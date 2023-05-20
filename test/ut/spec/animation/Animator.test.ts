import Animator from '../../../../src/animation/Animator';
import Clip from '../../../../src/animation/Clip';

describe('Animator', function () {
    it('valueType number Animator', async () => {
        const obj = {
            x: 100,
            y: 100
        };
        const duringFn = jest.fn();
        const clips: Clip[] = [];
        const addClip = jest.fn((t) => clips.push(t));
        const attClip = new Animator(obj,
            false).during(duringFn);
            attClip.animation = {
                addClip
            } as any;
            attClip.when(1000, {
                x: 200,
                y: 300
            }).when(2000, {
                x: 300,
                y: 500
            }).start();
            expect(addClip).toBeCalledTimes(1);
            clips[0].onframe(0.25);
            expect(obj).toStrictEqual({
                x: 150,
                y: 200
            });
            clips[0].onframe(0.5);
            expect(obj).toStrictEqual({
                x: 200,
                y: 300
            });
            clips[0].onframe(0.75);
            expect(obj).toStrictEqual({
                x: 250,
                y: 400
            });
            expect(duringFn).toBeCalledTimes(3);
    });

});
