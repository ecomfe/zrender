#!/usr/bin/env node

const fsExtra = require('fs-extra');
const {resolve} = require('path');
const config = require('./config.js');
const commander = require('commander');
const {build, watch} = require('./helper');
const prePublish = require('./pre-publish');

function run() {

    /**
     * Tips for `commander`:
     * (1) If arg xxx not specified, `commander.xxx` is undefined.
     *     Otherwise:
     *      If '-x, --xxx', `commander.xxx` can only be true/false, even if '--xxx yyy' input.
     *      If '-x, --xxx <some>', the 'some' string is required, or otherwise error will be thrown.
     *      If '-x, --xxx [some]', the 'some' string is optional, that is, `commander.xxx` can be boolean or string.
     * (2) `node ./build/build.js --help` will print helper info and exit.
     */

    commander
        .usage('[options]')
        .description('Build zrender and generate result files in directory `zrender/dist` ')
        .option(
            '--release',
            'Build all for release'
        )
        .option(
            '--prepublish',
            'Build all for release'
        )
        .option(
            '-w, --watch',
            'Watch modifications of files and auto-compile to dist file (e.g., `zrender/dist/zrender.js`).'
        )
        .option(
            '--min',
            'Whether to compress the output file.'
        )
        .parse(process.argv);

    let isWatch = !!commander.watch;
    let isRelease = !!commander.release;
    let isPrePublish = !!commander.prepublish;
    let min = !!commander.min;

    // Clear `echarts/dist`
    if (isRelease) {
        fsExtra.removeSync(getPath('./dist'));
    }

    if (isWatch) {
        watch(config.create());
    }
    else if (isPrePublish) {
        prePublish();
    }
    else if (isRelease) {
        build([
            config.create(false),
            config.create(true)
        ]).then(function () {
            prePublish();
        }).catch(handleBuildError);
    }
    else {
        build([config.create(min)]).catch(handleBuildError);
    }
}

function handleBuildError(err) {
    console.log(err);
}

/**
 * @param {string} relativePath Based on zrender directory.
 * @return {string} Absolute path.
 */
function getPath(relativePath) {
    return resolve(__dirname, '../', relativePath);
}

run();
