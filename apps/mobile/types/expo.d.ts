/// <reference types="expo/types" />

// Expo normally writes `expo-env.d.ts` on first run, but that file is
// git-ignored, so a fresh checkout cannot typecheck until the dev server has
// run once. This tracked reference activates Expo's ambient declarations
// (including the `*.css` modules used by the styling layer) unconditionally.
