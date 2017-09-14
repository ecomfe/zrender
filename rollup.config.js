import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
    entry: './index.js',
    format: 'umd',
    moduleName: 'zrender',
    plugins: [
        resolve(),
        commonjs({
            include: ['lib/**', 'index.js']
        })
    ],
    dest: 'dist/zrender.js'
  };