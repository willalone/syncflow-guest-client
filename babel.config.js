module.exports = function (api) {
  api.cache(() => process.env.NODE_ENV);
  const isProd = process.env.NODE_ENV === 'production';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...(isProd ? [['transform-remove-console', { exclude: ['warn', 'error'] }]] : []),
      'react-native-reanimated/plugin',
    ],
  };
};
