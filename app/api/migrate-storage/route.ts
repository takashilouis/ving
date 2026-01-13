import { createClient } from '@/lib/supabase/server'
import { encryptApiKey } from '@/lib/supabase/encryption'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// POST - Migrate localStorage API keys to Supabase
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { geminiKey, klingAccessKey, klingSecretKey } = await request.json()

    // Validate that at least one key is provided
    if (!geminiKey && !klingAccessKey && !klingSecretKey) {
      return NextResponse.json({ error: 'No keys provided for migration' }, { status: 400 })
    }

    const keysToMigrate: Array<{ keyType: string; keyValue: string }> = []

    if (geminiKey && geminiKey.trim()) {
      keysToMigrate.push({ keyType: 'gemini', keyValue: geminiKey })
    }
    if (klingAccessKey && klingAccessKey.trim()) {
      keysToMigrate.push({ keyType: 'kling-access', keyValue: klingAccessKey })
    }
    if (klingSecretKey && klingSecretKey.trim()) {
      keysToMigrate.push({ keyType: 'kling-secret', keyValue: klingSecretKey })
    }

    // Encrypt and save all keys
    const migratePromises = keysToMigrate.map(async ({ keyType, keyValue }) => {
      const encryptedKey = encryptApiKey(keyValue, user.id)

      const { error } = await supabase.from('user_api_keys').upsert(
        {
          user_id: user.id,
          key_type: keyType,
          encrypted_key: encryptedKey,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,key_type',
        }
      )

      if (error) {
        throw error
      }
    })

    await Promise.all(migratePromises)

    return NextResponse.json({
      success: true,
      migrated: keysToMigrate.length,
    })
  } catch (error) {
    console.error('Error migrating keys:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to migrate keys' },
      { status: 500 }
    )
  }
}
