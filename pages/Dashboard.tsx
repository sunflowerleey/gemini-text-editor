import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Image as ImageIcon, Trash2, Calendar, ChevronRight } from 'lucide-react';
import { getAllProjects, createProject, deleteProject, Project } from '../services/storageService';

export default function Dashboard() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadProjects = async () => {
        try {
            const list = await getAllProjects();
            // Sort by updated descending
            setProjects(list.sort((a, b) => b.updatedAt - a.updatedAt));
        } catch (e) {
            console.error("Failed to load projects", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    const handleCreateProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Basic size check
        if (file.size > 5 * 1024 * 1024) {
            alert("Image size too large (max 5MB)");
            return;
        }

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                const name = file.name.split('.')[0] || "Untitled Project";

                const newId = await createProject(name, base64);
                navigate(`/project/${newId}`);
            };
        } catch (e) {
            console.error("Failed to create project", e);
            alert("Failed to create project");
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this project?")) {
            await deleteProject(id);
            loadProjects();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-5xl">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Projects</h1>
                        <p className="text-gray-500 mt-1">Manage your image text editing projects</p>
                    </div>

                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleCreateProject}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]">
                            <Plus size={20} />
                            New Project
                        </button>
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                ) : projects.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100 flex flex-col items-center">
                        <div className="bg-indigo-50 p-4 rounded-full mb-4">
                            <ImageIcon size={48} className="text-indigo-300" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">No projects yet</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-8">Get started by uploading an image. We'll help you detect text and edit it seamlessly.</p>
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleCreateProject}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <button className="text-indigo-600 font-semibold hover:underline">Create your first project</button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => (
                            <div
                                key={project.id}
                                onClick={() => navigate(`/project/${project.id}`)}
                                className="group bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col"
                            >
                                <div className="h-48 bg-gray-100 relative overflow-hidden">
                                    <img
                                        src={project.processedImage || project.originalImage}
                                        alt={project.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    {project.processedImage && (
                                        <span className="absolute top-2 right-2 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur">
                                            CLEANED
                                        </span>
                                    )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-gray-800 line-clamp-1">{project.name}</h3>
                                        <button
                                            onClick={(e) => handleDelete(e, project.id)}
                                            className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto pt-4 border-t border-gray-50">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(project.updatedAt).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1 ml-auto text-indigo-500 font-medium group-hover:translate-x-1 transition-transform">
                                            Open <ChevronRight size={12} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
