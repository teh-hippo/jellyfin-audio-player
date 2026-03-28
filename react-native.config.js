module.exports = {
    dependencies: {
        // Exclude CarPlay package from iOS build - incompatible with Xcode 16.x
        // and CarPlay entitlement not enabled on fork's App ID.
        // Re-enable when upstream fixes Xcode 16 compatibility.
        '@iternio/react-native-auto-play': {
            platforms: {
                ios: null,
            },
        },
    },
    project: {
        ios: {},
        android: {}
    },
    assets: ['./src/assets/fonts/'],
};
