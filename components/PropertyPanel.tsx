import React from 'react';
import { Type, Bold, Palette, Minus, Maximize2 } from 'lucide-react';

interface PropertyPanelProps {
    selectedObject: any; // Type as 'any' or specific fabric type if available
    onUpdate: (property: string, value: any) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedObject, onUpdate }) => {
    if (!selectedObject || selectedObject.type !== 'textbox') return null;

    return (
        <div className="absolute top-20 right-4 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 z-50">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                    <Type size={16} className="text-indigo-600" />
                    Text Properties
                </h3>
            </div>

            <div className="p-4 space-y-4">
                {/* Font Family */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Font Family</label>
                    <select
                        value={selectedObject.fontFamily}
                        onChange={(e) => onUpdate('fontFamily', e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    >
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Brush Script MT">Brush Script MT</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Helvetica">Helvetica</option>
                    </select>
                </div>

                {/* Font Size & Weight */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Maximize2 size={12} /> Size
                        </label>
                        <input
                            type="number"
                            value={Math.round(selectedObject.fontSize || 0)}
                            onChange={(e) => onUpdate('fontSize', parseInt(e.target.value))}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Bold size={12} /> Weight
                        </label>
                        <select
                            value={selectedObject.fontWeight}
                            onChange={(e) => onUpdate('fontWeight', e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                        </select>
                    </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Palette size={12} /> Color
                        </label>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1.5 bg-white">
                            <input
                                type="color"
                                value={selectedObject.fill as string || '#000000'}
                                onChange={(e) => onUpdate('fill', e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer border-none p-0"
                            />
                            <span className="text-xs text-gray-600 font-mono flex-1">
                                {selectedObject.fill}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Minus size={12} /> Stroke
                        </label>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1.5 bg-white">
                            <input
                                type="color"
                                value={selectedObject.stroke as string || '#000000'}
                                onChange={(e) => onUpdate('stroke', e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer border-none p-0"
                            />
                        </div>
                    </div>
                </div>

                {/* Stroke Width */}
                <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <label className="text-xs font-medium text-gray-500">Stroke Width</label>
                        <span className="text-xs text-gray-400">{selectedObject.strokeWidth || 0}px</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={selectedObject.strokeWidth || 0}
                        onChange={(e) => onUpdate('strokeWidth', parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                </div>
            </div>
        </div>
    );
};
