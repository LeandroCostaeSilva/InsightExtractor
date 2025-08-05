import pdf from "pdf-parse";
import fs from "fs";
import path from "path";

export interface PDFMetadata {
  title?: string;
  authors?: string;
  publishedAt?: Date;
  text: string;
}

export async function extractPDFContent(filePath: string): Promise<PDFMetadata> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    // Extract basic metadata from PDF info
    const info = data.info || {};
    
    // Try to extract title from metadata or first few lines
    let title = info.Title || extractTitleFromText(data.text);
    
    // Try to extract authors from metadata
    let authors = info.Author || extractAuthorsFromText(data.text);
    
    // Try to extract publication date
    let publishedAt: Date | undefined;
    if (info.CreationDate) {
      const date = new Date(info.CreationDate);
      // Validate that the date is valid
      if (!isNaN(date.getTime())) {
        publishedAt = date;
      }
    }

    return {
      title: title || undefined,
      authors: authors || undefined,
      publishedAt,
      text: data.text,
    };
  } catch (error) {
    console.error("Error extracting PDF content:", error);
    throw new Error("Failed to extract PDF content");
  }
}

function extractTitleFromText(text: string): string | null {
  // Simple heuristic to extract title from first lines
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    // Skip common headers/footers
    if (trimmed.length > 10 && trimmed.length < 200 && 
        !trimmed.match(/^\d+$/) && 
        !trimmed.toLowerCase().includes('abstract') &&
        !trimmed.toLowerCase().includes('introduction')) {
      return trimmed;
    }
  }
  
  return null;
}

function extractAuthorsFromText(text: string): string | null {
  // Simple heuristic to find author patterns
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    
    // Look for patterns like "Author Name, Another Author"
    if (line.match(/^[A-Z][a-z]+ [A-Z][a-z]+(?:,\s*[A-Z][a-z]+ [A-Z][a-z]+)*$/)) {
      return line;
    }
    
    // Look for patterns with "et al."
    if (line.includes('et al.')) {
      return line;
    }
  }
  
  return null;
}

export function ensureUploadsDirectory(): string {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

export function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  return `${baseName}-${timestamp}${ext}`;
}
