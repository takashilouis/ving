import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';
import { loadEnvConfig } from '@next/env';
import path from 'path';

// Load environment variables from .env depending on where the script is run
loadEnvConfig(path.resolve(process.cwd()));

const getServerSecret = () => {
    const secret = process.env.ENCRYPTION_SECRET_KEY;
    if (!secret) {
        throw new Error('ENCRYPTION_SECRET_KEY environment variable is not set');
    }
    return secret;
};

function encryptApiKey(apiKey: string, userId: string): string {
    const serverSecret = getServerSecret();
    const userSecret = CryptoJS.SHA256(userId + serverSecret).toString();
    const encrypted = CryptoJS.AES.encrypt(apiKey, userSecret).toString();
    return encrypted;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Service Role Key in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addKey(type: string, key: string) {
    const encrypted = encryptApiKey(key, 'admin'); // admin keys use 'admin' as userId

    const { error } = await supabase
        .from('admin_api_keys')
        .upsert({
            key_type: type,
            encrypted_key: encrypted,
            is_active: true,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key_type' });

    if (error) {
        console.error(`Failed to add ${type}:`, error.message);
    } else {
        console.log(`✅ Successfully uploaded ${type}`);
    }
}

async function main() {
    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;

    if (!accessKey || !secretKey) {
        console.error('❌ Please add KLING_ACCESS_KEY and KLING_SECRET_KEY to your .env file before running this script.');
        process.exit(1);
    }

    console.log('Encrypting and uploading Kling API keys...');

    await addKey('kling_access', accessKey);
    await addKey('kling_secret', secretKey);

    console.log('Done!');
}

main().catch(console.error);
