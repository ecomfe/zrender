const uglifyPlugin = require('rollup-plugin-uglify');
const {resolve} = require('path');

// Based on echarts/
function getPath(relativePath) {
    return resolve(__dirname, '../', relativePath);
}

/**
 * @param {boolean} [min=false]
 */
function getPlugins(min) {
    let plugins = [];
    min && plugins.push(uglifyPlugin({
        compress: {
            // Eliminate __DEV__ code.
            'global_defs': {
                __DEV__: true
            }
        }
    }));

    return plugins;
}

/**
 * @param {boolean} [min=false]
 */
exports.create = function (min) {
    let postfixMin = min ? '.min' : '';

    return {
        plugins: getPlugins(min),
        input: getPath(`./zrender.all.js`),
        legacy: true, // Support IE8-
        output: {
            name: 'zrender',
            format: 'umd',
            legacy: true, // Must be declared both in inputOptions and outputOptions.
            sourcemap: !min,
            file: getPath(`dist/zrender${postfixMin}.js`)
        },
        watch: {
            include: [getPath('./src/**'), getPath('./zrender*.js')]
        }
    };
};
