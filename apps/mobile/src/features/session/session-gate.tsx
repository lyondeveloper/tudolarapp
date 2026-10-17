import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useAppSelector } from '@/store/hooks';

/**
 * Route guards for the two session states.
 *
 * A guard lives on each screen rather than only on the entry route, because the
 * entry route is unmounted once the user is somewhere else: after a successful
 * sign-in nothing would move the user off the sign-in screen if the redirect
 * decision lived only at `/`. Guarding the screens keeps the routing rule
 * declarative and independent of where the user currently is.
 *
 * While the session is `restoring` neither screen renders, so the app never
 * shows the wrong one before the stored refresh token has been exchanged.
 */

export function RequireAnonymous({ children }: { children: ReactNode }) {
  const status = useAppSelector((state) => state.session.status);

  if (status === 'restoring') return null;
  if (status === 'authenticated') return <Redirect href="/home" />;

  return <>{children}</>;
}

export function RequireAuthenticated({ children }: { children: ReactNode }) {
  const status = useAppSelector((state) => state.session.status);

  if (status === 'restoring') return null;
  if (status === 'anonymous') return <Redirect href="/sign-in" />;

  return <>{children}</>;
}
