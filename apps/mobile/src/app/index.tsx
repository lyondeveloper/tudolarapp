import { Redirect } from 'expo-router';

import { useAppSelector } from '@/store/hooks';

/**
 * Entry route. It holds the app on the native splash while the session is still
 * being restored, then sends the user to the screen that matches the session
 * status, so neither screen ever renders at the wrong time.
 */
export default function Index() {
  const status = useAppSelector((state) => state.session.status);

  if (status === 'restoring') return null;

  return <Redirect href={status === 'authenticated' ? '/home' : '/sign-in'} />;
}
