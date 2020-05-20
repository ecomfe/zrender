import {Rect} from '../zrender';
import {util} from '../zrender';
import { PathState } from '../../../../src/graphic/Path';

describe('Path', function () {

    it('Can init properties properly.', function () {
        const rect = new Rect({
            shape: {
                width: 100,
                height: 100
            },
            style: {
                stroke: 'red'
            },
            x: 10,
            y: 10
        });
        // Default shape values should be correct
        expect(rect.shape.x).toBe(0);
        expect(rect.shape.y).toBe(0);

        // Given shape values should be correct
        expect(rect.shape.width).toBe(100);
        expect(rect.shape.height).toBe(100);

        // Default style values should be right
        expect(rect.style.fill).toBe('#000');
        // Given style values should be right
        expect(rect.style.stroke).toBe('red');

        expect(rect.x).toEqual(10);
        expect(rect.y).toEqual(10);
    });

    it('Default styles should be right.', function () {
        const rect = new Rect();
        // Default shape values should be correct
        expect(rect.style.stroke).toBe(null);
        expect(rect.style.fill).toBe('#000');
        expect(rect.style.lineDashOffset).toBe(0);
        expect(rect.style.lineWidth).toBe(1);
        expect(rect.style.lineCap).toBe('butt');
        expect(rect.style.miterLimit).toBe(10);

        expect(rect.style.strokeNoScale).toBe(false);
        expect(rect.style.strokeFirst).toBe(false);

        expect(rect.style.shadowBlur).toBe(0);
        expect(rect.style.shadowOffsetX).toBe(0);
        expect(rect.style.shadowOffsetY).toBe(0);
        expect(rect.style.shadowColor).toBe('#000');
        expect(rect.style.opacity).toBe(1);
        expect(rect.style.blend).toBe('source-over');
    });

    it('Path#setStyle should merge style properly', function () {
        const rect = new Rect({
            style: { stroke: 'red' }
        });

        rect.setStyle({
            stroke: 'green',
            fill: 'blue'
        });

        expect(rect.style.fill).toBe('blue');
        expect(rect.style.stroke).toBe('green');

        rect.setStyle('stroke', 'yellow');
        rect.setStyle('lineWidth', 2);

        expect(rect.style.stroke).toBe('yellow');
        expect(rect.style.lineWidth).toBe(2);
    });

    it('Path#setShape should merge style properly', function () {
        const rect = new Rect({
            shape: { width: 100, height: 100 }
        });
        rect.setShape({ x: 10, width: 200 });
        expect(rect.shape.x).toEqual(10);
        expect(rect.shape.width).toEqual(200);

        rect.setShape('r', 5);
        rect.setShape('x', 100);

        expect(rect.shape.r).toBe(5);
        expect(rect.shape.x).toBe(100);
    });


    const selectedState: PathState = {
        x: 100,
        y: 100,
        rotation: 10,
        scaleX: 2,
        scaleY: 2,
        originX: 10,
        originY: 10,
        style: {
            stroke: 'red',
            lineWidth: 2
        },
        shape: {
            width: 200,
            x: 10
        },
        z: 1,
        z2: 10,
        invisible: true,
        ignore: true
    };

    function createRectForStateTest() {
        return new Rect({
            shape: {
                width: 100,
                height: 100
            },
            style: {
                fill: 'blue'
            }
        });
    }

    it('Path#useState should switch state properly', function () {
        const rect = createRectForStateTest();

        expect(rect.states).toEqual({});

        rect.states = {
            selected: util.clone(selectedState)
        };

        expect(rect.currentStates).toEqual([]);

        rect.useState('selected');

        expect(rect.currentStates).toEqual(['selected']);

        expect(rect).toMatchObject({
            x: 100, y: 100,
            scaleX: 2, scaleY: 2,
            originX: 10, originY: 10,
            rotation: 10
        });
        expect(rect.style.stroke).toBe('red');
        expect(rect.style.lineWidth).toBe(2);
        expect(rect.shape.width).toBe(200);
        expect(rect.shape.x).toBe(10);
        expect(rect.invisible).toBe(true);
        expect(rect.ignore).toBe(true);
        expect(rect.z).toBe(1);
        expect(rect.z2).toBe(10);

        // Still keep the original value if property is not exists in state
        expect(rect.shape.height).toBe(100);
        expect(rect.style.fill).toBe('blue');

    });

    it('Path#clearStates should be able to restore to normal state properly', function () {
        const rect = createRectForStateTest();

        rect.states = {
            selected: util.clone(selectedState)
        };

        rect.useState('selected');
        // Switch back to normal
        rect.clearStates();

        expect(rect.currentStates).toEqual([]);

        expect(rect).toMatchObject({
            x: 0, y: 0,
            rotation: 0,
            scaleX: 1, scaleY: 1,
            originX: 0, originY: 0
        });

        expect(rect.style.fill).toEqual('blue');
        expect(rect.style.stroke).toBeNull();

        expect(rect.shape.height).toBe(100);
        expect(rect.shape.width).toBe(100);
        expect(rect.shape.x).toBe(0);

        expect(rect.invisible).toBe(false);
        expect(rect.ignore).toBe(false);
        expect(rect.z).toBe(0);
        expect(rect.z2).toBe(0);

        // TODO textContent
    });

    it('Path#useStates. Mutiple states should be merged properly', function () {
        const rect = createRectForStateTest();

        rect.states = {
            selected: util.clone(selectedState),
            emphasis: {
                style: {
                    fill: 'white',
                    stroke: 'black'
                }
            }
        };

        rect.useStates(['selected', 'emphasis']);

        expect(rect.currentStates).toEqual(['selected', 'emphasis']);
        expect(rect.style).toMatchObject({
            // Should use fill/stroke in emphasis
            fill: 'white',
            stroke: 'black',
            // Should use lineWidth in selected
            lineWidth: 2
        });

        // Should use shape in selected
        expect(rect.shape.width).toBe(200);
        expect(rect.shape.x).toBe(10);
    });

    it('Path#useState. Can switch back to single state', function () {
        const rect = createRectForStateTest();

        rect.states = {
            selected: util.clone(selectedState),
            emphasis: {
                style: {
                    fill: 'white',
                    stroke: 'black'
                }
            }
        };

        rect.useStates(['selected', 'emphasis']);

        expect(rect.currentStates).toEqual(['selected', 'emphasis']);

        rect.useState('emphasis');

        expect(rect.style.fill).toBe('white');

        // style and z, z2 should be normal
        expect(rect.style.stroke).not.toBe('red');
        expect(rect.z).toBe(0);
        expect(rect.z2).toBe(0);
        expect(rect.invisible).toBe(false);
        expect(rect.ignore).toBe(false);

        // should use shape of normal state.
        expect(rect.shape.width).toBe(100);
    });

    it('Path#clearStates() should not throw error on stateless object.', function () {
        const rect = createRectForStateTest();
        expect(() => rect.clearStates()).not.toThrowError();
    });

    it('Path#getBoundingRect() should return a correct bounding rect before render', function () {
        const rect = new Rect({
            shape: { x: 10, y: 10, width: 100, height: 100 }
        });
        expect(rect.getBoundingRect()).toMatchObject({
            x: 10, y: 10, width: 100, height: 100
        });
    });
    it('Path#getBoundingRect() should include stroke', function () {
        const rect = new Rect({
            shape: { x: 10, y: 10, width: 100, height: 100 },
            style: { lineWidth: 2, stroke: 'red' }
        });
        const boundingRect = rect.getBoundingRect();
        expect(boundingRect).toMatchObject({
            x: 9, y: 9, width: 102, height: 102
        });
    });

    it('Path#getBoundingRect() should update bounding rect after setShape', function () {
        const rect = new Rect({
            shape: { x: 10, y: 10, width: 100, height: 100 }
        });
        expect(rect.getBoundingRect()).toMatchObject({
            x: 10, y: 10, width: 100, height: 100
        });
        rect.setShape({ width: 200, height: 200 });
        expect(rect.getBoundingRect()).toMatchObject({
            x: 10, y: 10, width: 200, height: 200
        });
    });

    it('Path#getBoundingRect() should still cache bounding rect after setStyle', function () {
        const rect = new Rect({
            shape: { x: 10, y: 10, width: 100, height: 100 }
        });
        expect(rect.getBoundingRect()).toMatchObject({
            x: 10, y: 10, width: 100, height: 100
        });
        rect.setStyle({
            fill: 'red'
        });
        expect(rect.getBoundingRect()).toMatchObject({
            x: 10, y: 10, width: 100, height: 100
        });
    });


    // TODO more getBoundingRect test on different shapes.
    // TODO pathContain test
});