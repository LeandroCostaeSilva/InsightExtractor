import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface DocumentAnalysis {
  summary: string;
  insights: string[];
  metadata: {
    title?: string;
    authors?: string;
    publishedAt?: string;
  };
}

export async function analyzeDocument(text: string, existingMetadata?: {
  title?: string;
  authors?: string;
  publishedAt?: Date;
}): Promise<DocumentAnalysis> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert document analyst. Analyze the provided PDF text and extract:
1. A comprehensive executive summary (2-3 paragraphs)
2. Key insights as an array of bullet points
3. Enhanced metadata including title, authors, and publication date if available

Respond with JSON in this exact format:
{
  "summary": "comprehensive summary text",
  "insights": ["insight 1", "insight 2", "insight 3", ...],
  "metadata": {
    "title": "enhanced or extracted title",
    "authors": "extracted or enhanced authors",
    "publishedAt": "publication date if found"
  }
}`
        },
        {
          role: "user",
          content: `Please analyze this document text and provide the analysis in JSON format:

${existingMetadata ? `Existing metadata:
Title: ${existingMetadata.title || 'Unknown'}
Authors: ${existingMetadata.authors || 'Unknown'}
Published: ${existingMetadata.publishedAt ? existingMetadata.publishedAt.toISOString() : 'Unknown'}

` : ''}Document text:
${text.substring(0, 10000)}${text.length > 10000 ? '...' : ''}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      summary: result.summary || "No summary available",
      insights: Array.isArray(result.insights) ? result.insights : [],
      metadata: {
        title: result.metadata?.title || existingMetadata?.title,
        authors: result.metadata?.authors || existingMetadata?.authors,
        publishedAt: result.metadata?.publishedAt || (existingMetadata?.publishedAt?.toISOString()),
      }
    };
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    throw new Error("Failed to analyze document with AI");
  }
}
