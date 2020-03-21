import Rect from '../../../../src/graphic/shape/Rect';
import { clone } from '../../../../src/core/util';

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
            position: [10, 10]
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

        expect(rect.position).toEqual([10, 10]);
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
            style: {
                stroke: 'red'
            }
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
            shape: {
                width: 100,
                height: 100
            }
        });
        rect.setShape({
            x: 10,
            width: 200
        });
        expect(rect.shape.x).toEqual(10);
        expect(rect.shape.width).toEqual(200);

        rect.setShape('r', 5);
        rect.setShape('x', 100);

        expect(rect.shape.r).toBe(5);
        expect(rect.shape.x).toBe(100);
    });

    const emphasisState = {
        position: [100, 100],
        rotation: 10,
        scale: [2, 2],
        style: {
            stroke: 'red'
        },
        shape: {
            width: 200,
            x: 0
        }
    };

    it('Path#useState should switch state properly', function () {
        const rect = new Rect({
            shape: {
                width: 100,
                height: 100
            },
            style: {
                fill: 'blue'
            }
        });

        expect(rect.states).toBeUndefined();

        rect.states = {
            emphasis: clone(emphasisState)
        };

        rect.useState('emphasis');

        expect(rect.position).toEqual([100, 100]);
        expect(rect.rotation).toBe(10);
        expect(rect.scale).toEqual([2, 2]);
        expect(rect.style.stroke).toBe('red');
        expect(rect.shape.width).toBe(200);
        expect(rect.shape.x).toBe(0);

        // Still keep the original value if property is not exists in state
        expect(rect.shape.height).toBe(100);
        expect(rect.style.fill).toBe('blue');

        // Can restore to normal state
    });

    it('Path#useState should be able to restore to normal state properly', function () {
        const rect = new Rect({
            shape: {
                width: 100,
                height: 100
            },
            style: {
                fill: 'blue'
            }
        });

        rect.states = {
            emphasis: clone(emphasisState)
        };

        rect.useState('emphasis');
        // Switch back to normal
        rect.useState('normal');

        expect(rect.position).toEqual([0, 0]);
        expect(rect.rotation).toEqual(0);
        expect(rect.scale).toEqual([1, 1]);

        expect(rect.style.fill).toEqual('blue');
        expect(rect.style.stroke).toBeNull();

        expect(rect.shape.height).toBe(100);
        expect(rect.shape.width).toBe(100);
        expect(rect.shape.x).toBe(0);
    });
});