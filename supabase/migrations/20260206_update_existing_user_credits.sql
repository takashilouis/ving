-- Migration to update existing users' credits from 10 to 5
-- This is a one-time migration to adjust existing users to the new 5 credit limit
-- Run this ONCE after deploying the main migration

-- Only run if you have existing users that were created with 10 credits
-- This will NOT affect the trigger which has already been updated to give 5 credits to new users

-- Update existing users who have not spent any credits and have the default 10
UPDATE user_credits
SET 
  balance = 5,
  total_earned = 5,
  updated_at = NOW()
WHERE 
  balance = 10 
  AND total_earned = 10 
  AND total_spent = 0;

-- If you want to be more conservative and only reduce credits for users who haven't used any:
-- The above query already does that by checking total_spent = 0

-- Optional: Add a transaction record for tracking
INSERT INTO credit_transactions (user_id, amount, transaction_type, balance_after, metadata)
SELECT 
  user_id,
  -5,
  'admin_adjustment',
  5,
  '{"reason": "Initial credit reduction from 10 to 5", "previous_balance": 10}'::jsonb
FROM user_credits
WHERE 
  balance = 5 
  AND total_earned = 5 
  AND total_spent = 5
  AND NOT EXISTS (
    SELECT 1 FROM credit_transactions 
    WHERE user_id = user_credits.user_id 
    AND transaction_type = 'admin_adjustment'
    AND metadata->>'reason' = 'Initial credit reduction from 10 to 5'
  );
