import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, hashPassword, comparePassword, generateToken, type AuthRequest } from "./auth";
import { registerSchema, loginSchema } from "@shared/schema";
import { extractPDFContent, ensureUploadsDirectory, generateFileName } from "./pdfProcessor";
import { analyzeDocument } from "./openaiService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { passport } from "./oauth";
import multer from "multer";
import path from "path";
import fs from "fs";
import session from "express-session";

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
  
  // Configure session middleware for OAuth
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // OAuth routes (only if credentials are configured)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get('/api/auth/google', (req, res, next) => {
      console.log('Initiating Google OAuth authentication...');
      passport.authenticate('google', { 
        scope: ['profile', 'email'],
        accessType: 'offline',
        prompt: 'consent'
      })(req, res, next);
    });
    
    app.get('/api/auth/google/callback', 
      (req, res, next) => {
        console.log('Google OAuth callback received');
        passport.authenticate('google', { 
          failureRedirect: '/login?error=oauth_failed',
          successRedirect: false
        })(req, res, next);
      },
      (req, res) => {
        try {
          // Successful authentication, generate JWT and redirect
          const user = req.user as any;
          if (!user) {
            console.error('No user found after OAuth authentication');
            return res.redirect('/login?error=no_user');
          }
          
          const token = generateToken(user.id, user.email);
          console.log('OAuth authentication successful for user:', user.email);
          
          // Redirect to frontend with token
          res.redirect(`/login?token=${token}&success=true`);
        } catch (error) {
          console.error('Error in OAuth callback:', error);
          res.redirect('/login?error=callback_error');
        }
      }
    );
  } else {
    app.get('/api/auth/google', (req, res) => {
      res.status(501).json({ error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' });
    });
  }
  
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
    
    app.get('/api/auth/github/callback',
      passport.authenticate('github', { failureRedirect: '/login' }),
      (req, res) => {
        // Successful authentication, generate JWT and redirect
        const user = req.user as any;
        const token = generateToken(user.id, user.email);
        
        // Redirect to frontend with token
        res.redirect(`/login?token=${token}&success=true`);
      }
    );
  } else {
    app.get('/api/auth/github', (req, res) => {
      res.status(501).json({ error: 'GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.' });
    });
  }
  
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

  // Download original PDF document
  app.get("/api/documents/:id/download", authenticateToken, async (req: AuthRequest, res) => {
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
