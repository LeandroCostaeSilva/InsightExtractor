import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  Calendar, 
  Clock, 
  Download, 
  Plus, 
  FileDown,
  Lightbulb,
  Users
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document } from '@shared/schema';
import { api } from '@/lib/api';
import { useLocation } from 'wouter';
import { formatDistanceToNow, format } from 'date-fns';

interface ResultsPageProps {
  params: {
    id: string;
  };
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', params.id],
    queryFn: async () => {
      const response = await api.getDocument(params.id);
      return response.json() as Promise<Document>;
    },
  });

  const handleDownload = async () => {
    if (document) {
      try {
        await api.downloadDocument(document.id);
      } catch (error) {
        console.error('Download failed:', error);
        alert('Erro ao baixar o arquivo. Tente novamente.');
      }
    }
  };

  const handleGoBack = () => {
    setLocation('/dashboard');
  };

  const handleProcessNew = () => {
    setLocation('/dashboard');
  };

  const handleExportPDF = async () => {
    if (!document) return;
    
    try {
      // Create PDF content structure with proper A4 dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const leftMargin = 25; // Margem esquerda maior para encadernação
      const rightMargin = 20; // Margem direita
      const topMargin = 25; // Margem superior
      const bottomMargin = 25; // Margem inferior
      const textWidth = pageWidth - leftMargin - rightMargin; // Largura útil do texto
      let yPosition = topMargin;
      
      // Função para verificar se precisa de nova página
      const checkNewPage = (neededSpace: number) => {
        if (yPosition + neededSpace > pageHeight - bottomMargin) {
          pdf.addPage();
          yPosition = topMargin;
          return true;
        }
        return false;
      };
      
      // Cabeçalho com título
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18); // Tamanho reduzido para melhor formatação
      
      const title = document.title || 'Documento sem título';
      const titleLines = pdf.splitTextToSize(title, textWidth);
      pdf.text(titleLines, leftMargin, yPosition);
      yPosition += titleLines.length * 8 + 15; // Espaçamento proporcional
      
      // Informações do documento
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      if (document.authors) {
        const authorsText = `Autores: ${document.authors}`;
        const authorsLines = pdf.splitTextToSize(authorsText, textWidth);
        checkNewPage(authorsLines.length * 5);
        pdf.text(authorsLines, leftMargin, yPosition);
        yPosition += authorsLines.length * 5 + 3;
      }
      
      if (document.publishedAt) {
        const pubText = `Data de Publicação: ${format(new Date(document.publishedAt), 'dd/MM/yyyy')}`;
        checkNewPage(5);
        pdf.text(pubText, leftMargin, yPosition);
        yPosition += 8;
      }
      
      const processedText = `Processado em: ${format(new Date(document.createdAt), 'dd/MM/yyyy HH:mm')}`;
      checkNewPage(5);
      pdf.text(processedText, leftMargin, yPosition);
      yPosition += 15;
      
      // Linha separadora
      checkNewPage(10);
      pdf.setDrawColor(200, 200, 200);
      pdf.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
      yPosition += 15;
      
      // Resumo Executivo
      if (document.summary) {
        checkNewPage(20);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('RESUMO EXECUTIVO', leftMargin, yPosition);
        yPosition += 12;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        
        // Dividir texto em parágrafos para melhor formatação
        const paragraphs = document.summary.split('\n\n').filter(p => p.trim());
        
        paragraphs.forEach((paragraph, index) => {
          const paragraphLines = pdf.splitTextToSize(paragraph.trim(), textWidth);
          
          // Verificar se cabe na página atual
          checkNewPage(paragraphLines.length * 4 + 8);
          
          pdf.text(paragraphLines, leftMargin, yPosition);
          yPosition += paragraphLines.length * 4 + 8; // Espaçamento entre parágrafos
        });
        
        yPosition += 10; // Espaço extra após resumo
      }
      
      // Principais Insights
      if (document.insights && Array.isArray(document.insights) && document.insights.length > 0) {
        checkNewPage(25);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('PRINCIPAIS INSIGHTS', leftMargin, yPosition);
        yPosition += 12;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        
        document.insights.forEach((insight: string, index: number) => {
          const bulletText = `• ${insight}`;
          const insightLines = pdf.splitTextToSize(bulletText, textWidth - 10);
          
          // Verificar se cabe na página atual
          checkNewPage(insightLines.length * 4 + 6);
          
          pdf.text(insightLines, leftMargin + 5, yPosition);
          yPosition += insightLines.length * 4 + 6; // Espaçamento entre insights
        });
      }
      
      // Rodapé em todas as páginas
      const totalPages = pdf.internal.pages.length - 1; // -1 porque a primeira "página" é metadata
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        
        // Informação do gerador (esquerda)
        pdf.text('Gerado pelo PDF Insight Extractor', leftMargin, pageHeight - 15);
        
        // Número da página (direita)
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - rightMargin - 20, pageHeight - 15);
      }
      
      // Resetar cor do texto
      pdf.setTextColor(0, 0, 0);
      
      // Salvar com nome limpo
      const cleanTitle = document.title ? 
        document.title.replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, '').substring(0, 50) : 
        'documento';
      const fileName = `${cleanTitle}_analise.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o arquivo PDF. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Document not found</p>
          <Button onClick={handleGoBack} className="mt-4" data-testid="button-go-back">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-4"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </Button>
              <div className="flex items-center">
                <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Extraction Results</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                data-testid="button-download"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2" />
                <span data-testid="text-user-email">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Document Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-document-title">
                  {document.title || 'Untitled Document'}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                  {document.authors && (
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      <span data-testid="text-document-authors">{document.authors}</span>
                    </div>
                  )}
                  {document.publishedAt && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span data-testid="text-published-date">
                        {format(new Date(document.publishedAt), 'MMMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span data-testid="text-processed-date">
                      Processed {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="ml-6">
                <div className="h-16 w-16 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 text-primary-500 mr-3" />
                  Resumo Executivo
                </h2>
                <div className="prose prose-sm max-w-none text-gray-700" data-testid="text-summary">
                  {document.summary ? (
                    <div className="whitespace-pre-wrap">{document.summary}</div>
                  ) : (
                    <p className="text-gray-500 italic">Nenhum resumo disponível. O documento pode não ter sido analisado ainda.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Insights */}
          <div>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Lightbulb className="h-5 w-5 text-accent-500 mr-3" />
                  Principais Insights
                </h2>
                <div className="space-y-4" data-testid="list-insights">
                  {document.insights && Array.isArray(document.insights) ? (
                    document.insights.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                        <p className="text-sm text-gray-700" data-testid={`text-insight-${index}`}>
                          {insight}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic text-sm">
                      Nenhum insight disponível. O documento pode não ter sido analisado ainda.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleProcessNew}
            className="bg-primary-500 hover:bg-primary-600"
            data-testid="button-process-new"
          >
            <Plus className="h-4 w-4 mr-2" />
            Process New Document
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            data-testid="button-export-pdf"
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </main>
    </div>
  );
}
