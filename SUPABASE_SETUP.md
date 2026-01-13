# Supabase Setup Guide for Ving

This guide will walk you through setting up Supabase for the Ving video generation platform with credit-based system and admin-managed API keys.

## Quick Start (TL;DR)

If you're in a hurry, here's the essential setup:

1. ✅ **Create Supabase project** (you already did this: "Ving")
2. 📋 **Get API credentials** from Settings → API (Publishable key + Secret key)
3. 🔐 **Generate encryption secret**: `openssl rand -hex 32`
4. 📝 **Add to `.env`**: URL, Publishable key, Secret key, Encryption secret
5. 🗄️ **Run migration**: Copy `supabase/migrations/20260111_admin_keys_credit_system.sql` → SQL Editor → Run
6. 👤 **Create admin**: Sign up → Get UUID → Set `is_admin = TRUE`
7. 🔑 **Add AI provider keys**: Use browser console or `/api/admin/api-keys` endpoint
8. ✅ **Test**: Generate video, verify credit deduction

**Read the full guide below for detailed instructions.**

---

## Overview

Supabase provides:
- **Authentication**: Email/password and Google OAuth for user login
- **Database**: PostgreSQL with Row Level Security (RLS) for secure data access
- **Credit System**: Track user credit balance and transaction history (10 free credits on signup)
- **Admin System**: Encrypted API key storage accessible only to administrators

## Step 1: Create a Supabase Project

✅ **You've already done this!** Your project is called "Ving".

If you need to create another project in the future:
1. Go to [https://supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: `ving` (or your preferred name)
   - **Database Password**: Generate a secure password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project" and wait for setup (~2 minutes)

## Step 2: Get API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://your-project.supabase.co`
   - **Publishable key** (anon): Long string starting with `eyJ...` - Safe for client-side use
   - **Secret key** (service_role): Another long string starting with `eyJ...` - **Keep this secret!**

3. Add these to your `.env` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key-here
SUPABASE_SERVICE_ROLE_KEY=your-secret-key-here
```

**Note**: The environment variable names still use "ANON_KEY" and "SERVICE_ROLE_KEY" for backward compatibility, but they correspond to the "Publishable key" and "Secret key" in the dashboard.

## Step 3: Generate Encryption Secret

Generate a secure 256-bit encryption key for API key encryption:

```bash
openssl rand -hex 32
```

Add it to your `.env` file:
```bash
ENCRYPTION_SECRET_KEY=your-generated-key-here
```

**IMPORTANT**: Never commit this to version control!

## Step 4: Create Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the **entire contents** of `supabase/migrations/20260111_admin_keys_credit_system.sql`
4. Paste it into the SQL Editor
5. Click **"Run"** to execute the migration

**What this migration creates:**
- ✅ `admin_api_keys` - Encrypted AI provider API keys (admin-only access)
- ✅ `user_profiles` - User metadata with `is_admin` flag
- ✅ `user_credits` - Credit balance tracking for each user
- ✅ `credit_transactions` - Audit log of all credit operations
- ✅ `deduct_credits()` - PostgreSQL function for atomic credit deduction
- ✅ `add_credits()` - PostgreSQL function for granting credits
- ✅ Row Level Security (RLS) policies for all tables
- ✅ Auto-triggers to create profiles and credits on user signup

**Note**: The migration also renames the old `user_api_keys` table to `deprecated_user_api_keys` if it exists (from the old BYOK system).

✅ **Row Level Security (RLS) is automatically enabled by the migration above!**

## Step 5: Verify Database Setup

After running the migration, verify everything was created successfully:

1. In Supabase dashboard, go to **Database** → **Tables**
2. You should see these new tables:
   - `admin_api_keys`
   - `user_profiles`
   - `user_credits`
   - `credit_transactions`
   - `video_history` (optional, for future use)
   - `user_preferences` (optional, for future use)

3. Go to **Database** → **Functions** and verify:
   - `deduct_credits(p_user_id, p_amount, p_transaction_type, p_metadata)`
   - `add_credits(p_user_id, p_amount, p_transaction_type, p_metadata)`
   - `handle_new_user()`
   - `handle_new_user_credits()`

4. Go to **Authentication** → **Policies** and verify RLS is enabled on all tables

## Step 6: Configure Email Authentication

1. Go to **Authentication** → **Providers**
2. **Email** provider should be enabled by default
3. Under **Email Templates**, you can customize:
   - Confirm signup email
   - Reset password email
4. Configure **Site URL** to match your deployment:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

## Step 7: Set Up First Admin User

**IMPORTANT**: You need at least one admin user to add API keys to the system.

### Option A: Set Admin After First Signup (Recommended)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your app at `http://localhost:3000`

3. Sign up with your admin email address

4. After signup, go to your Supabase dashboard → **Authentication** → **Users**

5. Find your user and copy the **UUID** (e.g., `12345678-1234-1234-1234-123456789abc`)

6. Go to **SQL Editor** and run:
   ```sql
   UPDATE user_profiles
   SET is_admin = TRUE
   WHERE user_id = 'YOUR-USER-UUID-HERE';
   ```

7. Verify it worked:
   ```sql
   SELECT u.email, p.is_admin
   FROM auth.users u
   JOIN user_profiles p ON u.id = p.user_id
   WHERE p.is_admin = TRUE;
   ```

### Option B: Pre-Create Admin Before First Signup

If you want to set admin status before anyone signs up:

1. Go to **Authentication** → **Users** → **Invite User**
2. Enter your admin email
3. After the user accepts the invite and signs up, follow steps 4-7 from Option A

**What This Enables:**
- Access to `/api/admin/api-keys` endpoint
- Ability to add/update/deactivate Gemini and Kling API keys
- View all user credit balances (future feature)
- Grant credits to users manually

## Step 8: Add AI Provider API Keys

Now that you have an admin account, add your API keys:

### Method 1: Using the API (Recommended)

While logged in as admin in your browser, you can use the browser console:

```javascript
// Add Gemini API Key
fetch('/api/admin/api-keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyType: 'gemini',
    apiKey: 'YOUR-GEMINI-API-KEY'
  })
}).then(r => r.json()).then(console.log);

// Add Kling Access Key
fetch('/api/admin/api-keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyType: 'kling_access',
    apiKey: 'YOUR-KLING-ACCESS-KEY'
  })
}).then(r => r.json()).then(console.log);

// Add Kling Secret Key
fetch('/api/admin/api-keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyType: 'kling_secret',
    apiKey: 'YOUR-KLING-SECRET-KEY'
  })
}).then(r => r.json()).then(console.log);
```

### Method 2: Using SQL (Direct Database)

**Warning**: This requires encrypting the keys manually. Only use if Method 1 doesn't work.

1. Install `crypto-js` if not already installed:
   ```bash
   npm install crypto-js
   ```

2. Create a script to encrypt your keys (see `lib/supabase/encryption.ts` for reference)

3. Insert directly into database (not recommended)

**Verify Keys Were Added:**
```sql
SELECT key_type, is_active, created_at
FROM admin_api_keys
ORDER BY created_at DESC;
```

You should see your keys listed (encrypted_key will show encrypted data).

## Step 9: Configure Google OAuth (Optional)

1. Go to **Authentication** → **Providers**
2. Find **Google** and click to enable it
3. You'll need Google OAuth credentials:

### Get Google OAuth Credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure consent screen if prompted
6. Choose **Web application** as application type
7. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
8. Copy the **Client ID** and **Client Secret**

### Add to Supabase:

1. Back in Supabase **Authentication** → **Providers** → **Google**
2. Enable the provider
3. Paste your **Client ID** and **Client Secret**
4. Save the configuration

## Step 10: Configure Auth Settings

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your application URL:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
3. Add **Redirect URLs** (one per line):
   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   ```

## Step 11: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your app at `http://localhost:3000`

3. Test the following flows:

   **Authentication:**
   - ✅ Click "Sign In" button appears in top-right
   - ✅ Sign up with email/password
   - ✅ Check email for confirmation link
   - ✅ Click confirmation link → redirected back to app
   - ✅ Sign out via user menu
   - ✅ Sign in with Google OAuth (if configured)

   **Credit System:**
   - ✅ After signup, check Settings tab shows 10 free credits
   - ✅ Credit balance displays correctly (balance, total earned, total spent)
   - ✅ Generate a Veo video → verify 1 credit deducted
   - ✅ Generate a Kling motion video → verify 2 credits deducted
   - ✅ Try to generate with 0 credits → verify error message appears

   **Admin Functions (if you're logged in as admin):**
   - ✅ Admin API keys are accessible via `/api/admin/api-keys`
   - ✅ Can add new API keys
   - ✅ Can update existing API keys
   - ✅ Can deactivate API keys

## Verification Checklist

Use this checklist to ensure everything is set up correctly:

**Supabase Setup:**
- [ ] Supabase project created (Ving)
- [ ] API credentials added to `.env`
- [ ] Encryption secret generated and added to `.env`
- [ ] Database migration executed successfully
- [ ] All tables created (`admin_api_keys`, `user_profiles`, `user_credits`, `credit_transactions`)
- [ ] All PostgreSQL functions created (`deduct_credits`, `add_credits`, triggers)
- [ ] RLS policies enabled and working
- [ ] Email auth configured
- [ ] Google OAuth configured (optional)
- [ ] Site URL and redirect URLs configured

**Admin Setup:**
- [ ] First admin user created
- [ ] Admin flag set to TRUE in `user_profiles`
- [ ] Gemini API key added to `admin_api_keys`
- [ ] Kling Access Key added to `admin_api_keys`
- [ ] Kling Secret Key added to `admin_api_keys`
- [ ] All keys show `is_active = TRUE`

**Application Testing:**
- [ ] App runs without errors (`npm run dev`)
- [ ] Sign up flow works
- [ ] Sign in flow works
- [ ] New users receive 10 free credits automatically
- [ ] Credit balance displays in Settings tab
- [ ] Veo video generation works and deducts 1 credit
- [ ] Kling motion control works and deducts 2 credits
- [ ] Insufficient credit error displays correctly
- [ ] Credit transactions are logged in database

## Troubleshooting

### "Service temporarily unavailable" error
**Cause**: Admin API keys not found or not active

**Solution**:
1. Check if keys exist in database:
   ```sql
   SELECT key_type, is_active FROM admin_api_keys;
   ```
2. Make sure all keys have `is_active = TRUE`
3. Verify keys are decrypting correctly (check `ENCRYPTION_SECRET_KEY` in `.env`)

### "Unauthorized. Please sign in." error
**Cause**: User not authenticated or session expired

**Solution**:
1. Sign in via the app UI
2. Check browser cookies are enabled
3. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Publishable key) are correct
4. Clear browser cookies and sign in again

### "Insufficient credits" error (402)
**Cause**: User doesn't have enough credits

**Solution**:
1. Check credit balance in Settings tab
2. As admin, grant more credits via SQL:
   ```sql
   SELECT add_credits(
     'user-uuid-here',
     10,  -- amount to add
     'admin_grant',
     '{"reason": "manual grant"}'::jsonb
   );
   ```

### "Forbidden. Admin access required." error
**Cause**: User is not an admin trying to access admin endpoints

**Solution**:
1. Verify admin flag is set:
   ```sql
   SELECT email, is_admin FROM user_profiles
   JOIN auth.users ON user_profiles.user_id = auth.users.id
   WHERE email = 'your-email@example.com';
   ```
2. Set admin flag if needed:
   ```sql
   UPDATE user_profiles
   SET is_admin = TRUE
   WHERE user_id = 'user-uuid-here';
   ```

### OAuth redirect issues
- Verify redirect URLs match exactly in Supabase settings
- Check Google OAuth credentials are correct
- Ensure Site URL is configured properly

### Database migration errors
- Check SQL Editor output for specific error messages
- Verify you're running the entire migration file
- Make sure Supabase project is fully provisioned (wait 2-3 minutes after creation)
- Try running migration again (it has `IF NOT EXISTS` checks)

### Encryption/Decryption errors
- Ensure `ENCRYPTION_SECRET_KEY` is exactly 64 hex characters (256 bits)
- **CRITICAL**: Never change the secret after adding keys (or existing keys won't decrypt)
- Generate new secret: `openssl rand -hex 32`

### Credit deduction not working
**Cause**: Service role key missing or incorrect

**Solution**:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is in `.env` (server-side only)
2. Check the key has proper permissions in Supabase dashboard
3. Restart your development server after adding the key

### New users not getting 10 free credits
**Cause**: Trigger not firing or function error

**Solution**:
1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created_credits';
   ```
2. Manually add credits for existing user:
   ```sql
   INSERT INTO user_credits (user_id, balance, total_earned)
   VALUES ('user-uuid-here', 10, 10)
   ON CONFLICT (user_id) DO NOTHING;
   ```

## Security Best Practices

1. **Never commit `.env` to version control**
   - Use `.env.example` as a template
   - Add `.env` to `.gitignore`
   - Never commit `ENCRYPTION_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

2. **Keep secret key secure**
   - **CRITICAL**: `SUPABASE_SERVICE_ROLE_KEY` (Secret key) bypasses ALL RLS policies
   - Never expose it to client-side code
   - Only use in server-side API routes
   - This key allows credit deduction and admin operations

3. **Protect the encryption secret**
   - `ENCRYPTION_SECRET_KEY` decrypts all admin API keys
   - **Never change it** after adding keys (or keys become unrecoverable)
   - Store securely in production environment variables
   - If compromised, all API keys must be rotated

4. **Limit admin accounts**
   - Only ONE admin should exist (as per requirements)
   - Review `user_profiles` regularly:
     ```sql
     SELECT u.email, p.is_admin
     FROM auth.users u
     JOIN user_profiles p ON u.id = p.user_id
     WHERE p.is_admin = TRUE;
     ```

5. **Monitor credit usage**
   - Check for unusual credit deductions:
     ```sql
     SELECT user_id, SUM(ABS(amount)) as total_spent
     FROM credit_transactions
     WHERE amount < 0
     GROUP BY user_id
     ORDER BY total_spent DESC
     LIMIT 10;
     ```
   - Set up alerts for high-volume users

6. **Rotate API keys periodically**
   - Update admin API keys in `admin_api_keys` table every 90 days
   - Use the admin API endpoint to update keys
   - Deactivate old keys instead of deleting (for audit trail)

7. **Enable MFA for your Supabase account**
   - Go to Account Settings → Security
   - Enable two-factor authentication
   - Protects against unauthorized database access

## Production Deployment

When deploying to production (Vercel, Netlify, etc.):

### 1. Update Environment Variables

Add these to your hosting provider's environment variables:

```bash
# Supabase (from your project dashboard Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Publishable key
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # Secret key - CRITICAL: Server-side only!

# Encryption (use same key as development)
ENCRYPTION_SECRET_KEY=your-64-char-hex-key

# Cloudflare R2 (for video uploads)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=vling
R2_PUBLIC_URL=https://pub-...r2.dev

# Site URL (for auth redirects)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 2. Update Supabase Auth Settings

1. Go to Supabase dashboard → **Authentication** → **URL Configuration**
2. Update **Site URL**: `https://yourdomain.com`
3. Add **Redirect URLs**:
   ```
   https://yourdomain.com/auth/callback
   https://yourdomain.com
   ```

### 3. Enable Rate Limiting

1. Go to **Authentication** → **Rate Limits**
2. Enable rate limiting to prevent abuse:
   - Email signups: 4 per hour per IP
   - Password resets: 5 per hour per user
   - OTP requests: 4 per hour per user

### 4. Set Up Custom SMTP (Optional)

For better email deliverability:
1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Configure your own SMTP provider (SendGrid, AWS SES, etc.)
3. Verify sender domain

### 5. Database Backups

1. Go to **Database** → **Backups**
2. Enable Point-in-Time Recovery (requires Pro plan)
3. Set up automated daily backups

### 6. Monitor Credit Usage

Set up monitoring for credit consumption:

```sql
-- Create a view for daily credit usage
CREATE VIEW daily_credit_usage AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as transactions,
  SUM(ABS(amount)) as total_credits_used
FROM credit_transactions
WHERE amount < 0
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 7. Production Checklist

- [ ] All environment variables set correctly
- [ ] Redirect URLs updated in Supabase
- [ ] Rate limiting enabled
- [ ] Admin account created and API keys added
- [ ] Test video generation in production
- [ ] Test credit deduction in production
- [ ] Monitor error logs for first 24 hours
- [ ] Set up usage alerts (Supabase Pro)
- [ ] Enable database backups

## Quick Reference: SQL Queries

### Check Admin Status
```sql
SELECT u.email, p.is_admin
FROM auth.users u
JOIN user_profiles p ON u.id = p.user_id
WHERE u.email = 'your-email@example.com';
```

### Grant Credits to User
```sql
SELECT add_credits(
  'user-uuid-here',
  100,  -- amount to add
  'admin_grant',
  '{"reason": "promotional credits"}'::jsonb
);
```

### View Credit Transactions
```sql
SELECT
  u.email,
  t.amount,
  t.transaction_type,
  t.balance_after,
  t.created_at,
  t.metadata
FROM credit_transactions t
JOIN auth.users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 20;
```

### Check All Admin API Keys
```sql
SELECT key_type, is_active, created_at, updated_at
FROM admin_api_keys
ORDER BY key_type;
```

### View Top Credit Consumers
```sql
SELECT
  u.email,
  c.balance,
  c.total_spent,
  c.total_earned
FROM user_credits c
JOIN auth.users u ON c.user_id = u.id
ORDER BY c.total_spent DESC
LIMIT 10;
```

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

---

**Need help?**
- Check the [CLAUDE.md](./CLAUDE.md) file for complete architecture details
- Review the troubleshooting section above
- Check Supabase logs: **Database** → **Logs** → **Postgres Logs**
- Monitor API route errors in your hosting provider's logs
