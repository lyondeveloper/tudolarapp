/**
 * Stub for stylesheet imports.
 *
 * The root layout imports `src/global.css` for the uniwind/Tailwind pipeline.
 * Metro compiles that file, but Jest only sees CSS text and fails to parse it,
 * so stylesheet imports are mapped to this empty module in tests.
 */
module.exports = {};
