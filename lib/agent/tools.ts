import { tool, zodSchema, type Schema } from "ai";
import { z } from "zod";

// TypeScript can't infer OBJECT from Zod v4 schemas passed to zodSchema()
// because the module paths differ (zod vs zod/v4). This cast forces the
// correct Schema<T> return type, which lets tool() resolve overload 1.
function zs<T extends z.ZodObject<z.ZodRawShape>>(s: T): Schema<z.infer<T>> {
    return zodSchema(s) as unknown as Schema<z.infer<T>>;
}
import { generateImageService } from "@/lib/services/generate-image";
import { generateVideoService } from "@/lib/services/generate-video";
import { klingMotionService } from "@/lib/services/kling-motion";
import { generateImageFusionService } from "@/lib/services/generate-image-fusion";
import { generateScriptService } from "@/lib/services/generate-script";
import { extendVideoService } from "@/lib/services/extend-video";
import { resolveCharacterImage } from "@/lib/characters/service";
import {
    checkCredits,
    deductCredits,
    CREDIT_COSTS,
    getImageCreditCost,
    getFusionCreditCost,
} from "@/lib/credits";
import { ToolExecutionContext } from "./types";

// ── Schemas ────────────────────────────────────────────────────────────────────

const sGenerateImage = z.object({
    prompt: z.string().describe("Detailed description of the image"),
    aspectRatio: z.enum(["16:9", "4:3", "1:1", "3:4", "9:16"]).optional().default("1:1"),
    model: z.enum(["flash", "pro"]).optional().default("pro"),
    quality: z.enum(["1K", "2K", "4K"]).optional().default("1K"),
    quantity: z.number().int().min(1).max(4).optional().default(1),
    characterId: z.string().optional().describe("ID of a saved character to use as reference"),
});

const sGenerateVideo = z.object({
    prompt: z.string().describe("Detailed cinematic description of the video"),
    duration: z.number().int().min(4).max(8).optional().default(6),
    aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional().default("16:9"),
    resolution: z.enum(["720p", "1080p"]).optional().default("720p"),
    characterId: z.string().optional().describe("ID of a saved character as the subject"),
});

const sAnimateCharacter = z.object({
    characterId: z.string().describe("ID of the saved character to animate"),
    referenceVideoUrl: z.string().describe("Public URL of the reference video to mimic"),
    orientation: z.enum(["image", "video"]).default("video"),
    prompt: z.string().optional(),
});

const sFuseCharacters = z.object({
    characterIds: z.array(z.string()).min(2).max(5),
    fusionPrompt: z.string().optional(),
    quality: z.enum(["standard", "pro"]).optional().default("standard"),
    aspectRatio: z.enum(["16:9", "9:16", "1:1", "3:4", "4:3"]).optional().default("1:1"),
});

const sCreateScript = z.object({
    idea: z.string().describe("The video concept or story idea"),
    targetDuration: z.number().int().min(15).max(120).default(30),
});

const sExtendVideo = z.object({
    googleVideoUri: z.string().describe("Google Files API URI of the video to extend"),
    prompt: z.string().optional(),
});

const sCreateStoryboard = z.object({
    concept: z.string().describe("The story or video concept to visualize"),
    numFrames: z.number().int().min(2).max(6).optional().default(4),
    style: z.string().optional().default("cinematic"),
    aspectRatio: z.enum(["16:9", "1:1", "9:16"]).optional().default("16:9"),
    characterId: z.string().optional(),
});

// Zod v4's type doesn't automatically satisfy zodSchema's generic inference —
// execute functions use `unknown` input + internal cast to keep TypeScript happy
// while preserving full type safety inside the function body.
type Args<S extends z.ZodObject<z.ZodRawShape>> = z.infer<S>;

async function requireCredits(userId: string, amount: number) {
    const { hasEnough, balance } = await checkCredits(userId, amount);
    if (!hasEnough) {
        throw new Error(`Insufficient credits. Need ${amount}, have ${balance}.`);
    }
}

export function createAgentTools(ctx: ToolExecutionContext) {
    return {
        generate_image: tool({
            description: "Generate one or more AI images. Use when the user asks to create, draw, or generate an image.",
            inputSchema: zs(sGenerateImage),
            execute: async (args) => {
                const { prompt, characterId } = args as Args<typeof sGenerateImage>;
                const a = args as Args<typeof sGenerateImage>;
                const m = a.model ?? "pro";
                const q = a.quality ?? "1K";
                const n = a.quantity ?? 1;
                const ar = a.aspectRatio ?? "1:1";
                const creditCost = getImageCreditCost(m, q) * n;

                await requireCredits(ctx.userId, creditCost);

                let referenceImageBase64: string | undefined;
                let referenceImageMimeType: string | undefined;
                if (characterId) {
                    const r = await resolveCharacterImage(characterId, ctx.userId);
                    referenceImageBase64 = r.base64;
                    referenceImageMimeType = r.mimeType;
                }

                const results = await Promise.all(
                    Array.from({ length: n }, () =>
                        generateImageService({ prompt, model: m, quality: q, aspectRatio: ar, referenceImageBase64, referenceImageMimeType })
                    )
                );

                await deductCredits(ctx.userId, creditCost, "image_generation", { prompt, model: m, quality: q, quantity: n });
                return { type: "images" as const, images: results.map((r) => ({ url: r.imageUrl, prompt, aspectRatio: ar })) };
            },
        }),

        generate_video: tool({
            description: "Generate an AI video with Veo 3.1. Use when the user asks to create or generate a video clip.",
            inputSchema: zs(sGenerateVideo),
            execute: async (args) => {
                const a = args as Args<typeof sGenerateVideo>;
                const duration = a.duration ?? 6;
                const ar = a.aspectRatio ?? "16:9";
                const res = a.resolution ?? "720p";

                await requireCredits(ctx.userId, CREDIT_COSTS.veo);

                let imageBase64: string | undefined;
                let imageMimeType: string | undefined;
                if (a.characterId) {
                    const r = await resolveCharacterImage(a.characterId, ctx.userId);
                    imageBase64 = r.base64;
                    imageMimeType = r.mimeType;
                }

                const result = await generateVideoService({ prompt: a.prompt, duration, aspectRatio: ar, resolution: res, imageBase64, imageMimeType });
                await deductCredits(ctx.userId, CREDIT_COSTS.veo, "veo_generation", { prompt: a.prompt, duration, aspectRatio: ar });
                return { type: "video" as const, videoUrl: result.videoUrl, googleVideoUri: result.googleVideoUri, prompt: a.prompt, duration, aspectRatio: ar };
            },
        }),

        animate_character: tool({
            description: "Animate a saved character using Kling AI motion control — character mimics movements from a reference video.",
            inputSchema: zs(sAnimateCharacter),
            execute: async (args) => {
                const a = args as Args<typeof sAnimateCharacter>;
                await requireCredits(ctx.userId, CREDIT_COSTS.kling);
                const r = await resolveCharacterImage(a.characterId, ctx.userId);
                const result = await klingMotionService({
                    imageBase64: `data:${r.mimeType};base64,${r.base64}`,
                    videoUrl: a.referenceVideoUrl,
                    orientation: a.orientation,
                    prompt: a.prompt,
                });
                await deductCredits(ctx.userId, CREDIT_COSTS.kling, "kling_motion", { characterId: a.characterId, prompt: a.prompt });
                return { type: "video" as const, videoUrl: result.videoUrl, duration: result.duration, prompt: a.prompt ?? "Animated character" };
            },
        }),

        fuse_characters: tool({
            description: "Fuse 2–5 saved character images into one cohesive image using Gemini.",
            inputSchema: zs(sFuseCharacters),
            execute: async (args) => {
                const a = args as Args<typeof sFuseCharacters>;
                const q = a.quality ?? "standard";
                const ar = a.aspectRatio ?? "1:1";

                await requireCredits(ctx.userId, getFusionCreditCost(q));

                const images = await Promise.all(
                    a.characterIds.map(async (id: string) => {
                        const r = await resolveCharacterImage(id, ctx.userId);
                        return { data: `data:${r.mimeType};base64,${r.base64}` };
                    })
                );

                const result = await generateImageFusionService({ images, prompt: a.fusionPrompt, aspectRatio: ar, quality: q });
                await deductCredits(ctx.userId, getFusionCreditCost(q), "image_fusion", { characterIds: a.characterIds, quality: q });
                return { type: "image" as const, imageUrl: result.imageUrl, prompt: a.fusionPrompt ?? `Fusion of ${a.characterIds.length} characters`, aspectRatio: ar };
            },
        }),

        create_script: tool({
            description: "Generate a structured multi-clip video script from an idea. Free — no credit cost.",
            inputSchema: zs(sCreateScript),
            execute: async (args) => {
                const a = args as Args<typeof sCreateScript>;
                const result = await generateScriptService({ idea: a.idea, videoLength: a.targetDuration });
                return { type: "script" as const, clips: result.clips, totalDuration: result.clips.reduce((s, c) => s + c.duration, 0) };
            },
        }),

        extend_video: tool({
            description: "Extend an existing Veo video by ~7 seconds. Requires the googleVideoUri (expires 48h after generation).",
            inputSchema: zs(sExtendVideo),
            execute: async (args) => {
                const a = args as Args<typeof sExtendVideo>;
                await requireCredits(ctx.userId, CREDIT_COSTS.veo);
                const result = await extendVideoService({ googleVideoUri: a.googleVideoUri, prompt: a.prompt });
                await deductCredits(ctx.userId, CREDIT_COSTS.veo, "veo_generation", { type: "extension", prompt: a.prompt });
                return { type: "video" as const, videoUrl: result.videoUrl, googleVideoUri: result.googleVideoUri, prompt: a.prompt ?? "Video extension" };
            },
        }),

        create_storyboard: tool({
            description: "Generate a visual storyboard as a series of images for planning a video or story.",
            inputSchema: zs(sCreateStoryboard),
            execute: async (args) => {
                const a = args as Args<typeof sCreateStoryboard>;
                const n = a.numFrames ?? 4;
                const ar = a.aspectRatio ?? "16:9";
                const s = a.style ?? "cinematic";
                const creditCost = n * getImageCreditCost("flash", "1K");

                await requireCredits(ctx.userId, creditCost);

                let referenceImageBase64: string | undefined;
                let referenceImageMimeType: string | undefined;
                if (a.characterId) {
                    const r = await resolveCharacterImage(a.characterId, ctx.userId);
                    referenceImageBase64 = r.base64;
                    referenceImageMimeType = r.mimeType;
                }

                const scriptResult = await generateScriptService({ idea: a.concept, videoLength: n * 5 });
                const framePrompts = scriptResult.clips.slice(0, n).map((c) => `${c.prompt}. Style: ${s}.`);

                const frames = await Promise.all(
                    framePrompts.map((fp, i) =>
                        generateImageService({ prompt: fp, model: "flash", quality: "1K", aspectRatio: ar, referenceImageBase64, referenceImageMimeType })
                            .then((r) => ({ url: r.imageUrl, prompt: fp, frameNumber: i + 1 }))
                    )
                );

                await deductCredits(ctx.userId, creditCost, "image_generation", { concept: a.concept, numFrames: n, style: s });
                return { type: "storyboard" as const, frames, concept: a.concept };
            },
        }),
    };
}
