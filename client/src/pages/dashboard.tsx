import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sidebar } from '@/components/sidebar';
import { FileUpload } from '@/components/file-upload';
import { Menu, FileText, LogOut, User, Loader2, Sparkles } from 'lucide-react';
import { Document } from '@shared/schema';
import { api } from '@/lib/api';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: documents = [], refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await api.getDocuments();
      return response.json();
    },
  });

  const handleUploadComplete = (document: Document) => {
    refetch();
    setSelectedDocument(document);
  };

  const handleAnalyzeDocument = async (document: Document) => {
    if (!document) return;

    setIsAnalyzing(true);
    try {
      const response = await api.analyzeDocument(document.id);
      const analyzedDocument = await response.json();
      
      toast({
        title: "Analysis complete",
        description: "Your document has been analyzed successfully.",
      });
      
      setLocation(`/results/${analyzedDocument.id}`);
    } catch (error: any) {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze document.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectDocument = (document: Document) => {
    if (document.summary) {
      setLocation(`/results/${document.id}`);
    } else {
      setSelectedDocument(document);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/90 backdrop-blur-sm shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile/Tablet Layout */}
          <div className="md:hidden">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center flex-1">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setSidebarOpen(true)}
                  className="p-3 rounded-lg hover:bg-slate-700 transition-colors mr-4"
                  data-testid="button-menu"
                >
                  <Menu className="h-6 w-6 text-slate-300" />
                </Button>
                <div className="flex items-center flex-1">
                  <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-lg font-semibold text-white truncate">PDF Insight</h1>
                </div>
              </div>
              
              <Button
                onClick={logout}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium px-4 py-2 rounded-lg shadow-lg ml-2"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
            
            {/* User info row on mobile */}
            <div className="pb-3 border-t border-slate-700 pt-3">
              <div className="flex items-center justify-center text-sm text-slate-300">
                <User className="h-4 w-4 mr-2" />
                <span data-testid="text-user-email" className="truncate">{user?.email}</span>
              </div>
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden md:flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-slate-700 transition-colors lg:hidden mr-4"
                data-testid="button-menu-desktop"
              >
                <Menu className="h-5 w-5 text-slate-300" />
              </Button>
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-white">PDF Insight Extractor</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-slate-300">
                <User className="h-4 w-4 mr-2" />
                <span data-testid="text-user-email-desktop">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                data-testid="button-logout-desktop"
              >
                <LogOut className="h-4 w-4 text-slate-300" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          documents={documents}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectDocument={handleSelectDocument}
        />

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            {/* Upload Area */}
            {!selectedDocument && (
              <FileUpload onUploadComplete={handleUploadComplete} />
            )}

            {/* Selected Document Preview */}
            {selectedDocument && !selectedDocument.summary && (
              <Card className="border border-slate-700 bg-slate-800/90 backdrop-blur-sm shadow-2xl">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Pronto para Análise</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDocument(null)}
                      className="text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      data-testid="button-clear-selection"
                    >
                      <span className="sr-only">Clear selection</span>
                      ✕
                    </Button>
                  </div>
                  
                  {/* Mobile Layout */}
                  <div className="md:hidden max-w-sm mx-auto space-y-6">
                    <div className="bg-slate-700/50 backdrop-blur-sm rounded-lg p-6 text-center border border-slate-600">
                      <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-white" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-base font-medium text-white break-words" data-testid="text-selected-title">
                          {selectedDocument.title || 'Documento sem título'}
                        </p>
                        {selectedDocument.authors && (
                          <p className="text-sm text-slate-300" data-testid="text-selected-authors">
                            {selectedDocument.authors}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAnalyzeDocument(selectedDocument)}
                      disabled={isAnalyzing}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-4 text-lg shadow-xl rounded-xl"
                      data-testid="button-analyze"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-6 w-6 mr-3" />
                          Iniciar Análise IA
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:block">
                    <div className="flex items-center space-x-4 p-4 bg-slate-700/50 rounded-lg mb-6">
                      <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate" data-testid="text-selected-title-desktop">
                          {selectedDocument.title || 'Documento sem título'}
                        </p>
                        {selectedDocument.authors && (
                          <p className="text-sm text-slate-300" data-testid="text-selected-authors-desktop">
                            {selectedDocument.authors}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-center">
                      <Button
                        onClick={() => handleAnalyzeDocument(selectedDocument)}
                        disabled={isAnalyzing}
                        className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold shadow-lg"
                        data-testid="button-analyze-desktop"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analisando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Iniciar Análise IA
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {isAnalyzing && (
              <Card className="border border-gray-200">
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                      <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Your PDF</h3>
                    <p className="text-gray-600">Extracting metadata and generating insights with AI...</p>
                  </div>
                  
                  <div className="max-w-md mx-auto">
                    <div className="bg-gray-200 rounded-full h-2 mb-4">
                      <div className="bg-primary-500 h-2 rounded-full animate-pulse" style={{ width: '65%' }}></div>
                    </div>
                    <p className="text-sm text-gray-500">This may take up to 30 seconds</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
