import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DetectedTextBlock } from '../types';
import { Download, Type, RefreshCw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// Access the global fabric instance loaded via script tag
const fabric = (window as any).fabric;

interface EditorCanvasProps {
  imageUrl: string | null;
  originalImageUrl: string | null;
  blocks: DetectedTextBlock[];
  onBlockUpdate: (id: string, newText: string) => void;
  isProcessing: boolean;
  isCleaned: boolean;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ 
  imageUrl, 
  blocks, 
  isProcessing,
  isCleaned
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any | null>(null);
  
  // Viewport State
  const [scale, setScale] = useState(1);
  const [loadingCanvas, setLoadingCanvas] = useState(false);

  // Helper to fit canvas (memoized)
  const fitCanvas = useCallback(() => {
      if (!containerRef.current || !fabricCanvasRef.current) return;
      const container = containerRef.current;
      const canvas = fabricCanvasRef.current;
      
      const padding = 64; // px
      const availableWidth = container.clientWidth - padding;
      const availableHeight = container.clientHeight - padding;
      
      // Fabric canvas dimensions (internal resolution)
      const contentWidth = canvas.getWidth();
      const contentHeight = canvas.getHeight();

      // If dimensions are invalid or too small, default to something reasonable to avoid divide by zero
      if (contentWidth <= 1 || contentHeight <= 1) return;

      const scaleX = availableWidth / contentWidth;
      const scaleY = availableHeight / contentHeight;
      const newScale = Math.min(scaleX, scaleY, 1); 

      // Ensure minimal scale
      setScale(Math.max(newScale, 0.05));
  }, []);

  // 1. Initialize Fabric Instance (Run Once)
  useEffect(() => {
    if (!canvasElRef.current || !fabric) return;

    // Create instance
    const canvas = new fabric.Canvas(canvasElRef.current, {
        selection: true,
        preserveObjectStacking: true,
        backgroundColor: '#ffffff', // Ensure visible background
        renderOnAddRemove: false, // Performance optimization
    });
    fabricCanvasRef.current = canvas;

    // Handle window resize
    const handleResize = () => {
        requestAnimationFrame(fitCanvas);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        // Safely dispose
        if (fabricCanvasRef.current) {
            try {
                fabricCanvasRef.current.clear();
                fabricCanvasRef.current.dispose();
            } catch (e) {
                console.warn("Fabric dispose error suppressed:", e);
            }
            fabricCanvasRef.current = null;
        }
    };
  }, []); 

  // 2. Load Content (Image + Blocks)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !imageUrl || !fabric) return;

    setLoadingCanvas(true);

    // Use native Image loader for better control
    const imgElement = new Image();
    imgElement.crossOrigin = "anonymous";
    imgElement.src = imageUrl;

    imgElement.onload = () => {
        if (!fabricCanvasRef.current) return;
        const canvas = fabricCanvasRef.current;
        
        // Reset Canvas
        canvas.clear();
        
        // 1. Setup Canvas Dimensions from natural image size
        const width = imgElement.naturalWidth || 800;
        const height = imgElement.naturalHeight || 600;
        
        canvas.setWidth(width);
        canvas.setHeight(height);
        
        // 2. Set Background
        const fImg = new fabric.Image(imgElement, {
           originX: 'left',
           originY: 'top',
           scaleX: 1,
           scaleY: 1
        });
        
        canvas.setBackgroundImage(fImg, canvas.renderAll.bind(canvas));

        // 3. Process Blocks
        blocks.forEach(block => {
            const x = (block.box_2d[1] / 1000) * width;
            const y = (block.box_2d[0] / 1000) * height;
            const w = ((block.box_2d[3] - block.box_2d[1]) / 1000) * width;
            const h = ((block.box_2d[2] - block.box_2d[0]) / 1000) * height;

            // A. Create Mask (If not cleaned by AI)
            if (!isCleaned) {
                const paddingX = w * 0.05;
                const paddingY = h * 0.05;
                const maskRect = new fabric.Rect({
                    left: x - paddingX,
                    top: y - paddingY,
                    width: w + (paddingX * 2),
                    height: h + (paddingY * 2),
                    fill: block.backgroundColor,
                    selectable: false, 
                    evented: false,
                    excludeFromExport: false
                });
                canvas.add(maskRect);
            }

            // B. Create Text
            // Normalize font size better based on box height
            const fontSize = h * 0.8; 
            const fontFamily = block.fontFamily === 'serif' ? 'Times New Roman' : 
                               block.fontFamily === 'monospace' ? 'Courier New' : 
                               block.fontFamily === 'cursive' ? 'Brush Script MT' : 'Arial';
            
            const textbox = new fabric.Textbox(block.currentText, {
                left: x,
                top: y + (h * 0.1), // Slight offset
                width: w,
                fontSize: fontSize,
                fontFamily: fontFamily,
                fontWeight: block.fontWeight,
                fill: block.textColor,
                textAlign: 'center',
                // Styling
                transparentCorners: false,
                cornerColor: '#6366f1',
                cornerStyle: 'circle',
                borderColor: '#6366f1',
                cornerSize: 10,
                padding: 2,
                // Interaction
                editable: true,
                lockRotation: false,
                splitByGrapheme: true // Better for breaking long words
            });

            canvas.add(textbox);
        });

        // 4. Finalize
        canvas.requestRenderAll();
        // Give a small delay to ensure DOM update before measuring for fit
        setTimeout(fitCanvas, 50);
        setLoadingCanvas(false);
    };

    imgElement.onerror = (e) => {
        console.error("Failed to load image into canvas", e);
        setLoadingCanvas(false);
    };

  }, [imageUrl, blocks, isCleaned, fitCanvas]);

  const handleDownload = () => {
    if (!fabricCanvasRef.current) return;
    
    fabricCanvasRef.current.discardActiveObject();
    fabricCanvasRef.current.requestRenderAll();

    setTimeout(() => {
        if (!fabricCanvasRef.current) return;
        const dataURL = fabricCanvasRef.current.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 1 
        });

        const link = document.createElement('a');
        link.download = 'gemini-edited.png';
        link.href = dataURL;
        link.click();
    }, 100);
  };

  if (!imageUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 border-l border-gray-200">
        <Type size={48} className="mb-4 opacity-20" />
        <p>Processed image will appear here</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-100 relative">
      {/* Toolbar */}
      <div className="h-14 border-b bg-white flex items-center justify-between px-4 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <RefreshCw size={16} className={isProcessing || loadingCanvas ? "animate-spin" : ""} />
            Editor
            </h2>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-1.5 hover:bg-white rounded text-gray-600"><ZoomOut size={16}/></button>
                <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => s + 0.1)} className="p-1.5 hover:bg-white rounded text-gray-600"><ZoomIn size={16}/></button>
                <button onClick={fitCanvas} className="p-1.5 hover:bg-white rounded text-gray-600 ml-1" title="Fit"><Maximize size={14}/></button>
            </div>
        </div>
        
        <button 
          onClick={handleDownload}
          disabled={isProcessing || loadingCanvas}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Download size={16} />
          Download
        </button>
      </div>

      {/* Main Viewport */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-hidden relative flex items-center justify-center bg-slate-200/50"
      >
        <div 
            className="shadow-2xl bg-white origin-center transition-transform duration-200 ease-out"
            style={{ 
                transform: `scale(${scale})`,
                // Explicitly set initial size to avoid 0x0 collapse if canvas is delayed
                minWidth: '100px',
                minHeight: '100px'
            }}
        >
            <canvas ref={canvasElRef} width={800} height={600} />
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs text-slate-500 shadow-sm border border-slate-200 pointer-events-none z-10">
         Double-click text to edit • Drag to move • Drag corners to scale
      </div>
    </div>
  );
};