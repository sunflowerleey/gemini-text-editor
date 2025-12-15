import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DetectedTextBlock } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Project {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    originalImage: string; // base64
    processedImage: string | null; // base64
    blocks: DetectedTextBlock[];
}

interface GeminiDB extends DBSchema {
    projects: {
        key: string;
        value: Project;
        indexes: { 'by-date': number };
    };
}

const DB_NAME = 'gemini-text-editor-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GeminiDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<GeminiDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                const store = db.createObjectStore('projects', { keyPath: 'id' });
                store.createIndex('by-date', 'updatedAt');
            },
        });
    }
    return dbPromise;
};

export const createProject = async (name: string, originalImage: string, blocks: DetectedTextBlock[] = []): Promise<string> => {
    const db = await initDB();
    const id = uuidv4();
    const project: Project = {
        id,
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        originalImage,
        processedImage: null,
        blocks,
    };
    await db.put('projects', project);
    return id;
};

export const getProject = async (id: string): Promise<Project | undefined> => {
    const db = await initDB();
    return db.get('projects', id);
};

export const getAllProjects = async (): Promise<Project[]> => {
    const db = await initDB();
    return db.getAllFromIndex('projects', 'by-date');
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<void> => {
    const db = await initDB();
    const project = await db.get('projects', id);
    if (!project) throw new Error(`Project ${id} not found`);

    const updatedProject = {
        ...project,
        ...updates,
        updatedAt: Date.now(),
    };
    await db.put('projects', updatedProject);
};

export const deleteProject = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete('projects', id);
};

export type { Project };
