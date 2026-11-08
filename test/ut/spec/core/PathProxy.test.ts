import PathProxy from '../../../../src/core/PathProxy';
import Polyline from '../../../../src/graphic/shape/Polyline';
import Rect from '../../../../src/graphic/shape/Rect';
import { mergePath } from '../../../../src/tool/path';

describe('PathProxy.appendPath', function () {
    const CMD = PathProxy.CMD;
    const prefix = [CMD.M, -10, -10];
    const lineData = [CMD.M, 0, 0, CMD.L, 10, 0];

    function createReusedPath(typed: boolean, empty = false) {
        const path = new PathProxy();
        path.moveTo(0, 0);
        for (let x = 10; x <= 40; x += 10) {
            path.lineTo(x, 0);
        }
        if (typed) {
            path.toStatic();
        }
        path.reset();
        if (!empty) {
            path.moveTo(0, 0);
            path.lineTo(10, 0);
        }
        expect(path.data instanceof Float32Array).toBe(typed);
        expect(path.data.length).toBeGreaterThan(path.len());
        return path;
    }

    function createDestination(typed: boolean) {
        const path = new PathProxy();
        if (typed) {
            path.setData(new Float32Array(prefix));
        }
        else {
            path.moveTo(-10, -10);
        }
        expect(path.data instanceof Float32Array).toBe(typed);
        return path;
    }

    [false, true].forEach(function (typedSource) {
        [false, true].forEach(function (typedDestination) {
            const storage = `${typedSource ? 'Float32Array' : 'Array'} to `
                + `${typedDestination ? 'Float32Array' : 'Array'}`;

            it(`should append only the active commands of a reused path (${storage})`, function () {
                const source = createReusedPath(typedSource);
                const originalData = source.data;
                const originalValues = Array.from(source.data);
                const destination = createDestination(typedDestination);

                destination.appendPath(source);

                expect(destination.len()).toBe(prefix.length + lineData.length);
                expect(Array.from(destination.data)).toEqual(prefix.concat(lineData));
                expect(source.data).toBe(originalData);
                expect(Array.from(source.data)).toEqual(originalValues);
                expect(source.len()).toBe(lineData.length);
            });

            it(`should append multiple paths and ignore empty reused paths (${storage})`, function () {
                const source = createReusedPath(typedSource);
                const empty = createReusedPath(typedSource, true);
                const rect = new PathProxy();
                rect.rect(50, 60, 5, 6);
                const rectData = Array.from(rect.data);
                const emptyData = empty.data;
                const emptyValues = Array.from(empty.data);
                const destination = createDestination(typedDestination);

                destination.appendPath([empty, source, empty, rect]);

                const expected = prefix.concat(lineData, rectData);
                expect(destination.len()).toBe(expected.length);
                expect(Array.from(destination.data)).toEqual(expected);
                expect(empty.data).toBe(emptyData);
                expect(Array.from(empty.data)).toEqual(emptyValues);
                expect(empty.len()).toBe(0);
            });
        });
    });

    [false, true].forEach(function (typedDestination) {
        it(`should retain the prefix when appending no paths (typed: ${typedDestination})`, function () {
            const destination = createDestination(typedDestination);

            destination.appendPath([]);

            expect(destination.len()).toBe(prefix.length);
            expect(Array.from(destination.data)).toEqual(prefix);
        });
    });

    it('should merge the current geometry after a polyline shrinks', function () {
        const line = new Polyline({
            shape: { points: [[0, 0], [10, 0], [20, 0], [30, 0], [40, 0]] }
        });
        line.getUpdatedPathProxy(true);
        line.setShape({ points: [[0, 0], [10, 0]] });
        const rect = new Rect({ shape: { x: 0, y: 0, width: 1, height: 1 } });

        const merged = mergePath([line, rect], {});
        const mergedPath = merged.getUpdatedPathProxy(true);
        const bounds = merged.getBoundingRect();

        expect(mergedPath.len()).toBe(line.getUpdatedPathProxy().len() + rect.getUpdatedPathProxy().len());
        expect(bounds.x).toBe(0);
        expect(bounds.y).toBe(0);
        expect(bounds.width).toBe(10);
        expect(bounds.height).toBe(1);
    });
});
