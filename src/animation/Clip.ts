/**
 * 动画主控制器
 * @config target 动画对象，可以是数组，如果是数组的话会批量分发onframe等事件
 * @config life(1000) 动画时长
 * @config delay(0) 动画延迟时间
 * @config loop(true)
 * @config gap(0) 循环的间隔时间
 * @config onframe
 * @config easing(optional)
 * @config ondestroy(optional)
 * @config onrestart(optional)
 *
 * TODO pause
 */

import easingFuncs, {AnimationEasing} from './easing';
import type Animation from './Animation';

type OnframeCallback = (percent: number) => void;
type ondestroyCallback = () => void
type onrestartCallback = () => void

export type DeferredEventTypes = 'destroy' | 'restart'
// type DeferredEventKeys = 'ondestroy' | 'onrestart'

export interface ClipProps {
    life?: number
    delay?: number
    loop?: boolean
    gap?: number
    easing?: AnimationEasing

    onframe?: OnframeCallback
    ondestroy?: ondestroyCallback
    onrestart?: onrestartCallback
}

export default class Clip {

    // 生命周期
    private _life: number
    // 延时
    private _delay: number

    private _initialized: boolean = false
    // 开始时间
    private _startTime = 0 // 开始时间单位毫秒

    private _pausedTime = 0
    private _paused = false

    animation: Animation

    loop: boolean
    gap: number
    easing: AnimationEasing

    // For linked list. Readonly
    next: Clip
    prev: Clip

    onframe: OnframeCallback
    ondestroy: ondestroyCallback
    onrestart: onrestartCallback

    constructor(opts: ClipProps) {

        this._life = opts.life || 1000;

        this._delay = opts.delay || 0;

        // this._startTime = new Date().getTime() + this._delay;

        // 是否循环
        this.loop = opts.loop == null ? false : opts.loop;

        this.gap = opts.gap || 0;

        this.easing = opts.easing || 'linear';

        this.onframe = opts.onframe;
        this.ondestroy = opts.ondestroy;
        this.onrestart = opts.onrestart;
    }

    step(globalTime: number, deltaTime: number): boolean {
        // Set startTime on first step, or _startTime may has milleseconds different between clips
        // PENDING
        if (!this._initialized) {
            this._startTime = globalTime + this._delay;
            this._initialized = true;
        }

        if (this._paused) {
            this._pausedTime += deltaTime;
            return;
        }

        let percent = (globalTime - this._startTime - this._pausedTime) / this._life;

        // PENDING: Not begin yet. Still run the loop.
        // In the case callback needs to be invoked.
        // Or want to update to the begin state at next frame when `setToFinal` and `delay` are both used.
        // To avoid the unexpected blink.
        if (percent < 0) {
            percent = 0;
        }

        percent = Math.min(percent, 1);

        const easing = this.easing;
        const easingFunc = typeof easing === 'string'
            ? easingFuncs[easing as keyof typeof easingFuncs] : easing;
        const schedule = typeof easingFunc === 'function'
            ? easingFunc(percent)
            : percent;

        this.onframe && this.onframe(schedule);

        // 结束
        if (percent === 1) {
            if (this.loop) {
                this._restart(globalTime);
                this.onrestart && this.onrestart();
            }
            else {
                return true;
            }
        }

        return false;
    }

    private _restart(globalTime: number) {
        const remainder = (globalTime - this._startTime - this._pausedTime) % this._life;
        this._startTime = globalTime - remainder + this.gap;
        this._pausedTime = 0;
    }

    pause() {
        this._paused = true;
    }

    resume() {
        this._paused = false;
    }
}