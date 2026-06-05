# Ving AI — Agent Mode + Character System: Detailed Implementation Plan

---

## How Characters Work Inside Agent Mode

Characters are natively integrated into the agent at every layer:

1. **System prompt awareness** — Every chat request injects the user's saved characters list into the system prompt. The agent knows "Luna" exists and what she looks like *before* the user says anything.
2. **Tool parameters** — Every generation tool accepts an optional `characterId`. When provided, `execute-tool.ts` fetches the character's image from R2 and passes it as a reference to the generation API.
3. **Inline `@mention` in chat input** — User types `@` to trigger a character picker. Selected characters become chips attached to the message.
4. **Multi-character fusion** — `fuse_images` tool accepts multiple `characterIds` to compose scenes with several characters.
5. **Agent memory within session** — After the agent generates something with Luna, it remembers that context and can reference it in follow-up turns ("make her smile more", "change her outfit to red").

---

## Full File Map

```
app/
├── studio/
│   ├── page.tsx                        # Studio page — holds all shared state
│   └── layout.tsx                      # Minimal layout (no sidebar from dashboard)
├── api/
│   ├── agent/
│   │   ├── chat/
│   │   │   └── route.ts                # POST → SSE stream (Claude + tool loop)
│   │   └── sessions/
│   │       ├── route.ts                # GET (list), POST (create new session)
│   │       └── [id]/
│   │           └── route.ts            # DELETE, PATCH (rename title)
│   └── characters/
│       ├── route.ts                    # GET (list), POST (create)
│       └── [id]/
│           └── route.ts                # PUT (update name/desc), DELETE

components/
├── studio/
│   ├── StudioLayout.tsx                # CSS grid wrapper
│   ├── Canvas.tsx                      # Center content viewer
│   ├── HistoryRail.tsx                 # Right rail — thumbnails
│   ├── ChatRail.tsx                    # Right rail — agent chat
│   ├── BottomBar.tsx                   # Prompt input + controls
│   └── GenerationPopup.tsx             # Floating settings panel
├── characters/
│   ├── CharacterLibrary.tsx            # Grid of saved characters
│   ├── CharacterCard.tsx               # Single character tile
│   ├── CharacterChip.tsx               # Inline mention chip in chat input
│   ├── CharacterPicker.tsx             # @mention dropdown overlay
│   └── CreateCharacterModal.tsx        # Upload + name form
└── agent/
    ├── ChatMessage.tsx                 # Message bubble (user / assistant)
    ├── ToolCallCard.tsx                # Animated in-progress tool card
    └── AssetCard.tsx                   # Completed asset thumbnail in chat

lib/
├── agent/
│   ├── tools.ts                        # All 7 tool definitions (Zod schemas)
│   ├── system-prompt.ts                # System prompt builder
│   ├── execute-tool.ts                 # Tool dispatch + character resolution
│   └── types.ts                        # Agent-specific TS interfaces
├── characters/
│   └── service.ts                      # getCharacters(), resolveCharacterImage()
└── types.ts                            # + Character interface added

supabase/migrations/
└── 20260602_agent_characters.sql       # All new tables
```

---

## Phase 1 — Database Migration + Character API

### 1.1 Migration SQL

**File**: `supabase/migrations/20260602_agent_characters.sql`

```sql
-- ============================================================
-- CHARACTERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS characters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  image_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  tags          TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_characters_user_id ON characters(user_id);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "characters_select_own" ON characters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "characters_insert_own" ON characters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "characters_update_own" ON characters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "characters_delete_own" ON characters
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CHAT SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New Chat',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_own" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sessions_delete_own" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CHAT MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  -- tool_calls: [{id, toolName, input, status: 'pending'|'success'|'error', result}]
  tool_calls   JSONB DEFAULT '[]',
  -- assets: [{type:'image'|'video', url, prompt, characterIds, ...}]
  assets       JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_own" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "messages_insert_own" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

### 1.2 TypeScript Interfaces

**File**: `lib/types.ts` — add to existing file:

```typescript
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
  startedAt: number;
  completedAt?: number;
}

export interface GeneratedAssetRef {
  type: 'image' | 'video';
  url: string;
  prompt: string;
  characterIds?: string[];
  duration?: number;
  aspectRatio?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: ToolCallRecord[];
  assets: GeneratedAssetRef[];
  createdAt: number;
}
```

**File**: `lib/agent/types.ts`:

```typescript
import { Character, ChatMessage, ChatSession } from '@/lib/types';

export interface AgentChatRequest {
  sessionId: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  attachedCharacterIds?: string[];  // characters @mentioned in this message
  attachedImages?: string[];        // base64 images dropped into input
}

export interface AgentChatContext {
  userId: string;
  characters: Character[];
  creditBalance: number;
  sessionId: string;
}

export interface ToolExecutionContext {
  userId: string;
  csrfToken?: string;
}
```

---

### 1.3 Character Service

**File**: `lib/characters/service.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { Character } from '@/lib/types';

export async function getCharacters(userId: string): Promise<Character[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    tags: row.tags,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

// Fetches the character's image from R2 and returns raw base64 (no data: prefix)
export async function resolveCharacterImage(
  characterId: string,
  userId: string
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('characters')
    .select('image_url')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single();

  if (error || !data) throw new Error(`Character ${characterId} not found`);

  const response = await fetch(data.image_url);
  if (!response.ok) throw new Error('Failed to fetch character image from R2');
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}
```

---

### 1.4 Character API Routes

**File**: `app/api/characters/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2 } from '@/lib/r2-storage';
import { withCsrfProtection } from '@/lib/csrf';

// GET /api/characters — list user's characters
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ characters: data });
}

// POST /api/characters — create new character
export const POST = withCsrfProtection(async (req: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('image') as File;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string | null;

  if (!file || !name) {
    return NextResponse.json({ error: 'image and name are required' }, { status: 400 });
  }

  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP allowed' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Max 10MB' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `characters/${user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
  const imageUrl = await uploadToR2(buffer, filename, file.type);

  // TODO Phase 6: generate thumbnail (resize to 256px square)
  const thumbnailUrl = imageUrl; // use full image as thumbnail for now

  const { data, error } = await supabase
    .from('characters')
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ character: data }, { status: 201 });
});
```

**File**: `app/api/characters/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withCsrfProtection } from '@/lib/csrf';
import { deleteFromR2 } from '@/lib/r2-storage'; // add this helper

// PUT /api/characters/[id] — update name / description
export const PUT = withCsrfProtection(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description } = await req.json();

  const { data, error } = await supabase
    .from('characters')
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ character: data });
});

// DELETE /api/characters/[id]
export const DELETE = withCsrfProtection(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch image_url before deleting
  const { data: character } = await supabase
    .from('characters')
    .select('image_url, thumbnail_url')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (character) {
    // Delete from R2 (best-effort)
    try { await deleteFromR2(character.image_url); } catch {}
  }

  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
});
```

---

## Phase 2 — Studio UI Shell

### 2.1 Studio Page State

**File**: `app/studio/page.tsx`

```typescript
'use client';
import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Character, GeneratedVideo, GeneratedImage, GeneratedAssetRef } from '@/lib/types';
import StudioLayout from '@/components/studio/StudioLayout';

export type GenerationMode = 'image' | 'video' | 'frames' | 'agent';
export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
export type Quantity = 1 | 2 | 3 | 4;

export interface GenerationSettings {
  mode: GenerationMode;
  aspectRatio: AspectRatio;
  quantity: Quantity;
  model: string;
  // Frames mode
  startFrameBase64?: string;
  endFrameBase64?: string;
  // Ingredients
  selectedCharacterIds: string[];
  attachedImages: string[];  // base64 images dropped by user
}

export interface StudioAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  thumbnail?: string;
  timestamp: number;
  characterIds?: string[];
}

export default function StudioPage() {
  const { user } = useAuth();

  // Canvas state
  const [currentAsset, setCurrentAsset] = useState<StudioAsset | null>(null);
  const [sessionHistory, setSessionHistory] = useState<StudioAsset[]>([]);

  // Generation settings
  const [settings, setSettings] = useState<GenerationSettings>({
    mode: 'image',
    aspectRatio: '1:1',
    quantity: 1,
    model: 'flash',
    selectedCharacterIds: [],
    attachedImages: [],
  });

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [agentMode, setAgentMode] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);

  const addAssetToHistory = useCallback((asset: StudioAsset) => {
    setCurrentAsset(asset);
    setSessionHistory(prev => [asset, ...prev].slice(0, 50));
  }, []);

  return (
    <StudioLayout
      currentAsset={currentAsset}
      sessionHistory={sessionHistory}
      settings={settings}
      onSettingsChange={setSettings}
      isGenerating={isGenerating}
      progress={progress}
      agentMode={agentMode}
      onAgentModeToggle={() => setAgentMode(v => !v)}
      activeSessionId={activeSessionId}
      onSessionChange={setActiveSessionId}
      characters={characters}
      onCharactersChange={setCharacters}
      onAssetGenerated={addAssetToHistory}
      onAssetSelect={setCurrentAsset}
    />
  );
}
```

---

### 2.2 Studio Layout

**File**: `components/studio/StudioLayout.tsx`

Three-region CSS grid. The right rail is 280px wide and conditionally shows `HistoryRail` or `ChatRail`.

```typescript
// Props interface
interface StudioLayoutProps {
  currentAsset: StudioAsset | null;
  sessionHistory: StudioAsset[];
  settings: GenerationSettings;
  onSettingsChange: (s: GenerationSettings) => void;
  isGenerating: boolean;
  progress: string;
  agentMode: boolean;
  onAgentModeToggle: () => void;
  activeSessionId: string | null;
  onSessionChange: (id: string | null) => void;
  characters: Character[];
  onCharactersChange: (c: Character[]) => void;
  onAssetGenerated: (asset: StudioAsset) => void;
  onAssetSelect: (asset: StudioAsset) => void;
}
```

CSS layout:
```
grid-template-areas:
  "topbar topbar"
  "canvas rail"
  "bottombar bottombar"
grid-template-columns: 1fr 280px
grid-template-rows: 48px 1fr 80px
```

---

### 2.3 Bottom Bar + Generation Popup

**File**: `components/studio/BottomBar.tsx`

Key behaviors:
- `textarea` auto-resizes, `Enter` submits, `Shift+Enter` newlines
- Typing `@` opens `CharacterPicker` dropdown
- Dragging an image/video onto the bar shows an attachment preview chip
- Clicking the mode badge (right side) toggles `GenerationPopup`

```typescript
interface BottomBarProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  onSubmit: (prompt: string) => void;
  isGenerating: boolean;
  settings: GenerationSettings;
  onSettingsChange: (s: GenerationSettings) => void;
  agentMode: boolean;
  onAgentModeToggle: () => void;
  characters: Character[];
  onAttachmentDrop: (files: File[]) => void;
}

// Mode badge label logic:
function getModeLabel(settings: GenerationSettings): string {
  const modeIcon = settings.mode === 'video' ? '▶' : '▣';
  const charName = settings.selectedCharacterIds.length === 1
    ? characters.find(c => c.id === settings.selectedCharacterIds[0])?.name
    : null;
  const prefix = charName ?? (settings.mode === 'video' ? 'Video' : 'Image');
  return `${prefix} ${modeIcon} ${settings.quantity}x`;
}
```

**File**: `components/studio/GenerationPopup.tsx`

```typescript
// Tab: 'image' | 'video'
// Video sub-tab: 'frames' | 'ingredients'
// Renders inside a floating panel above BottomBar using absolute positioning
// Calculates credit cost dynamically:
function calcCreditCost(settings: GenerationSettings): number {
  const base = {
    image_flash:  1,
    image_pro:    3,
    video_veo:    1,
    kling:        2,
  }[`${settings.mode}_${settings.model}`] ?? 1;
  return base * settings.quantity;
}
```

---

## Phase 3 — Generation in Studio

### 3.1 Submit Handler in StudioLayout

```typescript
async function handleSubmit(prompt: string) {
  setIsGenerating(true);
  setProgress('Sending request...');

  try {
    if (settings.mode === 'image') {
      // Multi-quantity: fire in parallel
      const requests = Array.from({ length: settings.quantity }).map(() =>
        fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify({
            prompt,
            model: settings.model,
            quality: '1K',
            aspectRatio: settings.aspectRatio,
            // If a character is selected, attach their image
            referenceImageBase64: settings.selectedCharacterIds[0]
              ? await fetchCharacterBase64(settings.selectedCharacterIds[0])
              : undefined,
          }),
        }).then(r => r.json())
      );
      const results = await Promise.all(requests);
      results.forEach(r => {
        if (r.imageUrl) onAssetGenerated({ type: 'image', url: r.imageUrl, prompt, ... });
      });

    } else if (settings.mode === 'video') {
      // image-to-video if character selected, else text-to-video
      const characterBase64 = settings.selectedCharacterIds[0]
        ? await fetchCharacterBase64(settings.selectedCharacterIds[0])
        : null;

      const res = await fetch('/api/generate-veo-video', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          duration: 6,
          aspectRatio: settings.aspectRatio,
          imageBase64: characterBase64,
        }),
      });
      // handle polling (same as existing dashboard pattern)
    }
  } finally {
    setIsGenerating(false);
  }
}
```

---

## Phase 4 — Agent Backend

### 4.1 Tool Definitions

**File**: `lib/agent/tools.ts`

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const agentTools = {

  generate_image: tool({
    description: `Generate one or more images from a text prompt. 
      Use model 'flash' for fast/cheap, 'pro' for high quality.
      If a characterId is provided, the character's photo is used as a visual reference.`,
    parameters: z.object({
      prompt: z.string().describe('Detailed, cinematic image description'),
      aspectRatio: z.enum(['16:9', '4:3', '1:1', '3:4', '9:16']).default('1:1'),
      model: z.enum(['flash', 'pro']).default('flash'),
      quality: z.enum(['1K', '2K', '4K']).default('1K'),
      quantity: z.number().int().min(1).max(4).default(1),
      characterId: z.string().optional().describe(
        'ID of a saved character to use as the subject. Look up by name from the characters list in context.'
      ),
    }),
    execute: async (input, ctx) => executeTool('generate_image', input, ctx),
  }),

  generate_video: tool({
    description: `Generate a short video (4-8 seconds) using Veo 3.1.
      If a characterId is provided, uses the character's photo as the video's starting frame (image-to-video).
      For text-only video, leave characterId empty.`,
    parameters: z.object({
      prompt: z.string().describe('Detailed cinematic video description with camera motion'),
      duration: z.number().int().min(4).max(8).default(6),
      aspectRatio: z.enum(['9:16', '16:9']).default('9:16'),
      characterId: z.string().optional().describe(
        'ID of saved character. Their photo becomes the first frame.'
      ),
    }),
    execute: async (input, ctx) => executeTool('generate_video', input, ctx),
  }),

  animate_character: tool({
    description: `Animate a character from a saved photo to mimic motions from a reference video (Kling AI).
      Use this when user wants to make a character "move" or "perform" something.`,
    parameters: z.object({
      characterId: z.string().describe('ID of the saved character to animate'),
      referenceVideoUrl: z.string().url().describe('Public URL of the reference motion video'),
      orientation: z.enum(['video', 'image']).default('video').describe(
        '"video" = character follows video motion (max 30s). "image" = character posed from their own photo (max 10s).'
      ),
      prompt: z.string().optional().describe('Additional motion instructions'),
    }),
    execute: async (input, ctx) => executeTool('animate_character', input, ctx),
  }),

  fuse_characters: tool({
    description: `Combine 2 or more characters (or additional reference images) into one composite scene.
      Use when user wants multiple people together or a character placed in a specific scene/outfit.`,
    parameters: z.object({
      characterIds: z.array(z.string()).min(1).describe(
        'IDs of saved characters to include. At least one required.'
      ),
      fusionPrompt: z.string().describe(
        'What to generate with these characters combined, e.g. "two friends sitting at a cafe"'
      ),
      quality: z.enum(['standard', 'pro']).default('standard'),
      aspectRatio: z.enum(['16:9', '4:3', '1:1', '3:4', '9:16']).default('1:1'),
    }),
    execute: async (input, ctx) => executeTool('fuse_characters', input, ctx),
  }),

  create_script: tool({
    description: `Break a video idea into a list of timed clips (a shooting script).
      Returns an array of clips with prompts and durations. Free — no credits.
      Use before generate_video when user wants a multi-clip production.`,
    parameters: z.object({
      idea: z.string().describe('The overall video concept or story'),
      targetDuration: z.number().int().min(30).max(120).default(60).describe('Total video length in seconds'),
    }),
    execute: async (input, ctx) => executeTool('create_script', input, ctx),
  }),

  extend_video: tool({
    description: `Extend a previously generated Veo video by a few more seconds.
      Requires the googleVideoUri from the original generation. Free — no credits.`,
    parameters: z.object({
      googleVideoUri: z.string().describe('The googleVideoUri returned from a previous generate_video call'),
      prompt: z.string().optional().describe('Direction for the extension, e.g. "continue the walk into the forest"'),
    }),
    execute: async (input, ctx) => executeTool('extend_video', input, ctx),
  }),

  create_storyboard: tool({
    description: `Generate a series of sequential images representing a storyboard or filmstrip.
      Returns multiple images shown as frames. Good for planning a video shoot or visual narrative.`,
    parameters: z.object({
      concept: z.string().describe('Overall creative concept for the storyboard'),
      numFrames: z.number().int().min(2).max(8).default(4),
      style: z.string().default('cinematic, editorial').describe('Visual style descriptor'),
      aspectRatio: z.enum(['16:9', '4:3', '1:1', '9:16']).default('16:9'),
      characterId: z.string().optional().describe('Include a character in every frame'),
    }),
    execute: async (input, ctx) => executeTool('create_storyboard', input, ctx),
  }),

} as const;
```

---

### 4.2 Tool Executor

**File**: `lib/agent/execute-tool.ts`

This is the critical file — all tool calls resolve here before any credit is touched.

```typescript
import { resolveCharacterImage } from '@/lib/characters/service';
import { checkCredits, deductCredits } from '@/lib/credits';
import { createClient as createServiceClient } from '@/lib/supabase/service'; // uses service role
import { generateImageService } from '@/lib/services/generate-image';
import { generateVideoService } from '@/lib/services/generate-veo-video';
import { klingMotionService } from '@/lib/services/kling-motion';
import { generateImageFusionService } from '@/lib/services/generate-image-fusion';
import { generateScriptService } from '@/lib/services/generate-script';
import { extendVideoService } from '@/lib/services/extend-video';
import type { ToolExecutionContext } from './types';

// Each service function is extracted from the corresponding route handler
// into a lib/services/ file so both the route AND the agent can call it.

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<unknown> {
  const { userId } = ctx;

  switch (toolName) {

    case 'generate_image': {
      const { prompt, aspectRatio, model, quality, quantity, characterId } = input as any;

      // Resolve character image if provided
      let referenceBase64: string | undefined;
      if (characterId) {
        referenceBase64 = await resolveCharacterImage(characterId, userId);
      }

      const creditCost = (model === 'pro' ? 3 : 1) * (quantity as number);
      await checkCredits(userId, creditCost);

      const results = await Promise.all(
        Array.from({ length: quantity as number }).map(() =>
          generateImageService({ prompt, aspectRatio, model, quality, referenceBase64, userId })
        )
      );

      await deductCredits(userId, creditCost, 'image_generation', {
        model, quality, quantity, characterId, promptExcerpt: prompt.slice(0, 80),
      });

      return { images: results.map(r => ({ url: r.imageUrl, prompt })) };
    }

    case 'generate_video': {
      const { prompt, duration, aspectRatio, characterId } = input as any;

      let imageBase64: string | undefined;
      if (characterId) {
        imageBase64 = await resolveCharacterImage(characterId, userId);
      }

      await checkCredits(userId, 1);

      const result = await generateVideoService({ prompt, duration, aspectRatio, imageBase64, userId });

      await deductCredits(userId, 1, 'veo_generation', {
        characterId, durationSeconds: duration, promptExcerpt: prompt.slice(0, 80),
      });

      return {
        video: {
          url: result.videoUrl,
          googleVideoUri: result.googleVideoUri,
          prompt,
          duration,
          aspectRatio,
          characterId,
        }
      };
    }

    case 'animate_character': {
      const { characterId, referenceVideoUrl, orientation, prompt } = input as any;

      const characterImageBase64 = await resolveCharacterImage(characterId, userId);

      await checkCredits(userId, 2);

      const result = await klingMotionService({
        imageBase64: characterImageBase64,
        videoUrl: referenceVideoUrl,
        orientation,
        prompt,
        userId,
      });

      await deductCredits(userId, 2, 'kling_generation', { characterId });

      return { video: { url: result.videoUrl, characterId } };
    }

    case 'fuse_characters': {
      const { characterIds, fusionPrompt, quality, aspectRatio } = input as any;

      const creditCost = quality === 'pro' ? 4 : 2;
      await checkCredits(userId, creditCost);

      // Resolve all character images in parallel
      const characterImages = await Promise.all(
        (characterIds as string[]).map(async (id: string, i: number) => ({
          id: `char-${i}`,
          data: `data:image/jpeg;base64,${await resolveCharacterImage(id, userId)}`,
          label: `character_${i + 1}`,
        }))
      );

      const result = await generateImageFusionService({
        images: characterImages,
        prompt: fusionPrompt,
        quality,
        aspectRatio,
        userId,
      });

      await deductCredits(userId, creditCost, 'fusion_generation', {
        characterCount: characterIds.length, quality,
      });

      return { image: { url: result.imageUrl, prompt: fusionPrompt, characterIds } };
    }

    case 'create_script': {
      const { idea, targetDuration } = input as any;
      const clips = await generateScriptService({ idea, targetDuration, userId });
      return { clips };
    }

    case 'extend_video': {
      const { googleVideoUri, prompt } = input as any;
      const result = await extendVideoService({ googleVideoUri, prompt, userId });
      return { video: { url: result.videoUrl, googleVideoUri: result.newGoogleVideoUri } };
    }

    case 'create_storyboard': {
      const { concept, numFrames, style, aspectRatio, characterId } = input as any;

      const creditCost = numFrames as number;
      await checkCredits(userId, creditCost);

      let referenceBase64: string | undefined;
      if (characterId) {
        referenceBase64 = await resolveCharacterImage(characterId, userId);
      }

      // Generate all frames in parallel
      const frames = await Promise.all(
        Array.from({ length: numFrames as number }, (_, i) =>
          generateImageService({
            prompt: `Storyboard frame ${i + 1} of ${numFrames}: ${concept}. ${style} style. Frame ${i + 1} shows: ${getFrameDirection(i, numFrames as number, concept)}`,
            aspectRatio,
            model: 'flash',
            quality: '1K',
            referenceBase64,
            userId,
          })
        )
      );

      await deductCredits(userId, creditCost, 'image_generation', {
        type: 'storyboard', numFrames, concept: concept.slice(0, 80),
      });

      return {
        storyboard: frames.map((f, i) => ({
          frame: i + 1,
          url: f.imageUrl,
          prompt: concept,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Helper: give each frame a slightly different directorial note
function getFrameDirection(index: number, total: number, concept: string): string {
  const positions = ['establishing wide shot', 'medium shot', 'close-up detail', 'over-the-shoulder', 'low angle', 'high angle', 'extreme close-up', 'final wide shot'];
  return positions[index % positions.length];
}
```

---

### 4.3 System Prompt Builder

**File**: `lib/agent/system-prompt.ts`

```typescript
import type { Character } from '@/lib/types';

export function buildSystemPrompt(characters: Character[], creditBalance: number): string {
  const characterList = characters.length > 0
    ? characters.map(c =>
        `  - "${c.name}" (id: ${c.id})${c.description ? `: ${c.description}` : ''}`
      ).join('\n')
    : '  (no characters saved yet — suggest the user saves one with the + button)';

  return `You are Ving, an AI creative director for professional video and image production.
You help users create stunning visuals through natural conversation.

## Your Capabilities (use these tools):

- **generate_image**: Create images (model: flash=fast, pro=high quality, up to 4K)
- **generate_video**: Text-to-video OR image-to-video using Veo 3.1 (4-8 seconds)
- **animate_character**: Make a character perform motions from a reference video (Kling AI)
- **fuse_characters**: Composite multiple characters or reference images into one scene
- **create_script**: Break a video idea into timed clips (free)
- **extend_video**: Extend a previously generated video (free)
- **create_storyboard**: Generate 2-8 sequential frames as a visual storyboard

## User's Saved Characters:
${characterList}

## User's Credit Balance: ${creditBalance} credits

## Credit Costs:
- Image (Flash, 1K): 1 credit each
- Image (Pro, 4K): 3 credits each
- Video (Veo 3.1): 1 credit
- Motion control (Kling): 2 credits
- Storyboard: 1 credit per frame
- Script / Extend: free

## How to Use Characters:
- When a user mentions a name from the saved characters list, ALWAYS use that character's ID in the tool call
- For multi-person scenes, use fuse_characters with multiple characterIds
- Characters can be used in any tool — images, videos, storyboards, motion

## Guidelines:
- ALWAYS write detailed, cinematic prompts — never short or vague. Add lighting, mood, camera angle, style.
- For multi-step work (storyboards, scripts), CONFIRM the plan briefly before executing
- Narrate what you're doing: "I'll generate 4 storyboard frames for Luna..." then call the tool
- After results, OFFER to refine: "Would you like me to adjust the lighting or try a different angle?"
- If credits are insufficient, warn the user and suggest the cheapest path to their goal
- If user hasn't saved any characters yet and wants to use a person, suggest: "You can save a character by clicking the + button below and uploading a photo"
- Keep responses concise — let the generated assets speak for themselves`;
}
```

---

### 4.4 Agent Chat API Route

**File**: `app/api/agent/chat/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { withCsrfProtection } from '@/lib/csrf';
import { getCharacters } from '@/lib/characters/service';
import { getUserCredits } from '@/lib/credits';
import { buildSystemPrompt } from '@/lib/agent/system-prompt';
import { agentTools } from '@/lib/agent/tools';
import type { AgentChatRequest } from '@/lib/agent/types';

export const maxDuration = 300;

export const POST = withCsrfProtection(async (req: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { messages, sessionId, attachedCharacterIds = [], attachedImages = [] }
    = (await req.json()) as AgentChatRequest;

  // Load user context for system prompt
  const [characters, balance] = await Promise.all([
    getCharacters(user.id),
    getUserCredits(user.id),
  ]);

  // Inject attached characters and images into the last user message
  const enrichedMessages = enrichLastMessage(messages, attachedCharacterIds, attachedImages, characters);

  const result = streamText({
    model: anthropic('claude-opus-4-8'),
    system: buildSystemPrompt(characters, balance),
    messages: enrichedMessages,
    tools: agentTools,
    maxSteps: 6,
    toolChoice: 'auto',

    onStepFinish: async ({ stepType, toolCalls, toolResults, text }) => {
      // Persist assistant message to DB after each step
      await persistAssistantStep(supabase, sessionId, user.id, {
        stepType, toolCalls, toolResults, text,
      });
    },

    onFinish: async ({ text }) => {
      // Auto-generate session title from first exchange if still "New Chat"
      await maybeAutoTitleSession(supabase, sessionId, user.id, text);
    },
  });

  return result.toDataStreamResponse();
});

function enrichLastMessage(
  messages: any[],
  characterIds: string[],
  images: string[],
  characters: Character[]
) {
  if (characterIds.length === 0 && images.length === 0) return messages;

  const last = messages[messages.length - 1];
  if (last?.role !== 'user') return messages;

  // Build a text note listing attached characters by name
  const charNames = characterIds
    .map(id => characters.find(c => c.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  const contextNote = [
    charNames ? `[User attached characters: ${charNames}]` : '',
    images.length ? `[User attached ${images.length} image(s) as context]` : '',
  ].filter(Boolean).join(' ');

  return [
    ...messages.slice(0, -1),
    { ...last, content: contextNote ? `${contextNote}\n\n${last.content}` : last.content },
  ];
}

async function persistAssistantStep(supabase: any, sessionId: string, userId: string, step: any) {
  try {
    const toolCalls = step.toolCalls?.map((tc: any) => ({
      id: tc.toolCallId,
      toolName: tc.toolName,
      input: tc.args,
      status: 'success',
      result: step.toolResults?.find((tr: any) => tr.toolCallId === tc.toolCallId)?.result,
    })) ?? [];

    const assets = extractAssetsFromResults(step.toolResults ?? []);

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: userId,
      role: 'assistant',
      content: step.text ?? '',
      tool_calls: toolCalls,
      assets,
    });
  } catch (err) {
    console.error('Failed to persist step:', err);
  }
}

function extractAssetsFromResults(toolResults: any[]): any[] {
  const assets: any[] = [];
  for (const tr of toolResults) {
    const r = tr.result;
    if (r?.images) assets.push(...r.images.map((img: any) => ({ type: 'image', ...img })));
    if (r?.image) assets.push({ type: 'image', ...r.image });
    if (r?.video) assets.push({ type: 'video', ...r.video });
    if (r?.storyboard) assets.push(...r.storyboard.map((f: any) => ({ type: 'image', ...f })));
  }
  return assets;
}

async function maybeAutoTitleSession(supabase: any, sessionId: string, userId: string, text: string) {
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('title')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (session?.title !== 'New Chat') return;

  // Extract first sentence of first assistant response as title
  const title = text.split(/[.!?]/)[0]?.trim().slice(0, 60) || 'Creative Session';
  await supabase
    .from('chat_sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}
```

---

## Phase 5 — Agent Chat UI

### 5.1 ChatRail Component

**File**: `components/studio/ChatRail.tsx`

```typescript
import { useChat } from 'ai/react';

interface ChatRailProps {
  sessionId: string;
  characters: Character[];
  onAssetGenerated: (asset: StudioAsset) => void;
  csrfToken: string;
}

export default function ChatRail({ sessionId, characters, onAssetGenerated, csrfToken }: ChatRailProps) {
  const [attachedCharacterIds, setAttachedCharacterIds] = useState<string[]>([]);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/agent/chat',
    headers: { 'X-CSRF-Token': csrfToken },
    body: { sessionId, attachedCharacterIds, attachedImages },
    onFinish: (message) => {
      // Extract any assets from tool results and add to canvas history
      const assets = extractAssetsFromMessage(message);
      assets.forEach(onAssetGenerated);
      // Clear attachments after send
      setAttachedCharacterIds([]);
      setAttachedImages([]);
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#0E0E0E]">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} characters={characters} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
```

---

### 5.2 ChatMessage Component

**File**: `components/agent/ChatMessage.tsx`

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: Message; // from Vercel AI SDK
  characters: Character[];
}

export default function ChatMessage({ message, characters }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isUser && <AgentAvatar />}

      <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>

        {/* Text bubble */}
        {message.content && (
          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-[#1A1A1A] text-white rounded-tr-sm'
              : 'bg-transparent text-gray-200 rounded-tl-sm'
          }`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                code: ({ children }) => <code className="bg-[#2A2A2A] px-1 rounded text-green-400 text-xs">{children}</code>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool call cards — shown for assistant messages */}
        {!isUser && message.toolInvocations?.map(ti => (
          <ToolCallCard
            key={ti.toolCallId}
            toolName={ti.toolName}
            input={ti.args}
            state={ti.state}
            result={'result' in ti ? ti.result : undefined}
            characters={characters}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### 5.3 ToolCallCard Component

**File**: `components/agent/ToolCallCard.tsx`

```typescript
interface ToolCallCardProps {
  toolName: string;
  input: Record<string, unknown>;
  state: 'call' | 'result' | 'partial-call';
  result?: unknown;
  characters: Character[];
}

const TOOL_LABELS: Record<string, string> = {
  generate_image: 'Generating image',
  generate_video: 'Generating video',
  animate_character: 'Animating character',
  fuse_characters: 'Fusing characters',
  create_script: 'Writing script',
  extend_video: 'Extending video',
  create_storyboard: 'Building storyboard',
};

export default function ToolCallCard({ toolName, input, state, result, characters }: ToolCallCardProps) {
  const isPending = state === 'call' || state === 'partial-call';
  const label = TOOL_LABELS[toolName] ?? toolName;
  const charName = (input.characterId as string | undefined)
    ? characters.find(c => c.id === input.characterId)?.name
    : null;

  if (isPending) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-sm text-gray-400"
      >
        <Spinner className="w-3.5 h-3.5 text-green-500" />
        <span>{label}{charName ? ` "${charName}"` : ''}...</span>
        <ElapsedTimer />
      </motion.div>
    );
  }

  // Completed — show result as AssetCard(s)
  const assets = extractAssetsFromResult(toolName, result);
  if (assets.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {assets.length > 1
        ? <StoryboardGrid assets={assets} />
        : <AssetCard asset={assets[0]} />
      }
    </div>
  );
}
```

---

### 5.4 Character @Mention in Chat Input

**File**: `components/characters/CharacterPicker.tsx`

```typescript
// Dropdown that appears when user types '@' in the chat input
interface CharacterPickerProps {
  characters: Character[];
  query: string;           // text after '@'
  onSelect: (character: Character) => void;
  onDismiss: () => void;
}

export default function CharacterPicker({ characters, query, onSelect, onDismiss }: CharacterPickerProps) {
  const filtered = characters.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-full left-0 mb-2 w-56 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl overflow-hidden z-50"
    >
      {filtered.length === 0
        ? <p className="px-3 py-2 text-sm text-gray-500">No characters found</p>
        : filtered.map(char => (
            <button
              key={char.id}
              onClick={() => onSelect(char)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#2A2A2A] transition-colors text-left"
            >
              <img src={char.thumbnailUrl ?? char.imageUrl} className="w-7 h-7 rounded-full object-cover border border-[#333]" />
              <div>
                <p className="text-sm text-white font-medium">{char.name}</p>
                {char.description && <p className="text-xs text-gray-500 truncate max-w-[140px]">{char.description}</p>}
              </div>
            </button>
          ))
      }
    </motion.div>
  );
}
```

**Chat input behavior**:
```typescript
// Inside ChatRail or the agent chat input:
function handleKeyInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
  const val = e.target.value;
  const atMatch = val.match(/@(\w*)$/);

  if (atMatch) {
    setShowCharacterPicker(true);
    setCharacterQuery(atMatch[1]);
  } else {
    setShowCharacterPicker(false);
  }

  handleInputChange(e);
}

function handleCharacterSelect(char: Character) {
  // Replace '@query' with a chip and add to attached IDs
  setAttachedCharacterIds(prev => [...prev, char.id]);
  const newValue = input.replace(/@\w*$/, ''); // remove @query
  // Trigger handleInputChange with cleaned value
  setShowCharacterPicker(false);
}
```

**CharacterChip** (appears above the input when character is attached):
```typescript
// Small chip showing character thumbnail + name + × remove
<div className="flex items-center gap-1.5 px-2 py-1 bg-[#1A1A1A] border border-green-500/30 rounded-full text-xs">
  <img src={char.thumbnailUrl} className="w-4 h-4 rounded-full object-cover" />
  <span className="text-green-400">{char.name}</span>
  <button onClick={() => removeCharacter(char.id)} className="text-gray-500 hover:text-white">×</button>
</div>
```

---

## Phase 6 — Character Management UI

### 6.1 CreateCharacterModal

**File**: `components/characters/CreateCharacterModal.tsx`

```
Flow:
1. User clicks "+" → "Save Character"
2. Modal opens with drag-drop zone
3. User drops/selects a portrait photo
4. Preview shows the photo with a circular crop preview
5. User enters name (required) and description (optional)
6. Submit → POST /api/characters (multipart)
7. On success: close modal, add character to local state, show toast
```

Key implementation notes:
- Use `<input type="file" accept="image/jpeg,image/png,image/webp">` hidden behind a styled drop zone
- Show circular preview (CSS `border-radius: 50%; object-fit: cover`) to help user frame the face
- Client-side size check: reject if > 10MB before upload
- Progress bar during upload (use `XMLHttpRequest` with `upload.onprogress` instead of `fetch` for progress tracking)

### 6.2 CharacterLibrary (in Ingredients tab + Sidebar)

```
Two contexts:
A. Inside GenerationPopup > Ingredients tab:
   - Horizontal scroll row of character cards
   - Click to toggle selection (adds to settings.selectedCharacterIds)
   - Selected state: green border + checkmark

B. Standalone sidebar section (via LeftSidebar "Characters" icon):
   - Full grid view
   - Each card: thumbnail, name, edit name pencil icon, delete × icon
   - "+ New Character" card at the start
```

```typescript
// CharacterCard.tsx
interface CharacterCardProps {
  character: Character;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onRename?: (name: string) => void;
  size?: 'sm' | 'md';
}
// sm: used in Ingredients tab (64px circle)
// md: used in full library view (128px square with rounded corners)
```

---

## Phase 7 — Extracted Service Functions

For the agent's `execute-tool.ts` to call generation logic **without HTTP**, the core logic from each route must be extracted into `lib/services/`.

### Services to create:

**`lib/services/generate-image.ts`**
```typescript
export interface GenerateImageInput {
  prompt: string; aspectRatio: string; model: string; quality: string;
  referenceBase64?: string; userId: string;
}
export interface GenerateImageOutput { imageUrl: string; }
export async function generateImageService(input: GenerateImageInput): Promise<GenerateImageOutput>
// Move the Gemini API call + R2 upload logic here from the route handler
```

**`lib/services/generate-veo-video.ts`**
```typescript
export interface GenerateVideoInput {
  prompt: string; duration: number; aspectRatio: string;
  imageBase64?: string; userId: string;
}
export interface GenerateVideoOutput { videoUrl: string; googleVideoUri?: string; }
export async function generateVideoService(input: GenerateVideoInput): Promise<GenerateVideoOutput>
```

**`lib/services/kling-motion.ts`**
```typescript
export interface KlingMotionInput {
  imageBase64: string; videoUrl: string; orientation: string;
  prompt?: string; userId: string;
}
export interface KlingMotionOutput { videoUrl: string; }
export async function klingMotionService(input: KlingMotionInput): Promise<KlingMotionOutput>
```

**`lib/services/generate-image-fusion.ts`**, **`lib/services/generate-script.ts`**, **`lib/services/extend-video.ts`** — same pattern.

The route handlers then become thin wrappers:
```typescript
// app/api/generate-image/route.ts (after refactor)
export const POST = withCsrfProtection(async (req) => {
  const user = await getAuthUser(req);
  await checkCredits(user.id, cost);
  const result = await generateImageService({ ...body, userId: user.id });
  await deductCredits(...);
  return NextResponse.json(result);
});
```

This ensures zero duplication between direct API calls and agent tool execution.

---

## Implementation Order (Day-by-Day)

### Week 1 — Foundation
| Day | Work |
|-----|------|
| 1 | DB migration. Character API (GET, POST, DELETE). Test with curl. |
| 2 | Extract service functions from all 6 route handlers. Route handlers become thin wrappers. |
| 3 | Studio page shell: `StudioLayout`, `Canvas`, basic `HistoryRail` (no real data yet). |
| 4 | `BottomBar` with `GenerationPopup` (tabs, aspect ratio, quantity, model selector). |
| 5 | Wire generation in Studio: Image + Video submit → existing service fns → canvas updates. |

### Week 2 — Characters + Agent
| Day | Work |
|-----|------|
| 6 | `CharacterLibrary`, `CharacterCard`, `CreateCharacterModal`. Characters appear in Ingredients tab. |
| 7 | Agent tools (`lib/agent/tools.ts`) + `execute-tool.ts` with character resolution. |
| 8 | Agent system prompt + `/api/agent/chat` route with SSE streaming. |
| 9 | `ChatRail`, `ChatMessage`, `ToolCallCard`, `AssetCard`. Wire to `useChat()`. |
| 10 | `CharacterPicker` @mention, character chips in chat input. |

### Week 3 — Polish
| Day | Work |
|-----|------|
| 11 | Storyboard grid view in chat. Multi-asset canvas (2×2 grid for quantity > 1). |
| 12 | Session list sidebar. Auto-title sessions. "Hide history" toggle. |
| 13 | Drag-and-drop onto BottomBar (images → base64 → attached to generation/agent). |
| 14 | Credits warning in agent + UI. Error recovery. Empty states. |
| 15 | QA, edge cases, responsive layout tweaks. |

---

## Complete Credit Table

| Action | Cost | Deducted By |
|--------|------|-------------|
| Chat (text only, no tools) | 0 | — |
| Image Flash 1K | 1/image | execute-tool or route |
| Image Pro 1K | 2/image | execute-tool or route |
| Image Pro 4K | 3/image | execute-tool or route |
| Video (Veo 3.1) | 1/clip | execute-tool or route |
| Animate character (Kling) | 2/clip | execute-tool or route |
| Image fusion (standard) | 2 | execute-tool or route |
| Image fusion (pro) | 4 | execute-tool or route |
| Storyboard | 1/frame | execute-tool |
| Script | 0 | — |
| Video extend | 0 | — |
| Character save | 0 | — |

---

## Key Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| Video generation takes 2-5 min — agent appears stuck | `ToolCallCard` shows elapsed timer; agent narrates "This will take a few minutes..." |
| User burns credits accidentally via agent | Agent warns before multi-step tool calls; shows credit cost in `ToolCallCard` input display |
| Character image fetch adds latency to tool execution | Pre-fetch character images at chat session start and cache in memory for the request lifetime |
| `maxSteps: 6` could chain expensive tools (e.g. 6× generate_video) | System prompt explicitly instructs agent to confirm before multi-step expensive operations |
| Service function extraction is large refactor risk | Extract one service at a time, verify route still works after each extraction |
