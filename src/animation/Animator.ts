/**
 * @module echarts/animation/Animator
 */

import Clip from './Clip';
import * as color from '../tool/color';
import {isArrayLike, keys} from '../core/util';
import {ArrayLike, Dictionary} from '../core/types';
import { AnimationEasing } from './easing';
import Animation from './Animation';

type NumberArray = ArrayLike<number>
type InterpolatableType = string | number | NumberArray | NumberArray[];

const arraySlice = Array.prototype.slice;

function interpolateNumber(p0: number, p1: number, percent: number): number {
    return (p1 - p0) * percent + p0;
}

function step(p0: any, p1: any, percent: number): any {
    return percent > 0.5 ? p1 : p0;
}

function interpolate1DArray(
    p0: NumberArray,
    p1: NumberArray,
    percent: number,
    out: NumberArray
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
    out: NumberArray[]
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

function guessArrayDim(value: ArrayLike<unknown>): number {
    return isArrayLike(value && (value as ArrayLike<unknown>)[0]) ? 2 : 1;
}

type Keyframe = {
    time: number
    value: unknown
    percent: number
}

let tmpRgba: number[] = [0, 0, 0, 0];
class Track {

    keyframes: Keyframe[] = []
    maxTime: number = 0

    propName: string

    /**
     * If use spline interpolate
     */
    useSpline: boolean

    private _isValueColor: boolean
    private _interpolable: boolean = true

    // Larger than 0 if value is array
    private _arrDim: number = 0

    private _needsSort: boolean = false

    private _isAllValueEqual = true

    // Info for run
    private _lastFrame = 0;
    private _lastFramePercent = 0;

    constructor(propName: string) {
        this.propName = propName;
    }

    needsAnimate() {
        return !this._isAllValueEqual;
    }

    addKeyframe(time: number, value: unknown) {
        if (time >= this.maxTime) {
            this.maxTime = time;
        }
        else {
            this._needsSort = true;
        }

        let keyframes = this.keyframes;

        let len = keyframes.length;

        if (this._interpolable) {
            // Handling values only if it's possible to be interpolated.
            if (isArrayLike(value)) {
                let arrayDim = guessArrayDim(value);
                if (len > 0 && this._arrDim !== arrayDim) { // Two values has differnt dimension.
                    this._interpolable = false;
                    return;
                }
                if (len > 0) {
                    let lastFrame = keyframes[len - 1];
                    fillArray(
                        value,
                        lastFrame.value as NumberArray[],
                        arrayDim
                    );

                    // For performance consideration. only check 1d array
                    if (this._isAllValueEqual) {
                        if (arrayDim === 1) {
                            if (!is1DArraySame(value, lastFrame.value as number[])) {
                                this._isAllValueEqual = false;
                            }
                        }
                        else {
                            this._isAllValueEqual = false;
                        }
                    }
                }
                this._arrDim = arrayDim;
            }
            else {
                if (this._arrDim > 0) {  // Previous value is array.
                    this._interpolable = false;
                    return;
                }

                if (typeof value === 'string') {
                    const colorArray = color.parse(value);
                    if (colorArray) {
                        value = colorArray;
                        this._isValueColor = true;
                    }
                    else {
                        this._interpolable = false;
                    }
                }
                else if (typeof value !== 'number') {
                    this._interpolable = false;
                    return;
                }

                if (this._isAllValueEqual && len > 0) {
                    let lastFrame = keyframes[len - 1];
                    if (this._isValueColor && !is1DArraySame(lastFrame.value as number[], value as number[])) {
                        this._isAllValueEqual = false;
                    }
                    else if (lastFrame.value !== value) {
                        this._isAllValueEqual = false;
                    }
                }
            }
        }

        // Not check if value equal here.
        this.keyframes.push({
            time,
            value,
            percent: 0
        });
    }

    prepare() {
        let kfs = this.keyframes;
        if (this._needsSort) {
            // Sort keyframe as ascending
            kfs.sort(function (a: Keyframe, b: Keyframe) {
                return a.time - b.time;
            });
        }

        for (let i = 0; i < kfs.length; i++) {
            kfs[i].percent = kfs[i].time / this.maxTime;
        }
    }

    step(target: any, percent: number) {
        const keyframes = this.keyframes;
        const kfsNum = this.keyframes.length;
        const propName = this.propName;
        const arrDim = this._arrDim;
        // Find the range keyframes
        // kf1-----kf2---------current--------kf3
        // find kf2 and kf3 and do interpolation
        let frameIdx;
        // In the easing function like elasticOut, percent may less than 0
        if (percent < 0) {
            frameIdx = 0;
        }
        else if (percent < this._lastFramePercent) {
            // Start from next key
            // PENDING start from lastFrame ?
            const start = Math.min(this._lastFrame + 1, kfsNum - 1);
            for (frameIdx = start; frameIdx >= 0; frameIdx--) {
                if (keyframes[frameIdx].percent <= percent) {
                    break;
                }
            }
            // PENDING really need to do this ?
            frameIdx = Math.min(frameIdx, kfsNum - 2);
        }
        else {
            for (frameIdx = this._lastFrame; frameIdx < kfsNum; frameIdx++) {
                if (keyframes[frameIdx].percent > percent) {
                    break;
                }
            }
            frameIdx = Math.min(frameIdx - 1, kfsNum - 2);
        }
        this._lastFrame = frameIdx;
        this._lastFramePercent = percent;

        let nextFrame = keyframes[frameIdx + 1];
        let frame = keyframes[frameIdx];

        const range = (nextFrame.percent - frame.percent);
        if (range === 0) {
            return;
        }
        const w = (percent - frame.percent) / range;
        if (this.useSpline) {
            const p1 = keyframes[frameIdx].value;
            const p0 = keyframes[frameIdx === 0 ? frameIdx : frameIdx - 1].value;
            const p2 = keyframes[frameIdx > kfsNum - 2 ? kfsNum - 1 : frameIdx + 1].value;
            const p3 = keyframes[frameIdx > kfsNum - 3 ? kfsNum - 1 : frameIdx + 2].value;
            if (arrDim > 0) {
                arrDim === 1
                    ? catmullRomInterpolate1DArray(
                        p0 as NumberArray, p1 as NumberArray, p2 as NumberArray, p3 as NumberArray,
                        w, w * w, w * w * w,
                        target[propName] as NumberArray
                    )
                    : catmullRomInterpolate2DArray(
                        p0 as NumberArray[], p1 as NumberArray[], p2 as NumberArray[], p3 as NumberArray[],
                        w, w * w, w * w * w,
                        target[propName] as NumberArray[]
                    );
            }
            else {
                let value;
                if (this._isValueColor) {
                    value = catmullRomInterpolate1DArray(
                        p0 as NumberArray, p1 as NumberArray, p2 as NumberArray, p3 as NumberArray,
                        w, w * w, w * w * w,
                        tmpRgba
                    );
                    value = rgba2String(tmpRgba);
                }
                else if (!this._interpolable) {
                    // String is step(0.5)
                    return step(p1 as string, p2 as string, w);
                }
                else {
                    value = catmullRomInterpolate(
                        p0 as number, p1 as number, p2 as number, p3 as number,
                        w, w * w, w * w * w
                    );
                }
                target[propName] = value;
            }
        }
        else {
            if (arrDim > 0) {
                arrDim === 1
                    ? interpolate1DArray(
                        frame.value as NumberArray,
                        nextFrame.value as NumberArray,
                        w,
                        target[propName] as NumberArray
                    )
                    : interpolate2DArray(
                        frame.value as NumberArray[],
                        nextFrame.value as NumberArray[],
                        w,
                        target[propName] as NumberArray[]
                    );
            }
            else {
                let value;
                if (this._isValueColor) {
                    interpolate1DArray(
                        frame.value as NumberArray,
                        nextFrame.value as NumberArray,
                        w, tmpRgba
                    );
                    value = rgba2String(tmpRgba);
                }
                else if (!this._interpolable) {
                    // String is step(0.5)
                    return step(frame.value as string, nextFrame.value as string, w);
                }
                else {
                    value = interpolateNumber(frame.value as number, nextFrame.value as number, w);
                }
                target[propName] = value;
            }
        }
    }
}


type DoneCallback = () => void;
type OnframeCallback<T> = (target: T, percent: number) => void;

export type AnimationPropGetter<T> = (target: T, key: string) => InterpolatableType;
export type AnimationPropSetter<T> = (target: T, key: string, value: InterpolatableType) => void;

export default class Animator<T> {

    animation: Animation

    private _tracks: Dictionary<Track> = {}
    private _trackKeys: string[] = []
    private _target: T

    private _loop: boolean
    private _delay = 0
    private _paused = false
    private _maxTime = 0;

    private _doneList: DoneCallback[] = []
    private _onframeList: OnframeCallback<T>[] = []

    private _clip: Clip<T> = null

    constructor(target: T, loop: boolean) {
        this._target = target;
        this._target = target;
        this._loop = loop || false;
    }

    /**
     * Set Animation keyframe
     * @param time 关键帧时间，单位是ms
     * @param props 关键帧的属性值，key-value表示
     * @return {module:zrender/animation/Animator}
     */
    when(time: number, props: Dictionary<any>) {
        return this.whenWithKeys(time, props, keys(props) as string[]);
    }


    // Fast path for add keyframes of aniamteTo
    whenWithKeys(time: number, props: Dictionary<any>, propNames: string[]) {
        const tracks = this._tracks;
        for (let i = 0; i < propNames.length; i++) {
            let propName = propNames[i] as string;

            let track = tracks[propName];
            if (!track) {
                track = tracks[propName] = new Track(propName);
                // Invalid value
                const value = (this._target as any)[propName];
                if (value == null) {
                    // zrLog('Invalid property ' + propName);
                    continue;
                }
                // If time is 0
                //  Then props is given initialize value
                // Else
                //  Initialize value from current prop value
                if (time !== 0) {
                    track.addKeyframe(0, cloneValue(value));
                }

                this._trackKeys.push(propName);
            }
            track.addKeyframe(time, props[propName]);
        }
        this._maxTime = Math.max(this._maxTime, time);
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
        this._clip.pause();
        this._paused = true;
    }

    resume() {
        this._clip.resume();
        this._paused = false;
    }

    isPaused(): boolean {
        return !!this._paused;
    }

    _doneCallback() {
        // Clear all tracks
        this._tracks = {};
        // Clear all clips
        this._clip = null;

        const doneList = this._doneList;
        const len = doneList.length;
        for (let i = 0; i < len; i++) {
            doneList[i].call(this);
        }
    }
    /**
     * Start the animation
     * @param easing
     * @param  forceAnimate
     * @return
     */
    start(easing?: AnimationEasing, forceAnimate?: boolean) {

        const self = this;

        let tracks: Track[] = [];
        for (let i = 0; i < this._trackKeys.length; i++) {
            const propName = this._trackKeys[i];
            const track = this._tracks[propName];
            track.prepare();
            if (track.needsAnimate() || forceAnimate) {
                tracks.push(track);
            }
        }
        // Add during callback on the last clip
        if (tracks.length) {
            const clip = new Clip<T>({
                target: this._target,
                life: this._maxTime,
                loop: this._loop,
                delay: this._delay,
                onframe(target: T, percent: number) {
                    for (let i = 0; i < tracks.length; i++) {
                        tracks[i].step(target, percent);
                    }
                    for (let i = 0; i < self._onframeList.length; i++) {
                        self._onframeList[i](target, percent);
                    }
                },
                ondestroy() {
                    self._doneCallback();
                }
            });
            this._clip = clip;

            if (this.animation) {
                this.animation.addClip(clip);
            }

            if (easing && easing !== 'spline') {
                clip.easing = easing;
            }
        }
        else {

            // This optimization will help the case that in the upper application
            // the view may be refreshed frequently, where animation will be
            // called repeatly but nothing changed.
            this._doneCallback();
        }

        return this;
    }
    /**
     * Stop animation
     * @param {boolean} forwardToLast If move to last frame before stop
     */
    stop(forwardToLast: boolean) {
        const clip = this._clip;
        const animation = this.animation;
        if (forwardToLast) {
            // Move to last frame before stop
            clip.onframe(this._target, 1);
        }
        if (animation) {
            animation.removeClip(clip);
        }
    }
    /**
     * Set when animation delay starts
     * @param time 单位ms
     */
    delay(time: number) {
        this._delay = time;
        return this;
    }
    /**
     * Add callback for animation end
     * @param cb
     */
    done(cb: DoneCallback) {
        if (cb) {
            this._doneList.push(cb);
        }
        return this;
    }

    getClip() {
        return this._clip;
    }
}