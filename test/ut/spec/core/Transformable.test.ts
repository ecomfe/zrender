import Rect from '../../../../src/graphic/shape/Rect';
import Group from '../../../../src/graphic/Group';
import Transformable from '../../../../src/core/Transformable';

describe('Transformable origin', function () {
    function expectMatrix(actual: ArrayLike<number>, expected: number[]) {
        expect(actual.length).toBe(6);
        for (let i = 0; i < 6; i++) {
            expect(actual[i]).toBeCloseTo(expected[i], 8);
        }
    }

    it('should retain the origin and requested translation after drifting a rotated element', function () {
        const element = new Rect({
            x: 100,
            y: 40,
            originX: 50,
            originY: 50,
            rotation: Math.PI / 4,
            shape: {width: 100, height: 100}
        });
        element.updateTransform();
        const initial = Array.from(element.transform);

        element.drift(2, 3);
        element.update();

        expect(element.transform[4]).toBeCloseTo(initial[4] + 2, 8);
        expect(element.transform[5]).toBeCloseTo(initial[5] + 3, 8);
        expect(element.originX).toBe(50);
        expect(element.originY).toBe(50);
    });

    const cases = [
        {name: 'rotation', transform: {originX: 50, originY: 50, rotation: Math.PI / 4}},
        {name: 'scale', transform: {originX: -20, originY: 35, scaleX: 2.5, scaleY: 0.4}},
        {name: 'skewX', transform: {originX: 30, originY: 12, skewX: 0.25}},
        {name: 'skewY with one origin axis', transform: {originX: 20, originY: 0, skewY: -0.3}},
        {
            name: 'combined transform with the other origin axis',
            transform: {originX: 0, originY: 40, rotation: 0.7, scaleX: 1.2, scaleY: 0.8, skewX: 0.2, skewY: -0.1}
        },
        {
            name: 'reflection',
            transform: {originX: 50, originY: -20, rotation: -0.6, scaleX: -1.4, scaleY: 0.75, skewX: 0.12}
        },
        {
            name: 'zero origin',
            transform: {originX: 0, originY: 0, rotation: 0.4, scaleX: 1.7, scaleY: 0.6, skewX: 0.2, skewY: 0.1}
        },
        {name: 'translation only', transform: {originX: 50, originY: 50}}
    ];

    cases.forEach(function (scenario) {
        [false, true].forEach(function (withParent) {
            it(`should preserve the full matrix through repeated drift (${scenario.name}, parent: ${withParent})`,
                function () {
                    const element = new Rect({x: 100, y: 40, ...scenario.transform});
                    const parent = new Group({
                        x: 20,
                        y: -30,
                        originX: 8,
                        originY: 3,
                        rotation: -0.3,
                        scaleX: 1.7,
                        scaleY: 0.6,
                        skewX: 0.2
                    });
                    if (withParent) {
                        parent.add(element);
                        parent.updateTransform();
                    }
                    element.updateTransform();
                    const initial = Array.from(element.transform);
                    const parentTransform = withParent ? Array.from(parent.transform) : null;

                    for (let step = 1; step <= 3; step++) {
                        element.drift(2, 3);
                        element.update();

                        const expected = initial.slice();
                        expected[4] += step * 2;
                        expected[5] += step * 3;
                        expectMatrix(element.transform, expected);
                        expect(element.originX).toBe(scenario.transform.originX);
                        expect(element.originY).toBe(scenario.transform.originY);
                    }
                    if (withParent) {
                        expect(Array.from(parent.transform)).toEqual(parentTransform);
                    }
                });
        });
    });

    it('should still reset the origin when setting a complete local matrix directly', function () {
        const element = new Transformable();
        element.setOrigin([50, -20]);
        const matrix = [2, -1, 0.5, 3, 7, 11];

        element.setLocalTransform(matrix);
        element.updateTransform();

        expect(element.originX).toBe(0);
        expect(element.originY).toBe(0);
        expectMatrix(element.transform, matrix);
    });

    it('should leave the origin unchanged when there is no matrix to decompose', function () {
        const element = new Transformable();
        element.setOrigin([50, -20]);

        element.decomposeTransform();

        expect(element.originX).toBe(50);
        expect(element.originY).toBe(-20);
        expect(element.transform).toBeUndefined();
    });
});
