const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// drizzle-kit が生成する .sql をアセットとしてバンドルに含める
config.resolver.sourceExts.push('sql');

module.exports = config;
