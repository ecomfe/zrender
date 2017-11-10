/**
 * Compatible with prevoius folder structure: `zrender/lib` exists in `node_modules`
 */

const {resolve, join} = require('path');
const fsExtra = require('fs-extra');
const fs = require('fs');
const babel = require('@babel/core');
const esm2cjsPlugin = require('./babel-plugin-transform-modules-commonjs-ec');
const {color} = require('./helper');

const ecDir = resolve(__dirname, '..');
const srcDir = resolve(__dirname, '../src');
const libDir = resolve(__dirname, '../lib');

const REG_SRC = /^[^.].*[.]js$/;
const REG_DIR = /^[^.].*$/;


module.exports = function () {

    fsExtra.removeSync(libDir);
    fsExtra.ensureDirSync(libDir);

    travelSrcDir('.', ({fileName, basePath, absolutePath, outputPath}) => {
        outputPath = resolve(ecDir, 'lib', basePath, fileName);
        transform(absolutePath, outputPath);
    });

    transform(resolve(ecDir, 'zrender.all.js'), resolve(ecDir, 'index.js'));

    function transform(inputPath, outputPath) {
        console.log(
            color('fgGreen', 'dim')('[transform] '),
            color('fgGreen')(inputPath),
            color('fgGreen', 'dim')('...')
        );

        let {code} = babel.transformFileSync(inputPath, {
            plugins: [esm2cjsPlugin]
        });

        code = esm2cjsPlugin.replaceInject(code);

        fsExtra.ensureFileSync(outputPath);
        fs.writeFileSync(outputPath, code, {encoding:'utf-8'});
    }

    console.log(color('fgGreen', 'bright')('All done.'));
};

function travelSrcDir(basePath, cb) {
    const absolutePath = resolve(srcDir, basePath);

    fs.readdirSync(absolutePath).forEach(fileName => {
        const childAbsolutePath = resolve(absolutePath, fileName);
        const stat = fs.statSync(childAbsolutePath);
        if (stat.isDirectory()) {
            if (REG_DIR.test(fileName)) {
                travelSrcDir(join(basePath, fileName), cb);
            }
        }
        else if (stat.isFile()) {
            if (REG_SRC.test(fileName)) {
                cb({fileName, basePath: basePath, absolutePath: childAbsolutePath});
            }
        }
    });
}
