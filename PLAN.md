# Implementation Plan: Image Generation Feature for Ving

## Overview
Add image generation capability using Gemini models with quality options and credit-based pricing.

## Models & Quality Options

| Model | Quality | Credits | Notes |
|-------|---------|---------|-------|
| Gemini 2.5 Flash | 1K (fixed) | 1 credit | Fast, fixed 1024x1024 |
| Gemini 3.0 Pro | 1K | 1 credit | High quality |
| Gemini 3.0 Pro | 2K | 2 credits | Higher resolution |
| Gemini 3.0 Pro | 4K | 3 credits | Premium, highest quality |

**Note:** Flash model only supports 1K quality. 2K/4K options will be disabled when Flash is selected.

---

## Files to Create

### 1. `/app/api/generate-image/route.ts`
New API route for image generation:
- Authenticate user via Supabase
- Check credit balance based on model/quality
- Fetch admin Gemini API key from database
- Call Gemini API with appropriate model
- Return base64 image data URL
- Deduct credits only after successful generation

### 2. `/components/ImageGenerationPanel.tsx`
New UI component with:
- Prompt textarea
- Model selector (Flash / Pro)
- Quality selector (1K / 2K / 4K) - disabled options for Flash
- Aspect ratio dropdown (1:1, 16:9, 9:16, 4:3, 3:4)
- Credit cost display
- Generate button

### 3. `/components/ImagePreview.tsx`
New preview component with:
- Main image display area
- Loading state with progress indicator
- Download button
- Image history gallery (horizontal scroll, max 20 images)

---

## Files to Modify

### 4. `/lib/credits.ts`
Add image generation credit costs:
```typescript
export const CREDIT_COSTS = {
  veo: 1,
  kling: 2,
  image_flash_1k: 1,
  image_pro_1k: 1,
  image_pro_2k: 2,
  image_pro_4k: 3,
}
```

### 5. `/lib/types.ts`
Add new interfaces:
```typescript
interface GeneratedImage {
  id: string
  url: string
  prompt: string
  model: 'flash' | 'pro'
  quality: '1K' | '2K' | '4K'
  aspectRatio: string
  timestamp: number
}
```

### 6. `/components/LeftSidebar.tsx`
Add "Image" tab between "Gallery" and "Video" sections.

### 7. `/app/page.tsx`
- Add image state (currentImage, imageHistory, isGeneratingImage)
- Add conditional rendering for image tab
- Integrate ImageGenerationPanel and ImagePreview components

### 8. `/components/CreditBalance.tsx`
Add image generation costs to the "Generation Costs" display section.

---

## Implementation Sequence

1. **Update type definitions** (`lib/types.ts`, `lib/credits.ts`)
2. **Create API route** (`/api/generate-image/route.ts`)
3. **Create UI components** (`ImageGenerationPanel.tsx`, `ImagePreview.tsx`)
4. **Update LeftSidebar** with Image tab
5. **Integrate in main page** (`app/page.tsx`)
6. **Update credit display** (`CreditBalance.tsx`)
7. **Test all model/quality combinations**

---

## Technical Notes

- Gemini 2.5 Flash uses model ID: `gemini-2.5-flash-preview-04-17` with `responseModalities: ['IMAGE']`
- Gemini 3.0 Pro uses model ID: `gemini-3.0-pro` with `image_size` parameter for quality
- Images returned as base64, converted to data URL format
- No database schema changes needed - existing `credit_transactions` table supports `'image_generation'` type
- CSRF protection applied following existing patterns
