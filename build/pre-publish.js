/**
 * Compatible with prevoius folder structure: `zrender/lib` exists in `node_modules`
 */

const path = require('path');
const fsExtra = require('fs-extra');
const {color, travelSrcDir, prePulishSrc} = require('./helper');

const ecDir = path.resolve(__dirname, '..');
const srcDir = path.resolve(__dirname, '../src');
const libDir = path.resolve(__dirname, '../lib');


module.exports = function () {

    fsExtra.removeSync(libDir);
    fsExtra.ensureDirSync(libDir);

    travelSrcDir(srcDir, ({fileName, relativePath, absolutePath}) => {
        prePulishSrc({
            inputPath: absolutePath,
            outputPath: path.resolve(libDir, relativePath, fileName)
        });
    });

    prePulishSrc({
        inputPath: path.resolve(ecDir, 'zrender.all.js'),
        outputPath: path.resolve(ecDir, 'index.js')
    });

    console.log(color('fgGreen', 'bright')('All done.'));
};
