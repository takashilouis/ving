import { createClient } from '@/lib/supabase/server'
import { encryptApiKey, decryptApiKey } from '@/lib/supabase/encryption'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// GET - Fetch and decrypt user's API keys
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch encrypted keys from database
    const { data: encryptedKeys, error: fetchError } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)

    if (fetchError) {
      throw fetchError
    }

    // Decrypt keys server-side
    const decryptedKeys = (encryptedKeys || []).map((key) => {
      try {
        return {
          type: key.key_type,
          value: decryptApiKey(key.encrypted_key, user.id),
        }
      } catch (err) {
        console.error(`Failed to decrypt key type ${key.key_type}:`, err)
        return {
          type: key.key_type,
          value: '',
        }
      }
    })

    return NextResponse.json(decryptedKeys)
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch API keys' },
      { status: 500 }
    )
  }
}

// POST - Encrypt and save/update user's API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { keyType, keyValue } = await request.json()

    if (!keyType || typeof keyValue !== 'string') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Validate key type
    const validKeyTypes = ['gemini', 'kling-access', 'kling-secret']
    if (!validKeyTypes.includes(keyType)) {
      return NextResponse.json({ error: 'Invalid key type' }, { status: 400 })
    }

    // Encrypt the API key
    const encryptedKey = encryptApiKey(keyValue, user.id)

    // Upsert (insert or update) the key
    const { error: upsertError } = await supabase.from('user_api_keys').upsert(
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

    if (upsertError) {
      throw upsertError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving API key:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save API key' },
      { status: 500 }
    )
  }
}

// DELETE - Remove user's API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { keyType } = await request.json()

    if (!keyType) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Delete the key
    const { error: deleteError } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('key_type', keyType)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
