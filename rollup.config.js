/* global process */

import uglify from 'rollup-plugin-uglify';

var watching = process.argv.indexOf('--watch') >= 0 || process.argv.indexOf('-w') >= 0;

function getPlugins(min) {
    let plugins = [];
    min && plugins.push(uglify({
        compress: {
            // Eliminate __DEV__ code.
            'global_defs': {
                __DEV__: false
            }
        }
    }));
    return plugins;
}

function createBuild(min) {
    var postfix = min ? '.min' : '';

    return {
        name: 'zrender',
        plugins: getPlugins(min),
        input: './zrender.js',
        legacy: true, // Support IE8-
        output: {
            format: 'umd',
            sourcemap: !min,
            file: `dist/zrender${postfix}.js`
        },
        watch: {
            include: ['./src/**', './zrender*.js']
        }
    };
}

var configs = watching
    ? createBuild(false)
    : [
        createBuild(false),
        createBuild(true),
    ];

export default configs;