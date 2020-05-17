/**
 * Animation main class, dispatch and manage all animation controllers
 *
 */
// TODO Additive animation
// http://iosoteric.com/additive-animations-animatewithduration-in-ios-8/
// https://developer.apple.com/videos/wwdc2014/#236

import Eventful from '../core/Eventful';
import requestAnimationFrame from './requestAnimationFrame';
import Animator from './Animator';
import Clip from './Clip';


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

    // Use linked list to store clip
    private _clipsHead: Clip | null
    private _clipsTail: Clip | null

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
     * Add clip
     */
    addClip(clip: Clip) {
        if (!this._clipsHead) {
            this._clipsHead = this._clipsTail = clip;
        }
        else if (this._clipsTail) {
            this._clipsTail.next = clip;
            clip.prev = this._clipsTail;
            clip.next = null;
            this._clipsTail = clip;
        }
    }
    /**
     * Add animator
     */
    addAnimator(animator: Animator<any>) {
        animator.animation = this;
        const clip = animator.getClip();
        if (clip) {
            this.addClip(clip);
        }
    }
    /**
     * Delete animation clip
     */
    removeClip(clip: Clip) {   // TODO Make sure clip is in the animation.
        const prev = clip.prev;
        const next = clip.next;
        if (prev) {
            prev.next = next;
        }
        else {
            // Is head
            this._clipsHead = next;
        }
        if (next) {
            next.prev = prev;
        }
        else {
            // Is tail
            this._clipsTail = prev;
        }
        clip.next = clip.prev = null;
    }

    /**
     * Delete animation clip
     */
    removeAnimator(animator: Animator<any>) {
        const clip = animator.getClip();
        if (clip) {
            this.removeClip(clip);
        }
        animator.animation = undefined;
    }

    update() {
        const time = new Date().getTime() - this._pausedTime;
        const delta = time - this._time;
        let clip = this._clipsHead;

        while (clip) {
            let finished = clip.step(time, delta);
            if (finished) {
                clip.ondestroy && clip.ondestroy();
                const nextClip = clip.next;
                this.removeClip(clip);
                clip = nextClip;
            }
            else {
                clip = clip.next;
            }
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

                !self._paused && self.update();
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
        let clip = this._clipsHead;

        while (clip) {
            let nextClip = clip.next;
            clip.prev = clip.next = null;
            clip = nextClip;
        }

        this._clipsHead = this._clipsTail = null;
    }

    /**
     * Whether animation finished.
     */
    isFinished() {
        return this._clipsHead == null;
    }

    /**
     * Creat animator for a target, whose props can be animated.
     */
    // TODO Gap
    animate<T>(target: T, options: {
        loop?: boolean  // Whether loop animation.
    }) {
        options = options || {};

        const animator = new Animator(
            target,
            !!options.loop
        );

        this.addAnimator(animator);

        return animator;
    }
}