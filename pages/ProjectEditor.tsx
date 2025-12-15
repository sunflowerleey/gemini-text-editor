import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, ArrowLeft, Save, RefreshCw, Eraser } from 'lucide-react';
import { analyzeImageText, removeTextFromImage } from '../services/geminiService';
import { DetectedTextBlock } from '../types';
import { EditorCanvas } from '../components/EditorCanvas';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { getProject, updateProject } from '../services/storageService';

export default function ProjectEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [projectName, setProjectName] = useState("Untitled Project");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
    const [blocks, setBlocks] = useState<DetectedTextBlock[]>([]);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Load Project
    useEffect(() => {
        if (!id) return;
        const load = async () => {
            try {
                const project = await getProject(id);
                if (!project) {
                    setError("Project not found");
                    return;
                }
                setProjectName(project.name);
                setImageUrl(project.originalImage);
                setProcessedImageUrl(project.processedImage);
                setBlocks(project.blocks || []);
            } catch (e) {
                console.error("Failed to load project", e);
                setError("Failed to load project");
            }
        };
        load();
    }, [id]);

    const saveChanges = async (newBlocks?: DetectedTextBlock[], newProcessedImage?: string) => {
        if (!id) return;
        setIsSaving(true);
        try {
            await updateProject(id, {
                blocks: newBlocks ?? blocks,
                processedImage: newProcessedImage ?? processedImageUrl ?? undefined
            });
        } catch (e) {
            console.error("Failed to save", e);
        } finally {
            setIsSaving(false);
        }
    };

    const updateBlockText = useCallback((blockId: string, newText: string) => {
        setBlocks(prev => {
            const newBlocks = prev.map(b => b.id === blockId ? { ...b, currentText: newText } : b);
            saveChanges(newBlocks); // Auto-save on text change
            return newBlocks;
        });
    }, [id]);

    const reDetectText = async () => {
        if (!imageUrl) return;
        setIsAnalyzing(true);
        setStatusMessage("Re-detecting text regions...");
        try {
            const result = await analyzeImageText(imageUrl);
            setBlocks(result.textBlocks);
            await saveChanges(result.textBlocks);
        } catch (err) {
            setError("Failed to detect text");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const reCleanBackground = async () => {
        if (!imageUrl) return;
        setIsAnalyzing(true);
        setStatusMessage("Re-cleaning background...");
        try {
            const cleaned = await removeTextFromImage(imageUrl);
            if (cleaned) {
                setProcessedImageUrl(cleaned);
                await saveChanges(undefined, cleaned);
            } else {
                setError("Could not generate cleaned image");
            }
        } catch (err) {
            setError("Failed to clean background");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Active image to display (processed or original)
    const activeImageUrl = processedImageUrl || imageUrl;

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                <AlertCircle className="text-red-500" size={48} />
                <p className="text-xl font-semibold text-gray-700">{error}</p>
                <button onClick={() => navigate('/')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Back to Projects</button>
            </div>
        )
    }

    return (
        <div className="flex h-screen w-screen bg-gray-50 overflow-hidden">
            {/* Left Panel: Controls & Info */}
            <div className="w-[300px] border-r border-gray-200 bg-white flex flex-col z-20 shadow-lg">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-bold text-gray-800 truncate" title={projectName}>{projectName}</h1>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions</h2>

                        <button
                            onClick={reDetectText}
                            disabled={isAnalyzing}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 hover:border-indigo-500 hover:text-indigo-600 rounded-xl transition-all shadow-sm text-gray-700 font-medium text-sm"
                        >
                            <Sparkles size={18} />
                            Re-Detect Text
                        </button>

                        <button
                            onClick={reCleanBackground}
                            disabled={isAnalyzing}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 hover:border-indigo-500 hover:text-indigo-600 rounded-xl transition-all shadow-sm text-gray-700 font-medium text-sm"
                        >
                            <Eraser size={18} />
                            Re-Clean Background
                        </button>
                    </div>

                    {activeImageUrl && (
                        <div className="mt-auto">
                            <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
                                <img src={imageUrl!} alt="Original" className="w-full h-40 object-cover opacity-50 hover:opacity-100 transition-opacity" />
                                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md">
                                    Original Source
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t text-xs text-gray-400 flex justify-between items-center">
                    <span>{blocks.length} Text Blocks</span>
                    {isSaving ? <span className="animate-pulse flex items-center gap-1"><Save size={12} /> Saving...</span> : <span className="text-green-600 flex items-center gap-1"><Save size={12} /> Saved</span>}
                </div>
            </div>

            {/* Right Panel: Editor */}
            <div className="flex-1 relative bg-slate-100 h-full overflow-hidden">
                {isAnalyzing && <LoadingOverlay message={statusMessage} />}
                <EditorCanvas
                    key={activeImageUrl} // Remount on image change to reset canvas sizing
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
