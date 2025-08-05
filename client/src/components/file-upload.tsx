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
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Uploaded File</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-gray-400 hover:text-gray-600"
              data-testid="button-remove-file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate" data-testid="text-filename">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-500" data-testid="text-filesize">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-secondary-500 hover:bg-secondary-600"
              data-testid="button-upload-pdf"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4 mr-2" />
                  Upload PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <CloudUpload className="h-8 w-8 text-primary-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload PDF Document</h2>
          <p className="text-gray-600 mb-6">Upload your PDF to extract metadata and generate AI-powered insights</p>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
              dragActive 
                ? 'border-primary-400 bg-primary-50' 
                : 'border-gray-300 hover:border-primary-400'
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
                <FileText className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Choose PDF file or drag and drop
                </p>
                <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
              </div>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
