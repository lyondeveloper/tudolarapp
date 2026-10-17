/**
 * Jest environment shim.
 *
 * `react-aria` — pulled in by the gluestack provider that the root layout
 * renders — inspects `window.screen` and `window.visualViewport` at import time
 * whenever `NODE_ENV` is `test`:
 *
 *   if (process.env.NODE_ENV === 'test' && typeof window !== 'undefined' &&
 *       !Reflect.has(window.screen, 'orientation')) { ... }
 *
 * The jest-expo node environment defines `window` but not `window.screen`, so
 * `Reflect.has` is called on `undefined` and throws `Reflect.has called on
 * non-object` before a single test can run. Supplying the missing object keeps
 * the library's own test-only setup working instead of mocking the provider.
 */
if (typeof window !== 'undefined' && typeof window.screen !== 'object') {
  try {
    Object.defineProperty(window, 'screen', {
      value: {},
      configurable: true,
      writable: true,
    });
  } catch {
    // If the environment refuses the definition there is nothing else to do
    // here; the failure would surface as the original library error.
  }
}
