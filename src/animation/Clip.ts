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

import easingFuncs, {easingType} from './easing';

type OnframeCallback<T> = (target: T, percent: number) => void;
type ondestroyCallback<T> = (target: T) => void
type onrestartCallback<T> = (target: T) => void

export type DeferredEventTypes = 'destroy' | 'restart'
type DeferredEventKeys = 'ondestroy' | 'onrestart'

export interface ClipOption<T> {
    target: T
    life?: number
    delay?: number
    loop?: boolean
    gap?: number
    easing?: easingType

    onframe?: OnframeCallback<T>
    ondestroy?: ondestroyCallback<T>
    onrestart?: onrestartCallback<T>
}

export default class Clip<T> {

    private _target: T
    // 生命周期
    private _life: number
    // 延时
    private _delay: number

    private _initialized: boolean = false
    // 开始时间
    private _startTime = 0 // 开始时间单位毫秒

    private _pausedTime = 0
    private _paused = false

    private _needsRemove = false

    loop: boolean
    gap: number
    easing: easingType
    onframe: OnframeCallback<T>
    ondestroy: ondestroyCallback<T>
    onrestart: onrestartCallback<T>

    constructor(opts: ClipOption<T>) {

        this._target = opts.target;
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

    step(globalTime: number, deltaTime: number): DeferredEventTypes {
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

        // 还没开始
        if (percent < 0) {
            return;
        }

        percent = Math.min(percent, 1);

        const easing = this.easing;
        const easingFunc = typeof easing === 'string'
            ? easingFuncs[easing as keyof typeof easingFuncs] : easing;
        const schedule = typeof easingFunc === 'function'
            ? easingFunc(percent)
            : percent;

        this.onframe && this.onframe(this._target, schedule);

        // 结束
        if (percent === 1) {
            if (this.loop) {
                this.restart(globalTime);
                // 重新开始周期
                // 抛出而不是直接调用事件直到 stage.update 后再统一调用这些事件
                return 'restart';
            }

            // 动画完成将这个控制器标识为待删除
            // 在Animation.update中进行批量删除
            this._needsRemove = true;
            return 'destroy';
        }

        return null;
    }

    restart(globalTime: number) {
        const remainder = (globalTime - this._startTime - this._pausedTime) % this._life;
        this._startTime = globalTime - remainder + this.gap;
        this._pausedTime = 0;

        this._needsRemove = false;
    }

    fire(eventType: DeferredEventTypes) {
        let onEventType: DeferredEventKeys = ('on' + eventType) as DeferredEventKeys;
        if (this[onEventType]) {
            this[onEventType](this._target);
        }
    }

    pause() {
        this._paused = true;
    }

    resume() {
        this._paused = false;
    }

    needsRemove(): boolean {
        return this._needsRemove;
    }
}