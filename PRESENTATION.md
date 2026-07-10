# Ving Project Presentation

## 1. Project Overview

**Ving** is an AI-powered creative studio for generating images, videos, scripts, and character-driven motion content.

The main goal of the project is to make advanced generative AI models usable through a simple web interface, while handling authentication, API key security, credits, media storage, and generation history behind the scenes.

In short:

> Ving lets users turn prompts, images, characters, and scripts into AI-generated visual assets using models like Google Gemini/Veo and Kling AI.

---

## 2. Problem Statement

Creating AI videos usually requires several difficult steps:

- Managing provider API keys
- Understanding model-specific request formats
- Polling long-running generation jobs
- Handling video downloads, CORS, and storage
- Tracking user usage and cost
- Organizing generated assets

Ving abstracts those details into a product-like workflow where users can focus on the creative prompt instead of the infrastructure.

---

## 3. Core Product Features

- **Text-to-video generation** using Google Veo 3.1
- **Image-to-video support** for creating videos from an input image
- **AI image generation** with different quality tiers
- **Image fusion** for combining multiple image references
- **Kling motion control** to animate a character from an image using a reference video
- **Script generation** that converts an idea into structured video clips
- **Studio workspace** for generating, previewing, and managing assets
- **Character system** for saving reusable characters
- **Agent mode** where users can chat with an AI assistant that can call generation tools
- **Credit-based usage system**
- **Admin-managed encrypted API keys**
- **Cloudflare R2 media storage**
- **Supabase authentication and persistence**

---

## 4. Tech Stack

- **Frontend:** Next.js 16 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Animation:** Framer Motion
- **Authentication:** Supabase Auth
- **Database:** Supabase Postgres with Row Level Security
- **Storage:** Cloudflare R2
- **AI Providers:** Google Gemini/Veo, Kling AI
- **Security:** CSRF protection, encrypted provider keys, server-only service role access

---

## 5. High-Level Architecture

```text
User
  |
  v
Next.js App Router UI
  |
  |-- Landing page
  |-- Dashboard
  |-- Studio workspace
  |-- Admin settings
  |
  v
Next.js API Routes
  |
  |-- Auth and CSRF validation
  |-- Credit checks
  |-- AI provider calls
  |-- Polling long-running jobs
  |-- Uploading generated media
  |
  v
Supabase + Cloudflare R2 + AI Providers
```

The frontend is responsible for the creative workflow. The backend API routes protect sensitive credentials, enforce credits, call AI providers, and persist generated assets.

---

## 6. Main User Workflow

1. A user signs in with Supabase Auth.
2. The user opens the Studio or Dashboard.
3. The user enters a prompt, uploads references, or selects saved characters.
4. The app checks the user's credit balance.
5. The server retrieves the admin-managed API key from Supabase.
6. The key is decrypted server-side.
7. The server calls the selected AI provider.
8. Long-running jobs are polled until completion.
9. The generated media is uploaded to Cloudflare R2.
10. Credits are deducted only after a successful generation.
11. The result is saved to the user's history.

---

## 7. Credit System

Ving uses a credit-based model so every generation has a predictable cost.

Examples:

- Veo video generation: **1 credit**
- Kling motion control: **2 credits**
- Image generation: varies by model and quality
- Image fusion: varies by quality tier

Important design decision:

> Credits are deducted only after successful generation.

This avoids charging users for failed API calls, safety-filtered results, or provider timeouts.

---

## 8. Admin API Key Management

Ving does not require every user to bring their own provider API key.

Instead:

- Admins add Gemini and Kling API keys in the admin panel.
- Keys are encrypted before being stored in the database.
- Only server-side routes decrypt and use the keys.
- Users never see or handle provider credentials.

This makes the app easier for normal users and safer from a product/security perspective.

---

## 9. Security Design

The project includes several security layers:

- **Supabase Auth** for user sessions
- **Row Level Security** so users only access their own data
- **Service role key only on the server**
- **Encrypted provider API keys**
- **CSRF protection** on mutation routes
- **Admin-only routes** for provider key management
- **Credit checks before expensive operations**

The key idea is that the browser never receives sensitive provider credentials.

---

## 10. Database Design

Core tables include:

- `user_profiles`
  - Stores user profile metadata and admin status

- `user_credits`
  - Stores current balance and lifetime credit usage

- `credit_transactions`
  - Audit log for credit additions and deductions

- `admin_api_keys`
  - Stores encrypted Gemini and Kling API keys

- `generated_images`
  - Stores image generation history

- `generated_videos`
  - Stores video generation history

- `characters`
  - Stores reusable character assets

- `chat_sessions` and `chat_messages`
  - Persist agent-mode conversations and generated assets

---

## 11. AI Video Generation Flow

```text
Prompt or image input
  |
  v
/api/generate-veo-video
  |
  |-- Authenticate user
  |-- Validate CSRF token
  |-- Check credits
  |-- Fetch encrypted Gemini API key
  |-- Decrypt key server-side
  |-- Start Veo generation
  |-- Poll until complete
  |-- Download generated video
  |-- Upload video to R2
  |-- Deduct credits
  |-- Save generation history
  |
  v
Return video URL to client
```

This flow handles both provider complexity and product logic in one controlled server-side path.

---

## 12. Kling Motion Control Flow

Kling motion control allows a saved or uploaded character image to mimic motion from a reference video.

The workflow:

- User uploads a character image.
- User provides a reference video URL or uploads a video.
- The video is uploaded to R2 if needed.
- The backend signs a Kling JWT using admin-managed keys.
- The backend starts a Kling motion-control job.
- The backend polls the job status.
- On success, the result is returned and credits are deducted.

This feature shows how the app integrates with providers that require custom authentication and asynchronous job handling.

---

## 13. Studio Workspace

The Studio is the main creative workspace.

It includes:

- Prompt input
- Generation settings
- Image, video, and frame modes
- Aspect ratio controls
- Quality controls
- Character selection
- Asset preview canvas
- History rail
- Detail views for generated images and videos
- Optional agent mode

The goal of the Studio is to feel closer to a creative tool than a simple form.

---

## 14. Agent Mode

Agent mode lets users describe what they want conversationally.

The AI assistant can call internal tools such as:

- Generate image
- Generate video
- Animate character
- Fuse characters
- Create script
- Extend video
- Create storyboard

This turns Ving from a form-based generator into a more interactive creative assistant.

---

## 15. Key Engineering Challenges

### Long-running AI operations

Video generation can take several minutes, so the app needs polling, timeouts, progress feedback, and graceful failure handling.

### Credit consistency

Credits must not be deducted too early. The project solves this by checking credits before generation but deducting only after success.

### Secure key handling

Provider API keys are valuable secrets. Ving stores them encrypted and only uses them server-side.

### Media storage

Generated files can be large. The app uploads media to Cloudflare R2 and falls back to base64 data URLs when storage fails.

### Multi-provider differences

Gemini/Veo and Kling have different auth, request, and polling patterns. The backend normalizes those differences for the UI.

---

## 16. What I Built / What I Would Highlight

For an interview, I would highlight:

- Designed a full-stack AI generation workflow, not just a UI prototype
- Implemented secure admin-managed API keys
- Added a credit system with transactional deduction
- Integrated multiple AI providers with different async APIs
- Built a creative Studio interface with asset history
- Added persistent media storage with Cloudflare R2
- Used Supabase RLS to protect user-specific data
- Added agent tooling so chat can trigger real generation workflows

---

## 17. Demo Script

1. Open the landing page and explain the product.
2. Sign in and go to the Studio.
3. Show the prompt input and generation settings.
4. Generate an image or video.
5. Explain the backend flow while generation runs.
6. Show the generated asset in the canvas/history rail.
7. Open the admin API key page and explain encrypted key management.
8. Show the credit balance and explain deduction after success.
9. If time allows, show agent mode and describe how tools are called.

---

## 18. Interview Elevator Pitch

Ving is a full-stack AI creative studio that lets users generate images, videos, scripts, and character animations through a polished web interface.

The interesting engineering work is behind the scenes: authentication, encrypted admin API keys, credit accounting, long-running AI job polling, Cloudflare R2 storage, Supabase persistence, and an agent mode that can call generation tools.

It demonstrates how to turn raw AI APIs into a real product workflow with security, reliability, and user experience in mind.

---

## 19. Possible Improvements

- Add payment integration for buying credits
- Add queue-based background workers for long-running jobs
- Improve video generation progress tracking
- Add team workspaces
- Add richer asset search and tagging
- Add more admin analytics
- Add automated tests for credit and generation routes
- Add observability for provider failures and latency

---

## 20. Closing

Ving is more than a prompt-to-video demo. It is an end-to-end AI media generation platform with production-minded architecture:

- Secure credentials
- Authenticated users
- Credit-based usage
- Persistent media history
- Multi-provider AI integrations
- A creative Studio UI
- Agent-powered workflows

That combination makes it a strong interview project because it shows both product thinking and full-stack engineering depth.
