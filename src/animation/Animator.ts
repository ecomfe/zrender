/**
 * @module echarts/animation/Animator
 */

import Clip, { ClipOption } from './Clip';
import * as color from '../tool/color';
import {isArrayLike} from '../core/util';
import {ArrayLike, Dictionary} from '../core/types';
import { easingType } from './easing';
import Animation from './Animation';

type NumberArray = ArrayLike<number>
type InterpolatableType = string | number | NumberArray | NumberArray[];

type Keyframe = {
    time: number
    value: InterpolatableType
}

var arraySlice = Array.prototype.slice;

function interpolateNumber(p0: number, p1: number, percent: number): number {
    return (p1 - p0) * percent + p0;
}

function interpolateString(p0: string, p1: string, percent: number): string {
    return percent > 0.5 ? p1 : p0;
}

function interpolate1DArray(
    p0: NumberArray,
    p1: NumberArray,
    percent: number,
    out: NumberArray,
) {
    const len = p0.length;
    for (let i = 0; i < len; i++) {
        out[i] = interpolateNumber(p0[i], p1[i], percent);
    }
}

function interpolate2DArray(
    p0: NumberArray[],
    p1: NumberArray[],
    percent: number,
    out: NumberArray[],
) {
    const len = p0.length;
    const len2 = len && (p0 as NumberArray[])[0].length;
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < len2; j++) {
            (out as NumberArray[])[i][j] = interpolateNumber(
                (p0 as NumberArray[])[i][j],
                (p1 as NumberArray[])[i][j],
                percent
            );
        }
    }
}

// arr0 is source array, arr1 is target array.
// Do some preprocess to avoid error happened when interpolating from arr0 to arr1
function fillArray(
    val0: NumberArray | NumberArray[],
    val1: NumberArray | NumberArray[],
    arrDim: number
) {
    let arr0 = val0 as (number | number[])[];
    let arr1 = val1 as (number | number[])[];
    if (!arr0.push || !arr1.push) {
        return;
    }
    const arr0Len = arr0.length;
    const arr1Len = arr1.length;
    if (arr0Len !== arr1Len) {
        // FIXME Not work for TypedArray
        const isPreviousLarger = arr0Len > arr1Len;
        if (isPreviousLarger) {
            // Cut the previous
            arr0.length = arr1Len;
        }
        else {
            // Fill the previous
            for (let i = arr0Len; i < arr1Len; i++) {
                arr0.push(arrDim === 1 ? arr1[i] : arraySlice.call(arr1[i]));
            }
        }
    }
    // Handling NaN value
    const len2 = arr0[0] && (arr0[0] as number[]).length;
    for (let i = 0; i < arr0.length; i++) {
        if (arrDim === 1) {
            if (isNaN(arr0[i] as number)) {
                arr0[i] = arr1[i];
            }
        }
        else {
            for (let j = 0; j < len2; j++) {
                if (isNaN((arr0 as number[][])[i][j])) {
                    (arr0 as number[][])[i][j] = (arr1 as number[][])[i][j];
                }
            }
        }
    }
}

function is1DArraySame(arr0: NumberArray, arr1: NumberArray) {
    const len = arr0.length;
    if (len !== arr1.length) {
        return false;
    }
    for (let i = 0; i < len; i++) {
        if (arr0[i] !== arr1[i]) {
            return false;
        }
    }
    return true;
}

function is2DArraySame(arr0: NumberArray[], arr1: NumberArray[]) {
    const len = arr0.length;
    if (len !== arr1.length) {
        return false;
    }
    const len2 = arr0[0].length;
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < len2; j++) {
            if (arr0[i][j] !== arr1[i][j]) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Catmull Rom interpolate number
 */
function catmullRomInterpolate(
    p0: number, p1: number, p2: number, p3: number, t: number, t2: number, t3: number
) {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    return (2 * (p1 - p2) + v0 + v1) * t3
            + (-3 * (p1 - p2) - 2 * v0 - v1) * t2
            + v0 * t + p1;
}
/**
 * Catmull Rom interpolate 1D array
 */
function catmullRomInterpolate1DArray(
    p0: NumberArray,
    p1: NumberArray,
    p2: NumberArray,
    p3: NumberArray,
    t: number,
    t2: number,
    t3: number,
    out: NumberArray
) {
    const len = p0.length;
    for (let i = 0; i < len; i++) {
        out[i] = catmullRomInterpolate(
            p0[i], p1[i], p2[i], p3[i], t, t2, t3
        );
    }
}

/**
 * Catmull Rom interpolate 2D array
 */
function catmullRomInterpolate2DArray(
    p0: NumberArray[],
    p1: NumberArray[],
    p2: NumberArray[],
    p3: NumberArray[],
    t: number,
    t2: number,
    t3: number,
    out: NumberArray[]
) {
    const len = p0.length;
    const len2 = p0[0].length;
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < len2; j++) {
            out[i][j] = catmullRomInterpolate(
                p0[i][j], p1[i][j], p2[i][j], p3[i][j],
                t, t2, t3
            );
        }
    }
}


function cloneValue(value: InterpolatableType) {
    if (isArrayLike(value)) {
        const len = value.length;
        if (isArrayLike(value[0])) {
            const ret = [];
            for (let i = 0; i < len; i++) {
                ret.push(arraySlice.call(value[i]));
            }
            return ret;
        }

        return arraySlice.call(value);
    }

    return value;
}

function rgba2String(rgba: number[]): string {
    rgba[0] = Math.floor(rgba[0]);
    rgba[1] = Math.floor(rgba[1]);
    rgba[2] = Math.floor(rgba[2]);

    return 'rgba(' + rgba.join(',') + ')';
}

function guessArrayDim(keyframes: Keyframe[]): number {
    const lastValue = keyframes[keyframes.length - 1].value;
    return isArrayLike(lastValue && (lastValue as unknown[])[0]) ? 2 : 1;
}

type DoneCallback = () => void;
type OnframeCallback<T> = (target: T, percent: number) => void;

export type AnimationPropGetter<T> = (target: T, key: string) => InterpolatableType;
export type AnimationPropSetter<T> = (target: T, key: string, value: InterpolatableType) => void;
/**
 * @alias module:zrender/animation/Animator
 * @constructor
 * @param {Object} target
 * @param {boolean} loop
 * @param {Function} getter
 * @param {Function} setter
 */
export default class Animator<T> {

    animation: Animation

    private _tracks: Dictionary<Keyframe[]> = {}
    private _target: T

    private _getter: AnimationPropGetter<T>
    private _setter: AnimationPropSetter<T>

    private _loop: boolean
    private _delay = 0
    private _paused = false

    private _doneList: DoneCallback[] = []
    private _onframeList: OnframeCallback<T>[] = []

    private _clipList: Clip<T>[] = []

    constructor(target: T, loop: boolean, getter?: AnimationPropGetter<T>, setter?: AnimationPropSetter<T>) {
        this._target = target;
        this._target = target;
        this._loop = loop || false;
        this._getter = getter || function (target: T, key: string) {
            return (target as any)[key];
        }
        this._setter = setter || function (target: T, key: string, value: any) {
            (target as any)[key] = value;
        }
    }

    /**
     * 设置动画关键帧
     * @param time 关键帧时间，单位是ms
     * @param props 关键帧的属性值，key-value表示
     * @return {module:zrender/animation/Animator}
     */
    when(time: number, props: Dictionary<any>) {
        const tracks = this._tracks;
        for (let propName in props) {
            if (!props.hasOwnProperty(propName)) {
                continue;
            }

            if (!tracks[propName]) {
                tracks[propName] = [];
                // Invalid value
                const value = this._getter(this._target, propName);
                if (value == null) {
                    // zrLog('Invalid property ' + propName);
                    continue;
                }
                // If time is 0
                //  Then props is given initialize value
                // Else
                //  Initialize value from current prop value
                if (time !== 0) {
                    tracks[propName].push({
                        time: 0,
                        value: cloneValue(value)
                    });
                }
            }
            tracks[propName].push({
                time: time,
                value: props[propName]
            });
        }
        return this;
    }
    /**
     * 添加动画每一帧的回调函数
     * @param callback
     */
    during(callback: OnframeCallback<T>) {
        this._onframeList.push(callback);
        return this;
    }

    pause() {
        for (let i = 0; i < this._clipList.length; i++) {
            this._clipList[i].pause();
        }
        this._paused = true;
    }

    resume() {
        for (let i = 0; i < this._clipList.length; i++) {
            this._clipList[i].resume();
        }
        this._paused = false;
    }

    isPaused(): boolean {
        return !!this._paused;
    }

    _DoneCallback() {
        // Clear all tracks
        this._tracks = {};
        // Clear all clips
        this._clipList.length = 0;

        const doneList = this._doneList;
        const len = doneList.length;
        for (let i = 0; i < len; i++) {
            doneList[i].call(this);
        }
    }
    /**
     * 开始执行动画
     * @param easing
     *         动画缓动函数，详见{@link module:zrender/animation/easing}
     * @param  forceAnimate
     * @return
     */
    start(easing?: easingType, forceAnimate?: boolean) {

        const self = this;
        let clipCount = 0;

        const oneTrackDone = function () {
            clipCount--;
            if (!clipCount) {
                self._DoneCallback();
            }
        };

        let lastClip;
        for (let propName in this._tracks) {
            if (!this._tracks.hasOwnProperty(propName)) {
                continue;
            }
            const clip = this._createTrackClip(
                easing, oneTrackDone,
                this._tracks[propName], propName, forceAnimate
            );
            if (clip) {
                this._clipList.push(clip);
                clipCount++;

                // If start after added to animation
                if (this.animation) {
                    this.animation.addClip(clip);
                }

                lastClip = clip;
            }
        }

        // Add during callback on the last clip
        if (lastClip) {
            const oldOnFrame = lastClip.onframe;
            lastClip.onframe = function (target: T, percent: number) {
                oldOnFrame(target, percent);

                for (let i = 0; i < self._onframeList.length; i++) {
                    self._onframeList[i](target, percent);
                }
            };
        }

        // This optimization will help the case that in the upper application
        // the view may be refreshed frequently, where animation will be
        // called repeatly but nothing changed.
        if (!clipCount) {
            this._DoneCallback();
        }
        return this;
    }
    /**
     * 停止动画
     * @param {boolean} forwardToLast If move to last frame before stop
     */
    stop(forwardToLast: boolean) {
        const clipList = this._clipList;
        const animation = this.animation;
        for (let i = 0; i < clipList.length; i++) {
            const clip = clipList[i];
            if (forwardToLast) {
                // Move to last frame before stop
                clip.onframe(this._target, 1);
            }
            animation && animation.removeClip(clip);
        }
        clipList.length = 0;
    }
    /**
     * 设置动画延迟开始的时间
     * @param time 单位ms
     */
    delay(time: number) {
        this._delay = time;
        return this;
    }
    /**
     * 添加动画结束的回调
     * @param cb
     */
    done(cb: DoneCallback) {
        if (cb) {
            this._doneList.push(cb);
        }
        return this;
    }

    getClips() {
        return this._clipList;
    }


    private _createTrackClip(
        easing: easingType,
        oneTrackDone: DoneCallback,
        keyframes: Keyframe[],
        propName: string,
        forceAnimate: boolean
    ) {
        const getter = this._getter;
        const setter = this._setter;
        const useSpline = easing === 'spline';

        const trackLen = keyframes.length;
        if (!trackLen) {
            return;
        }
        // Guess data type
        const firstVal = keyframes[0].value;
        const isValueArray = isArrayLike(firstVal);
        let isValueColor = false;
        let isValueString = false;

        // For vertices morphing
        const arrDim = isValueArray ? guessArrayDim(keyframes) : 0;

        let trackMaxTime;
        // Sort keyframe as ascending
        keyframes.sort(function (a: Keyframe, b: Keyframe) {
            return a.time - b.time;
        });

        trackMaxTime = keyframes[trackLen - 1].time;
        // Percents of each keyframe
        const kfPercents: number[] = [];
        // Value of each keyframe
        const kfValues: InterpolatableType[] = [];
        let prevValue = keyframes[0].value;
        let isAllValueEqual = true;
        for (let i = 0; i < trackLen; i++) {
            kfPercents.push(keyframes[i].time / trackMaxTime);
            // Assume value is a color when it is a string
            let value = keyframes[i].value;

            // Check if value is not all equal, deep check if value is array
            if (isAllValueEqual) {
                if (isValueArray && !(arrDim === 1
                    ? is1DArraySame(value as NumberArray, prevValue as NumberArray)
                    : is2DArraySame(value as NumberArray[], prevValue as NumberArray[])
                )) {
                    isAllValueEqual = false
                }
                else if (value !== prevValue) { // number or string
                    isAllValueEqual = false;
                }
                prevValue = value;
            }

            // Try converting a string to a color array
            if (!isValueColor && !isValueColor && typeof value === 'string') {
                const colorArray = color.parse(value);
                if (colorArray) {
                    value = colorArray;
                    isValueColor = true;
                }
                else {
                    isValueString = true;
                }
            }
            kfValues.push(value);
        }
        if (!forceAnimate && isAllValueEqual) {
            return;
        }

        const lastValue = kfValues[trackLen - 1];
        // Polyfill array and NaN value
        for (let i = 0; i < trackLen - 1; i++) {
            if (isValueArray) {
                fillArray(
                    kfValues[i] as NumberArray | NumberArray[],
                    lastValue as NumberArray | NumberArray[],
                    arrDim
                );
            }
            else {
                // Unkown types
                if (isNaN(kfValues[i] as number) && !isNaN(lastValue as number)
                    && !isValueString && !isValueColor
                ) {
                    kfValues[i] = lastValue;
                }
            }
        }
        isValueArray && fillArray(
            getter(this._target, propName) as NumberArray | NumberArray[],
            lastValue as NumberArray | NumberArray[],
            arrDim
        );

        // Cache the key of last frame to speed up when
        // animation playback is sequency
        let lastFrame = 0;
        let lastFramePercent = 0;
        let start;
        let w;
        let p0;
        let p1;
        let p2;
        let p3;
        let rgba: number[];

        if (isValueColor) {
            rgba = [0, 0, 0, 0];
        }

        const onframe = function (target: T, percent: number) {
            // Find the range keyframes
            // kf1-----kf2---------current--------kf3
            // find kf2 and kf3 and do interpolation
            let frame;
            // In the easing function like elasticOut, percent may less than 0
            if (percent < 0) {
                frame = 0;
            }
            else if (percent < lastFramePercent) {
                // Start from next key
                // PENDING start from lastFrame ?
                start = Math.min(lastFrame + 1, trackLen - 1);
                for (frame = start; frame >= 0; frame--) {
                    if (kfPercents[frame] <= percent) {
                        break;
                    }
                }
                // PENDING really need to do this ?
                frame = Math.min(frame, trackLen - 2);
            }
            else {
                for (frame = lastFrame; frame < trackLen; frame++) {
                    if (kfPercents[frame] > percent) {
                        break;
                    }
                }
                frame = Math.min(frame - 1, trackLen - 2);
            }
            lastFrame = frame;
            lastFramePercent = percent;

            const range = (kfPercents[frame + 1] - kfPercents[frame]);
            if (range === 0) {
                return;
            }
            else {
                w = (percent - kfPercents[frame]) / range;
            }
            if (useSpline) {
                p1 = kfValues[frame];
                p0 = kfValues[frame === 0 ? frame : frame - 1];
                p2 = kfValues[frame > trackLen - 2 ? trackLen - 1 : frame + 1];
                p3 = kfValues[frame > trackLen - 3 ? trackLen - 1 : frame + 2];
                if (isValueArray) {
                    arrDim === 1
                        ? catmullRomInterpolate1DArray(
                            p0 as NumberArray, p1 as NumberArray, p2 as NumberArray, p3 as NumberArray,
                            w, w * w, w * w * w,
                            getter(target, propName) as NumberArray,
                        )
                        : catmullRomInterpolate2DArray(
                            p0 as NumberArray[], p1 as NumberArray[], p2 as NumberArray[], p3 as NumberArray[],
                            w, w * w, w * w * w,
                            getter(target, propName) as NumberArray[],
                        )
                }
                else {
                    let value;
                    if (isValueColor) {
                        value = catmullRomInterpolate1DArray(
                            p0 as NumberArray, p1 as NumberArray, p2 as NumberArray, p3 as NumberArray,
                            w, w * w, w * w * w,
                            rgba
                        );
                        value = rgba2String(rgba);
                    }
                    else if (isValueString) {
                        // String is step(0.5)
                        return interpolateString(p1 as string, p2 as string, w);
                    }
                    else {
                        value = catmullRomInterpolate(
                            p0 as number, p1 as number, p2 as number, p3 as number,
                            w, w * w, w * w * w
                        );
                    }
                    setter(
                        target,
                        propName,
                        value
                    );
                }
            }
            else {
                if (isValueArray) {
                    arrDim === 1
                        ? interpolate1DArray(
                            kfValues[frame] as NumberArray,
                            kfValues[frame + 1] as NumberArray,
                            w,
                            getter(target, propName) as NumberArray
                        )
                        : interpolate2DArray(
                            kfValues[frame] as NumberArray[],
                            kfValues[frame + 1] as NumberArray[],
                            w,
                            getter(target, propName) as NumberArray[]
                        )
                }
                else {
                    let value;
                    if (isValueColor) {
                        interpolate1DArray(
                            kfValues[frame] as NumberArray,
                            kfValues[frame + 1] as NumberArray,
                            w, rgba
                        )
                        value = rgba2String(rgba);
                    }
                    else if (isValueString) {
                        // String is step(0.5)
                        return interpolateString(kfValues[frame] as string, kfValues[frame + 1] as string, w);
                    }
                    else {
                        value = interpolateNumber(kfValues[frame] as number, kfValues[frame + 1] as number, w);
                    }
                    setter(target, propName, value);
                }
            }
        };

        const clip = new Clip<T>({
            target: this._target,
            life: trackMaxTime,
            loop: this._loop,
            delay: this._delay,
            onframe: onframe,
            ondestroy: oneTrackDone
        });

        if (easing && easing !== 'spline') {
            clip.easing = easing;
        }

        return clip;
    }
}