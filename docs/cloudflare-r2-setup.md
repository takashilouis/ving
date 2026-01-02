# Cloudflare R2 Setup Guide for Vling

## Overview
This guide explains how to set up Cloudflare R2 for video uploads in the Motion Control feature.

## Step 1: Create a Cloudflare Account
If you haven't already, sign up at https://dash.cloudflare.com/sign-up

## Step 2: Create an R2 Bucket
1. Go to **R2 Object Storage** in your Cloudflare dashboard
2. Click **Create bucket**
3. Name your bucket (e.g., `vling-videos`)
4. Select a location hint (optional)
5. Click **Create bucket**

## Step 3: Set Up Public Access
1. Go to your bucket settings
2. Click on **Settings** tab
3. Under **Public Access**, click **Allow Access**
4. Copy your **Public bucket URL** (e.g., `https://pub-xxx.r2.dev`)

## Step 4: Generate API Tokens
1. Go to **R2 Object Storage** > **Manage R2 API Tokens**
2. Click **Create API token**
3. Give it a name (e.g., `vling-upload`)
4. Set permissions to **Object Read & Write**
5. Apply to your specific bucket
6. Click **Create API Token**
7. **IMPORTANT**: Save the Access Key ID and Secret Access Key immediately (they won't be shown again)

## Step 5: Find Your Account ID
1. Go to your Cloudflare dashboard home
2. Your Account ID is in the right sidebar under "Account ID"
3. Or find it in the URL: `https://dash.cloudflare.com/{ACCOUNT_ID}/`

## Step 6: Configure Environment Variables
Create or update your `.env.local` file with:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=vling-videos
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

## Step 7: Install Dependencies
Run:
```bash
npm install @aws-sdk/client-s3
```

## Step 8: Restart Your Dev Server
```bash
npm run dev
```

## Testing
1. Go to the Motion Control tab
2. Switch to "Upload" mode
3. Upload a short MP4 video (max 100MB)
4. The video should upload to R2 and the URL will be used for Kling AI

## Troubleshooting

### "Cloudflare R2 credentials not configured"
Make sure all environment variables are set in `.env.local` and restart the dev server.

### "CORS error"
Add CORS rules to your R2 bucket:
1. Go to bucket **Settings** > **CORS Policy**
2. Add:
```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## Cost
- Storage: $0.015 per GB per month
- Egress: **FREE** (no bandwidth charges!)
- 10GB free tier included

This makes R2 ideal for video hosting since playback doesn't incur costs.
