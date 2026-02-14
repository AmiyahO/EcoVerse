// // metro.config.js
// const { getDefaultConfig } = require('expo/metro-config');
// const path = require('path');

// const config = getDefaultConfig(__dirname);

// config.resolver.extraNodeModules = {
//   'firebase/auth': path.resolve(__dirname, 'node_modules/firebase/auth'),
// };

// // 1. Support .mjs files
// config.resolver.sourceExts.push('mjs');

// // 2. Force Metro to resolve the "browser" or "react-native" fields in package.json
// // config.resolver.resolverMainFields = ['sbmodern', 'react-native', 'browser', 'main'];

// config.resolver.unstable_enablePackageExports = true;

// module.exports = config;