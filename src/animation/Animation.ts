/**
 * 动画主类, 调度和管理所有动画控制器
 *
 */
// TODO Additive animation
// http://iosoteric.com/additive-animations-animatewithduration-in-ios-8/
// https://developer.apple.com/videos/wwdc2014/#236

import * as util from '../core/util';
import Eventful from '../core/Eventful';
import requestAnimationFrame from './requestAnimationFrame';
import Animator, {AnimationPropSetter, AnimationPropGetter} from './Animator';
import Clip, {DeferredEventTypes} from './Clip';
import { Dictionary } from '../core/types';


interface Stage {
    update?: () => void
}
type OnframeCallback = (deltaTime: number) => void

interface AnimationOption {
    stage?: Stage
    onframe?: OnframeCallback
}
/**
 * @example
 *     const animation = new Animation();
 *     const obj = {
 *         x: 100,
 *         y: 100
 *     };
 *     animation.animate(node.position)
 *         .when(1000, {
 *             x: 500,
 *             y: 500
 *         })
 *         .when(2000, {
 *             x: 100,
 *             y: 100
 *         })
 *         .start('spline');
 */

export default class Animation extends Eventful {

    stage: Stage

    onframe: OnframeCallback

    private _clips: Clip<any>[] = []
    private _running: boolean = false

    private _time: number = 0
    private _pausedTime: number = 0
    private _pauseStart: number = 0

    private _paused = false;

    constructor(opts: AnimationOption) {
        super();

        opts = opts || {};

        this.stage = opts.stage || {};

        this.onframe = opts.onframe || function () {};
    }

    /**
     * 添加 clip
     */
    addClip(clip: Clip<any>) {
        this._clips.push(clip);
    }
    /**
     * 添加 animator
     */
    addAnimator(animator: Animator<any>) {
        animator.animation = this;
        const clips = animator.getClips();
        for (let i = 0; i < clips.length; i++) {
            this.addClip(clips[i]);
        }
    }
    /**
     * 删除动画片段
     */
    removeClip(clip: Clip<any>) {
        const idx = util.indexOf(this._clips, clip);
        if (idx >= 0) {
            this._clips.splice(idx, 1);
        }
    }

    /**
     * 删除动画片段
     */
    removeAnimator(animator: Animator<any>) {
        const clips = animator.getClips();
        for (let i = 0; i < clips.length; i++) {
            this.removeClip(clips[i]);
        }
        animator.animation = null;
    }

    _update() {
        const time = new Date().getTime() - this._pausedTime;
        const delta = time - this._time;
        const clips = this._clips;
        let len = clips.length;

        const deferredEvents: DeferredEventTypes[] = [];
        const deferredClips = [];
        for (let i = 0; i < len; i++) {
            const clip = clips[i];
            const e = clip.step(time, delta);
            // Throw out the events need to be called after
            // stage.update, like destroy
            if (e) {
                deferredEvents.push(e);
                deferredClips.push(clip);
            }
        }

        // Remove the finished clip
        for (let i = 0; i < len;) {
            if (clips[i].needsRemove()) {
                clips[i] = clips[len - 1];
                clips.pop();
                len--;
            }
            else {
                i++;
            }
        }

        len = deferredEvents.length;
        for (let i = 0; i < len; i++) {
            deferredClips[i].fire(deferredEvents[i]);
        }

        this._time = time;

        this.onframe(delta);

        // 'frame' should be triggered before stage, because upper application
        // depends on the sequence (e.g., echarts-stream and finish
        // event judge)
        this.trigger('frame', delta);

        if (this.stage.update) {
            this.stage.update();
        }
    }

    _startLoop() {
        const self = this;

        this._running = true;

        function step() {
            if (self._running) {

                requestAnimationFrame(step);

                !self._paused && self._update();
            }
        }

        requestAnimationFrame(step);
    }

    /**
     * Start animation.
     */
    start() {

        this._time = new Date().getTime();
        this._pausedTime = 0;

        this._startLoop();
    }

    /**
     * Stop animation.
     */
    stop() {
        this._running = false;
    }

    /**
     * Pause animation.
     */
    pause() {
        if (!this._paused) {
            this._pauseStart = new Date().getTime();
            this._paused = true;
        }
    }

    /**
     * Resume animation.
     */
    resume() {
        if (this._paused) {
            this._pausedTime += (new Date().getTime()) - this._pauseStart;
            this._paused = false;
        }
    }

    /**
     * Clear animation.
     */
    clear() {
        this._clips = [];
    }

    /**
     * Whether animation finished.
     */
    isFinished() {
        return !this._clips.length;
    }

    /**
     * Creat animator for a target, whose props can be animated.
     */
    // TODO Gap
    animate<T>(target: T, options: {
        loop?: boolean  // Whether loop animation.
        getter?: AnimationPropGetter<T>    // Get value from target.
        setter?: AnimationPropSetter<T>    // Set value to target.
    }) {
        options = options || {};

        const animator = new Animator(
            target,
            options.loop,
            options.getter,
            options.setter
        );

        this.addAnimator(animator);

        return animator;
    }
}