/**
 * Jest configuration for the Expo client.
 *
 * `jest-expo` supplies the React Native transform and mocks the native part of
 * the Expo SDK. `transformIgnorePatterns` follows the Expo unit-testing guide so
 * that Expo and React Native packages are transpiled instead of ignored; the
 * remaining entries are packages this app depends on that ship untranspiled
 * ESM, which Metro compiles but Jest would otherwise skip (`immer` is the one
 * that fails first, because Redux Toolkit loads its legacy ESM build).
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/jest.style-mock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|standard-navigation|@sentry/react-native|native-base|react-native-svg|uniwind|@gluestack-ui/.*|@legendapp/motion|react-native-css|@reduxjs/toolkit|redux|react-redux|use-sync-external-store|immer|reselect)',
  ],
};
