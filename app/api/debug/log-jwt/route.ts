import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 10;

/**
 * POST /api/debug/log-jwt
 * Logs JWT token to server terminal (for debugging)
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }

    // Log to server console (visible in terminal where npm run dev is running)
    console.log('\n'.repeat(3));
    console.log('═'.repeat(80));
    console.log('🔐 JWT TOKEN LOGGED FROM BROWSER (Login)');
    console.log('═'.repeat(80));
    console.log('\n📝 Full JWT Token:');
    console.log(token);

    console.log('\n📦 Token Structure (3 parts):');
    const parts = token.split('.');
    console.log(`  1️⃣  Header:    ${parts[0]}`);
    console.log(`  2️⃣  Payload:   ${parts[1]}`);
    console.log(`  3️⃣  Signature: ${parts[2]}`);

    // Decode the payload (just for display, not for security)
    try {
      const payloadBase64 = parts[1];
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload = JSON.parse(payloadJson);

      console.log('\n👤 Decoded Payload:');
      console.log(JSON.stringify(payload, null, 2));
    } catch (e) {
      console.log('\n⚠️  Could not decode payload');
    }

    console.log('\n🔗 Test on jwt.io: https://jwt.io');
    console.log('   Copy the token above and paste it there!');
    console.log('═'.repeat(80));
    console.log('\n');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging JWT:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log JWT" },
      { status: 500 }
    );
  }
}
