import type { AspectRatio } from "@/lib/types";

export const SUPPORTED_ASPECT_RATIOS: AspectRatio[] = ["16:9", "4:3", "1:1", "3:4", "9:16"];

const NORMALIZED_TO_RATIO: Record<string, AspectRatio> = {
    "16:9": "16:9",
    "16/9": "16:9",
    "16x9": "16:9",
    "16by9": "16:9",
    "4:3": "4:3",
    "4/3": "4:3",
    "4x3": "4:3",
    "4by3": "4:3",
    "1:1": "1:1",
    "1/1": "1:1",
    "1x1": "1:1",
    "1by1": "1:1",
    "3:4": "3:4",
    "3/4": "3:4",
    "3x4": "3:4",
    "3by4": "3:4",
    "9:16": "9:16",
    "9/16": "9:16",
    "9x16": "9:16",
    "9by16": "9:16",
};

const EXPLICIT_RATIO_RE =
    /\b(?:aspect\s*ratio|ratio|size|sized|format|canvas|dimension|dimensions|resolution)\s*(?:of|is|to|=|:)?\s*(16\s*[:/x]\s*9|16\s+by\s+9|4\s*[:/x]\s*3|4\s+by\s+3|1\s*[:/x]\s*1|1\s+by\s+1|3\s*[:/x]\s*4|3\s+by\s+4|9\s*[:/x]\s*16|9\s+by\s+16)\b/i;

const STANDALONE_RATIO_RE =
    /\b(16\s*[:/x]\s*9|16\s+by\s+9|4\s*[:/x]\s*3|4\s+by\s+3|1\s*[:/x]\s*1|1\s+by\s+1|3\s*[:/x]\s*4|3\s+by\s+4|9\s*[:/x]\s*16|9\s+by\s+16)\b/i;

function normalizeRatio(value: string): AspectRatio | null {
    const normalized = value
        .toLowerCase()
        .replace(/\s+/g, "");
    return NORMALIZED_TO_RATIO[normalized] ?? null;
}

export function extractRequestedAspectRatio(prompt: string): AspectRatio | null {
    const explicitMatch = prompt.match(EXPLICIT_RATIO_RE);
    if (explicitMatch?.[1]) return normalizeRatio(explicitMatch[1]);

    const standaloneMatch = prompt.match(STANDALONE_RATIO_RE);
    if (standaloneMatch?.[1]) return normalizeRatio(standaloneMatch[1]);

    return null;
}
