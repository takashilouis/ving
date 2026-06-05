# Sprint: AI Agent Mode + Character System

**Status legend:**
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

**48 tasks total** — ordered by dependency. Work top-to-bottom within each group.

---

## GROUP 1 — Foundation
> Everything depends on this group. Do first.

- [x] **T01 — Run DB migration**
  Run `supabase/migrations/20260602_agent_characters.sql` in Supabase dashboard.
  Creates: `characters`, `chat_sessions`, `chat_messages` tables + RLS policies.
  **✓ Executed in Supabase SQL Editor.**

- [x] **T02 — Add agent API keys to `.env`**
  Add both keys. The agent will use whichever is set via `AGENT_PROVIDER`.

  ```env
  # Agent LLM provider — set to "gemini" or "deepseek"
  AGENT_PROVIDER=gemini

  # Gemini — reuse the same key already used for image/video generation
  # (The existing admin DB key works; this env var is for the agent SDK directly)
  GEMINI_API_KEY=your-gemini-key-here

  # DeepSeek — alternative agent provider
  DEEPSEEK_API_KEY=your-deepseek-key-here
  ```

  **Gemini key**: same key already stored in `admin_api_keys` table — get it from Google AI Studio (aistudio.google.com).
  **DeepSeek key**: get from platform.deepseek.com.

  **Model mapping:**
  | Provider | Model | Best for |
  |----------|-------|----------|
  | `gemini` | `gemini-2.5-flash` | Fast responses, lower cost |
  | `gemini` | `gemini-2.5-pro` | Complex multi-step workflows |
  | `deepseek` | `deepseek-chat` | Strong instruction following, low cost |
  | `deepseek` | `deepseek-reasoner` | Step-by-step reasoning (slower) |

  **Recommended default:** `gemini` + `gemini-2.5-flash` — already integrated into the project, no new billing account needed.

- [x] **T03 — Update `lib/types.ts`**
  Add interfaces: `Character`, `ChatSession`, `StudioAsset`, `GeneratedAssetRef`, `ToolCallRecord`, `AgentChatMessage`.
  Also added: `GenerationSettings`, `GenerationMode`, `AspectRatio`, `Quantity`, `ToolStatus`.

- [x] **T04 — Swap packages: remove Anthropic, add Gemini + DeepSeek**

  ```bash
  npm uninstall @ai-sdk/anthropic
  npm install @ai-sdk/google @ai-sdk/deepseek
  ```

  Final agent-related packages in `package.json`:
  ```json
  "ai": "^6.x",
  "@ai-sdk/google": "latest",
  "@ai-sdk/deepseek": "latest",
  "zod": "^4.x",
  "react-markdown": "^10.x",
  "remark-gfm": "^4.x"
  ```

  Create `lib/agent/provider.ts` to centralise model selection — used by T20 (`/api/agent/chat`):
  ```typescript
  import { google } from '@ai-sdk/google';
  import { deepseek } from '@ai-sdk/deepseek';

  export function getAgentModel() {
    const provider = process.env.AGENT_PROVIDER ?? 'gemini';

    if (provider === 'deepseek') {
      const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
      return deepseek(model);
    }

    // Default: Gemini
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    return google(model);
  }
  ```

  Then in T20, replace `anthropic('claude-opus-4-8')` with `getAgentModel()`.
  Switching providers requires only an env var change — no code change.
  **✓ `@ai-sdk/anthropic` removed. `@ai-sdk/google` + `@ai-sdk/deepseek` installed. `lib/agent/provider.ts` created.**

---

## GROUP 2 — Service Layer
> Extract AI logic from route handlers so the agent can call them directly (no HTTP, no CSRF overhead).

- [x] **T05 — `lib/services/generate-image.ts`**
  Extract Gemini image gen logic from `app/api/generate-image/route.ts`.
  Export: `generateImageService(input)` → `{ imageUrl }`.
  Handles: API key fetch, Gemini call, R2 upload. No credit logic.

- [x] **T06 — `lib/services/generate-video.ts`**
  Extract `generateWithGemini()` from `app/api/generate-veo-video/route.ts`.
  Export: `generateVideoService(input)` → `{ videoUrl, googleVideoUri }`.

- [x] **T07 — `lib/services/kling-motion.ts`**
  Extract Kling polling logic + JWT generation helper.
  Export: `klingMotionService(input)` → `{ videoUrl }`.

- [x] **T08 — `lib/services/generate-image-fusion.ts`**
  Extract fusion logic from `app/api/generate-image-fusion/route.ts`.
  Export: `generateImageFusionService(input)` → `{ imageUrl }`.

- [x] **T09 — `lib/services/generate-script.ts`**
  Extract Gemini script gen from `app/api/generate-script/route.ts`.
  Export: `generateScriptService(input)` → `{ clips[] }`.

- [x] **T10 — `lib/services/extend-video.ts`**
  Extract `extendWithGemini()` from `app/api/extend-video/route.ts`.
  Export: `extendVideoService(input)` → `{ videoUrl, newGoogleVideoUri }`.

---

## GROUP 3 — Character Backend

- [ ] **T11 — `lib/characters/service.ts`**
  - `getCharacters(userId)` → `Character[]`
  - `resolveCharacterImage(characterId, userId)` → raw base64 string (no `data:` prefix)
  Used by agent tools to inject character photos into generation calls.

- [ ] **T12 — `app/api/characters/route.ts`**
  - `GET` — list user's characters from DB ordered by `created_at` desc
  - `POST` — accept `multipart/form-data` (image + name + description), upload to R2 under `characters/{userId}/{timestamp}-{filename}`, insert DB row, return `Character`

- [ ] **T13 — `app/api/characters/[id]/route.ts`**
  - `PUT` — update name / description, set `updated_at`
  - `DELETE` — delete R2 object (best-effort) + delete DB row

---

## GROUP 4 — Agent Backend

- [ ] **T14 — `lib/agent/types.ts`**
  Interfaces: `AgentChatRequest`, `AgentChatContext`, `ToolExecutionContext`.

- [ ] **T15 — `lib/agent/system-prompt.ts`**
  `buildSystemPrompt(characters, balance)` → injects character list (name + id + description) and credit balance. Characters listed as `"Luna" (id: xxx): description`.

- [ ] **T16 — `lib/agent/tools.ts`**
  Define all 7 tools using Vercel AI SDK `tool()` + Zod schemas:
  - `generate_image` — prompt, aspectRatio, model, quality, quantity, characterId?
  - `generate_video` — prompt, duration, aspectRatio, characterId?
  - `animate_character` — characterId, referenceVideoUrl, orientation, prompt?
  - `fuse_characters` — characterIds[], fusionPrompt, quality, aspectRatio
  - `create_script` — idea, targetDuration
  - `extend_video` — googleVideoUri, prompt?
  - `create_storyboard` — concept, numFrames, style, aspectRatio, characterId?

- [ ] **T17 — `lib/agent/execute-tool.ts`**
  `executeTool(toolName, input, ctx)` switch statement:
  - Resolves `characterId` → base64 via `resolveCharacterImage()`
  - Calls `checkCredits()` before generation
  - Calls service fn (T05–T10)
  - Calls `deductCredits()` after success
  - Returns structured result: `{ images[] | video | storyboard[] | clips[] }`

- [ ] **T18 — `app/api/agent/sessions/route.ts`**
  - `GET` — list user's chat sessions ordered by `updated_at` desc
  - `POST` — create new session with title "New Chat", return `{ id, title, createdAt }`

- [ ] **T19 — `app/api/agent/sessions/[id]/route.ts`**
  - `PATCH` — rename session title
  - `DELETE` — delete session (messages cascade via FK)

- [ ] **T20 — `app/api/agent/chat/route.ts`**
  Main SSE streaming endpoint:
  1. Auth check (Supabase)
  2. CSRF validation
  3. Load `characters[]` + `balance` in parallel
  4. `buildSystemPrompt(characters, balance)`
  5. `streamText({ model: anthropic('claude-opus-4-8'), tools: agentTools, maxSteps: 6 })`
  6. `onStepFinish` → persist to `chat_messages` (content + tool_calls + assets)
  7. `onFinish` → auto-title session if still "New Chat"
  8. Return `result.toDataStreamResponse()`

---

## GROUP 5 — Studio UI Shell

- [ ] **T21 — `app/studio/layout.tsx`**
  Minimal layout: full height, `bg-[#0A0A0A]`, no shared dashboard header.
  Wraps `AuthContext`. Auth gate: redirect to `/` if not signed in.

- [ ] **T22 — `app/studio/page.tsx`**
  Holds all shared state:
  - `currentAsset`, `sessionHistory[]`
  - `settings` (mode, aspectRatio, quantity, model, selectedCharacterIds, attachedImages)
  - `agentMode` (bool), `activeSessionId`
  - `characters[]`, `isGenerating`, `progress`

- [ ] **T23 — `components/studio/StudioLayout.tsx`**
  CSS grid: `"topbar topbar" / "canvas rail" / "bottombar bottombar"`.
  Columns: `1fr 280px`. Rows: `48px 1fr 80px`.
  Right rail collapsible via `showRail` state.
  Conditionally renders `HistoryRail` or `ChatRail` based on `agentMode`.

- [ ] **T24 — `components/studio/Canvas.tsx`**
  Full-bleed content viewer:
  - Image: `<img>` with fade-in transition
  - Video: `<video autoPlay loop muted playsInline>`
  - Multiple assets (quantity > 1): 2×2 grid
  - Empty: centered dark placeholder + hint text
  - Download button overlay on hover

- [ ] **T25 — `components/studio/HistoryRail.tsx`**
  Vertical scroll list of session history thumbnails (80px wide tiles).
  Most recent at top. Click tile → `onAssetSelect(asset)`.
  Header row with "Hide history" button.
  Empty state: "Your generations will appear here."

- [ ] **T26 — `components/studio/BottomBar.tsx`**
  - Auto-resize `textarea` (Enter = submit, Shift+Enter = newline)
  - Left: `+` dropdown → "Save Character", "Upload Image", "Upload Video"
  - `Agent` pill toggle button (green when active)
  - Center: prompt input with drag-and-drop zone for images/videos
  - Right: mode badge button (`Image ▣ 1x →`) — click opens `GenerationPopup`
  - Character chips row above input when characters are attached

- [ ] **T27 — `components/studio/GenerationPopup.tsx`**
  Floats above BottomBar (absolute positioned, `bottom-full`).
  - Tabs: **Image** / **Video**
  - Image tab: 5 aspect ratio buttons (16:9 4:3 1:1 3:4 9:16), 1x–4x quantity, model dropdown
  - Video tab: **Frames** sub-tab (Start ⇄ End frame pickers), **Ingredients** sub-tab (character selector)
  - Live credit cost: `base × quantity`
  - Click outside → close

---

## GROUP 6 — Generation Wiring in Studio

- [ ] **T28 — Image generation submit**
  On submit (mode=image): `Promise.all` N calls to `/api/generate-image` for quantity.
  Show spinner on Canvas. On success: `addAssetToHistory()` for each result.
  If `selectedCharacterIds[0]` set: fetch base64, include as `referenceImageBase64`.

- [ ] **T29 — Video generation submit**
  On submit (mode=video): call `/api/generate-veo-video`.
  Handle async polling (same pattern as existing dashboard).
  If character selected: pass base64 as `imageBase64` (image-to-video mode).
  Update canvas on completion.

- [ ] **T30 — Frames mode submit**
  On submit (mode=frames): call generate-video with `imageBase64` = start frame.
  Start and end frame pickers shown in Ingredients tab of popup.

- [ ] **T31 — Character ingredient wiring**
  When `settings.selectedCharacterIds` is non-empty:
  Fetch character image, attach to generation request.
  Show character name in mode badge: `Luna ▣ 1x →`.

---

## GROUP 7 — Character UI

- [ ] **T32 — `components/characters/CharacterCard.tsx`**
  Two sizes:
  - `sm` (64px circle): used in Ingredients tab, selected = green ring + checkmark
  - `md` (120px rounded square): used in library, shows pencil + × delete icons

- [ ] **T33 — `components/characters/CharacterLibrary.tsx`**
  Grid of `CharacterCard` components. Fetches from `GET /api/characters` on mount.
  "+ New Character" card at start → opens `CreateCharacterModal`.
  Used in: GenerationPopup Ingredients tab (horizontal scroll) + standalone view.

- [ ] **T34 — `components/characters/CreateCharacterModal.tsx`**
  - Drag-drop upload zone + circular photo preview
  - Name (required) + description (optional) text inputs
  - `POST /api/characters` with `multipart/form-data`
  - Upload progress bar (XHR `upload.onprogress`)
  - On success: add to `characters[]` state, close modal, show toast

- [ ] **T35 — `components/characters/CharacterPicker.tsx`**
  Dropdown shown when user types `@` in chat input.
  Filters characters by typed query. Each row: thumbnail + name + description.
  Click → `onSelect(character)`. Dismiss on Escape or click outside.

- [ ] **T36 — `components/characters/CharacterChip.tsx`**
  Small pill chip: circular thumbnail + name + `×` remove button.
  Shown above chat input when character is @mentioned.
  `onRemove` → removes from `attachedCharacterIds[]`.

- [ ] **T37 — Characters access in Studio**
  In `BottomBar` `+` dropdown: "Manage Characters" → opens `CharacterLibrary`.
  Characters also selectable from `GenerationPopup > Video > Ingredients` tab.

---

## GROUP 8 — Agent Chat UI

- [ ] **T38 — `components/agent/ChatMessage.tsx`**
  - User bubble: right-aligned, `bg-[#1A1A1A]`, `rounded-2xl rounded-tr-sm`
  - Assistant bubble: left-aligned, transparent bg, left avatar dot
  - Both render text via `ReactMarkdown` + `remarkGfm`
  - Assistant messages iterate `message.toolInvocations` → render `ToolCallCard` per invocation

- [ ] **T39 — `components/agent/ToolCallCard.tsx`**
  - While `state === 'call'`: spinner + label (`"Generating image 'Luna at golden hour'..."`) + elapsed timer
  - Elapsed timer: `useEffect` incrementing seconds display (`0:12`)
  - Shows character name when `input.characterId` matches a saved character
  - When `state === 'result'`: render `AssetCard` (single) or `StoryboardGrid` (multiple frames)

- [ ] **T40 — `components/agent/AssetCard.tsx`**
  Compact result card:
  - 80px thumbnail (image or video with play icon overlay)
  - Truncated prompt text
  - "View" button → calls `onAssetSelect(asset)` to load into Canvas

- [ ] **T41 — `components/studio/ChatRail.tsx`**
  Wires the agent chat using `useChat()` from `ai/react`:
  - `api: '/api/agent/chat'`
  - `headers: { 'X-CSRF-Token': csrfToken }`
  - `body: { sessionId, attachedCharacterIds, attachedImages }`
  - Renders `ChatMessage` list, auto-scrolls to bottom
  - Detects `@` input → shows `CharacterPicker`
  - Shows `CharacterChip` row for attached characters
  - `onFinish`: extract assets from tool invocations → call `onAssetGenerated()`

- [ ] **T42 — Wire Agent toggle**
  In `StudioLayout`: toggle `agentMode` swaps right rail between `HistoryRail` and `ChatRail`.
  On toggle ON: if `activeSessionId` is null → `POST /api/agent/sessions` to create one.

- [ ] **T43 — Tool results → Canvas wiring**
  In `ChatRail.onFinish`: parse `message.toolInvocations` for completed tools.
  Extract `url` from results. Call `onAssetGenerated(asset)` to update `currentAsset` + `sessionHistory` in Studio page.

---

## GROUP 9 — Navigation & Session Management

- [ ] **T44 — Studio entry point**
  In existing `LeftSidebar.tsx`: add a Studio / sparkle icon tab.
  Navigates to `/studio`. Highlight when on `/studio` route.

- [ ] **T45 — Session list UI**
  In Studio top bar: show current session title (editable on click).
  Dropdown of recent sessions from `GET /api/agent/sessions`.
  "New session" button → `POST /api/agent/sessions` → clears chat state.
  Clicking a past session loads its messages.

- [ ] **T46 — Load session messages**
  Add `GET /api/agent/sessions/[id]/messages` route.
  Returns `chat_messages` ordered by `created_at` asc.
  `ChatRail` loads these as initial messages when switching sessions.

---

## GROUP 10 — Polish & Edge Cases

- [ ] **T47 — Storyboard grid in chat**
  When tool result contains `storyboard[]` (multiple frames):
  Render a horizontal filmstrip in `ToolCallCard` instead of a single `AssetCard`.
  Each frame clickable → loads into Canvas. Frame number label below each.

- [ ] **T48 — Empty states, loading, toasts**
  - Canvas empty state: "What do you want to create?" centered hint
  - HistoryRail empty: "Your generations will appear here"
  - ChatRail empty: "Ask the agent to create something"
  - Character library empty: "No characters saved yet — click + to add one"
  - Skeleton loader for character library fetch
  - Toast notifications: character saved ✓ / character deleted / generation error

---

## Dependency Map

```
[T01–T04] Foundation
  ├── [T05–T10] Services
  │     └── [T11–T13] Character Backend
  │           └── [T14–T20] Agent Backend ──────────────────┐
  └── [T21–T27] Studio UI Shell                              │
        ├── [T28–T31] Generation Wiring                      │
        ├── [T32–T37] Character UI                           │
        │     └── [T38–T43] Agent Chat UI ←──────────────────┘
        │           └── [T44–T46] Navigation
        │                 └── [T47–T48] Polish
        └── (T44 also depends on T21)
```

**Minimum viable demo** (agent works end-to-end):
T01 → T04 → T05–T10 → T11–T13 → T14–T20 → T21–T27 → T38–T43

**Skip for MVP:** T30 (frames mode), T37 (character management view), T45–T46 (session switching), T47–T48 (polish)
