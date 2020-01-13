// const typescript = require('@rollup/plugin-typescript');
const typescript = require('rollup-plugin-typescript2');
const rollup = require('rollup');
const path = require('path');

rollup.rollup({
    input: path.resolve(__dirname, '../index.ts'),
    plugins: [typescript({
        tsconfigOverride: {
            compilerOptions: {
                // Rollup don't use CommonJS by default.
                module: 'ES2015',
                sourceMap: true
            }
        }
    })]
}).then(bundle => {
    bundle.write({
        format: 'umd',
        file: path.resolve(__dirname, '../dist/zrender.js'),
        sourcemap: true,
        name: 'zrender'
    });
});


