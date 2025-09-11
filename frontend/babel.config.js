module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: { '@': './src' }
      }
    ],
    // MUST be last
    'react-native-reanimated/plugin'
  ]
};
