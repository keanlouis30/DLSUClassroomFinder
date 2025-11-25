// This file shows how to handle rate limiting errors on the login page
// Add to your app/auth/login/page.tsx

'use client';

import { useSearchParams } from 'next/navigation';

export function RateLimitErrorDisplay() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const minutes = searchParams.get('minutes');

  if (!error) return null;

  let errorMessage = '';
  let errorType = '';

  switch (error) {
    case 'rate_limited':
      errorType = 'IP Rate Limited';
      errorMessage = `Too many login attempts from your IP. Please try again in ${minutes || '30'} minutes.`;
      break;
    case 'account_locked':
      errorType = 'Account Locked';
      errorMessage = `Your account has been temporarily locked due to multiple failed attempts. Please try again in ${minutes || '30'} minutes.`;
      break;
    case 'invalid_domain':
      errorType = 'Invalid Email Domain';
      errorMessage = 'Please sign in with your @dlsu.edu.ph email address.';
      break;
    default:
      return null;
  }

  return (
    <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
      <h3 className="font-bold">{errorType}</h3>
      <p className="text-sm">{errorMessage}</p>
    </div>
  );
}
