export interface BoundingBox {
  ymin: number; // 0-1000 normalized
  xmin: number; // 0-1000 normalized
  ymax: number; // 0-1000 normalized
  xmax: number; // 0-1000 normalized
}

export interface DetectedTextBlock {
  id: string;
  originalText: string;
  currentText: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  textColor: string; // hex
  backgroundColor: string; // hex
  fontFamily: 'serif' | 'sans-serif' | 'monospace' | 'cursive';
  fontWeight: 'normal' | 'bold';
}

export interface AnalysisResult {
  textBlocks: DetectedTextBlock[];
}