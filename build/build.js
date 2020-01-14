// const typescript = require('@rollup/plugin-typescript');
const typescript = require('rollup-plugin-typescript2');
const rollup = require('rollup');
const path = require('path');
const processs = require('process');
const chalk = require('chalk');

function current() {
    return (new Date()).toLocaleString();
}

const inputOption = {
    input: path.resolve(__dirname, '../index.ts'),
    plugins: [typescript({
        tsconfigOverride: {
            compilerOptions: {
                // Rollup don't use CommonJS by default.
                module: 'ES2015',
                sourceMap: true,
                // Use the esm d.ts
                declaration: false
            }
        }
    })]
};

const outputOption = {
    format: 'umd',
    file: path.resolve(__dirname, '../dist/zrender.js'),
    sourcemap: true,
    name: 'zrender'
};

if (processs.argv.includes('--watch')) {
    const watcher = rollup.watch({
        ...inputOption,
        output: [outputOption],
        watch: {
            clearScreen: true
        }
    });
    watcher.on('event', event => {
        switch(event.code) {
            // case 'START':
            //     console.log(chalk.green('Begin to watch'));
            //     break;
            case 'BUNDLE_START':
                console.log(
                    chalk.gray(current()),
                    chalk.blue('File changed. Begin to bundle')
                );
                break;
            case 'BUNDLE_END':
                console.log(
                    chalk.gray(current()),
                    chalk.green('Finished bundle')
                );
                break;
            case 'ERROR':
                console.log(
                    chalk.gray(current()),
                    chalk.red(event.error)
                );
                break;
        }
    });
}
else {
    rollup.rollup({
        ...inputOption
    }).then(bundle => {
        bundle.write(outputOption);
    });
}
