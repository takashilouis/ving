# Plan to integrate Stripe Payment for Buying Credits

This plan outlines the steps to add Stripe checkout and webhook integration so users can purchase credits securely.

## Overview of Proposed Changes

### 1. Dependencies and Environment Configuration
- **Package**: Install the `stripe` package (e.g., `npm install stripe`).
- **Environment**: Add necessary Stripe environment variables to `.env` and `.env.example`:
  ```env
  # Stripe configuration
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

### 2. Stripe Client and Product Configuration
- **Stripe Instance**: Create a shared, strongly populated Stripe server-side instance at `lib/stripe.ts`.
- **Pricing configuration**: Define the credit packages available for purchase in `lib/pricing.ts` (e.g., 50 credits for $5, 120 credits for $10, 300 credits for $20). These can be created dynamically in the code or predefined as Stripe Price IDs.

### 3. API Routes for Checkout and Webhooks
- **`app/api/stripe/checkout/route.ts`**: Creates a Stripe Checkout session. Requires user authentication via Supabase. Passes the user ID and credit amount in the `metadata` of the session. Returns the checkout URL so the frontend can redirect the user.
- **`app/api/stripe/webhook/route.ts`**: Listens for `checkout.session.completed` events asynchronously. Verifies the webhook signature using `STRIPE_WEBHOOK_SECRET`. Extracts user ID and credit amount from `metadata`. Integrates with the existing `user_credits` system by calling `add_credits` from `lib/credits.ts` with `transaction_type = 'purchase'`.

### 4. Frontend Integration
- **`components/CreditBalance.tsx`**: Add a "Buy Credits" button next to the current balance. Create a pricing modal or dialog that fetches available packages and calls `/api/stripe/checkout`. Handle the redirect to the Stripe Checkout page.
- **Alternative**: Add `app/dashboard/billing/page.tsx` if a dedicated page is preferred instead of a modal.

## Verification Plan
1. **Environment setup**: Create a Stripe account, get test API keys, and run the Stripe CLI to forward webhooks to the local server.
2. **Purchase Flow**:
   - Log in to the application.
   - Click "Buy Credits".
   - Select a credit package.
   - Proceed to Stripe Checkout test mode.
   - Complete checkout with a test card (e.g., 4242...).
3. **Webhook Verification**:
   - Observe the terminal output logs to verify the webhook was received and processed successfully.
   - Verify the database's `user_credits` table correctly reflects the addition of credits.
   - Verify the `credit_transactions` table logs the transaction under `transaction_type: 'purchase'`.
4. **Balance Verification**:
   - Verify the UI automatically updates (or updates upon refresh) to show the new credit balance.
