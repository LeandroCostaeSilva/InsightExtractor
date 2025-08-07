import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CloudUpload, FileText, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Document } from '@shared/schema';

interface FileUploadProps {
  onUploadComplete: (document: Document) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const document = await api.uploadFile(selectedFile);
      toast({
        title: "Upload successful",
        description: "Your PDF has been uploaded and is ready for analysis.",
      });
      onUploadComplete(document);
      setSelectedFile(null);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload PDF.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  if (selectedFile) {
    return (
      <Card className="border border-slate-700 bg-slate-800/90 backdrop-blur-sm shadow-2xl">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Arquivo Selecionado</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              data-testid="button-remove-file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Mobile Layout */}
          <div className="md:hidden space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-slate-700/50 rounded-lg">
              <div className="h-12 w-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate" data-testid="text-filename">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-slate-300" data-testid="text-filesize">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 text-base shadow-lg"
              data-testid="button-upload-pdf"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CloudUpload className="h-5 w-5 mr-2" />
                  Enviar PDF
                </>
              )}
            </Button>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center space-x-4 p-4 bg-slate-700/50 rounded-lg">
            <div className="h-12 w-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate" data-testid="text-filename-desktop">
                {selectedFile.name}
              </p>
              <p className="text-sm text-slate-300" data-testid="text-filesize-desktop">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
              data-testid="button-upload-pdf-desktop"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4 mr-2" />
                  Enviar PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-700 bg-slate-800/90 backdrop-blur-sm shadow-2xl">
      <CardContent className="p-4 md:p-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <CloudUpload className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-2">Enviar Documento PDF</h2>
          <p className="text-slate-300 mb-6 text-sm md:text-base">Envie seu PDF para extrair metadados e gerar insights com IA</p>
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 md:p-8 transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-500/10' 
                : 'border-slate-600 hover:border-blue-400 hover:bg-blue-500/5'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="pdfUpload"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-file"
            />
            <label htmlFor="pdfUpload" className="cursor-pointer">
              <div className="flex flex-col items-center">
                <FileText className="h-12 md:h-16 w-12 md:w-16 text-slate-400 mb-4" />
                <p className="text-base md:text-lg font-medium text-white mb-2">
                  Escolha um arquivo PDF ou arraste aqui
                </p>
                <p className="text-sm text-slate-400">Tamanho máximo: 10MB</p>
                
                {/* Mobile-friendly upload button */}
                <div className="mt-4 md:hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg inline-flex items-center">
                    <CloudUpload className="h-5 w-5 mr-2" />
                    Selecionar Arquivo
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
