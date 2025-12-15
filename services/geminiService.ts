import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!API_KEY) {
  console.error("Missing VITE_GEMINI_API_KEY in environment variables");
}

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    textBlocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          originalText: {
            type: Type.STRING,
            description: "The text content found in this region."
          },
          box_2d: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "A VERY TIGHT bounding box [ymin, xmin, ymax, xmax] (0-1000) that exactly encloses the text."
          },
          textColor: {
            type: Type.STRING,
            description: "The primary hex color of the text (e.g. #000000)."
          },
          backgroundColor: {
            type: Type.STRING,
            description: "The solid hex color of the surface immediately behind the text, suitable for painting over/erasing the text (e.g. #FFFFFF)."
          },
          fontFamily: {
            type: Type.STRING,
            enum: ["serif", "sans-serif", "monospace", "cursive"],
            description: "The general font family of the text."
          },
          fontWeight: {
            type: Type.STRING,
            enum: ["normal", "bold"],
            description: "The weight of the font."
          }
        },
        required: ["originalText", "box_2d", "textColor", "backgroundColor", "fontFamily", "fontWeight"]
      }
    }
  }
};

export const analyzeImageText = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY, httpOptions: { baseUrl: "https://aihubmix.com/gemini" } });
    // Strip header if present (e.g., "data:image/png;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming jpeg/png, standardizing
              data: cleanBase64
            }
          },
          {
            text: "Analyze this image for text editing. 1. Detect all visible text. 2. Create TIGHT bounding boxes around each text line or block. 3. Accurately identify the background color behind the text so we can erase it. 4. Estimate font style."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are an expert OCR and design AI. Your goal is to help replace text in images. Be extremely precise with bounding boxes (tight fit) and background colors (for masking)."
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from Gemini");

    const data = JSON.parse(jsonText);

    // Add IDs and initialize currentText
    const processedBlocks = (data.textBlocks || []).map((block: any, index: number) => ({
      ...block,
      id: `block-${index}-${Date.now()}`,
      currentText: block.originalText
    }));

    return { textBlocks: processedBlocks };

  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};

export const removeTextFromImage = async (base64Image: string): Promise<string | null> => {
  try {
    // Check for API key selection logic for paid models
    if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey && (window as any).aistudio.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
      }
    }

    // Create new instance to ensure we use the potentially newly selected key
    const ai = new GoogleGenAI({ apiKey: API_KEY, httpOptions: { baseUrl: "https://aihubmix.com/gemini" } });
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: 'Remove all text from this image. Fill in the background where the text was to match the surrounding texture and lighting perfectly. Do not change the layout or other objects. Output only the cleaned image.',
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Error cleaning image:", error);
    return null;
  }
};