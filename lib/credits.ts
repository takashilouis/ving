import { createAdminClient } from './supabase/admin'

export interface CreditCost {
  veo: number           // Cost per Veo generation
  kling: number         // Cost per Kling generation
  image_flash_1k: number  // Cost per Gemini 2.5 Flash image
  image_pro_1k: number    // Cost per Gemini 3.0 Pro 1K image
  image_pro_2k: number    // Cost per Gemini 3.0 Pro 2K image
  image_pro_4k: number    // Cost per Gemini 3.0 Pro 4K image
  image_fusion_standard: number  // Cost per fusion (Standard/Flash)
  image_fusion_4k: number        // Cost per fusion (4K/Pro)
}

// Define credit costs for different operations
export const CREDIT_COSTS: CreditCost = {
  veo: 1,             // 1 credit per Veo video
  kling: 2,           // 2 credits per Kling motion control video
  image_flash_1k: 1,  // 1 credit per Flash image
  image_pro_1k: 1,    // 1 credit per Pro 1K image
  image_pro_2k: 2,    // 2 credits per Pro 2K image
  image_pro_4k: 3,    // 3 credits per Pro 4K image
  image_fusion_standard: 2,  // 2 credits per fusion (Standard)
  image_fusion_4k: 4,        // 4 credits per fusion (4K)
}

/**
 * Get credit cost for image generation based on model and quality
 */
export function getImageCreditCost(model: 'flash' | 'pro', quality: '1K' | '2K' | '4K'): number {
  if (model === 'flash') {
    return CREDIT_COSTS.image_flash_1k
  }
  const key = `image_pro_${quality.toLowerCase()}` as keyof CreditCost
  return CREDIT_COSTS[key]
}

/**
 * Get credit cost for image fusion based on quality
 */
export function getFusionCreditCost(quality: 'standard' | 'pro'): number {
  return quality === 'pro' ? CREDIT_COSTS.image_fusion_4k : CREDIT_COSTS.image_fusion_standard
}

/**
 * Check if user has sufficient credits
 * @param userId - User's UUID
 * @param requiredCredits - Number of credits required
 * @returns Object with hasEnough boolean and current balance
 */
export async function checkCredits(userId: string, requiredCredits: number): Promise<{
  hasEnough: boolean
  balance: number
}> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new Error('Failed to fetch user credits')
  }

  return {
    hasEnough: data.balance >= requiredCredits,
    balance: data.balance,
  }
}

/**
 * Deduct credits from user's balance
 * Uses Postgres function with row locking to prevent race conditions
 * @param userId - User's UUID
 * @param amount - Number of credits to deduct
 * @param transactionType - Type of transaction (e.g., 'veo_generation', 'kling_generation')
 * @param metadata - Optional metadata about the transaction
 */
export async function deductCredits(
  userId: string,
  amount: number,
  transactionType: string,
  metadata?: Record<string, any>
): Promise<void> {
  const supabase = createAdminClient()

  // Call the Postgres function that handles credit deduction atomically
  const { data, error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_transaction_type: transactionType,
    p_metadata: metadata || null,
  })

  if (error) {
    if (error.message.includes('Insufficient credits')) {
      throw new Error('Insufficient credits. Please purchase more credits to continue.')
    }
    throw new Error(`Failed to deduct credits: ${error.message}`)
  }
}

/**
 * Add credits to user's balance
 * Used for purchases, admin grants, refunds, etc.
 * @param userId - User's UUID
 * @param amount - Number of credits to add
 * @param transactionType - Type of transaction (e.g., 'purchase', 'admin_grant', 'refund')
 * @param metadata - Optional metadata about the transaction
 */
export async function addCredits(
  userId: string,
  amount: number,
  transactionType: string,
  metadata?: Record<string, any>
): Promise<void> {
  const supabase = createAdminClient()

  // Call the Postgres function that handles credit addition atomically
  const { data, error } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_transaction_type: transactionType,
    p_metadata: metadata || null,
  })

  if (error) {
    throw new Error(`Failed to add credits: ${error.message}`)
  }
}

/**
 * Get user's credit transaction history
 * @param userId - User's UUID
 * @param limit - Number of transactions to return (default: 50)
 */
export async function getCreditTransactions(userId: string, limit: number = 50) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  return data
}
