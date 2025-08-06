# PDF Insight Extractor

## Overview

PDF Insight Extractor is a complete full-stack web application that allows authenticated users to upload PDF documents for automated metadata extraction and AI-powered insights generation. The application processes PDFs to extract basic information (title, authors, publication date) and uses OpenAI's GPT-4o model to generate comprehensive summaries and key insights. Users can manage their document library, view analysis results, and download processed files through an intuitive dashboard interface.

## Recent Changes (January 5, 2025)

✅ **Complete Application Built Successfully**
- Full authentication system with JWT tokens and secure password hashing
- PDF upload and processing with file validation (10MB limit, PDF-only)
- AI-powered document analysis using OpenAI GPT-4o model
- Comprehensive dashboard with document history sidebar
- Results page displaying extracted metadata, summaries, and insights
- Database integration with PostgreSQL and Drizzle ORM
- All TypeScript errors resolved and application running successfully
- OpenAI API key configured for AI-powered analysis

✅ **Recent Improvements Applied**
- Fixed PDF upload error caused by invalid date metadata
- Enhanced AI analysis to provide content in Portuguese Brazilian
- Expanded executive summaries to 4-6 detailed paragraphs covering:
  - Document overview and purpose
  - Detailed chapter and section analysis
  - Central themes and methodologies
  - Key conclusions and recommendations
  - Context and work relevance
- Increased token limit to 3500 for more comprehensive analysis
- Updated UI labels to Portuguese (Resumo Executivo, Principais Insights)
- All analysis content now generated in Portuguese regardless of source language

✅ **PDF Export Functionality Implemented**
- Combined Export Results and Share Results into single "Exportar PDF" button
- Professional PDF formatting with proper A4 dimensions and margins:
  - Left margin: 25mm (binding-friendly), Right margin: 20mm
  - Top/bottom margins: 25mm for optimal readability
  - Proper text width calculations to prevent content overflow
- Enhanced PDF structure with automatic page breaks and pagination
- Paragraph-aware text formatting for better readability
- Professional footer with page numbering and generation info
- Clean filename generation based on document title

✅ **Object Storage Integration Completed**
- Implemented complete object storage service using Google Cloud Storage
- Original PDF files now stored in object storage with fallback to local storage
- Added new database fields: originalFileName and objectStoragePath
- Download functionality supports both object storage and local file fallback
- Secure file upload and download with proper authentication
- Enhanced API with dedicated download endpoint for original PDF files
- Automatic cleanup of temporary files after successful object storage upload

✅ **Authentication System Status**
- Simple email/password authentication system implemented
- JWT-based token authentication with 7-day expiration
- Secure password hashing using bcrypt (12 rounds)
- Clean login/registration interface without OAuth complexity
- OAuth system removed per user request to keep authentication simple
- Database schema maintains googleId/githubId fields for potential future use

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite for development and production builds
- **Routing**: Wouter for client-side routing with protected routes for authenticated content
- **UI Components**: Radix UI primitives with shadcn/ui component system for consistent design
- **Styling**: Tailwind CSS with custom CSS variables for theming and responsive design
- **State Management**: TanStack Query for server state management and caching
- **File Upload**: Uppy.js components for drag-and-drop PDF upload functionality

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **File Processing**: pdf-parse library for PDF content extraction and metadata parsing
- **API Design**: RESTful endpoints with proper HTTP status codes and error handling

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Database**: Neon serverless PostgreSQL with connection pooling
- **Schema**: Three main entities - users, documents, and extractions with proper foreign key relationships
- **Migrations**: Drizzle Kit for schema migrations and database management

### AI Integration
- **Service**: OpenAI GPT-4o model for document analysis and insight generation
- **Processing**: Structured JSON responses for consistent data formatting
- **Analysis**: Generates executive summaries, key insights, and enhanced metadata extraction

### Authentication System
- **Strategy**: JWT tokens with 7-day expiration stored in localStorage
- **Security**: Password hashing with bcrypt (12 rounds), secure token verification
- **Protection**: Middleware-based route protection for API endpoints
- **User Management**: Registration, login, and user session management

### File Storage
- **Upload Handling**: Multer middleware for multipart form data processing
- **File Validation**: PDF-only uploads with 10MB size limit
- **Storage Strategy**: Local file system storage with organized directory structure
- **Download Support**: Secure file serving with proper headers and authentication checks

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection for Neon database
- **drizzle-orm**: Type-safe ORM for database operations and query building
- **@tanstack/react-query**: Data fetching and caching library for React
- **wouter**: Lightweight routing library for React applications

### Authentication & Security
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and comparison utilities

### File Processing
- **pdf-parse**: PDF content extraction and metadata parsing
- **multer**: File upload handling middleware for Express

### AI Services
- **openai**: Official OpenAI API client for GPT-4o integration

### UI & Styling
- **@radix-ui/react-***: Headless UI components for accessibility and functionality
- **tailwindcss**: Utility-first CSS framework
- **@uppy/**: File upload components with drag-and-drop support
- **lucide-react**: Icon library for consistent iconography

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking and enhanced developer experience
- **tsx**: TypeScript execution for Node.js development
- **esbuild**: Fast bundling for production builds