module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Drizzle のマイグレーション journal / .sql を JS から直接 import するために必要
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
