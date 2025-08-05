import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, hashPassword, comparePassword, generateToken, type AuthRequest } from "./auth";
import { registerSchema, loginSchema } from "@shared/schema";
import { extractPDFContent, ensureUploadsDirectory, generateFileName } from "./pdfProcessor";
import { analyzeDocument } from "./openaiService";
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

  // Protected routes
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // Document routes
  app.get("/api/documents", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const documents = await storage.getDocumentsByUserId(req.user!.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", authenticateToken, async (req: AuthRequest, res) => {
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

  app.post("/api/documents/upload", authenticateToken, upload.single('pdf'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      // Generate unique filename and move file
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
      
      // Create document record
      const document = await storage.createDocument({
        userId: req.user!.id,
        title: pdfData.title,
        authors: pdfData.authors,
        publishedAt: validPublishedAt,
        filePath: finalPath,
        summary: null,
        insights: null,
      });

      res.status(201).json(document);
    } catch (error: any) {
      console.error("Upload error:", error);
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  app.post("/api/documents/:id/analyze", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Extract PDF content for analysis
      const pdfData = await extractPDFContent(document.filePath);
      
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
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: error.message || "Analysis failed" });
    }
  });

  app.get("/api/documents/:id/download", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      const fileName = path.basename(document.filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/pdf');
      
      const fileStream = fs.createReadStream(document.filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
