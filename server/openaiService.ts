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
          content: `Você é um analista especialista em documentos. Analise o texto do PDF fornecido e extraia:
1. Um resumo executivo abrangente e detalhado (4-6 parágrafos) que inclua:
   - Visão geral do documento e seu propósito
   - Descrição detalhada dos principais capítulos e seções
   - Temas centrais e metodologias abordadas
   - Principais conclusões e recomendações
   - Contexto e relevância do trabalho
2. Insights principais como uma lista de pontos-chave
3. Metadados aprimorados incluindo título, autores e data de publicação se disponíveis

IMPORTANTE: Responda SEMPRE em português brasileiro, independentemente do idioma do documento original.

Responda com JSON neste formato exato:
{
  "summary": "resumo executivo detalhado em português",
  "insights": ["insight 1 em português", "insight 2 em português", "insight 3 em português", ...],
  "metadata": {
    "title": "título extraído ou aprimorado",
    "authors": "autores extraídos ou aprimorados",
    "publishedAt": "data de publicação se encontrada"
  }
}`
        },
        {
          role: "user",
          content: `Por favor, analise este texto do documento e forneça uma análise detalhada em JSON. 

INSTRUÇÕES ESPECÍFICAS:
- Crie um resumo executivo extenso e detalhado (4-6 parágrafos)
- Inclua análise de cada capítulo/seção principal encontrada no documento
- Identifique metodologias, teorias e conceitos centrais
- Destaque conclusões, recomendações e implicações práticas
- Forneça insights estratégicos e pontos-chave de aprendizado
- SEMPRE responda em português brasileiro, mesmo que o documento original esteja em outro idioma

${existingMetadata ? `Metadados existentes:
Título: ${existingMetadata.title || 'Desconhecido'}
Autores: ${existingMetadata.authors || 'Desconhecido'}
Publicado em: ${existingMetadata.publishedAt ? existingMetadata.publishedAt.toISOString() : 'Desconhecido'}

` : ''}Texto do documento:
${text.substring(0, 15000)}${text.length > 15000 ? '...' : ''}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 3500,
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
