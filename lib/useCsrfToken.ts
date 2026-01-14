'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to fetch and manage CSRF token
 * Automatically fetches token on mount and provides it for API requests
 */
export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCsrfToken();
  }, []);

  const fetchCsrfToken = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include', // Important: include cookies
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data = await response.json();
      setCsrfToken(data.csrfToken);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('Error fetching CSRF token:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return { csrfToken, isLoading, error, refetchToken: fetchCsrfToken };
}

/**
 * Helper to get CSRF token from cookies (fallback)
 */
export function getCsrfTokenFromCookies(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'));
  return match ? match[2] : null;
}

/**
 * Helper to add CSRF token to fetch options
 */
export function withCsrfToken(
  csrfToken: string | null,
  options: RequestInit = {}
): RequestInit {
  if (!csrfToken) {
    console.warn('CSRF token is null, request may be rejected');
    return options;
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': csrfToken,
    },
  };
}
