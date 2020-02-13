import Transformable from './core/Transformable';
import * as zrUtil from './core/util';
import { easingType } from './animation/easing';
import Animator from './animation/Animator';
import { ZRenderType } from './zrender';
import { VectorArray } from './core/vector';
import { Dictionary, PropType, ElementEventName, ZRRawEvent, BuiltinTextPosition } from './core/types';
import Path from './graphic/Path';
import BoundingRect from './core/BoundingRect';
import Eventful, {EventQuery, EventCallback} from './core/Eventful';
import RichText from './graphic/RichText';
import { calculateTextPosition, TextPositionCalculationResult } from './contain/text';
import Storage from './Storage';

interface TextLayout {
    /**
     * Position relative to the element bounding rect
     * @default 'inside'
     */
    position?: BuiltinTextPosition | number[] | string[]

    /**
     * Distance to the rect
     * @default 5
     */
    distance?: number

    /**
     * If use local user space. Which will apply host's transform
     * @default false
     */
    local?: boolean

    // TODO applyClip
}

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

export interface ElementOption {
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

    textLayout?: TextLayout
    textContent?: RichText

    clipPath?: Path

    extra?: Dictionary<any>
}

type ElementKey = keyof ElementOption
type ElementPropertyType = PropType<ElementOption, ElementKey>

type AnimationCallback = () => {}

export type ElementEventCallback = (e: ElementEvent) => boolean | void

let tmpTextPosCalcRes = {} as TextPositionCalculationResult;
let tmpBoundingRect = new BoundingRect();

interface Element extends Transformable, Eventful {
    // Provide more typed event callback params for mouse events.
    on(event: ElementEventName, handler: ElementEventCallback, context?: object): Element
    on(event: ElementEventName, query: EventQuery, handler: ElementEventCallback, context?: object): Element
    // Provide general events handler for other custom events.
    on(event: string, query?: EventCallback | EventQuery, handler?: EventCallback | Object, context?: Object): Element

    // Mouse events
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
}

class Element {

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

    /**
     * Parent element
     */
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
     * path to clip the elements and its children, if it is a group.
     * @see http://www.w3.org/TR/2dcontext/#clipping-region
     */
    private _clipPath: Path

    /**
     * Attached text element.
     * `position`, `style.textAlign`, `style.textVerticalAlign`
     * of element will be ignored if textContent.position is set
     */
    private _textContent: RichText

    /**
     * Layout of textContent
     */
    textLayout: TextLayout

    constructor(opts?: ElementOption) {
        // Transformable needs position, rotation, scale
        Transformable.call(this);
        Eventful.call(this);

        if (opts) {
            if (opts.textContent) {
                this.setTextContent(opts.textContent);
            }
            if (opts.clipPath) {
                this.setClipPath(opts.clipPath);
            }
        }
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
        this.dirty();
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

        // Update textContent
        const textEl = this._textContent;
        if (textEl) {
            if (!this.textLayout) {
                this.textLayout = {};
            }
            const textLayout = this.textLayout;
            const isLocal = textLayout.local;
            tmpBoundingRect.copy(this.getBoundingRect());
            if (!isLocal) {
                tmpBoundingRect.applyTransform(this.transform);
            }
            else {
                textEl.parent = this;
            }
            calculateTextPosition(tmpTextPosCalcRes, textLayout, tmpBoundingRect);
            // TODO Not modify el.position?
            textEl.position[0] = tmpTextPosCalcRes.x;
            textEl.position[1] = tmpTextPosCalcRes.y;
            if (tmpTextPosCalcRes.textAlign) {
                textEl.style.textAlign = tmpTextPosCalcRes.textAlign;
            }
            if (tmpTextPosCalcRes.textVerticalAlign) {
                textEl.style.textVerticalAlign = tmpTextPosCalcRes.textVerticalAlign;
            }
            // Mark textEl to update transform.
            textEl.dirty();
        }
    }

    traverse<T> (
        cb: (this: T, el: Element) => void,
        context: T
    ) {}

    protected attrKV(key: ElementKey, value: ElementPropertyType) {
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
        else if (key === 'textLayout') {
            this.setTextLayout(value as TextLayout);
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

    attr(key: ElementKey, value: ElementPropertyType): Element
    attr(key: ElementOption): Element
    /**
     * @param {string|Object} key
     * @param {*} value
     */
    attr(key: ElementKey | ElementOption, value?: ElementPropertyType) {
        if (typeof key === 'string') {
            this.attrKV(key, value);
        }
        else if (zrUtil.isObject(key)) {
            for (let name in key) {
                if (key.hasOwnProperty(name)) {
                    this.attrKV(<ElementKey>name, (<any>key)[name]);
                }
            }
        }
        this.dirty();
        return this;
    }

    getClipPath() {
        return this._clipPath;
    }

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
        clipPath.__clipTarget = this;

        this.dirty();
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

            this.dirty();
        }
    }

    getTextContent(): RichText {
        return this._textContent;
    }

    setTextContent(textEl: RichText) {
        // Remove previous clip path
        if (this._textContent && this._textContent !== textEl) {
            this.removeTextContent();
        }

        const zr = this.__zr;
        if (zr) {
            textEl.addSelfToZr(zr);
        }

        this._textContent = textEl;
        textEl.__zr = zr;

        this.dirty();
    }

    removeTextContent() {
        const textEl = this._textContent;
        if (textEl) {
            if (textEl.__zr) {
                textEl.removeSelfFromZr(textEl.__zr);
            }
            textEl.__zr = null;
            this._textContent = null;
            this.dirty();
        }
    }

    setTextLayout(textLayout: TextLayout) {
        if (!this.textLayout) {
            this.textLayout = {};
        }
        zrUtil.extend(this.textLayout, textLayout);
        this.dirty();
    }

    /**
     * Mark displayable element dirty and refresh next frame
     */
    dirty() {
        this.__dirty = true;
        this.__zr && this.__zr.refresh();
    }

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
        if (this._textContent) {
            this._textContent.addSelfToZr(zr);
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
        if (this._textContent) {
            this._textContent.removeSelfFromZr(zr);
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
    animate(path: string, loop?: boolean) {
        const el = this as Element;
        const zr = this.__zr;

        let target;
        let targetKey: string;
        if (path) {
            const pathSplitted = path.split('.');
            let prop = <Dictionary<any>>el;
            targetKey = pathSplitted[0];
            // If animating shape
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

        animator.during(function () {
            el.updateDuringAnimation(targetKey);
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

    updateDuringAnimation(targetKey: string) {
        this.dirty();
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
    animateTo(target: Dictionary<any>): void
    animateTo(target: Dictionary<any>, callback: AnimationCallback): void
    animateTo(target: Dictionary<any>, time: number, callback: AnimationCallback): void
    animateTo(target: Dictionary<any>, time: number, delay: number, callback: AnimationCallback): void
    animateTo(target: Dictionary<any>, time: number, easing: easingType, callback: AnimationCallback): void
    animateTo(target: Dictionary<any>, time: number, delay: number, easing: easingType, callback: AnimationCallback): void
    animateTo(target: Dictionary<any>, time: number, delay: number, easing: easingType, callback: AnimationCallback, forceAnimate: boolean): void

    // TODO Return animation key
    animateTo(
        target: Dictionary<any>,
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
    animateFrom(target: Dictionary<any>): void
    animateFrom(target: Dictionary<any>, callback: AnimationCallback): void
    animateFrom(target: Dictionary<any>, time: number, callback: AnimationCallback): void
    animateFrom(target: Dictionary<any>, time: number, delay: number, callback: AnimationCallback): void
    animateFrom(target: Dictionary<any>, time: number, easing: easingType, callback: AnimationCallback): void
    animateFrom(target: Dictionary<any>, time: number, delay: number, easing: easingType, callback: AnimationCallback): void
    animateFrom(target: Dictionary<any>, time: number, delay: number, easing: easingType, callback: AnimationCallback, forceAnimate: boolean): void

    animateFrom(
        target: Dictionary<any>,
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

zrUtil.mixin(Element, Eventful);
zrUtil.mixin(Element, Transformable);

function animateTo(
    animatable: Element,
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
function animateToShallow(
    animatable: Element,
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

function setAttrByPath(el: Element, path: string, name: string, value: any) {
    let pathArr = path.split('.');
    // Attr directly if not has property
    // FIXME, if some property not needed for element ?
    if (!path) {
        el.attr(name as ElementKey, value);
    }
    else {
        // Only support set shape or style
        const props: Dictionary<any> = {};
        props[path] = {};
        props[path][name] = value;
        el.attr(props as ElementOption);
    }
}

export default Element;