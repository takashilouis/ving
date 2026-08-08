# Ving API Reference

This document describes the API routes implemented under `app/api`. The API is built with Next.js App Router route handlers and uses Supabase cookie-based auth, Supabase Postgres, admin-managed provider keys, Cloudflare R2 storage, and a credit ledger.

## Shared Conventions

- Base path: all endpoints are relative to the application origin.
- Authentication: most user endpoints require a valid Supabase session cookie. Unauthenticated routes are called out explicitly.
- CSRF: routes wrapped with `withCsrfProtection` require an `x-csrf-token` header for `POST`, `PUT`, `PATCH`, and `DELETE`.
- CSRF token bootstrap: call `GET /api/csrf-token`, store the returned `csrfToken`, and send it in `x-csrf-token`.
- Responses: JSON unless noted. Error responses generally use `{ "error": "message" }`.
- Credits: generation credits are checked before expensive provider calls and deducted only after successful generation.
- Persistence: generated media is uploaded to R2 when possible and saved to Supabase history tables. Some routes fall back to `data:` URLs if R2 upload fails.

## Route Overview

| Route | Methods | Auth | CSRF | Purpose |
| --- | --- | --- | --- | --- |
| `/api/csrf-token` | `GET` | No | No | Issue CSRF cookies and token |
| `/api/credits/balance` | `GET` | Yes | No | Fetch credit balance |
| `/api/generate-veo-video` | `POST` | Yes | Yes | Start or generate a Veo video |
| `/api/generate-veo-video/poll` | `POST` | Yes | Yes | Poll Vertex Veo async operation |
| `/api/extend-video` | `POST` | Yes | Yes | Extend a Veo video by Google URI |
| `/api/kling-motion` | `POST` | Yes | Yes | Generate Kling motion-control video |
| `/api/generate-image` | `POST` | Yes | Yes | Generate a Gemini image |
| `/api/generate-image-fusion` | `POST` | Yes | Yes | Fuse 2-5 images into one image |
| `/api/generate-script` | `POST` | Yes | Yes | Generate multi-clip video script |
| `/api/upload-image` | `POST` | No | Yes | Upload image file to R2 |
| `/api/upload-video` | `POST` | No | Yes | Upload video file to R2 |
| `/api/download` | `GET` | No | No | Proxy remote file download |
| `/api/history/images` | `GET`, `DELETE` | Yes | No | List/delete generated image history |
| `/api/history/videos` | `GET`, `DELETE` | Yes | No | List/delete generated video history |
| `/api/user/video-history` | `GET`, `POST`, `DELETE` | Yes | No | Legacy video history table |
| `/api/characters` | `GET`, `POST` | Yes | POST only | List/create saved characters |
| `/api/characters/[id]` | `PUT`, `DELETE` | Yes | Yes | Update/delete saved character |
| `/api/agent/chat` | `POST` | Yes | Yes | Stream AI agent chat response |
| `/api/agent/sessions` | `GET`, `POST` | Yes | POST only | List/create agent sessions |
| `/api/agent/sessions/[id]` | `PATCH`, `DELETE` | Yes | Yes | Rename/delete agent session |
| `/api/admin/api-keys` | `GET`, `POST`, `DELETE` | Admin | POST/DELETE only | Manage platform provider keys |
| `/api/admin/upload-asset` | `POST` | Admin | Yes | Upload admin site asset |
| `/api/user/api-keys` | `GET`, `POST`, `DELETE` | Yes | No | Legacy per-user BYOK keys |
| `/api/migrate-storage` | `POST` | Yes | No | Legacy localStorage key migration |

## Authentication And CSRF

### `GET /api/csrf-token`

Issues:

- `csrf-secret` httpOnly cookie
- `csrf-token` readable cookie
- JSON body containing the token

Response:

```json
{
  "csrfToken": "..."
}
```

Use the returned token as `x-csrf-token` on CSRF-protected state-changing requests.

### Authenticated User

Most routes call `createClient().auth.getUser()` and return `401` when there is no active session.

### Admin User

Admin routes additionally look up `user_profiles.is_admin = true` using the service role client. Non-admin users receive `403`.

## Credits

Credit costs are defined in `lib/credits.ts`.

| Operation | Cost |
| --- | ---: |
| Veo video generation | 1 |
| Veo video extension | 1 |
| Kling motion control | 2 |
| Flash image 1K | 1 |
| Pro image 1K | 1 |
| Pro image 2K | 2 |
| Pro image 4K | 3 |
| Image fusion standard | 2 |
| Image fusion pro/4K | 4 |

### `GET /api/credits/balance`

Returns the authenticated user's balance.

Response:

```json
{
  "balance": 10,
  "totalEarned": 10,
  "totalSpent": 0,
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

Errors:

- `401` unauthorized
- `404` credits row missing
- `500` database/internal error

## Video Generation

### `POST /api/generate-veo-video`

Generates a Veo video. The route supports two provider modes:

- `VEO_PROVIDER=gemini` or unset: server waits for Gemini operation completion, downloads video, uploads to R2, deducts credits, saves history, and returns the video URL.
- `VEO_PROVIDER=vertex`: route starts a Vertex long-running operation and returns `operationName`; the client must poll `/api/generate-veo-video/poll`.

Request:

```json
{
  "prompt": "A cinematic product shot of a green glass bottle on wet stone",
  "duration": 6,
  "aspectRatio": "16:9",
  "resolution": "720p",
  "imageBase64": "optional raw base64 image bytes",
  "imageMimeType": "image/png"
}
```

Fields:

- `prompt`: required unless `imageBase64` is provided.
- `duration`: defaults to `6`; `1080p` and `4k` force `8`.
- `aspectRatio`: defaults to `16:9`.
- `resolution`: defaults to `720p`.
- `imageBase64`, `imageMimeType`: optional image-to-video input.

Gemini response:

```json
{
  "success": true,
  "videoUrl": "https://...",
  "googleVideoUri": "https://...",
  "prompt": "...",
  "duration": 6,
  "creditsUsed": 1,
  "remainingBalance": 9
}
```

Vertex response:

```json
{
  "async": true,
  "operationName": "projects/.../operations/...",
  "prompt": "...",
  "duration": 6,
  "aspectRatio": "16:9"
}
```

Errors:

- `400` missing prompt or safety block
- `401` unauthorized
- `402` insufficient credits with `balance` and `required`
- `429` quota/limit
- `500` generation failure

Side effects:

- Deducts 1 credit after successful Gemini generation.
- Inserts into `generated_videos` with `source = "veo"`.
- Stores `google_uri` for later extension when available.

### `POST /api/generate-veo-video/poll`

Polls a Vertex Veo operation once. This endpoint does not loop; clients should call it repeatedly.

Request:

```json
{
  "operationName": "projects/.../operations/...",
  "prompt": "Original prompt",
  "duration": 6,
  "aspectRatio": "16:9"
}
```

Processing:

- Fetches operation from Vertex using `VERTEX_API_KEY`.
- If incomplete, returns `{ "done": false }`.
- If complete, decodes `bytesBase64Encoded`, uploads to R2, deducts 1 credit, and saves history.

Incomplete response:

```json
{
  "done": false
}
```

Complete response:

```json
{
  "done": true,
  "videoUrl": "https://...",
  "prompt": "...",
  "duration": 6,
  "creditsUsed": 1,
  "remainingBalance": 9
}
```

Errors:

- `400` safety block
- `401` unauthorized
- `402` insufficient credits at completion time
- `500` poll/generation failure

### `POST /api/extend-video`

Extends a Veo video using its Google video URI.

Request:

```json
{
  "googleVideoUri": "https://...",
  "prompt": "Continue the camera move into a wider reveal",
  "originalPrompt": "Original prompt",
  "aspectRatio": "16:9",
  "originalDuration": 8
}
```

Response:

```json
{
  "success": true,
  "videoUrl": "https://...",
  "googleVideoUri": "https://...",
  "creditsUsed": 1,
  "remainingBalance": 8,
  "persistenceWarning": "optional warning"
}
```

Notes:

- Costs 1 Veo credit.
- Google Files API URIs can expire; expired or inaccessible URIs return a user-facing error.
- Saves a new `generated_videos` row with duration `originalDuration + 7`.

Errors:

- `400` missing URI, safety block, or unsupported aspect ratio
- `401` unauthorized
- `402` insufficient credits
- `429` quota/limit
- `500` extension failure

### `POST /api/kling-motion`

Creates a Kling motion-control video where a character image follows a reference video.

Request:

```json
{
  "imageBase64": "data:image/png;base64,...",
  "videoUrl": "https://public-reference-video.mp4",
  "orientation": "video",
  "prompt": "Keep the dancer energetic and natural"
}
```

Fields:

- `imageBase64`: required. Data URL prefix is stripped before calling Kling.
- `videoUrl`: required public video URL.
- `orientation`: required, usually `video` or `image`.
- `prompt`: optional.

Processing:

- Fetches admin `kling_access` and `kling_secret` keys.
- Signs Kling JWTs with HS256.
- Starts `POST https://api.klingai.com/v1/videos/motion-control`.
- Polls every 5 seconds up to 30 minutes.
- On success, deducts 2 credits and saves `generated_videos` with `source = "kling"`.

Response:

```json
{
  "videoUrl": "https://...",
  "prompt": "Motion Control Video",
  "duration": 5,
  "taskId": "...",
  "videoId": "...",
  "creditsUsed": 2,
  "remainingBalance": 8
}
```

Errors:

- `400` missing input or Kling API error
- `401` unauthorized
- `402` insufficient credits
- `408` timeout
- `503` admin Kling keys unavailable
- `500` internal/generation failure

## Image Generation

### `POST /api/generate-image`

Generates a single image with Gemini image models.

Request:

```json
{
  "prompt": "A studio portrait of a futuristic sneaker",
  "model": "pro",
  "quality": "2K",
  "aspectRatio": "16:9"
}
```

Fields:

- `prompt`: required.
- `model`: `flash` or `pro`; defaults to `pro`.
- `quality`: `1K`, `2K`, or `4K`; defaults to `1K`.
- `aspectRatio`: `1:1`, `16:9`, `9:16`, `4:3`, or `3:4`; defaults to `16:9`.
- `4K` requires `model = "pro"`.

Processing:

- Calls Gemini REST `generateContent`.
- Crops/resizes with Sharp to the requested aspect ratio and quality tier.
- Uploads PNG to R2 if possible.
- Deducts credits after successful generation.
- Saves to `generated_images`.

Response:

```json
{
  "success": true,
  "imageUrl": "https://...",
  "prompt": "...",
  "model": "pro",
  "quality": "2K",
  "aspectRatio": "16:9",
  "creditsUsed": 2,
  "remainingBalance": 8
}
```

Errors:

- `400` missing/invalid inputs or safety block
- `401` unauthorized or invalid provider key
- `402` insufficient credits
- `429` quota/limit
- `503` admin Gemini key unavailable
- `500` generation failure

### `POST /api/generate-image-fusion`

Fuses 2-5 input images into one cohesive image.

Request:

```json
{
  "images": [
    { "data": "data:image/png;base64,..." },
    { "data": "data:image/jpeg;base64,..." }
  ],
  "prompt": "Combine the subject from image one with the background from image two",
  "aspectRatio": "1:1",
  "quality": "standard"
}
```

Fields:

- `images`: required array of 2-5 data URL images.
- `prompt`: optional instruction.
- `aspectRatio`: one of `16:9`, `9:16`, `1:1`, `3:4`, `4:3`; defaults to `16:9`.
- `quality`: `standard` or `pro`; defaults to `standard`.

Response:

```json
{
  "success": true,
  "imageUrl": "https://...",
  "prompt": "Fusion of 2 images",
  "quality": "standard",
  "aspectRatio": "1:1",
  "sourceImages": 2,
  "creditsUsed": 2,
  "remainingBalance": 8
}
```

Errors:

- `400` invalid image count/format, invalid quality/aspect ratio, safety block
- `401` unauthorized or invalid provider key
- `402` insufficient credits
- `429` quota/limit
- `503` admin Gemini key unavailable
- `500` fusion failure

## Script Generation

### `POST /api/generate-script`

Generates a structured list of video clip prompts from a user idea. This route authenticates the user and uses the admin Gemini key, but it does not deduct credits.

Request:

```json
{
  "idea": "A 30 second fashion ad for reflective rainwear",
  "videoLength": 30
}
```

Processing:

- `videoLength <= 50` uses 4-second clips.
- Longer videos use 6-second clips.
- `numClips = floor(videoLength / clipDuration)`.
- Parses JSON arrays even if wrapped in Markdown fences.

Response:

```json
{
  "success": true,
  "clips": [
    {
      "id": "clip-1",
      "prompt": "Detailed cinematic prompt...",
      "duration": 4
    }
  ]
}
```

Errors:

- `400` missing idea
- `401` unauthorized or invalid provider key
- `503` admin Gemini key unavailable
- `500` script generation or JSON parse failure

## Uploads And Downloads

### `POST /api/upload-image`

Uploads an image to R2. This route is CSRF-protected but does not currently require authentication.

Request: `multipart/form-data`

| Field | Type | Required |
| --- | --- | --- |
| `file` | File | Yes |

Validation:

- MIME types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`
- Max size: 20 MB

Response:

```json
{
  "url": "https://...",
  "filename": "uploads/...",
  "size": 12345,
  "type": "image/png"
}
```

### `POST /api/upload-video`

Uploads a video to R2 for workflows such as Kling motion control. This route is CSRF-protected but does not currently require authentication.

Request: `multipart/form-data`

| Field | Type | Required |
| --- | --- | --- |
| `file` | File | Yes |

Validation:

- MIME types: `video/mp4`, `video/quicktime`, `video/x-msvideo`
- Max size: 100 MB

Response:

```json
{
  "url": "https://...",
  "filename": "motion-videos/...",
  "size": 12345,
  "type": "video/mp4"
}
```

### `GET /api/download`

Proxies a remote URL as an attachment.

Query parameters:

- `url`: required source URL.
- `filename`: optional attachment filename.

Response:

- Body: streamed remote response body.
- Headers: `Content-Disposition: attachment; filename="..."`, `Content-Type`.

Errors:

- `400` missing `url`
- `500` remote fetch/proxy failure

## History

### `GET /api/history/images`

Returns the authenticated user's newest 50 generated images from `generated_images`.

Response:

```json
{
  "images": [
    {
      "id": "...",
      "url": "https://...",
      "prompt": "...",
      "model": "pro",
      "quality": "1K",
      "aspectRatio": "16:9",
      "timestamp": 1767225600000
    }
  ]
}
```

### `DELETE /api/history/images?id={imageId}`

Deletes an image history row owned by the authenticated user.

Response:

```json
{ "success": true }
```

### `GET /api/history/videos`

Returns the authenticated user's newest 50 generated videos from `generated_videos`.

Response:

```json
{
  "videos": [
    {
      "id": "...",
      "url": "https://...",
      "prompt": "...",
      "duration": 6,
      "source": "veo",
      "aspectRatio": "16:9",
      "resolution": "720p",
      "googleVideoUri": "https://...",
      "timestamp": 1767225600000
    }
  ]
}
```

### `DELETE /api/history/videos?id={videoId}`

Deletes a video history row owned by the authenticated user.

Response:

```json
{ "success": true }
```

### `GET /api/user/video-history`

Legacy history API backed by the `video_history` table.

Query parameters:

- `limit`: optional, defaults to `20`.
- `offset`: optional, defaults to `0`.

Response: array of raw `video_history` rows.

### `POST /api/user/video-history`

Creates a legacy video history row.

Request:

```json
{
  "videoUrl": "https://...",
  "videoType": "veo",
  "prompt": "...",
  "duration": 6,
  "aspectRatio": "16:9",
  "metadata": {}
}
```

`videoType` must be `veo` or `kling-motion`.

### `DELETE /api/user/video-history`

Soft-deletes a legacy video history row.

Request:

```json
{
  "videoId": "..."
}
```

Response:

```json
{ "success": true }
```

## Characters

Saved characters are user-owned images stored in R2 with metadata in `characters`.

### `GET /api/characters`

Lists the authenticated user's characters.

Response:

```json
{
  "characters": [
    {
      "id": "...",
      "userId": "...",
      "name": "Ava",
      "description": "Lead model",
      "imageUrl": "https://...",
      "thumbnailUrl": null,
      "tags": [],
      "createdAt": 1767225600000
    }
  ]
}
```

### `POST /api/characters`

Creates a character.

Request: `multipart/form-data`

| Field | Type | Required |
| --- | --- | --- |
| `image` | File | Yes |
| `name` | string | Yes |
| `description` | string | No |

Validation:

- Image types: JPEG, PNG, WebP
- Max size: 10 MB

Response: `{ "character": Character }` with status `201`.

### `PUT /api/characters/[id]`

Updates character name and description.

Request:

```json
{
  "name": "Ava",
  "description": "Updated description"
}
```

Response: `{ "character": Character }`.

### `DELETE /api/characters/[id]`

Deletes a character owned by the authenticated user. The R2 image is deleted best-effort when its URL starts with `R2_PUBLIC_URL`.

Response:

```json
{ "success": true }
```

## Agent Chat

### `POST /api/agent/chat`

Streams an AI agent response using the Vercel AI SDK `ToolLoopAgent`.

Request:

```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "Create a storyboard for a sneaker ad" }]
    }
  ],
  "sessionId": "...",
  "attachedCharacterIds": ["..."],
  "attachedImages": ["data:image/png;base64,..."]
}
```

Fields:

- `messages`: required AI SDK UI messages array.
- `sessionId`: optional. If present, user and assistant messages are persisted on finish.
- `attachedCharacterIds`: optional saved character IDs used in the system prompt.
- `attachedImages`: optional image data URLs appended to the last user message.

Agent tools:

- `generate_image`
- `generate_video`
- `animate_character`
- `fuse_characters`
- `create_script`
- `extend_video`
- `create_storyboard`

Response:

- Streaming AI SDK UI response, not a simple JSON payload.

Side effects:

- Reads characters and credit balance for context.
- Tool calls may generate media and deduct credits.
- Persists `chat_messages` and updates `chat_sessions` when `sessionId` is supplied.

### `GET /api/agent/sessions`

Lists the authenticated user's agent chat sessions.

Response:

```json
{
  "sessions": [
    {
      "id": "...",
      "userId": "...",
      "title": "New Chat",
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000
    }
  ]
}
```

### `POST /api/agent/sessions`

Creates a new session titled `New Chat`.

Response:

```json
{
  "session": {
    "id": "...",
    "userId": "...",
    "title": "New Chat",
    "createdAt": 1767225600000,
    "updatedAt": 1767225600000
  }
}
```

### `PATCH /api/agent/sessions/[id]`

Renames a session owned by the authenticated user.

Request:

```json
{
  "title": "Campaign concepts"
}
```

Response:

```json
{
  "session": {
    "id": "...",
    "title": "Campaign concepts",
    "updatedAt": 1767225600000
  }
}
```

### `DELETE /api/agent/sessions/[id]`

Deletes a session owned by the authenticated user. Messages cascade by foreign key.

Response:

```json
{ "success": true }
```

## Admin

### `GET /api/admin/api-keys`

Lists all platform provider keys for admins. Keys are decrypted in the response.

Response:

```json
{
  "keys": [
    {
      "id": "...",
      "keyType": "gemini",
      "decryptedKey": "...",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### `POST /api/admin/api-keys`

Creates or updates a platform provider key.

Request:

```json
{
  "keyType": "gemini",
  "apiKey": "..."
}
```

Valid `keyType` values:

- `gemini`
- `kling_access`
- `kling_secret`

Response:

```json
{
  "success": true,
  "message": "API key for gemini saved successfully",
  "keyType": "gemini"
}
```

### `DELETE /api/admin/api-keys`

Soft-deactivates a platform provider key by setting `is_active = false`.

Request:

```json
{
  "keyType": "gemini"
}
```

Response:

```json
{
  "success": true,
  "message": "API key for gemini deactivated successfully"
}
```

### `POST /api/admin/upload-asset`

Uploads an admin-only site asset to R2.

Request: `multipart/form-data`

| Field | Type | Required |
| --- | --- | --- |
| `file` | File | Yes |

Validation:

- Image types: PNG, JPG, WebP, GIF
- Max size: 10 MB

Response:

```json
{
  "url": "https://...",
  "key": "site-assets/..."
}
```

## Legacy Per-User API Keys

The current product architecture uses admin-managed provider keys. These endpoints still exist for older BYOK/localStorage migration flows and store encrypted keys in `user_api_keys`.

### `GET /api/user/api-keys`

Returns decrypted keys for the authenticated user.

Response:

```json
[
  { "type": "gemini", "value": "..." }
]
```

### `POST /api/user/api-keys`

Creates or updates a user's encrypted key.

Request:

```json
{
  "keyType": "gemini",
  "keyValue": "..."
}
```

Valid `keyType` values:

- `gemini`
- `kling-access`
- `kling-secret`

Response:

```json
{ "success": true }
```

### `DELETE /api/user/api-keys`

Deletes a user's key.

Request:

```json
{
  "keyType": "gemini"
}
```

Response:

```json
{ "success": true }
```

### `POST /api/migrate-storage`

Migrates legacy localStorage provider keys to `user_api_keys`.

Request:

```json
{
  "geminiKey": "...",
  "klingAccessKey": "...",
  "klingSecretKey": "..."
}
```

At least one key must be provided.

Response:

```json
{
  "success": true,
  "migrated": 3
}
```

## Storage And Database Tables

### R2 Paths

Common R2 key prefixes:

- `images/`: generated images
- `fusion/`: fused/generated composite images
- `videos/`: generated Veo videos
- `kling/`: downloaded Kling results rehosted to R2
- `uploads/`: generic uploaded images
- `motion-videos/`: uploaded reference videos
- `characters/{userId}/`: saved character images
- `site-assets/`: admin-uploaded assets

### Core Tables

- `admin_api_keys`: encrypted platform provider keys. Key types are `gemini`, `kling_access`, and `kling_secret`.
- `user_profiles`: user metadata and `is_admin`.
- `user_credits`: current balance and lifetime totals.
- `credit_transactions`: ledger of additions/deductions.
- `generated_images`: persisted generated image history.
- `generated_videos`: persisted generated video history, including optional `resolution` and `google_uri`.
- `characters`: saved user character images and metadata.
- `chat_sessions`: agent conversation sessions.
- `chat_messages`: persisted agent messages, tool calls, and generated assets.
- `user_api_keys`: legacy encrypted per-user provider keys.
- `video_history`: legacy video history table.

## Required Environment Variables

Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Encryption:

- `ENCRYPTION_SECRET_KEY`

Cloudflare R2:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

Veo provider selection:

- `VEO_PROVIDER`: `gemini` by default, or `vertex`.

Vertex Veo:

- `VERTEX_API_KEY`
- `VERTEX_PROJECT`
- `VERTEX_LOCATION`: defaults to `us-central1`.

Agent:

- `AGENT_PROVIDER`: `gemini` by default, or `deepseek`.
- `GEMINI_API_KEY`
- `GEMINI_MODEL`: defaults to `gemini-2.5-flash`.
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`: defaults to `deepseek-chat`.

## Notable Implementation Details

- `/api/generate-veo-video` is the active Veo route; there is no current `app/api/generate/route.ts` in this codebase.
- Admin provider keys are encrypted with `encryptApiKey(apiKey, "admin")`.
- Legacy user keys are encrypted with the user's ID as the encryption context.
- CSRF validation reads `x-csrf-token` first, then tries `csrfToken` from a JSON body. Multipart requests must use the header.
- Some legacy state-changing endpoints are not currently wrapped with CSRF protection. See the route overview table for exact coverage.
- History deletion removes database rows but does not delete generated R2 objects in the image/video history routes. Character deletion performs best-effort R2 cleanup.
