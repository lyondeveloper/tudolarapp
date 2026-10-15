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
