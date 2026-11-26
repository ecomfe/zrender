import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const reported = [
    'lib/core/platform', 'lib/zrender', 'lib/svg/helper', 'lib/graphic/Path',
    'lib/graphic/Image', 'lib/graphic/TSpan', 'lib/canvas/dashStyle',
    'lib/svg/mapStyleToAttrs'
];

describe('package exports', function () {
    it('resolves built lib files and preserves explicit extensions and non-lib paths', function () {
        const root = path.resolve(__dirname, '../../..');
        const paths = [
            ...reported, 'lib/canvas/canvas', 'lib/tool/color',
            ...reported.map(name => name + '.js'),
            ...reported.map(name => name + '.d.ts'),
            'package.json', 'dist/zrender.js'
        ];
        const script = `
            import { fileURLToPath } from 'node:url';
            import { relative } from 'node:path';
            const paths = ${JSON.stringify(paths)};
            console.log(JSON.stringify(paths.map(name =>
                relative(process.cwd(), fileURLToPath(import.meta.resolve('zrender/' + name)))
            )));
        `;
        const resolved: string[] = JSON.parse(execFileSync(process.execPath, [
            '--input-type=module', '--eval', script
        ], { cwd: root, encoding: 'utf8' }));
        expect(resolved).toEqual(paths.map(name =>
            name.startsWith('lib/') && !name.endsWith('.js') && !name.endsWith('.d.ts')
                ? name + '.js' : name
        ));
        // Node's import.meta.resolve can return paths to missing files: verify the lib artifacts too.
        for (const target of resolved.filter(name => name.startsWith('lib/'))) {
            expect(fs.existsSync(path.join(root, target))).toBe(true);
        }
    });

    it('names only files the package ships', function () {
        const root = path.resolve(__dirname, '../../..');
        const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
        // Node's resolver trusts the map: a stale entry promises a file that is not there.
        // The root entry is conditional and depends on the dist build; a pattern is not a file.
        const missing = Object.keys(pkg.exports)
            .filter(key => key !== '.' && !key.endsWith('*'))
            .filter(key => !fs.existsSync(path.join(root, pkg.exports[key])));
        expect(missing).toEqual([]);
    });

    it.each(reported)('bundles explicit %s.js with Rollup 1', async function (name) {
        const root = path.resolve(__dirname, '../../..');
        const { rollup } = require('rollup');
        const resolve = require('@rollup/plugin-node-resolve').default;
        const bundle = await rollup({
            input: 'virtual-entry',
            external: (id: string) => id.startsWith('.') || id === 'tslib',
            plugins: [{
                name: 'virtual-entry',
                resolveId(id: string) { return id === 'virtual-entry' ? id : null; },
                load(id: string) { return id === 'virtual-entry' ? `import 'zrender/${name}.js';` : null; }
            }, resolve()],
            onwarn(warning: any) {
                if (warning.code !== 'UNUSED_EXTERNAL_IMPORT') {
                    throw new Error(warning.message);
                }
            }
        });
        expect(bundle.watchFiles).toContain(path.join(root, name + '.js'));
    });
});
