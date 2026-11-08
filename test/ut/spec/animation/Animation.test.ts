import Animation from '../../../../src/animation/Animation';
import Clip from '../../../../src/animation/Clip';

describe('Animation loop', function () {
    let animation: Animation;

    beforeEach(function () {
        jest.useFakeTimers('modern');
        jest.setSystemTime(1000);
    });

    afterEach(function () {
        animation.stop();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it('should retire a pending frame after stop and start', function () {
        const onframe = jest.fn();
        animation = new Animation();
        animation.on('frame', onframe);
        animation.start();
        animation.stop();
        animation.start();

        expect(onframe).not.toHaveBeenCalled();
        jest.advanceTimersByTime(16);
        expect(onframe).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(16);
        expect(onframe).toHaveBeenCalledTimes(2);
    });

    it('should keep repeated start calls asynchronous and idempotent', function () {
        const onframe = jest.fn();
        animation = new Animation();
        animation.on('frame', onframe);
        animation.start();
        jest.advanceTimersByTime(8);
        animation.start();

        expect(onframe).not.toHaveBeenCalled();
        jest.advanceTimersByTime(8);
        expect(onframe.mock.calls).toEqual([[16]]);
        jest.advanceTimersByTime(16);
        expect(onframe.mock.calls).toEqual([[16], [16]]);
    });

    it('should keep only one loop after several restarts before a frame', function () {
        const onframe = jest.fn();
        animation = new Animation();
        animation.on('frame', onframe);
        animation.start();
        for (let i = 0; i < 3; i++) {
            animation.stop();
            animation.start();
        }

        for (let i = 1; i <= 5; i++) {
            jest.advanceTimersByTime(16);
            expect(onframe).toHaveBeenCalledTimes(i);
        }
    });

    it.each(['frame', 'stage'])('should allow restarting inside the %s callback', function (restartFrom) {
        const events: string[] = [];
        let restarts = 3;
        function restart() {
            if (restarts-- > 0) {
                animation.stop();
                animation.start();
            }
        }
        animation = new Animation({
            stage: {
                update() {
                    events.push('stage');
                    if (restartFrom === 'stage') {
                        restart();
                    }
                }
            }
        });
        animation.on('frame', function () {
            events.push('frame');
            if (restartFrom === 'frame') {
                restart();
            }
        });
        animation.start();

        for (let i = 0; i < 5; i++) {
            events.length = 0;
            jest.advanceTimersByTime(16);
            expect(events).toEqual(['frame', 'stage']);
        }
    });

    it('should stop silently and allow starting after pending callbacks have drained', function () {
        const onframe = jest.fn();
        animation = new Animation();
        animation.on('frame', onframe);
        animation.start();
        animation.stop();
        jest.advanceTimersByTime(48);
        expect(onframe).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);

        animation.start();
        jest.advanceTimersByTime(16);
        expect(onframe.mock.calls).toEqual([[16]]);
    });

    it('should keep scheduling while paused and exclude paused time after resume', function () {
        const onframe = jest.fn();
        const update = jest.fn();
        animation = new Animation({stage: {update}});
        animation.on('frame', onframe);
        animation.start();
        jest.advanceTimersByTime(16);
        animation.pause();
        jest.advanceTimersByTime(16);
        animation.pause();
        jest.advanceTimersByTime(32);

        expect(onframe.mock.calls).toEqual([[16]]);
        expect(update).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(1);
        animation.resume();
        animation.resume();
        jest.advanceTimersByTime(16);
        expect(onframe.mock.calls).toEqual([[16], [16]]);
        expect(update).toHaveBeenCalledTimes(2);
    });

    it('should retain the paused state across a restart and resume a single loop', function () {
        const onframe = jest.fn();
        animation = new Animation();
        animation.on('frame', onframe);
        animation.start();
        jest.advanceTimersByTime(16);
        animation.pause();
        animation.stop();
        animation.start();
        jest.advanceTimersByTime(32);

        expect(onframe.mock.calls).toEqual([[16]]);
        animation.resume();
        jest.advanceTimersByTime(16);
        expect(onframe.mock.calls).toEqual([[16], [16]]);
    });

    it('should schedule the next frame before dispatching frame and stage updates', function () {
        const events: string[] = [];
        animation = new Animation({stage: {
            update() {
                events.push('stage');
            }
        }});
        animation.on('frame', function () {
            expect(jest.getTimerCount()).toBe(1);
            events.push('frame');
            animation.stop();
        });
        animation.start();
        expect(events).toEqual([]);
        jest.advanceTimersByTime(16);
        expect(events).toEqual(['frame', 'stage']);
        jest.advanceTimersByTime(16);
        expect(events).toEqual(['frame', 'stage']);
        expect(jest.getTimerCount()).toBe(0);
    });

    it('should allow manual clip updates without scheduling or recursively dispatching frames', function () {
        const progress = jest.fn();
        const update = jest.fn();
        const onframe = jest.fn(function () {
            animation.update(true);
        });
        animation = new Animation({stage: {update}});
        animation.addClip(new Clip({life: 100, onframe: progress}));
        animation.on('frame', onframe);

        animation.update(true);
        jest.setSystemTime(1050);
        animation.update(true);
        expect(progress.mock.calls).toEqual([[0], [0.5]]);
        expect(onframe).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();

        animation.update();
        expect(onframe).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });
});
