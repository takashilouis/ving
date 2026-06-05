# Ving AI Agent Mode — Implementation Plan

## Vision

Replace the current 3-panel dashboard with a single **Studio** — a clean, canvas-first workspace where users generate, iterate, and orchestrate complex creative workflows through either direct controls or a conversational AI agent.

---

## UI Layout (based on reference screenshots)

```
┌──────────────────────────────────────────────────────────────────┐
│  [←Back]  Session Title               [♥] [↓] [Hide history]    │  ← top bar
├────────────────────────────────────────┬─────────────────────────┤
│                                        │                         │
│                                        │   [thumb / msg 1]       │
│         Main Canvas                    │   [thumb / msg 2]       │
│   (large: current image or video)      │   [thumb / msg 3]       │
│                                        │   [thumb / msg 4]       │
│                                        │   ...                   │
│                                        │                         │
│                                        │  ← History Rail         │
│                                        │    OR Chat Rail         │
│                                        │    (Agent mode)         │
├────────────────────────────────────────┴─────────────────────────┤
│                                                                    │
│  [+]  [Agent]   What do you want to create?     [Video □ 1x →]   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- **Main Canvas**: Full-bleed display of the current generated image or video.
- **History Rail** (right): Vertical strip of thumbnails from this session. Clicking one loads it into the canvas. "Hide history" collapses the rail.
- **Chat Rail** (right, agent mode): Replaces the thumbnail strip — shows chat messages and tool result cards when Agent mode is active.
- **Bottom Bar**: Always visible. Houses the prompt input and generation controls.
- **Generation Popup**: Floats above the bottom bar when the user clicks the mode badge (`Video □ 1x →`). Contains all generation settings.

---

## Generation Settings Popup

Appears above the bottom bar. Two top-level tabs: **Image** and **Video**.

### Image Tab
```
┌─────────────────────────────────────┐
│  [Image ✓]    Video                 │
│                                     │
│  16:9  4:3  1:1  3:4  9:16 (grid) │
│                                     │
│  1x   x2   x3   x4                 │
│                                     │
│  ┌───────────────────────┐ ▼       │
│  │  Gemini Flash         │          │
│  └───────────────────────┘          │
│                                     │
│  Generating will use  1 credit      │
└─────────────────────────────────────┘
```

### Video Tab — Frames mode (keyframe)
```
┌─────────────────────────────────────┐
│  Image    [Video ✓]                 │
│  [Frames ✓]    Ingredients          │
│                                     │
│  9:16   16:9                        │
│  1x   x2   x3   x4                 │
│  Veo 3.1 - Fast         ▼          │
│                                     │
│  [Start]  ⇄  [End]                 │
│  (upload start frame / end frame)   │
│                                     │
│  Generating will use  20 credits    │
└─────────────────────────────────────┘
```

### Video Tab — Ingredients mode (character-driven)
```
┌─────────────────────────────────────┐
│  Image    [Video ✓]                 │
│  Frames    [Ingredients ✓]          │
│                                     │
│  [+ Character]  [+ Reference Image] │
│  [Luna ✓]   [Background #3]         │
│                                     │
│  9:16   16:9                        │
│  1x   x2   x3   x4                 │
│  Veo 3.1 - Fast         ▼          │
│                                     │
│  Generating will use  20 credits    │
└─────────────────────────────────────┘
```

The bottom bar send button label updates dynamically to reflect the current selection, e.g. `Video □ 1x →`, `Image □ x4 →`, or after character selection: `Luna □ 1x →`.

---

## Feature 1 — Character System

Users upload a photo of a real person and save them as a named **Character**. Characters persist across sessions and can be injected into any generation as a reference subject.

### How It Works

1. User clicks `+` in bottom bar → "Save Character"
2. Uploads a portrait photo (PNG/JPG)
3. Sets a name (e.g. "Luna", "James")
4. Optionally adds a description ("Vietnamese model, long hair, 25yo")
5. Character is stored in R2 + database

On future use:
- Open the Ingredients tab → select saved character
- Character's image is automatically passed as a reference to the generation API
- For image generation: passed as a base reference alongside the prompt
- For video generation (Veo): passed as the image-to-video input
- For motion control (Kling): passed as the character image input
- The AI agent is aware of all saved characters by name

### Database Schema — Characters

```sql
CREATE TABLE characters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  image_url     TEXT NOT NULL,      -- full R2 URL
  thumbnail_url TEXT,               -- smaller 256px square crop
  tags          TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_characters_user_id ON characters(user_id);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own characters"
  ON characters FOR ALL USING (auth.uid() = user_id);
```

### API Routes — Characters

| Method | Route | Action |
|--------|-------|--------|
| GET | `/api/characters` | List user's characters |
| POST | `/api/characters` | Upload image → R2, save record |
| PUT | `/api/characters/[id]` | Update name / description |
| DELETE | `/api/characters/[id]` | Delete record + R2 image |

### TypeScript Interface

```typescript
interface Character {
  id: string;
  userId: string;
  name: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  tags?: string[];
  createdAt: number;
}
```

---

## Feature 2 — AI Agent Mode

Activated by clicking the **Agent** button in the bottom bar. The History Rail on the right becomes a Chat Rail. The user types natural language; the agent (Claude) understands intent, extracts parameters, and calls the appropriate generation tools — all while the canvas updates in real time.

### Example Flows

**Storyboard creation:**
> "Create a 4-frame fashion editorial storyboard for Luna in a rooftop at golden hour"
→ Agent calls `generate_image` × 4 with varied angles, shows frames in chat as they complete

**Character-driven video:**
> "Make a 6-second video of Luna walking on a beach at sunset"
→ Agent selects Luna's character image, calls `generate_video` with image-to-video, shows progress

**Iterative refinement:**
> "Make her outfit more glamorous and change the background to a city skyline"
→ Agent modifies the last generation with updated parameters

### Agent Architecture

```
User prompt
     ↓
/api/agent/chat  (SSE streaming)
     ↓
Claude claude-opus-4-8 with Tool Use + maxSteps:5
     ├── tool: generate_image        → /api/generate-image (service fn)
     ├── tool: generate_video        → /api/generate-veo-video (service fn)
     ├── tool: animate_character     → /api/kling-motion (service fn)
     ├── tool: fuse_images           → /api/generate-image-fusion (service fn)
     ├── tool: create_script         → /api/generate-script (service fn)
     ├── tool: extend_video          → /api/extend-video (service fn)
     └── tool: create_storyboard     → multi-call generate_image
```

Tools call service functions **directly** (not via internal HTTP) to avoid CSRF overhead and reduce latency.

### Database Schema — Agent Sessions

```sql
CREATE TABLE chat_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  tool_calls   JSONB,   -- [{toolName, input, status, result}]
  assets       JSONB,   -- [{type:'video'|'image', url, prompt, ...}]
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sessions" ON chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own messages" ON chat_messages FOR ALL USING (auth.uid() = user_id);
```

### Agent Tool Definitions

| Tool | Input Schema | Credit Cost | Maps To |
|------|-------------|-------------|---------|
| `generate_image` | prompt, aspectRatio, model, quality, quantity | 1-3 each | generate-image service |
| `generate_video` | prompt, duration, aspectRatio, imageBase64? | 1 | generate-veo-video service |
| `animate_character` | characterId, referenceVideoUrl, orientation, prompt | 2 | kling-motion service |
| `fuse_images` | images[], fusionPrompt, quality | 2-4 | generate-image-fusion service |
| `create_script` | idea, targetDuration | 0 | generate-script service |
| `extend_video` | googleVideoUri, prompt | 0 | extend-video service |
| `create_storyboard` | concept, numFrames, style, aspectRatio | 1 × numFrames | multi-call generate_image |

Credits are deducted inside each tool's execution function — same `deductCredits()` as existing routes. No charge for pure conversation.

### Agent System Prompt (key excerpts)

```
You are Ving, an AI creative director for professional video and image production.

Your tools:
- generate_image: create photos, portraits, product shots (Flash=fast/cheap, Pro=high quality)
- generate_video: text or image to video up to 8s using Veo 3.1
- animate_character: animate a person photo to match a reference video motion (Kling)
- fuse_images: combine multiple reference images into one composite scene
- create_script: break a video idea into a list of timed clips
- extend_video: extend a previously generated video
- create_storyboard: generate multiple sequential frames as a storyboard

Saved characters: {characters_list}
Available credits: {balance}

Guidelines:
- For multi-step work (storyboards, scripts), confirm the plan before starting
- Always write cinematic, detailed prompts — never short or vague
- When a character is referenced by name, look them up in the saved characters list and pass their image as reference
- Narrate what you are doing step by step
- After showing results, offer to refine or iterate
- If credits are low, warn the user and suggest the most efficient approach
```

---

## New File Structure

```
app/
├── studio/
│   ├── page.tsx                    # New Studio page (replaces dashboard routing)
│   └── layout.tsx                  # Studio-specific layout wrapper
├── api/
│   ├── agent/
│   │   ├── chat/route.ts           # POST → SSE stream (Claude + tools)
│   │   └── sessions/
│   │       ├── route.ts            # GET (list), POST (create)
│   │       └── [id]/route.ts       # DELETE, PATCH (rename)
│   └── characters/
│       ├── route.ts                # GET (list), POST (create + R2 upload)
│       └── [id]/route.ts           # PUT (update), DELETE

components/
├── studio/
│   ├── StudioLayout.tsx            # 3-section layout (canvas + right rail + bottom bar)
│   ├── Canvas.tsx                  # Full-bleed image/video viewer
│   ├── HistoryRail.tsx             # Right: thumbnail strip
│   ├── ChatRail.tsx                # Right: agent chat messages
│   ├── BottomBar.tsx               # Prompt input + mode badge + send
│   └── GenerationPopup.tsx         # Floating settings panel (Image/Video/Frames/Ingredients)
├── characters/
│   ├── CharacterLibrary.tsx        # Grid picker for Ingredients tab
│   ├── CharacterCard.tsx           # Thumbnail + name + select state
│   └── CreateCharacterModal.tsx    # Upload photo + name form
└── agent/
    ├── ChatMessage.tsx             # User / assistant bubble with Markdown
    ├── ToolCallCard.tsx            # Animated "Generating video..." card
    └── AssetCard.tsx               # Inline result (thumbnail + "View" button)

lib/
├── agent/
│   ├── tools.ts                    # Zod schemas for all 7 tools
│   ├── system-prompt.ts            # Agent system prompt builder
│   └── execute-tool.ts             # Tool dispatch → service functions
└── types.ts                        # + Character interface

supabase/migrations/
└── 20260602_agent_characters.sql   # characters, chat_sessions, chat_messages tables
```

---

## New Dependencies

```bash
npm install ai @ai-sdk/anthropic zod react-markdown remark-gfm
```

| Package | Purpose |
|---------|---------|
| `ai` | Vercel AI SDK — handles SSE streaming + tool-use loop |
| `@ai-sdk/anthropic` | Claude provider for Vercel AI SDK |
| `zod` | Tool input schema validation |
| `react-markdown` | Render Claude's markdown in chat bubbles |
| `remark-gfm` | GitHub Flavored Markdown (tables, bold, etc.) |

---

## Implementation Phases

### Phase 1 — Database + Character API (3 days)

**Goal**: Characters can be created, listed, and deleted via API.

1. Write migration `20260602_agent_characters.sql`:
   - `characters` table + RLS
   - `chat_sessions` + `chat_messages` tables + RLS
2. `POST /api/characters`:
   - Accept `multipart/form-data` with image file + name + description
   - Upload image to R2 using existing `uploadToR2()`
   - Generate thumbnail (resize to 256px via sharp or canvas)
   - Save record to `characters` table
   - Return Character object
3. `GET /api/characters`: Return user's characters list
4. `DELETE /api/characters/[id]`: Delete R2 object + DB record
5. Add `Character` to `lib/types.ts`

**Deliverable**: Characters CRUD working, testable via curl.

---

### Phase 2 — Studio UI Shell (3 days)

**Goal**: New `/studio` page renders the 3-section layout with the generation popup.

6. `StudioLayout.tsx`: CSS grid layout — canvas area, right rail (collapsible), bottom bar
7. `Canvas.tsx`: Shows current image (`<img>`) or video (`<video>`) with fade transition between items
8. `HistoryRail.tsx`: Maps over `sessionHistory[]` → thumbnail cards; click → update canvas
9. `BottomBar.tsx`:
   - Textarea (auto-resize, Enter to send)
   - `+` dropdown: "Save Character", "Upload Image", "Upload Video"
   - `Agent` toggle button (state: active/inactive)
   - Mode badge (`Video □ 1x →`) — click opens `GenerationPopup`
   - Drag-and-drop zone (receives images/videos, adds to current generation context)
10. `GenerationPopup.tsx`:
    - Tabs: Image / Video
    - For Image: 5 aspect ratios, 1x-4x quantity, model dropdown
    - For Video: Frames sub-tab (start/end frame pickers) and Ingredients sub-tab (character selector + reference images)
    - Live credit cost: `quantity × creditCost`
    - Clicking outside dismisses popup
11. Wire `app/studio/page.tsx` to hold all shared state (`currentAsset`, `sessionHistory`, `agentMode`, `characters`)

**Deliverable**: Studio page renders, popup opens/closes, mode badge updates.

---

### Phase 3 — Generation in Studio (2 days)

**Goal**: Image and Video generation works from the new Studio UI.

12. On submit (non-agent mode):
    - Call existing `/api/generate-image` or `/api/generate-veo-video` based on mode
    - Show loading spinner on canvas
    - On success: update `currentAsset`, push to `sessionHistory`
    - For multi-quantity (x2-x4): generate in parallel, show a 2×2 grid in canvas
13. Frames mode: call `/api/generate-veo-video` with start-frame image (base64) + prompt
14. Ingredients mode: attach selected character image (base64) to generation request
15. `CharacterLibrary.tsx` inside the Ingredients tab — list user's characters as selectable cards

**Deliverable**: Full generation flow in new Studio UI.

---

### Phase 4 — Agent Backend (3 days)

**Goal**: `/api/agent/chat` streams Claude responses with working tools.

16. Install `ai`, `@ai-sdk/anthropic`, `zod`
17. `lib/agent/tools.ts`: Define all 7 tools using Zod schemas
18. `lib/agent/execute-tool.ts`: Dispatch tool calls → call service functions directly (import from `lib/` not internal fetch)
19. `lib/agent/system-prompt.ts`: Build prompt with user's character list + balance injected at request time
20. `app/api/agent/chat/route.ts`:
    ```typescript
    export async function POST(req) {
      // 1. Auth + CSRF
      // 2. Load conversation history from chat_messages
      // 3. Fetch user's characters for system prompt
      // 4. streamText({
      //      model: anthropic('claude-opus-4-8'),
      //      system: buildSystemPrompt(characters, balance),
      //      messages,
      //      tools,
      //      maxSteps: 5,
      //      onStepFinish: async ({ toolResults }) => {
      //        await persistMessages(sessionId, toolResults)
      //      }
      //    })
      // 5. Return toDataStreamResponse()
    }
    ```
21. `app/api/agent/sessions/route.ts`: CRUD for chat sessions
22. Credit deduction inside `execute-tool.ts` using same `deductCredits()` — no charge for plain text responses

**Deliverable**: `curl -N /api/agent/chat` streams tokens and tool calls correctly.

---

### Phase 5 — Agent Chat UI (3 days)

**Goal**: Chat Rail renders in real time; tool results appear as asset cards.

23. `ChatMessage.tsx`: User bubble (right-aligned, dark) vs. assistant bubble (left-aligned, with avatar). Render content with `react-markdown`.
24. `ToolCallCard.tsx`: Animated card shown while a tool is in progress:
    ```
    ┌──────────────────────────────────┐
    │  ⟳  Generating image...    0:12  │
    │     "Luna at golden hour"        │
    └──────────────────────────────────┘
    ```
    On completion → collapses into `AssetCard`.
25. `AssetCard.tsx`: Compact card with thumbnail, prompt excerpt, "View in canvas" button. Clicking it loads the asset into the main canvas.
26. `ChatRail.tsx`: Renders list of `ChatMessage` + `ToolCallCard` components. Auto-scrolls to bottom. Sticky input at top to distinguish from `BottomBar`.
27. Wire `BottomBar`'s Agent toggle to swap `HistoryRail` ↔ `ChatRail` on the right.
28. Connect SSE stream from `/api/agent/chat` into chat state using Vercel AI SDK's `useChat()` hook.

**Deliverable**: Full chat UI works. User can chat, see tool cards animate, and view results in canvas.

---

### Phase 6 — Character Management UI (2 days)

**Goal**: Users can create, browse, and delete characters.

29. `CreateCharacterModal.tsx`:
    - Drag-and-drop or file picker for portrait photo
    - Preview of uploaded image
    - Name and description fields
    - Submit → `POST /api/characters`
30. `CharacterCard.tsx`: Circular thumbnail + name + "×" delete button
31. `CharacterLibrary.tsx`: Horizontal scroll row in Ingredients tab + full management view accessible from LeftSidebar
32. Add "Characters" icon to `LeftSidebar.tsx` → opens full character grid view
33. Show character chips in the bottom bar when one is selected: `Luna □ 1x →`

**Deliverable**: Full character lifecycle. Characters appear in Ingredients and are sent to generation APIs.

---

### Phase 7 — Polish + Storyboard View (2 days)

**Goal**: Multi-frame storyboard visualization + session management.

34. When agent calls `create_storyboard`, render a horizontal filmstrip in the canvas area showing all generated frames side by side
35. Each frame is clickable to expand to full canvas
36. Session list accessible from top-left back arrow: shows past sessions with title + timestamp
37. Auto-title sessions after first exchange via a short `generateText()` call: "Fashion editorial with Luna"
38. Drag-and-drop onto the bottom bar accepts images/videos → base64 encodes → attaches to next generation as context

**Deliverable**: Complete storyboard view, session history, and drag-drop attachments.

---

## Credit Costs Summary

| Action | Cost | Notes |
|--------|------|-------|
| Agent conversation (text only) | 0 | No charge for planning |
| Image generation (Flash, 1K) | 1 credit | Per image |
| Image generation (Pro, 4K) | 3 credits | Per image |
| Image × quantity (x2/x3/x4) | × multiplier | Each is 1 separate generation |
| Video generation (Veo 3.1) | 1 credit | Per clip |
| Motion control (Kling) | 2 credits | Per clip |
| Script generation | 0 credits | Subsidized |
| Storyboard (N frames) | N × 1 credit | Per frame |
| Video extend | 0 credits | Free |
| Character save | 0 credits | Storage only |

---

## Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Agent model | `claude-opus-4-8` | Best tool use accuracy; fall back to `claude-sonnet-4-6` to cut cost |
| Streaming | Vercel AI SDK `streamText` + `toDataStreamResponse()` | Native Next.js App Router SSE support |
| Tool execution | Direct service fn calls (not internal fetch) | No CSRF complexity, no extra latency, no network hop |
| Character storage | R2 (image file) + Supabase (metadata) | Consistent with existing video/image storage pattern |
| Conversation storage | `chat_messages` table | Persistent history, queryable, consistent with credit audit trail |
| Multi-quantity | Parallel `Promise.all()` on client | Avoids single 4× slow serial request |
| Agent mode toggle | In-place right rail swap | Avoids full layout change; canvas stays in focus |
| Drag-drop | HTML5 `dragover`/`drop` on `BottomBar` | No extra library; base64-encodes files client-side |

---

## Estimated Timeline

| Phase | Work | Duration |
|-------|------|----------|
| 1 | Database + Character API | 3 days |
| 2 | Studio UI Shell | 3 days |
| 3 | Generation in Studio | 2 days |
| 4 | Agent Backend | 3 days |
| 5 | Agent Chat UI | 3 days |
| 6 | Character Management UI | 2 days |
| 7 | Polish + Storyboard | 2 days |
| **Total** | | **~18 days** |

**Recommended start order**: Phase 1 → Phase 2 → Phase 3 (validate the new UI with existing generation, no agent yet) → Phase 4 → Phase 5 → Phase 6 → Phase 7.

This lets you ship a useful Studio redesign in the first week before the agent is complete.
