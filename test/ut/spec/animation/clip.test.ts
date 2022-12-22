import Clip from '../../../../src/animation/Clip';
import easingFuncs from '../../../../src/animation/easing';

describe('clip', function () {
    const life = 2000;
    const interval = 200;
    const delay = 300;
    /** '2022/12/22 00:42:45' */
    const now = 1671640965219;
    it('normal clip call onframe correct', () => {
        const onframe = jest.fn();
        const attClip = new Clip({
            life,
            onframe
        });
        attClip.step(now, 100);
        attClip.step(now + interval, 100);
        attClip.step(now + interval + life, 100);
        expect(onframe).toHaveBeenNthCalledWith(1, 0);
        expect(onframe).toHaveBeenNthCalledWith(2, interval / life);
        expect(onframe).toHaveBeenNthCalledWith(3, 1);
    });

    it('delay clip call onframe correct', () => {
        const onframe = jest.fn();

        const attClip = new Clip({
            life,
            onframe,
            delay
        });
        attClip.step(now, 100);
        attClip.step(now + interval, 100);
        attClip.step(now + interval + delay, 100);
        expect(onframe).toHaveBeenNthCalledWith(1, 0);
        expect(onframe).toHaveBeenNthCalledWith(2, 0);
        expect(onframe).toHaveBeenNthCalledWith(3, interval / life);
    });

    it('loop clip call onframe correct', () => {
        const onframe = jest.fn();
        const onrestart = jest.fn();

        const attClip = new Clip({
            life,
            onframe,
            loop: true,
            onrestart
        });
        attClip.step(now, 100);
        attClip.step(now + interval, 100);
        attClip.step(now + interval + life, 100);
        attClip.step(now + interval + life + 100, 100);
        expect(onframe).toHaveBeenNthCalledWith(1, 0);
        expect(onframe).toHaveBeenNthCalledWith(2, interval / life);
        expect(onframe).toHaveBeenNthCalledWith(3, 1);
        expect(onframe).toHaveBeenNthCalledWith(4, (interval + 100) / life);
        expect(onrestart).toBeCalledTimes(1);
    });

    it('clip pause correct', () => {
        const onframe = jest.fn();
        const onrestart = jest.fn();

        const attClip = new Clip({
            life,
            onframe,
            loop: true,
            onrestart
        });
        attClip.pause();
        attClip.step(now, interval);
        attClip.step(now + interval, interval);
        attClip.resume();
        // pause two interval
        attClip.step(now + interval + interval + interval, interval);
        expect(onframe).toBeCalledTimes(1);
        expect(onframe).toHaveBeenNthCalledWith(1, interval / life);
    });

    const buildInEasing = Object.keys(easingFuncs) as Array<keyof typeof easingFuncs>;

    test.each(buildInEasing)('setEasing buildIn %s correct', (easingName) => {
        const onframe = jest.fn();
        const onrestart = jest.fn();

        const attClip = new Clip({
            life,
            onframe,
            onrestart
        });
        attClip.setEasing(easingName);
        /** init */
        attClip.step(now, interval);
        attClip.step(now + interval, interval);
        attClip.step(now + 2 * interval, interval);
        expect(onframe).toBeCalledTimes(3);
        expect(onframe).toHaveBeenNthCalledWith(1, easingFuncs[easingName](0));
        expect(onframe).toHaveBeenNthCalledWith(2, easingFuncs[easingName](interval / life));
        expect(onframe).toHaveBeenNthCalledWith(3, easingFuncs[easingName](2 * interval / life));
    });
});
