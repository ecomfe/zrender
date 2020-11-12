import {Polyline, Rect, init} from '../zrender';
import Animation from '../../../../src/animation/Animation';

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

    it('Should call done after animation finished', function () {
        return new Promise(function (resolve) {
            const rect = new Rect();
            const animation = new Animation();
            animation.start();
            rect.animateTo({
                shape: {
                    x: 10, y: 10
                }
            }, {
                duration: 100,
                done: () => {
                    animation.stop();
                    resolve();
                }
            });
            for (let i = 0; i < rect.animators.length; i++) {
                animation.addAnimator(rect.animators[i]);
            }
        });
    });

    it('Should call abort after animation aborted', function () {
        return new Promise(function (resolve) {
            const rect = new Rect();
            rect.animateTo({
                shape: {
                    x: 10, y: 10
                }
            }, {
                duration: 200,
                aborted: resolve
            });
            setTimeout(function () {
                rect.animateTo({
                    shape: {
                        x: 10, y: 10
                    }
                });
            }, 100);
        });
    });
});