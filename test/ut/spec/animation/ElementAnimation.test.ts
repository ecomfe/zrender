import {Polyline} from '../zrender';

describe('ElementAnimation', function () {
    it('Should be final state when setToFinal', function () {
        const polyline = new Polyline();
        polyline.animateTo({
            shape: {
                points: [[10, 10], [20, 20], [20, 10]]
            },
            style: {
                fill: 'red'
            },
            x: 10,
            y: 10
        }, {
            setToFinal: true
        });

        expect(polyline.shape.points).toEqual([[10, 10], [20, 20], [20, 10]]);
        expect(polyline.style.fill).toBe('red');
        expect(polyline.x).toBe(10);
        expect(polyline.y).toBe(10);
    });


    it('Original reference should not be replaced', function () {
        const points = [[10, 10], [30, 30]];
        const firstPoint = points[0];
        const polyline = new Polyline({
            shape: { points }
        });
        polyline.animateTo({
            shape: {
                points: [[10, 20], [20, 20], [20, 10]]
            }
        }, {
            setToFinal: true
        });

        expect(polyline.shape.points).toBe(points);
        expect(firstPoint).toEqual([10, 20]);
        expect(points).toEqual([[10, 20], [20, 20], [20, 10]]);
    });
});