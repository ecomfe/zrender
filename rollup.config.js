import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify';

var watching = process.argv.indexOf('--watch') >= 0 || process.argv.indexOf('-w') >= 0;

function getPlugins(production) {
    let plugins = [
        resolve({
            extensions: ['.js'],
            jsnext: true,
            main: true,
            customResolveOptions: {
                /**
                 * BTW, `index.js` of a package will not be filtered.
                 * @see <https://github.com/browserify/resolve>
                 * @param {Object} pkg - package data
                 * @param {Object} path - the path being resolved
                 * @param {Object} relativePath - the path relative from the package.json location
                 * @return {string} - a relative path that will be joined from the package.json location
                 */
                pathFilter: function (pkg, path, relativePath) {
                    if (pkg.name !== 'zrender') {
                        return path;
                    }
                    // Redirect zrender `import` to `node_module/zrender/src`.
                    var idx = path.lastIndexOf(relativePath);
                    return path.slice(0, idx) + 'src/' + relativePath;
                }
            }
        }),
        commonjs({
            include: ['lib/**', 'index*.js']
        })
    ];
    if (production) {
        plugins.push(uglify({
            compress: {
                // Eliminate __DEV__ code.
                global_defs: {
                    __DEV__: true
                }
            }
        }));
    }
    return plugins;
}

function createBuild(production) {
    var postfix = '';
    if (production) {
        postfix = '.min';
    }

    return {
        name: 'zrender',
        plugins: getPlugins(),
        input: './zrender.js',
        legacy: true, // Support IE8-
        output: {
            format: 'umd',
            sourcemap: true,
            file: 'dist/zrender.js'
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