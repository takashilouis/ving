import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, setCsrfCookies } from '@/lib/csrf';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/csrf-token
 * Issues a new CSRF token to the client
 * The secret is stored in an httpOnly cookie, token is returned in response and cookie
 */
export async function GET(request: NextRequest) {
  try {
    const { secret, token } = await generateCsrfToken();
    const { secretCookie, tokenCookie } = setCsrfCookies(secret, token);

    const response = NextResponse.json({ csrfToken: token });

    // Set both cookies in the response
    response.headers.append('Set-Cookie', secretCookie);
    response.headers.append('Set-Cookie', tokenCookie);

    return response;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
