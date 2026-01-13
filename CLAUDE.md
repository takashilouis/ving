# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ving** is an AI video generation platform with an admin-managed API key system and credit-based usage model. Built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and Supabase for authentication and data persistence. Users consume credits for video generation, with API keys managed centrally by administrators.

## Commands

```bash
# Development
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Architecture Overview

### Credit System Design Philosophy

The platform operates on a credit-based consumption model:
- **Admin-Managed API Keys**: API keys for Gemini/Veo and Kling AI are stored encrypted in the database, accessible only to administrators
- **User Authentication**: Supabase Auth handles user sign-up/sign-in with email/password and Google OAuth
- **Credit System**: Users receive credits upon signup (10 free credits) and consume them per video generation:
  - Veo 3.1 video: 1 credit
  - Kling Motion Control: 2 credits
- **Row Level Security (RLS)**: PostgreSQL RLS policies ensure users can only access their own data
- **No BYOK**: Users don't need their own API keys—the admin provides them centrally

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

**State Management**: All state lives in `app/page.tsx` as React hooks. Props are passed down to child components with callback functions for updates. No global state management library is used. Authentication state is managed via Supabase's `AuthContext`.

**Key State Variables**:
- `currentVideo` - Currently displayed video object
- `videoHistory` - Array of recent GeneratedVideo objects (max 20, ephemeral in component state)
- `isGenerating`, `progress` - Loading state for UI feedback
- `selectedModel` - "veo" or "kling" model selection
- `scriptClips` - Array of clips from script generator
- User authentication state handled by `useAuth()` hook from AuthContext

### API Routes Architecture

All routes in `app/api/` are Next.js Route Handlers with `maxDuration = 300` (5 minutes) for long-polling operations.

#### 1. `/api/generate` - Google Veo 3.1 Video Generation

**Authentication Required**: Users must be signed in via Supabase Auth.

**Flow**:
1. Authenticate user via `supabase.auth.getUser()`
2. Check user credit balance (requires 1 credit for Veo generation)
3. If insufficient credits, return 402 Payment Required error
4. Fetch admin Gemini API key from `admin_api_keys` table (encrypted)
5. Decrypt API key using `decryptApiKey()` helper
6. Initialize `GoogleGenAI` client with admin API key
7. Call `generateMedia()` with model `veo-3.1-fast-generate-preview`
8. Poll operation status every 10 seconds (max 10 minutes)
9. When complete, fetch video from Google CDN with API key auth header
10. Convert video buffer to base64 data URL (`data:video/mp4;base64,...`)
11. **Deduct 1 credit** from user balance via `deductCredits()` function
12. Return base64 string + remaining credit balance to client

**Important**:
- Videos are returned as base64 data URLs to avoid CORS issues
- Credits are only deducted **after successful** video generation
- If generation fails, credits are not deducted

#### 2. `/api/kling-motion` - Kling Motion Control

**Authentication Required**: Users must be signed in via Supabase Auth.

**Kling API Authentication**: Uses JWT token generation with `jose` library:
```typescript
const jwt = await new jose.SignJWT({})
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setIssuer(accessKey)
  .setExpirationTime(now + 1800) // 30 minutes
  .sign(secretKeyBytes)
```

**Flow**:
1. Authenticate user via `supabase.auth.getUser()`
2. Check user credit balance (requires 2 credits for Kling generation)
3. If insufficient credits, return 402 Payment Required error
4. Fetch admin Kling Access Key and Secret Key from `admin_api_keys` table
5. Decrypt both keys using `decryptApiKey()` helper
6. Generate JWT with Access Key + Secret Key
7. POST to `https://api.klingai.com/v1/videos/motion-control` with:
   - `image_url`: Base64 image data (without `data:image/...;base64,` prefix)
   - `video_url`: Public URL to reference video
   - `character_orientation`: "video" or "image"
   - `prompt`: Optional motion description
8. Poll task status every 5 seconds via `GET /v1/videos/{taskId}` (regenerate JWT for each request)
9. When `task_status === "succeed"`, **deduct 2 credits** via `deductCredits()`
10. Return video URL from Kling R2 storage + remaining credit balance

**Key Details**:
- JWT must be regenerated for each polling request due to 30-minute expiration
- Credits deducted only after successful generation

#### 3. `/api/generate-script` - AI Script Generation

**Authentication Required**: Users must be signed in via Supabase Auth.

Uses Gemini 2.5 Flash to generate structured video scripts. Fetches admin Gemini API key from database (no credit deduction for script generation). The prompt instructs the model to return a JSON array of clips:
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

Required in `.env`:
```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key-here    # Publishable key (client-safe)
SUPABASE_SERVICE_ROLE_KEY=your-secret-key-here             # Secret key (server-only!)

# Encryption for API keys
ENCRYPTION_SECRET_KEY=your-256-bit-hex-key-here

# Cloudflare R2 Storage (for video uploads)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=vling
R2_PUBLIC_URL=https://pub-d574151b368d4ccf991bc865e42ef400.r2.dev
```

**Key Notes**:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Publishable key): Safe for client-side use, respects RLS policies
- `SUPABASE_SERVICE_ROLE_KEY` (Secret key): Bypasses ALL RLS policies, server-side only, never exposed to client, used for credit deduction
- `ENCRYPTION_SECRET_KEY`: Must be a 64-character hex string (256 bits). Generate via: `openssl rand -hex 32`
- R2 credentials only accessed in `/api/upload-video` route handler

### Database Architecture

**Core Tables**:

1. **`admin_api_keys`** - Stores encrypted AI provider API keys (admin-only access)
   - `key_type`: 'gemini', 'kling_access', or 'kling_secret'
   - `encrypted_key`: AES-256 encrypted key
   - `is_active`: Boolean flag to enable/disable keys
   - RLS Policy: Only users with `is_admin = true` can access

2. **`user_profiles`** - User metadata and admin flag
   - `user_id`: References `auth.users(id)`
   - `is_admin`: Boolean flag (only ONE admin user)
   - `display_name`, `avatar_url`: User profile info
   - Auto-created on signup via trigger

3. **`user_credits`** - Credit balance tracking
   - `user_id`: References `auth.users(id)`
   - `balance`: Current available credits (cannot go negative)
   - `total_earned`, `total_spent`: Lifetime statistics
   - Auto-created on signup with 10 free credits
   - RLS Policy: Users can view own balance only; service role can modify

4. **`credit_transactions`** - Audit log for all credit operations
   - `user_id`: References `auth.users(id)`
   - `amount`: Positive for additions, negative for deductions
   - `transaction_type`: 'veo_generation', 'kling_generation', 'purchase', 'admin_grant', 'refund'
   - `balance_after`: Snapshot of balance after transaction
   - `metadata`: JSONB field storing generation details
   - RLS Policy: Users can view own transactions only

**Helper Functions** (PostgreSQL, called via service role):
- `deduct_credits(user_id, amount, type, metadata)`: Atomically deducts credits with row locking
- `add_credits(user_id, amount, type, metadata)`: Adds credits (for purchases, grants, refunds)

Both functions automatically create entries in `credit_transactions` table for audit purposes.

### Credit System Implementation

**Credit Costs** (defined in `lib/credits.ts`):
```typescript
export const CREDIT_COSTS = {
  veo: 1,        // 1 credit per Veo video
  kling: 2,      // 2 credits per Kling motion control video
}
```

**Credit Flow**:
1. User signs up → `user_credits` row created with 10 free credits
2. User initiates video generation → API route checks balance via `checkCredits()`
3. If insufficient → Return 402 Payment Required error
4. Generate video successfully → `deductCredits()` called
5. Credit transaction recorded in `credit_transactions` table
6. Updated balance returned to client

**Important**: Credits are **never deducted on failure**. Only successful generations consume credits.

**Credit Management**:
- Users view balance in Settings tab (replaced old ApiKeySettings component)
- Admins can grant credits via `add_credits()` function
- Future: Payment integration to purchase credits

### Admin API Key Management

**Route**: `/api/admin/api-keys` (GET, POST, DELETE)

All endpoints require:
1. User authentication via Supabase Auth
2. Admin status check: `user_profiles.is_admin = true`
3. Return 403 Forbidden if not admin

**GET** - Fetch all admin API keys:
- Returns decrypted keys for admin viewing
- Keys are decrypted using `decryptApiKey(encrypted_key, "admin")`
- Response includes: `id`, `keyType`, `decryptedKey`, `isActive`, timestamps

**POST** - Create or update API key:
- Body: `{ keyType, apiKey }`
- Valid key types: `gemini`, `kling_access`, `kling_secret`
- Encrypts key using `encryptApiKey(apiKey, "admin")`
- Uses UPSERT on `key_type` (unique constraint)
- Sets `is_active = true` by default

**DELETE** - Deactivate API key:
- Body: `{ keyType }`
- Sets `is_active = false` (soft delete for audit purposes)
- Does not physically delete the row

**Setting Up First Admin**:
1. Run database migration: `supabase/migrations/20260111_admin_keys_credit_system.sql`
2. Sign up a user account via the app
3. Get user UUID from `auth.users` table
4. Manually set admin flag:
   ```sql
   UPDATE user_profiles SET is_admin = TRUE WHERE user_id = 'your-user-uuid';
   ```
5. Admin can now access `/api/admin/api-keys` to add AI provider keys

**Encryption Details**:
- Algorithm: AES-256
- Salt: SHA256 hash of `user_id + ENCRYPTION_SECRET_KEY`
- For admin keys, `user_id` is hardcoded as `"admin"` string
- Library: `crypto-js` package
- Implementation: `lib/supabase/encryption.ts`

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
