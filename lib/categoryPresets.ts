import { Preset } from "./presets";

// Advertisement, Photoshoot, Cinematic, Fashion, Movie presets
export const categoryPresets: { category: string; presets: Preset[] }[] = [
    {
        category: "Advertisement",
        presets: [
            {
                id: "ad-product-showcase",
                title: "Product Showcase",
                prompt: "Sleek product showcase rotation on a pure white cyclorama. Soft studio lighting, subtle shadows, professional commercial cinematography. Apple-style product video aesthetic.",
                category: "Advertisement",
            },
            {
                id: "ad-lifestyle",
                title: "Lifestyle Brand",
                prompt: "Happy diverse people enjoying a product in a modern lifestyle setting. Natural sunlight, warm tones, authentic moments. Social media advertisement style.",
                category: "Advertisement",
            },
            {
                id: "ad-tech-reveal",
                title: "Tech Product Reveal",
                prompt: "Futuristic technology product reveal with dynamic lighting, holographic effects, and sleek metallic surfaces. Dramatic slow-motion shots with neon accents.",
                category: "Advertisement",
            },
            {
                id: "ad-food-commercial",
                title: "Food Commercial",
                prompt: "Appetizing food commercial with steam rising, ingredients falling in slow motion. Professional food photography lighting, macro shots, vibrant colors.",
                category: "Advertisement",
            },
        ],
    },
    {
        category: "Photoshoot",
        presets: [
            {
                id: "photo-studio",
                title: "Studio Portrait",
                prompt: "Professional studio portrait photoshoot with dramatic lighting, beauty dish key light, and subtle rim lighting. Fashion magazine quality, elegant poses.",
                category: "Photoshoot",
            },
            {
                id: "photo-outdoor",
                title: "Golden Hour Outdoor",
                prompt: "Beautiful outdoor photoshoot during golden hour. Soft warm backlight, natural bokeh background, romantic and dreamy atmosphere.",
                category: "Photoshoot",
            },
            {
                id: "photo-editorial",
                title: "Editorial Fashion",
                prompt: "High-fashion editorial photoshoot with dramatic poses, avant-garde styling. Bold contrasts, artistic composition, Vogue magazine aesthetic.",
                category: "Photoshoot",
            },
        ],
    },
    {
        category: "Cinematic",
        presets: [
            {
                id: "cine-epic",
                title: "Epic Landscape",
                prompt: "Breathtaking cinematic aerial shot of majestic mountains at sunrise. Sweeping drone movement, volumetric god rays, Hollywood blockbuster cinematography.",
                category: "Cinematic",
            },
            {
                id: "cine-noir",
                title: "Film Noir",
                prompt: "Classic film noir aesthetic with dramatic shadows, venetian blind lighting, mysterious atmosphere. Black and white, rain-slicked streets.",
                category: "Cinematic",
            },
            {
                id: "cine-action",
                title: "Action Sequence",
                prompt: "Dynamic action sequence with speed ramping, dramatic explosions, and intense camera movements. Michael Bay style cinematography.",
                category: "Cinematic",
            },
            {
                id: "cine-romance",
                title: "Romantic Scene",
                prompt: "Romantic scene with soft focus, warm color grading, intimate close-ups. Gentle camera movements, dreamy bokeh, love story aesthetic.",
                category: "Cinematic",
            },
        ],
    },
    {
        category: "Fashion",
        presets: [
            {
                id: "fashion-runway",
                title: "Runway Walk",
                prompt: "High-fashion runway model walking confidently. Dramatic spotlighting, slow-motion fabric movement, Paris Fashion Week atmosphere.",
                category: "Fashion",
            },
            {
                id: "fashion-street",
                title: "Street Style",
                prompt: "Urban street style fashion video with dynamic camera movements. Gritty city backgrounds, authentic street photography aesthetic.",
                category: "Fashion",
            },
            {
                id: "fashion-luxury",
                title: "Luxury Brand",
                prompt: "Luxury fashion brand advertisement with elegant model, premium textures, and sophisticated styling. Chanel/Dior aesthetic, marble and gold accents.",
                category: "Fashion",
            },
        ],
    },
    {
        category: "Movie",
        presets: [
            {
                id: "movie-scifi",
                title: "Sci-Fi Scene",
                prompt: "Futuristic sci-fi scene with neon-lit cyberpunk city, flying vehicles, and holographic displays. Blade Runner atmosphere, rain and fog.",
                category: "Movie",
            },
            {
                id: "movie-horror",
                title: "Horror Atmosphere",
                prompt: "Creepy horror movie atmosphere with flickering lights, dense fog, and ominous shadows. Slow dolly shot revealing something lurking in darkness.",
                category: "Movie",
            },
            {
                id: "movie-fantasy",
                title: "Fantasy World",
                prompt: "Magical fantasy world with floating islands, mystical creatures, and ethereal lighting. Lord of the Rings inspired epic landscape.",
                category: "Movie",
            },
            {
                id: "movie-thriller",
                title: "Thriller Chase",
                prompt: "Intense thriller chase sequence through narrow alleyways. Handheld camera, quick cuts, heart-pounding tension. Bourne Identity style.",
                category: "Movie",
            },
        ],
    },
];
