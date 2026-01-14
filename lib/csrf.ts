import Tokens from 'csrf';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const tokens = new Tokens();

// Secret for CSRF token generation (should be stored in env, but can be generated per session)
const CSRF_SECRET_COOKIE = 'csrf-secret';
const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';

/**
 * Generate a CSRF secret and token pair
 * The secret is stored in an httpOnly cookie, token is readable by client
 */
export async function generateCsrfToken(): Promise<{ secret: string; token: string }> {
  const secret = tokens.secretSync();
  const token = tokens.create(secret);

  return { secret, token };
}

/**
 * Set CSRF token cookies in response
 */
export function setCsrfCookies(secret: string, token: string): {
  secretCookie: string;
  tokenCookie: string;
} {
  // Secret cookie (httpOnly, not accessible to JavaScript)
  const secretCookie = `${CSRF_SECRET_COOKIE}=${secret}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`;

  // Token cookie (readable by JavaScript for inclusion in requests)
  const tokenCookie = `${CSRF_TOKEN_COOKIE}=${token}; Path=/; Secure; SameSite=Strict; Max-Age=86400`;

  return { secretCookie, tokenCookie };
}

/**
 * Validate CSRF token from request
 * Token can come from header or request body
 */
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const secret = cookieStore.get(CSRF_SECRET_COOKIE)?.value;

  if (!secret) {
    console.error('CSRF validation failed: No secret found in cookies');
    return false;
  }

  // Try to get token from header first, then from body
  let token = request.headers.get(CSRF_TOKEN_HEADER);

  if (!token && request.method !== 'GET') {
    // Try to get from request body
    try {
      const body = await request.clone().json();
      token = body.csrfToken;
    } catch (e) {
      // Body might not be JSON or already consumed
      console.error('CSRF validation failed: Could not parse request body');
    }
  }

  if (!token) {
    console.error('CSRF validation failed: No token found in request');
    return false;
  }

  const isValid = tokens.verify(secret, token);

  if (!isValid) {
    console.error('CSRF validation failed: Token verification failed');
  }

  return isValid;
}

/**
 * Get CSRF token from cookies (client-side)
 */
export function getCsrfTokenFromCookies(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(new RegExp('(^| )' + CSRF_TOKEN_COOKIE + '=([^;]+)'));
  return match ? match[2] : null;
}

/**
 * Middleware helper to validate CSRF for state-changing operations
 */
export async function withCsrfProtection(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Only validate CSRF for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const isValid = await validateCsrfToken(request);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }
  }

  return handler(request);
}
