export interface Preset {
    id: string;
    title: string;
    prompt: string;
    category?: string;
    icon?: string;
}

export interface GeneratedVideo {
    id: string;
    url: string;
    prompt: string;
    duration: number;
    timestamp: number;
    source?: string;  // 'veo' | 'kling'
    aspectRatio?: string;
}

export interface ScriptClip {
    id: string;
    prompt: string;
    duration: number;
}

// Image generation types
export type ImageModel = 'flash' | 'pro';
export type ImageQuality = '1K' | '2K' | '4K';

export interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    model: ImageModel;
    quality: ImageQuality;
    aspectRatio: string;
    timestamp: number;
}

export interface ImageGenerationConfig {
    model: ImageModel;
    quality: ImageQuality;
    aspectRatio: string;
}

// Fusion types
export type FusionQuality = 'standard' | 'pro';

export interface FusionImage {
    id: string;
    data: string;  // base64 data URL
    label: string; // "model", "accessory", "background", etc.
}

export interface GeneratedFusionImage extends Omit<GeneratedImage, 'model' | 'quality'> {
    sourceImages: number;
    fusionQuality: FusionQuality;
}

// ── Character System ──────────────────────────────────────────────────────────

export interface Character {
    id: string;
    userId: string;
    name: string;
    description?: string;
    imageUrl: string;
    thumbnailUrl?: string;
    tags?: string[];
    createdAt: number;
}

// ── Agent / Chat ──────────────────────────────────────────────────────────────

export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

export type ToolStatus = 'pending' | 'success' | 'error';

export interface ToolCallRecord {
    id: string;
    toolName: string;
    input: Record<string, unknown>;
    status: ToolStatus;
    result?: unknown;
}

export interface GeneratedAssetRef {
    type: 'image' | 'video';
    url: string;
    prompt: string;
    characterIds?: string[];
    duration?: number;
    aspectRatio?: string;
    googleVideoUri?: string;
}

export interface AgentChatMessage {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    toolCalls: ToolCallRecord[];
    assets: GeneratedAssetRef[];
    createdAt: number;
}

// ── Studio ────────────────────────────────────────────────────────────────────

export type GenerationMode = 'image' | 'video' | 'frames';
export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
export type Quantity = 1 | 2 | 3 | 4;

export interface GenerationSettings {
    mode: GenerationMode;
    aspectRatio: AspectRatio;
    quantity: Quantity;
    model: string;
    startFrameBase64?: string;
    selectedCharacterIds: string[];
    attachedImages: string[];
}

export interface StudioAsset {
    id: string;
    type: 'image' | 'video';
    url: string;
    prompt: string;
    timestamp: number;
    characterIds?: string[];
    googleVideoUri?: string;
    aspectRatio?: string;
    duration?: number;
}
