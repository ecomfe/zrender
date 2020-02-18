import Transformable from './core/Transformable';
import * as zrUtil from './core/util';
import { easingType } from './animation/easing';
import Animator from './animation/Animator';
import { ZRenderType } from './zrender';
import { VectorArray } from './core/vector';
import { Dictionary, PropType, ElementEventName, ZRRawEvent, AllPropTypes } from './core/types';
import Path from './graphic/Path';
import BoundingRect from './core/BoundingRect';
import Storage from './Storage';
import {EventQuery, EventCallback} from './core/Eventful';

export interface ElementEvent {
    type: ElementEventName,
    event: ZRRawEvent,
    // target can only be an element that is not silent.
    target: Element,
    // topTarget can be a silent element.
    topTarget: Element,
    cancelBubble: boolean,
    offsetX: number,
    offsetY: number,
    gestureEvent: string,
    pinchX: number,
    pinchY: number,
    pinchScale: number,
    wheelDelta: number,
    zrByTouch: boolean,
    which: number,
    stop: (this: ElementEvent) => void
}

export interface ElementProps {
    name?: string
    ignore?: boolean
    isGroup?: boolean
    draggable?: boolean

    silent?: boolean

    // From transform
    position?: VectorArray
    rotation?: number
    scale?: VectorArray
    origin?: VectorArray
    globalScaleRatio?: number

    extra?: Dictionary<any>
}

type ElementKey = keyof ElementProps
type ElementPropertyType = PropType<ElementProps, ElementKey>

type AnimationCallback = () => void;

export type ElementEventCallback = (e: ElementEvent) => boolean | void

export default class Element<T extends ElementProps = ElementProps> extends Transformable {

    id: number = zrUtil.guid()
    /**
     * Element type
     */
    type: string

    /**
     * Element name
     */
    name: string

    /**
     * If ignore drawing and events of the element object
     */
    ignore: boolean

    /**
     * Whether to respond to mouse events.
     */
    silent: boolean

    /**
     * 是否是 Group
     */
    isGroup: boolean

    /**
     * Whether it can be dragged.
     */
    draggable: boolean | string

    /**
     * Whether is it dragging.
     */
    dragging: boolean

    parent: Element

    animators: Animator<any>[] = [];

    /**
     * Extra object to store any info not related to the Element
     */
    extra: Dictionary<any>

    /**
     * ZRender instance will be assigned when element is associated with zrender
     */
    __zr: ZRenderType

    /**
     * Dirty flag. From which painter will determine if this displayable object needs brush.
     */
    __dirty: boolean

    __storage: Storage

    /**
     * 用于裁剪的路径(shape)，所有 Group 内的路径在绘制时都会被这个路径裁剪
     * 该路径会继承被裁减对象的变换
     * @see http://www.w3.org/TR/2dcontext/#clipping-region
     */
    private _clipPath: Path

    constructor(opts?: ElementProps) {
        // Transformable needs position, rotation, scale
        super(opts);
    }

    /**
     * Drift element
     * @param {number} dx dx on the global space
     * @param {number} dy dy on the global space
     */
    drift(dx: number, dy: number, e?: ElementEvent) {
        switch (this.draggable) {
            case 'horizontal':
                dy = 0;
                break;
            case 'vertical':
                dx = 0;
                break;
        }

        let m = this.transform;
        if (!m) {
            m = this.transform = [1, 0, 0, 1, 0, 0];
        }
        m[4] += dx;
        m[5] += dy;

        this.decomposeTransform();
        this.dirty(false);
    }

    /**
     * Hook before update
     */
    beforeUpdate () {}
    /**
     * Hook after update
     */
    afterUpdate () {}
    /**
     * Update each frame
     */
    update () {
        this.updateTransform();
    }

    traverse<Context> (
        cb: (this: Context, el: Element<T>) => void,
        context?: Context
    ) {}

    protected attrKV(key: string, value: unknown) {
        if (key === 'position' || key === 'scale' || key === 'origin') {
            // Copy the array
            if (value) {
                let target = this[key];
                if (!target) {
                    target = this[key] = [];
                }
                target[0] = (value as VectorArray)[0];
                target[1] = (value as VectorArray)[1];
            }
        }
        else {
            // TODO https://github.com/microsoft/TypeScript/issues/31663#issuecomment-497113495
            (this as any)[key] = value;
        }
    }

    /**
     * Hide the element
     */
    hide () {
        this.ignore = true;
        this.__zr && this.__zr.refresh();
    }

    /**
     * Show the element
     */
    show () {
        this.ignore = false;
        this.__zr && this.__zr.refresh();
    }

    attr(key: T): Element<T>
    attr(key: keyof T, value: AllPropTypes<T>): Element<T>
    /**
     * @param {string|Object} key
     * @param {*} value
     */
    attr(key: keyof T | T, value?: AllPropTypes<T>): Element<T> {
        if (typeof key === 'string') {
            this.attrKV(key, value);
        }
        else if (zrUtil.isObject(key)) {
            for (let name in key as T) {
                if (key.hasOwnProperty(name)) {
                    this.attrKV(<ElementKey>name, (<any>key)[name]);
                }
            }
        }
        this.dirty(false);
        return this;
    }

    getClipPath() {
        return this._clipPath;
    }

    /**
     * @param clipPath
     */
    setClipPath(clipPath: Path) {
        const zr = this.__zr;
        if (zr) {
            clipPath.addSelfToZr(zr);
        }

        // Remove previous clip path
        if (this._clipPath && this._clipPath !== clipPath) {
            this.removeClipPath();
        }

        this._clipPath = clipPath;
        clipPath.__zr = zr;
        // TODO
        clipPath.__clipTarget = this as unknown as Element;

        this.dirty(false);
    }

    removeClipPath() {
        const clipPath = this._clipPath;
        if (clipPath) {
            if (clipPath.__zr) {
                clipPath.removeSelfFromZr(clipPath.__zr);
            }

            clipPath.__zr = null;
            clipPath.__clipTarget = null;
            this._clipPath = null;

            this.dirty(false);
        }
    }

    dirty(dirtyPath?: boolean) {}

    /**
     * Add self from zrender instance.
     * Not recursively because it will be invoked when element added to storage.
     */
    addSelfToZr(zr: ZRenderType) {
        this.__zr = zr;
        // 添加动画
        const animators = this.animators;
        if (animators) {
            for (let i = 0; i < animators.length; i++) {
                zr.animation.addAnimator(animators[i]);
            }
        }

        if (this._clipPath) {
            this._clipPath.addSelfToZr(zr);
        }
    }

    /**
     * Remove self from zrender instance.
     * Not recursively because it will be invoked when element added to storage.
     */
    removeSelfFromZr(zr: ZRenderType) {
        this.__zr = null;
        // 移除动画
        const animators = this.animators;
        if (animators) {
            for (let i = 0; i < animators.length; i++) {
                zr.animation.removeAnimator(animators[i]);
            }
        }

        if (this._clipPath) {
            this._clipPath.removeSelfFromZr(zr);
        }
    }

    /**
     * 动画
     *
     * @param path The path to fetch value from object, like 'a.b.c'.
     * @param loop Whether to loop animation.
     * @example:
     *     el.animate('style', false)
     *         .when(1000, {x: 10} )
     *         .done(function(){ // Animation done })
     *         .start()
     */
    animate(path?: string, loop?: boolean) {
        const el = this;
        const zr = this.__zr;

        let target;
        let animatingShape = false;
        if (path) {
            const pathSplitted = path.split('.');
            let prop = <Dictionary<any>>el;
            // If animating shape
            animatingShape = pathSplitted[0] === 'shape';
            for (let i = 0, l = pathSplitted.length; i < l; i++) {
                if (!prop) {
                    continue;
                }
                prop = prop[pathSplitted[i]];
            }
            if (prop) {
                target = prop;
            }
        }
        else {
            target = el;
        }

        if (!target) {
            zrUtil.logError(
                'Property "'
                + path
                + '" is not existed in element '
                + el.id
            );
            return;
        }

        const animators = el.animators;

        const animator = new Animator(target, loop);

        animator.during(function (target) {
            el.dirty(animatingShape);
        }).done(function () {
            // FIXME Animator will not be removed if use `Animator#stop` to stop animation
            animators.splice(zrUtil.indexOf(animators, animator), 1);
        });

        animators.push(animator);

        // If animate after added to the zrender
        if (zr) {
            zr.animation.addAnimator(animator);
        }

        return animator;
    }

    /**
     * 停止动画
     * @param {boolean} forwardToLast If move to last frame before stop
     */
    stopAnimation(forwardToLast?: boolean) {
        const animators = this.animators;
        const len = animators.length;
        for (let i = 0; i < len; i++) {
            animators[i].stop(forwardToLast);
        }
        animators.length = 0;

        return this;
    }

    /**
     * Caution: this method will stop previous animation.
     * So do not use this method to one element twice before
     * animation starts, unless you know what you are doing.
     *
     * @example
     *  // Animate position
     *  el.animateTo({
     *      position: [10, 10]
     *  }, function () { // done })
     *
     *  // Animate shape, style and position in 100ms, delayed 100ms, with cubicOut easing
     *  el.animateTo({
     *      shape: {
     *          width: 500
     *      },
     *      style: {
     *          fill: 'red'
     *      }
     *      position: [10, 10]
     *  }, 100, 100, 'cubicOut', function () { // done })
     */

    // Overload definitions
    animateTo(target: T): void
    animateTo(target: T, callback: AnimationCallback): void
    animateTo(target: T, time: number, delay: number): void
    animateTo(target: T, time: number, easing: easingType): void
    animateTo(target: T, time: number, callback: AnimationCallback): void
    animateTo(target: T, time: number, delay: number, callback: AnimationCallback): void
    animateTo(target: T, time: number, easing: easingType, callback: AnimationCallback): void
    animateTo(target: T, time: number, delay: number, easing: easingType, callback: AnimationCallback): void
    animateTo(target: T, time: number, delay: number, easing: easingType, callback: AnimationCallback, forceAnimate: boolean): void

    // TODO Return animation key
    animateTo(
        target: T,
        time?: number | AnimationCallback,  // Time in ms
        delay?: easingType | number | AnimationCallback,
        easing?: easingType | number | AnimationCallback ,
        callback?: AnimationCallback,
        forceAnimate?: boolean // Prevent stop animation and callback
                                // immediently when target values are the same as current values.
    ) {
        animateTo(this, target, time, delay, easing, callback, forceAnimate);
    }

    /**
     * Animate from the target state to current state.
     * The params and the return value are the same as `this.animateTo`.
     */

    // Overload definitions
    animateFrom(target: T): void
    animateFrom(target: T, callback: AnimationCallback): void
    animateFrom(target: T, time: number, delay: number): void
    animateFrom(target: T, time: number, easing: easingType): void
    animateFrom(target: T, time: number, callback: AnimationCallback): void
    animateFrom(target: T, time: number, delay: number, callback: AnimationCallback): void
    animateFrom(target: T, time: number, easing: easingType, callback: AnimationCallback): void
    animateFrom(target: T, time: number, delay: number, easing: easingType, callback: AnimationCallback): void
    animateFrom(target: T, time: number, delay: number, easing: easingType, callback: AnimationCallback, forceAnimate: boolean): void

    animateFrom(
        target: T,
        time?: number | AnimationCallback,
        delay?: easingType | number | AnimationCallback,
        easing?: easingType | number | AnimationCallback ,
        callback?: AnimationCallback,
        forceAnimate?: boolean
    ) {
        animateTo(this, target, time, delay, easing, callback, forceAnimate, true);
    }

    /**
     * Interface of getting the minimum bounding box.
     */
    getBoundingRect(): BoundingRect {
        return null;
    }

    // Provide more typed event callback params for mouse events.
    on<Context>(event: ElementEventName, handler: ElementEventCallback, context?: Context): Element<T>
    on<Context>(event: ElementEventName, query: EventQuery, handler: ElementEventCallback, context?: Context): Element<T>
    // Provide general events handler for other custom events.
    on<Context>(event: string, query?: EventCallback | EventQuery, handler?: EventCallback | Object, context?: Context): Element<T>
    on<Context>(event: string, query?: EventCallback | EventQuery, handler?: EventCallback | Object, context?: Context): Element<T> {
        super.on(event, query, handler as EventCallback, context);
        return this;
    }

    // Events
    onclick: ElementEventCallback
    ondblclick: ElementEventCallback
    onmouseover: ElementEventCallback
    onmouseout: ElementEventCallback
    onmousemove: ElementEventCallback
    onmousewheel: ElementEventCallback
    onmousedown: ElementEventCallback
    onmouseup: ElementEventCallback
    oncontextmenu: ElementEventCallback

    ondrag: ElementEventCallback
    ondragstart: ElementEventCallback
    ondragend: ElementEventCallback
    ondragenter: ElementEventCallback
    ondragleave: ElementEventCallback
    ondragover: ElementEventCallback
    ondrop: ElementEventCallback


    protected static initDefaultProps = (function () {
        const elProto = Element.prototype;
        elProto.type = 'element';
        elProto.name = '';
        elProto.ignore = false;
        elProto.silent = false;
        elProto.isGroup = false;
        elProto.draggable = false;
        elProto.dragging = false;
        elProto.__dirty = true;
    })()
}

function animateTo<T>(
    animatable: Element<T>,
    target: Dictionary<any>,
    time: number | AnimationCallback,
    delay: easingType | number | AnimationCallback,
    easing: easingType | number | AnimationCallback ,
    callback: AnimationCallback,
    forceAnimate: boolean,
    reverse?: boolean
) {
    // animateTo(target, time, easing, callback);
    if (zrUtil.isString(delay)) {
        callback = easing as AnimationCallback;
        easing = delay as easingType;
        delay = 0;
    }
    // animateTo(target, time, delay, callback);
    else if (zrUtil.isFunction(easing)) {
        callback = easing as AnimationCallback;
        easing = 'linear';
        delay = 0;
    }
    // animateTo(target, time, callback);
    else if (zrUtil.isFunction(delay)) {
        callback = delay as AnimationCallback;
        delay = 0;
    }
    // animateTo(target, callback)
    else if (zrUtil.isFunction(time)) {
        callback = time as AnimationCallback;
        time = 500;
    }
    // animateTo(target)
    else if (!time) {
        time = 500;
    }
    // Stop all previous animations
    animatable.stopAnimation();
    animateToShallow(animatable, '', animatable, target, time as number, delay as number, reverse);

    // Animators may be removed immediately after start
    // if there is nothing to animate
    const animators = animatable.animators.slice();
    let count = animators.length;
    function done() {
        count--;
        if (!count) {
            callback && callback();
        }
    }

    // No animators. This should be checked before animators[i].start(),
    // because 'done' may be executed immediately if no need to animate.
    if (!count) {
        callback && callback();
    }
    // Start after all animators created
    // Incase any animator is done immediately when all animation properties are not changed
    for (let i = 0; i < animators.length; i++) {
        animators[i]
            .done(done)
            .start(<easingType>easing, forceAnimate);
    }
}

/**
 * @example
 *  // Animate position
 *  el._animateToShallow({
 *      position: [10, 10]
 *  })
 *
 *  // Animate shape, style and position in 100ms, delayed 100ms
 *  el._animateToShallow({
 *      shape: {
 *          width: 500
 *      },
 *      style: {
 *          fill: 'red'
 *      }
 *      position: [10, 10]
 *  }, 100, 100)
 */
function animateToShallow<T>(
    animatable: Element<T>,
    path: string,
    source: Dictionary<any>,
    target: Dictionary<any>,
    time: number,
    delay: number,
    reverse: boolean    // If `true`, animate from the `target` to current state.
) {
    const objShallow: Dictionary<any> = {};
    let propertyCount = 0;
    for (let name in target) {
        if (!target.hasOwnProperty(name)) {
            continue;
        }

        if (source[name] != null) {
            if (zrUtil.isObject(target[name]) && !zrUtil.isArrayLike(target[name])) {
                animateToShallow(
                    animatable,
                    path ? path + '.' + name : name,
                    source[name],
                    target[name],
                    time,
                    delay,
                    reverse
                );
            }
            else {
                if (reverse) {
                    objShallow[name] = source[name];
                    setAttrByPath(animatable, path, name, target[name]);
                }
                else {
                    objShallow[name] = target[name];
                }
                propertyCount++;
            }
        }
        else if (target[name] != null && !reverse) {
            setAttrByPath(animatable, path, name, target[name]);
        }
    }

    if (propertyCount > 0) {
        animatable.animate(path, false)
            .when(time == null ? 500 : time, objShallow)
            .delay(delay || 0);
    }
}

function setAttrByPath<T>(el: Element<T>, path: string, name: string, value: any) {
    let pathArr = path.split('.');
    // Attr directly if not has property
    // FIXME, if some property not needed for element ?
    if (!path) {
        el.attr(name as keyof T, value);
    }
    else {
        // Only support set shape or style
        const props: Dictionary<any> = {};
        props[path] = {};
        props[path][name] = value;
        el.attr(props as T);
    }
}
