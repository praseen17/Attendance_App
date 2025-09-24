const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle missing files gracefully
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configure transformer to handle missing source maps
config.transformer = {
    ...config.transformer,
    minifierConfig: {
        keep_fnames: true,
        mangle: {
            keep_fnames: true,
        },
    },
};

// Configure server options to handle missing files
config.server = {
    ...config.server,
    enhanceMiddleware: (middleware, server) => {
        return (req, res, next) => {
            // Handle InternalBytecode.js requests gracefully
            if (req.url && req.url.includes('InternalBytecode.js')) {
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end('// InternalBytecode.js placeholder');
                return;
            }
            return middleware(req, res, next);
        };
    },
};

module.exports = config;