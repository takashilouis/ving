# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ving** is a privacy-focused AI video generation platform using a "Bring Your Own Key" (BYOK) architecture. Users provide their own API keys (Google Gemini/Veo or Kling AI) which are stored in browser localStorage and sent directly to the AI providers—never to a backend server. Built with Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4.

## Commands

```bash
# Development
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Architecture Overview

### BYOK Design Philosophy

The entire architecture centers on privacy through client-side API key storage:
- API keys stored in browser `localStorage` only
- Keys never sent to backend (except directly to AI provider APIs)
- Video history is ephemeral (component state, not persisted to database)
- No authentication system—each browser session is independent

### Component Hierarchy & Data Flow

```
app/page.tsx (Main orchestrator)
├── LeftSidebar (Navigation: Gallery, Video, Audio, Tools, Settings)
├── MiddlePanel (Content input & controls)
│   ├── PresetsTab (40+ categorized prompts)
│   ├── PromptInput (Textarea for video description)
│   ├── DurationToggle (4s, 6s, 8s selector)
│   ├── MotionControlTab (Kling motion control workflow)
│   └── ScriptGenerator (AI-powered script-to-video)
└── VideoPreview (Display & history)
    ├── Video player with controls
    ├── Download functionality
    └── VideoGallery (Recent 20 videos, horizontally scrollable)
```

**State Management**: All state lives in `app/page.tsx` as React hooks. Props are passed down to child components with callback functions for updates. No global state management library is used.

**Key State Variables**:
- `apiKey`, `klingAccessKey`, `klingSecretKey` - API credentials from localStorage
- `currentVideo` - Currently displayed video object
- `videoHistory` - Array of recent GeneratedVideo objects (max 20)
- `isGenerating`, `progress` - Loading state for UI feedback
- `selectedModel` - "veo" or "kling" model selection
- `scriptClips` - Array of clips from script generator

### API Routes Architecture

All routes in `app/api/` are Next.js Route Handlers with `maxDuration = 300` (5 minutes) for long-polling operations.

#### 1. `/api/generate` - Google Veo 3.1 Video Generation

**Flow**:
1. Initialize `GoogleGenAI` client with user's API key (passed in request body)
2. Call `generateMedia()` with model `veo-3.1-fast-generate-preview`
3. Poll operation status every 10 seconds (max 10 minutes)
4. When complete, fetch video from Google CDN with API key auth header
5. Convert video buffer to base64 data URL (`data:video/mp4;base64,...`)
6. Return base64 string to client for immediate display

**Important**: Videos are returned as base64 data URLs to avoid CORS issues and enable instant preview without external hosting.

#### 2. `/api/kling-motion` - Kling Motion Control

**Authentication**: Uses JWT token generation with `jose` library:
```typescript
const jwt = await new jose.SignJWT({})
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setIssuer(accessKey)
  .setExpirationTime(now + 1800) // 30 minutes
  .sign(secretKeyBytes)
```

**Flow**:
1. Generate JWT with Access Key + Secret Key
2. POST to `https://api.klingai.com/v1/videos/motion-control` with:
   - `image_url`: Base64 image data (without `data:image/...;base64,` prefix)
   - `video_url`: Public URL to reference video
   - `character_orientation`: "video" or "image"
   - `prompt`: Optional motion description
3. Poll task status every 5 seconds via `GET /v1/videos/{taskId}`
4. When `task_status === "succeed"`, return video URL from Kling R2 storage

**Key Detail**: JWT must be regenerated for each polling request due to short expiration.

#### 3. `/api/generate-script` - AI Script Generation

Uses Gemini 2.5 Flash to generate structured video scripts. The prompt instructs the model to return a JSON array of clips:
```json
[
  {
    "prompt": "Detailed cinematic description",
    "duration": 5
  }
]
```

**Parsing Logic**: Handles multiple response formats:
- Raw JSON array
- Markdown code blocks with triple backticks
- JSON or json language identifiers

Validation ensures each clip has both `prompt` and `duration` fields before returning to client.

#### 4. `/api/upload-video` - Cloudflare R2 Upload

Handles video uploads for motion control workflows where users provide local video files instead of URLs.

**Setup**:
```typescript
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
```

**Validation**:
- File types: MP4, MOV, AVI only
- Max size: 100MB (Kling API limit)

**Output**: Returns public R2 URL at `R2_PUBLIC_URL/{filename}`

### Preset System

Located in `lib/categoryPresets.ts`, contains 40+ pre-written prompts organized into 5 categories:
1. **Advertisement** (14 presets) - Product showcases, commercials
2. **Photoshoot** (3 presets) - Studio, outdoor, editorial
3. **Cinematic** (4 presets) - Epic, noir, action, romance
4. **Fashion** (3 presets) - Runway, street, luxury
5. **Movie** (4 presets) - Sci-fi, horror, fantasy, thriller

Each preset follows this structure:
```typescript
interface Preset {
  id: string;       // e.g., "adv-product-1"
  title: string;    // Display name
  prompt: string;   // Full cinematic prompt
  category: string; // Category name
}
```

**Usage**: Clicking a preset card populates the prompt field in MiddlePanel. Presets are loaded by both `PresetsTab` and `ScriptGenerator`.

### Multi-Tab Workflow in MiddlePanel

The MiddlePanel component manages 4 sub-tabs:

1. **text-to-video**: Direct prompt input with presets, duration, aspect ratio
2. **image-to-video**: Placeholder (not implemented)
3. **motion-control**: Kling motion control workflow (MotionControlTab component)
4. **script**: Script-to-video workflow (ScriptGenerator component)

Tab switching is handled by local state: `const [activeTab, setActiveTab] = useState("text-to-video")`

### Script-to-Video Workflow

1. User enters video idea in ScriptGenerator
2. Selects target duration (30-90 seconds)
3. Clicks "Generate Script" → calls `/api/generate-script`
4. Receives array of clips with auto-calculated durations
5. Can edit individual clip prompts or remove clips
6. Click "Generate" on any clip → calls `onGenerateClip()` → `/api/generate` with Veo
7. Generated video appears in VideoPreview with history

**Duration Calculation**: Total duration is divided by number of clips (4-8 clips depending on length), clamped to 4-8 second range per Veo's limits.

### Motion Control Workflow

Kling's motion control creates videos where a character from an image mimics motions from a reference video.

**Inputs**:
1. **Character Image**: PNG/JPG uploaded by user (converted to base64)
2. **Reference Video**: Either URL or local file (uploaded to R2)
3. **Character Orientation**:
   - "video": Character follows video motion (max 30s)
   - "image": Character posed from image (max 10s)
4. **Optional Prompt**: Additional motion instructions

**Implementation Notes**:
- Video upload to R2 happens client-side via `/api/upload-video`
- Base64 image prefix must be stripped before sending to Kling API
- Generation takes 2-5 minutes, display elapsed time to user
- JWT tokens expire in 30 minutes, regenerate for each poll

### Video Display & Download

**VideoPreview Component**:
- Displays current video in `<video>` element
- Mute/unmute, loop controls
- Download button handles two URL types:
  - Base64 data URLs (Veo): Convert to Blob → download
  - External URLs (Kling): Fetch with CORS → convert to Blob → download
- Filename format: `ving-video-{timestamp}.mp4`

**Video History**:
- Stored in component state (not persisted)
- Max 20 videos, older ones dropped
- Horizontal scroll gallery with thumbnails
- Click thumbnail to display in main player

### Environment Variables

Required in `.env` (server-side only):
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=vling
R2_PUBLIC_URL=https://pub-d574151b368d4ccf991bc865e42ef400.r2.dev
```

These are only accessed in `/api/upload-video` route handler.

### localStorage Keys

Client-side storage (managed by ApiKeySettings component):
- `gemini-api-key` - Google Gemini/Veo API key
- `kling-access-key` - Kling Access Key
- `kling-secret-key` - Kling Secret Key

Keys are loaded on mount via `useEffect` in `app/page.tsx` and saved when updated in settings.

### Error Handling Patterns

All API routes follow this pattern:
```typescript
try {
  // Operation
  return NextResponse.json({ data });
} catch (error) {
  console.error("Context:", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Generic error" },
    { status: 500 }
  );
}
```

Client-side error handling:
```typescript
const response = await fetch("/api/...");
const data = await response.json();

if (!response.ok) {
  throw new Error(data.error || "Failed");
}
```

Errors are displayed in VideoPreview's error state UI.

### Polling Implementation

Both Veo and Kling APIs require polling for asynchronous operations:

**Veo Pattern** (10 second intervals):
```typescript
while (attempts < maxAttempts) {
  await new Promise(resolve => setTimeout(resolve, 10000));
  const operation = await client.operations.get(...);
  if (operation.done) break;
  attempts++;
}
```

**Kling Pattern** (5 second intervals):
```typescript
while (attempts < maxAttempts) {
  await new Promise(resolve => setTimeout(resolve, 5000));
  const status = await fetch(`/v1/videos/${taskId}`);
  if (status.task_status === "succeed") break;
  attempts++;
}
```

Both have max timeouts (10 minutes) and return 408 Request Timeout if exceeded.

### Styling Conventions

**Theme**: Dark mode with green accents
- Background: `bg-[#0A0A0A]`
- Cards/panels: `bg-[#1A1A1A]` or `bg-[#0E0E0E]`
- Borders: `border-[#1A1A1A]` or `border-[#2A2A2A]`
- Text: `text-white`, `text-gray-400`, `text-gray-500`
- Accent: `text-green-500`, `bg-green-500`, `border-green-500`

**Framer Motion**: Used for:
- Loading spinners (rotating circles)
- Button hover effects (`whileHover={{ scale: 1.05 }}`)
- Preset card animations
- Tab transitions

### TypeScript Interfaces

Key types defined in `lib/types.ts`:

```typescript
interface GeneratedVideo {
  id: string;        // Unique ID: `video-${Date.now()}`
  url: string;       // Base64 data URL or external URL
  prompt: string;    // Original prompt used
  duration: number;  // Video length in seconds
  timestamp: number; // Date.now() when generated
}

interface ScriptClip {
  id: string;        // Unique ID
  prompt: string;    // Cinematic description
  duration: number;  // Clip length in seconds
}

interface Preset {
  id: string;
  title: string;
  prompt: string;
  category: string;
}
```

### Future Feature Placeholders

Several UI elements exist for planned features:
1. **Image-to-video tab** - UI exists, no implementation
2. **Audio tab** in LeftSidebar - No content yet
3. **Tools tab** in LeftSidebar - No content yet
4. **Post-generation actions** in VideoPreview:
   - "Go to OT" button (external tool)
   - "Lip Sync" (future)
   - "AI Sound" (future)

These can be extended as new features are developed.

### Common Debugging Tips

1. **Veo API errors**: Check API key validity, quota limits at https://aistudio.google.com/
2. **Kling API errors**:
   - Verify JWT generation (check exp, nbf timestamps)
   - Ensure base64 image has no `data:` prefix
   - Confirm video URL is publicly accessible
3. **R2 upload failures**: Verify .env credentials, check bucket permissions
4. **CORS issues**: Veo videos use base64 to avoid CORS; external URLs may need fetch proxying
5. **localStorage not persisting**: Check browser settings, private/incognito mode blocks localStorage

### Performance Considerations

- Video generation: 2-5 minutes typical
- Base64 encoding increases video size ~33% (acceptable for client-side display)
- Max 20 videos in history to prevent memory bloat
- Framer Motion animations are GPU-accelerated
- No server-side caching (stateless BYOK design)
