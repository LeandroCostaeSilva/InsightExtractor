import { useState } from 'react';
import { Document } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Eye, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SidebarProps {
  documents: Document[];
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: (document: Document) => void;
  className?: string;
}

export function Sidebar({ documents, isOpen, onClose, onSelectDocument, className }: SidebarProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (document: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(document.id);
    try {
      api.downloadDocument(document.id);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSelectDocument = (document: Document) => {
    onSelectDocument(document);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "w-80 md:w-96 bg-slate-800/95 backdrop-blur-sm shadow-2xl border-r border-slate-700 fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Histórico de Documentos</h2>
              <p className="text-sm text-slate-300">Seus PDFs enviados e análises</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden text-slate-300 hover:text-white hover:bg-slate-700"
              data-testid="button-close-sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Document list */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-sm text-slate-400">Nenhum documento enviado ainda</p>
              </div>
            ) : (
              documents.map((document) => (
                <div
                  key={document.id}
                  className="bg-slate-700/50 backdrop-blur-sm rounded-lg p-4 hover:bg-slate-700/70 transition-colors cursor-pointer border border-slate-600"
                  onClick={() => handleSelectDocument(document)}
                  data-testid={`card-document-${document.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate" data-testid={`text-title-${document.id}`}>
                        {document.title || 'Documento sem título'}
                      </h3>
                      {document.authors && (
                        <p className="text-xs text-slate-300 mt-1" data-testid={`text-authors-${document.id}`}>
                          {document.authors}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDownload(document, e)}
                      disabled={downloadingId === document.id}
                      className="ml-2 p-1 h-auto text-slate-400 hover:text-white hover:bg-slate-600"
                      data-testid={`button-download-${document.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span data-testid={`text-date-${document.id}`}>
                      {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
                    </span>
                    {document.summary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300 font-medium p-0 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDocument(document);
                        }}
                        data-testid={`button-view-results-${document.id}`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver Resultados
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
