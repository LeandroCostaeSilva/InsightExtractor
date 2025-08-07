import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, hashPassword, comparePassword, generateToken, type AuthRequest } from "./auth";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { emailService } from "./emailService";
import { extractPDFContent, ensureUploadsDirectory, generateFileName } from "./pdfProcessor";
import { analyzeDocument } from "./openaiService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadsDir = ensureUploadsDirectory();
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        email: validatedData.email,
        password: hashedPassword,
      });
      
      // Generate JWT token
      const token = generateToken(user.id, user.email);
      
      res.status(201).json({
        user: { id: user.id, email: user.email },
        token,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check password
      const isValidPassword = await comparePassword(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Generate JWT token
      const token = generateToken(user.id, user.email);
      
      res.json({
        user: { id: user.id, email: user.email },
        token,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  // Forgot password route
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return res.json({ 
          message: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha." 
        });
      }

      // Generate reset token
      const token = emailService.generateResetToken();
      const expiresAt = emailService.getTokenExpiration();

      // Store token in database
      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt,
      });

      // Send email
      await emailService.sendPasswordResetEmail(email, token);

      res.json({ 
        message: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha." 
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Reset password route
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      
      // Get token from database
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        await storage.deletePasswordResetToken(token);
        return res.status(400).json({ message: "Token expirado" });
      }

      // Hash new password and update user
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(resetToken.userId, { password: hashedPassword });

      // Delete used token
      await storage.deletePasswordResetToken(token);

      res.json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Protected routes
  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Document routes
  app.get("/api/documents", authenticateToken, async (req: any, res) => {
    try {
      const documents = await storage.getDocumentsByUserId(req.user!.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", authenticateToken, async (req: any, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/documents/upload", authenticateToken, upload.single('pdf'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      // Generate unique filename and move file to temp location
      const fileName = generateFileName(req.file.originalname);
      const finalPath = path.join(uploadsDir, fileName);
      fs.renameSync(req.file.path, finalPath);

      // Extract PDF content and metadata
      const pdfData = await extractPDFContent(finalPath);
      
      // Validate publishedAt date before saving
      let validPublishedAt: Date | undefined = undefined;
      if (pdfData.publishedAt && !isNaN(pdfData.publishedAt.getTime())) {
        validPublishedAt = pdfData.publishedAt;
      }
      
      // Create document record first to get the ID
      const document = await storage.createDocument({
        userId: req.user!.id,
        title: pdfData.title,
        authors: pdfData.authors,
        publishedAt: validPublishedAt,
        filePath: finalPath,
        originalFileName: req.file.originalname,
        objectStoragePath: null, // Will be updated after upload
        summary: null,
        insights: null,
      });

      try {
        // Upload file to object storage
        const fileBuffer = fs.readFileSync(finalPath);
        const objectStorageService = new ObjectStorageService();
        const objectPath = await objectStorageService.uploadDocumentFile(
          document.id,
          req.file.originalname,
          fileBuffer,
          'application/pdf'
        );

        // Update document with object storage path
        await storage.updateDocument(document.id, {
          objectStoragePath: objectPath
        });

        // Clean up local temp file
        fs.unlinkSync(finalPath);

        res.status(201).json(document);
      } catch (objectStorageError) {
        console.error("Object storage upload failed:", objectStorageError);
        // Keep the local file as fallback and continue
        console.log("Continuing with local file storage as fallback");
        res.status(201).json(document);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  app.post("/api/documents/:id/analyze", authenticateToken, async (req: any, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      let tempFilePath: string | null = null;
      let pdfData: any;

      try {
        // Check if file exists locally first
        if (fs.existsSync(document.filePath)) {
          console.log("Using local file for analysis:", document.filePath);
          pdfData = await extractPDFContent(document.filePath);
        } 
        // If not local and we have object storage path, download temporarily
        else if (document.objectStoragePath) {
          console.log("Downloading from object storage for analysis:", document.objectStoragePath);
          const objectStorageService = new ObjectStorageService();
          
          // Create temp file path
          tempFilePath = path.join(process.cwd(), 'uploads', `temp-${Date.now()}-${document.originalFileName || 'document.pdf'}`);
          
          // Download file from object storage to temp location
          try {
            // Extract document ID and filename from object storage path
            // Path format: /bucket/documents/documentId/filename
            const pathParts = document.objectStoragePath.split('/');
            const documentId = pathParts[pathParts.length - 2];
            const filename = pathParts[pathParts.length - 1];
            
            const objectFile = await objectStorageService.getDocumentFile(documentId, filename);
            const writeStream = fs.createWriteStream(tempFilePath);
            const readStream = objectFile.createReadStream();
            
            await new Promise<void>((resolve, reject) => {
              readStream.pipe(writeStream);
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
              readStream.on('error', reject);
            });
          } catch (objectError) {
            console.error("Error downloading from object storage:", objectError);
            throw new Error("Failed to download PDF from object storage");
          }
          
          pdfData = await extractPDFContent(tempFilePath);
        } else {
          throw new Error("PDF file not found in local storage or object storage");
        }
      } catch (fileError) {
        console.error("Error accessing PDF file:", fileError);
        throw new Error("Unable to access PDF file for analysis");
      }
      
      try {
        // Analyze with OpenAI
        const analysis = await analyzeDocument(pdfData.text, {
          title: document.title || undefined,
          authors: document.authors || undefined,
          publishedAt: document.publishedAt || undefined,
        });

        // Validate publishedAt date from analysis
        let validAnalysisDate: Date | undefined = document.publishedAt || undefined;
        if (analysis.metadata.publishedAt) {
          const analysisDate = new Date(analysis.metadata.publishedAt);
          if (!isNaN(analysisDate.getTime())) {
            validAnalysisDate = analysisDate;
          }
        }

        // Update document with analysis results
        const updatedDocument = await storage.updateDocument(document.id, {
          title: analysis.metadata.title || document.title,
          authors: analysis.metadata.authors || document.authors,
          publishedAt: validAnalysisDate,
          summary: analysis.summary,
          insights: analysis.insights,
        });

        // Create extraction record
        await storage.createExtraction({
          documentId: document.id,
          summary: analysis.summary,
          insights: analysis.insights,
        });

        res.json(updatedDocument);
      } finally {
        // Clean up temporary file if it was created
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
            console.log("Cleaned up temporary file:", tempFilePath);
          } catch (cleanupError) {
            console.error("Error cleaning up temp file:", cleanupError);
          }
        }
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: error.message || "Analysis failed" });
    }
  });

  // Download original PDF document
  app.get("/api/documents/:id/download", authenticateToken, async (req: any, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const objectStorageService = new ObjectStorageService();

      // Try to download from object storage first
      if (document.objectStoragePath && document.originalFileName) {
        try {
          const file = await objectStorageService.getDocumentFile(document.id, document.originalFileName);
          await objectStorageService.downloadObject(file, res);
          return;
        } catch (error) {
          if (error instanceof ObjectNotFoundError) {
            console.log("File not found in object storage, falling back to local file");
          } else {
            console.error("Object storage download error:", error);
          }
        }
      }

      // Fallback to local file if object storage fails or not available
      if (document.filePath && fs.existsSync(document.filePath)) {
        const filename = document.originalFileName || path.basename(document.filePath);
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        });
        res.sendFile(path.resolve(document.filePath));
      } else {
        res.status(404).json({ message: "File not found" });
      }
    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ message: error.message || "Download failed" });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
