const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const { resolver: { sourceExts, assetExts } } = getDefaultConfig(__dirname);

module.exports = mergeConfig(getDefaultConfig(__dirname), {
    transformer: {
        babelTransformerPath: require.resolve('react-native-svg-transformer'),
    },
    resolver: {
        assetExts: assetExts.filter(ext => ext !== 'svg'),
        sourceExts: [...sourceExts, 'svg'],
    },
});

// If you still have Metro issues, uncomment the line below to use the original config:
// module.exports = getDefaultConfig(__dirname);
