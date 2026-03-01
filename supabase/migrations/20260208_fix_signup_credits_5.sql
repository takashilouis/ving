-- Migration: Fix signup credits function to grant 5 credits instead of 10
-- Root cause: 20260111_admin_keys_credit_system.sql was edited after being applied,
-- so the live DB function still uses 10. This migration corrects the function
-- and patches any existing users who still have the default 10 credits.

-- ============================================
-- STEP 1: Fix the trigger function (new signups)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance, total_earned)
  VALUES (NEW.id, 5, 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: Fix existing users still on 10 credits
-- ============================================
UPDATE user_credits
SET
  balance = 5,
  total_earned = 5,
  updated_at = NOW()
WHERE
  balance = 10
  AND total_earned = 10
  AND total_spent = 0;

-- ============================================
-- STEP 3: Record the adjustment for auditing
-- ============================================
INSERT INTO credit_transactions (user_id, amount, transaction_type, balance_after, metadata)
SELECT
  user_id,
  -5,
  'admin_adjustment',
  5,
  '{"reason": "Corrected signup credits from 10 to 5"}'::jsonb
FROM user_credits
WHERE
  balance = 5
  AND total_earned = 5
  AND total_spent = 0
  AND NOT EXISTS (
    SELECT 1 FROM credit_transactions ct
    WHERE ct.user_id = user_credits.user_id
      AND ct.transaction_type = 'admin_adjustment'
      AND ct.metadata->>'reason' = 'Corrected signup credits from 10 to 5'
  );
