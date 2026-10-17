module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],

    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],

          alias: {
            // Must match the mappings in tsconfig.json. `@/assets/*` is listed
            // first because the resolver applies the first alias that matches,
            // and the bare `@` alias would otherwise send `@/assets/...` into
            // `./src/assets/...`, which does not exist.
            '@/assets': './assets',
            // Must match the `@/*` -> `./src/*` mapping in tsconfig.json.
            // `gluestack-ui init` writes `./` here, which only works for
            // projects whose app code sits at the repository root.
            '@': './src',
          },
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};
