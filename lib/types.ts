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
