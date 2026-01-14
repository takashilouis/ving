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
