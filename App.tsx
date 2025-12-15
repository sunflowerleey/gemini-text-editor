import React, { useState, useCallback } from 'react';
import { Upload, AlertCircle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { analyzeImageText, removeTextFromImage } from './services/geminiService';
import { DetectedTextBlock } from './types';
import { EditorCanvas } from './components/EditorCanvas';
import { LoadingOverlay } from './components/LoadingOverlay';

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Analyzing Image Structure...");
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<DetectedTextBlock[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size too large. Please upload an image under 5MB.");
        return;
      }
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setProcessedImageUrl(null);
      setBlocks([]); // Reset previous analysis
      setError(null);
    }
  };

  const startAnalysis = async () => {
    if (!imageFile || !imageUrl) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          // 1. Analyze Layout (Fast)
          setStatusMessage("Detecting text regions...");
          const result = await analyzeImageText(base64data);
          setBlocks(result.textBlocks);

          // 2. Clean Image (Slow - High Quality)
          setStatusMessage("Removing text from background (using Gemini Pro Image)...");
          const cleanedImage = await removeTextFromImage(base64data);
          if (cleanedImage) {
            setProcessedImageUrl(cleanedImage);
          } else {
            console.warn("Could not generate cleaned image, falling back to masking.");
          }

        } catch (err) {
          setError("Failed to process image. Please try again.");
          console.error(err);
        } finally {
          setIsAnalyzing(false);
          setStatusMessage("Analyzing Image Structure...");
        }
      };
    } catch (err) {
      setError("Error processing file.");
      setIsAnalyzing(false);
    }
  };

  const updateBlockText = useCallback((id: string, newText: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, currentText: newText } : b));
  }, []);

  // Determine the active image URL to display
  const activeImageUrl = processedImageUrl || imageUrl;

  return (
    <div className="flex h-screen w-screen bg-gray-50 overflow-hidden">
      {/* Left Panel: Upload & Preview */}
      <div className="w-1/3 min-w-[320px] max-w-[500px] border-r border-gray-200 bg-white flex flex-col z-20 shadow-lg">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="text-indigo-600" />
            AI Text Editor
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Upload an image, we'll detect the text, and you can rewrite it instantly.
          </p>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Upload Area */}
          <div className="relative group">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`
              border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all
              ${imageUrl ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}
            `}>
              <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                {imageUrl ? <ImageIcon className="text-indigo-600" /> : <Upload className="text-gray-400" />}
              </div>
              <p className="font-medium text-gray-700">
                {imageFile ? imageFile.name : "Click to upload or drag & drop"}
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
            </div>
          </div>

          {/* Original Preview */}
          {imageUrl && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
                 <img src={imageUrl} alt="Original" className="w-full object-contain bg-gray-100" />
                 <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md">
                   Original
                 </span>
              </div>

              {blocks.length === 0 && !isAnalyzing && (
                <button
                  onClick={startAnalysis}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-md shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  Analyze Text
                </button>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {blocks.length > 0 && (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm border border-green-100">
                  <p className="font-semibold mb-1">Success!</p>
                  Found {blocks.length} text regions. You can now edit them on the right.
                  {processedImageUrl && (
                      <p className="mt-2 text-xs text-green-800 opacity-75">
                          ✨ Background text removed with Gemini Pro Image.
                      </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t text-xs text-gray-400 text-center">
          Powered by Gemini 2.5 Flash & Gemini 3 Pro
        </div>
      </div>

      {/* Right Panel: Editor */}
      <div className="flex-1 relative bg-slate-100 h-full overflow-hidden">
        {isAnalyzing && <LoadingOverlay message={statusMessage} />}
        {/* Key prop forces remount when image changes, ensuring fresh canvas */}
        <EditorCanvas 
          key={activeImageUrl}
          imageUrl={activeImageUrl} 
          originalImageUrl={imageUrl}
          blocks={blocks} 
          onBlockUpdate={updateBlockText}
          isProcessing={isAnalyzing}
          isCleaned={!!processedImageUrl}
        />
      </div>
    </div>
  );
}