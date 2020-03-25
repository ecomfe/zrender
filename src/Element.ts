import Transformable from './core/Transformable';
import { AnimationEasing } from './animation/easing';
import Animator from './animation/Animator';
import { ZRenderType } from './zrender';
import { VectorArray, add } from './core/vector';
import { Dictionary, ElementEventName, ZRRawEvent, BuiltinTextPosition, AllPropTypes } from './core/types';
import Path from './graphic/Path';
import BoundingRect, { RectLike } from './core/BoundingRect';
import Eventful, {EventQuery, EventCallback} from './core/Eventful';
import RichText from './graphic/RichText';
import { calculateTextPosition, TextPositionCalculationResult } from './contain/text';
import Storage from './Storage';
import {
    guid,
    isObject,
    keys,
    extend,
    indexOf,
    logError,
    isString,
    mixin,
    isFunction,
    isArrayLike
} from './core/util';
import { Group } from './export';

interface ElementAnimateConfig {
    duration?: number
    delay?: number
    easing?: AnimationEasing
    done?: AnimationCallback
    /**
     * If force animate
     * Prevent stop animation and callback
     * immediently when target values are the same as current values.
     */
    force?: boolean
    /**
     * If use additive animation.
     */
    additive?: boolean
}

export interface ElementTextConfig {
    /**
     * Position relative to the element bounding rect
     * @default 'inside'
     */
    position?: BuiltinTextPosition | (number | string)[]

    /**
     * Rotation of the label.
     */
    rotation?: number

    /**
     * Offset of the label.
     * The difference of offset and position is that it will be applied
     * in the rotation
     */
    offset?: number[]

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

    /**
     * Will be set to textContent.style.fill if position is inside
     * If value is 'auto'. It will calculate text fill based on the
     * position and fill of Path.
     */
    insideFill?: string

    /**
     * Will be set to textContent.style.stroke if position is inside
     * If value is 'auto'. It will calculate text stroke based on the
     * position and fill of Path.
     */
    insideStroke?: string

    /**
     * Will be set to textContent.style.fill if position is not inside
     * Can only be a specific color string.
     */
    outsideFill?: string
    /**
     * Will be set to textContent.style.stroke if position is not inside
     * Can only be a specific color string.
     */
    outsideStroke?: string

    // TODO applyClip
    // TODO align, verticalAlign??
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

export type ElementEventCallback<Ctx, Impl> = (
    this: CbThis<Ctx, Impl>, e: ElementEvent
) => boolean | void
type CbThis<Ctx, Impl> = unknown extends Ctx ? Impl : Ctx;

interface ElementEventHandlerProps {
    // Events
    onclick: ElementEventCallback<unknown, unknown>
    ondblclick: ElementEventCallback<unknown, unknown>
    onmouseover: ElementEventCallback<unknown, unknown>
    onmouseout: ElementEventCallback<unknown, unknown>
    onmousemove: ElementEventCallback<unknown, unknown>
    onmousewheel: ElementEventCallback<unknown, unknown>
    onmousedown: ElementEventCallback<unknown, unknown>
    onmouseup: ElementEventCallback<unknown, unknown>
    oncontextmenu: ElementEventCallback<unknown, unknown>

    ondrag: ElementEventCallback<unknown, unknown>
    ondragstart: ElementEventCallback<unknown, unknown>
    ondragend: ElementEventCallback<unknown, unknown>
    ondragenter: ElementEventCallback<unknown, unknown>
    ondragleave: ElementEventCallback<unknown, unknown>
    ondragover: ElementEventCallback<unknown, unknown>
    ondrop: ElementEventCallback<unknown, unknown>

}

export interface ElementProps extends Partial<ElementEventHandlerProps> {
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

    textConfig?: ElementTextConfig
    textContent?: RichText

    clipPath?: Path
    drift?: Element['drift']

    // For echarts animation.
    anid?: string
}

// Properties can be used in state.
export const PRESERVED_NORMAL_STATE = '__zr_normal__';

export type ElementStatePropNames = 'position' | 'rotation' | 'scale' | 'origin' | 'textConfig' | 'ignore';
export type ElementState = Pick<ElementProps, ElementStatePropNames>;

const PRIMARY_STATES_KEYS = ['position', 'scale', 'rotation', 'origin', 'ignore'] as const;

type AnimationCallback = () => void

let tmpTextPosCalcRes = {} as TextPositionCalculationResult;
let tmpBoundingRect = new BoundingRect();

interface Element<Props extends ElementProps = ElementProps> extends Transformable, Eventful, ElementEventHandlerProps {
    // Provide more typed event callback params for mouse events.
    on<Ctx>(event: ElementEventName, handler: ElementEventCallback<Ctx, this>, context?: Ctx): this
    on<Ctx>(event: string, handler: EventCallback<Ctx, this>, context?: Ctx): this

    on<Ctx>(event: ElementEventName, query: EventQuery, handler: ElementEventCallback<Ctx, this>, context?: Ctx): this
    on<Ctx>(event: string, query: EventQuery, handler: EventCallback<Ctx, this>, context?: Ctx): this
}

class Element<Props extends ElementProps = ElementProps> {

    id: number = guid()
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

    parent: Group

    animators: Animator<any>[] = [];

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
     * Config of textContent. Inlcuding layout, color, ...etc.
     */
    textConfig: ElementTextConfig

    // FOR ECHARTS
    /**
     * Id for mapping animation
     */
    anid: string

    currentStates?: string[] = []
    /**
     * Store of element state.
     * '__normal__' key is preserved for default properties.
     */
    states: Dictionary<ElementState> = {}
    protected _normalState: ElementState

    // Temporary storage for inside text color configuration.
    private _innerTextColor: { fill?: string, stroke?: string, lineWidth?: number }

    constructor(props?: Props) {
        // Transformable needs position, rotation, scale
        Transformable.call(this);
        Eventful.call(this);

        this._init(props);
    }

    protected _init(props?: Props) {
        // Init default properties
        this.attr(props);
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
        this.markRedraw();
    }

    /**
     * Hook before update
     */
    beforeUpdate() {}
    /**
     * Hook after update
     */
    afterUpdate() {}
    /**
     * Update each frame
     */
    update() {
        this.updateTransform();
        this._updateInnerText();
    }

    private _updateInnerText() {
        // Update textContent
        const textEl = this._textContent;
        if (textEl) {
            if (!this.textConfig) {
                this.textConfig = {};
            }
            const textConfig = this.textConfig;
            const isLocal = textConfig.local;
            tmpBoundingRect.copy(this.getBoundingRect());
            if (!isLocal) {
                tmpBoundingRect.applyTransform(this.transform);
            }
            else {
                // TODO parent is always be group for developers. But can be displayble inside.
                textEl.parent = this as unknown as Group;
            }
            if (this.calculateTextPosition) {
                this.calculateTextPosition(tmpTextPosCalcRes, textConfig, tmpBoundingRect);
            }
            else {
                calculateTextPosition(tmpTextPosCalcRes, textConfig, tmpBoundingRect);
            }
            // TODO Not modify el.position?
            textEl.position[0] = tmpTextPosCalcRes.x;
            textEl.position[1] = tmpTextPosCalcRes.y;

            textEl.rotation = textConfig.rotation || 0;

            let textOffset = textConfig.offset;
            if (textOffset) {
                add(textEl.position, textEl.position, textOffset);
                textEl.origin = [-textOffset[0], -textOffset[1]];
            }

            if (tmpTextPosCalcRes.textAlign) {
                textEl.style.align = tmpTextPosCalcRes.textAlign;
            }
            if (tmpTextPosCalcRes.verticalAlign) {
                textEl.style.verticalAlign = tmpTextPosCalcRes.verticalAlign;
            }

            // Calculate text color
            const position = textConfig.position;
            const isInside = typeof position === 'string' && position.indexOf('inside') >= 0;
            const innerTextColor = this._innerTextColor || (this._innerTextColor = {});

            if (isInside) {
                const hasInsideFill = textConfig.insideFill != null;
                const hasInsideStroke = textConfig.insideStroke != null;

                if (hasInsideFill || hasInsideStroke) {
                    let fillColor = textConfig.insideFill;
                    let strokeColor = textConfig.insideStroke;

                    if (fillColor === 'auto') {
                        fillColor = this.getInsideTextFill();
                    }
                    if (strokeColor === 'auto') {
                        strokeColor = this.getInsideTextStroke(fillColor);
                    }

                    innerTextColor.fill = fillColor;
                    innerTextColor.stroke = strokeColor || null;
                    innerTextColor.lineWidth = strokeColor ? 2 : 0;

                }
            }
            else {
                innerTextColor.fill = textConfig.outsideFill || '#000';
                innerTextColor.stroke = textConfig.outsideStroke || null;
                innerTextColor.lineWidth = textConfig.outsideStroke ? 2 : 0;
            }

            textEl.setDefaultTextColor(innerTextColor);

            // Mark textEl to update transform.
            textEl.markRedraw();
        }
    }

    protected getInsideTextFill() {
        return '#fff';
    }

    protected getInsideTextStroke(textFill?: string) {
        return '#000';
    }

    traverse<Context>(
        cb: (this: Context, el: Element<Props>) => void,
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
        else if (key === 'textConfig') {
            this.setTextConfig(value as ElementTextConfig);
        }
        else if (key === 'textContent') {
            this.setTextContent(value as RichText);
        }
        else if (key === 'clipPath') {
            this.setClipPath(value as Path);
        }
        else {
            (this as any)[key] = value;
        }
    }

    /**
     * Hide the element
     */
    hide() {
        this.ignore = true;
        this.__zr && this.__zr.refresh();
    }

    /**
     * Show the element
     */
    show() {
        this.ignore = false;
        this.__zr && this.__zr.refresh();
    }

    attr(keyOrObj: Props): this
    attr<T extends keyof Props>(keyOrObj: T, value: Props[T]): this
    attr(keyOrObj: keyof Props | Props, value?: unknown): this {
        if (typeof keyOrObj === 'string') {
            this.attrKV(keyOrObj as keyof ElementProps, value as AllPropTypes<ElementProps>);
        }
        else if (isObject(keyOrObj)) {
            let obj = keyOrObj as object;
            let keysArr = keys(obj);
            for (let i = 0; i < keysArr.length; i++) {
                let key = keysArr[i];
                this.attrKV(key as keyof ElementProps, keyOrObj[key]);
            }
        }
        this.markRedraw();
        return this;
    }

    // Save current state to normal
    protected saveStateToNormal() {
        let state = this._normalState;
        if (!state) {
            state = this._normalState = {};
        }

        // TODO clone?
        state.textConfig = this.textConfig;
        state.position = this.position;
        state.scale = this.scale;
        state.rotation = this.rotation;
        state.origin = this.origin || [0, 0];

        state.ignore = this.ignore;
    }

    /**
     * If has any state.
     */
    hasState() {
        return this.currentStates.length > 0;
    }

    /**
     * Get state object
     */
    getState(name: string) {
        return this.states[name];
    }


    /**
     * Ensure state exists. If not, will create one and return.
     */
    ensureState(name: string) {
        const states = this.states;
        if (!states[name]) {
            states[name] = {};
        }
        return states[name];
    }

    /**
     * Clear all states.
     */
    clearStates() {
        this.useState(PRESERVED_NORMAL_STATE);
        // TODO set _normalState to null?
    }
    /**
     * Use state. State is a collection of properties.
     * Will return current state object if state exists and stateName has been changed.
     *
     * @param stateName State name to be switched to
     * @param keepCurrentState If keep current states.
     *      If not, it will inherit from the normal state.
     */
    useState(stateName: string, keepCurrentStates?: boolean) {
        // Use preserved word __normal__
        const toNormalState = stateName === PRESERVED_NORMAL_STATE;

        if (!this.hasState()) {
            // If switched from normal state to other state.
            if (!toNormalState) {
                this.saveStateToNormal();
            }
            else {
                // If switched from normal to normal.
                return;
            }
        }

        const currentStates = this.currentStates;
        const currentStatesCount = currentStates.length;
        const lastStateName = currentStates[currentStatesCount - 1];
        const stateNoChange = stateName === lastStateName
            /// If not keepCurrentStates and has more than one states have been applied.
            // Needs clear all the previous states and applied the new one again.
            && (keepCurrentStates || currentStatesCount === 1);

        if (stateNoChange) {
            return;
        }

        const statesMap = this.states;
        const state = (statesMap && statesMap[stateName]);
        if (!state && !toNormalState) {
            logError(`State ${stateName} not exists.`);
            return;
        }

        this._applyStateObj(state, keepCurrentStates);

        // Also set text content.
        if (this._textContent) {
            this._textContent.useState(stateName);
        }

        if (toNormalState) {
            // Clear state
            this.currentStates = [];
        }
        else {
            if (!keepCurrentStates) {
                this.currentStates = [stateName];
            }
            else {
                this.currentStates.push(stateName);
            }
        }

        this.markRedraw();
        // Return used state.
        return state;
    }

    /**
     * Apply multiple states.
     */
    useStates(states: string[]) {
        for (let i = 0; i < states.length; i++) {
            this.useState(states[i], i > 0);
        }
    }

    protected _applyStateObj(state?: ElementState, keepCurrentStates?: boolean) {
        const normalState = this._normalState;
        let needsRestoreToNormal = !state || !keepCurrentStates;

        // TODO: Save current state to normal?
        // TODO: Animation
        if (state && state.textConfig) {
            // Inherit from current state or normal state.
            this.textConfig = extend(
                {},
                keepCurrentStates ? this.textConfig : normalState.textConfig
            );
            extend(this.textConfig, state.textConfig);
        }
        else if (needsRestoreToNormal) {
            this.textConfig = normalState.textConfig;
        }

        for (let i = 0; i < PRIMARY_STATES_KEYS.length; i++) {
            let key = PRIMARY_STATES_KEYS[i];
            if (state && state[key] != null) {
                // Replace if it exist in target state
                (this as any)[key] = state[key];
            }
            else if (needsRestoreToNormal) {
                // Restore to normal state
                (this as any)[key] = normalState[key];
            }
        }

    }

    /**
     * Get clip path
     */
    getClipPath() {
        return this._clipPath;
    }

    /**
     * Set clip path
     */
    setClipPath(clipPath: Path) {
        const zr = this.__zr;
        if (zr) {
            // Needs to add self to zrender. For rerender triggering, or animation.
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

        this.markRedraw();
    }

    /**
     * Remove clip path
     */
    removeClipPath() {
        const clipPath = this._clipPath;
        if (clipPath) {
            if (clipPath.__zr) {
                clipPath.removeSelfFromZr(clipPath.__zr);
            }

            clipPath.__zr = null;
            clipPath.__clipTarget = null;
            this._clipPath = null;

            this.markRedraw();
        }
    }

    /**
     * Get attached text content.
     */
    getTextContent(): RichText {
        return this._textContent;
    }

    /**
     * Attach text on element
     */
    setTextContent(textEl: RichText) {
        // Remove previous clip path
        if (this._textContent && this._textContent !== textEl) {
            this.removeTextContent();
        }

        const zr = this.__zr;
        if (zr) {
            // Needs to add self to zrender. For rerender triggering, or animation.
            textEl.addSelfToZr(zr);
        }

        this._textContent = textEl;
        textEl.__zr = zr;

        this.markRedraw();
    }

    /**
     * Remove attached text element.
     */
    removeTextContent() {
        const textEl = this._textContent;
        if (textEl) {
            if (textEl.__zr) {
                textEl.removeSelfFromZr(textEl.__zr);
            }
            textEl.__zr = null;
            this._textContent = null;
            this.markRedraw();
        }
    }

    /**
     * Set layout of attached text. Will merge with the previous.
     */
    setTextConfig(cfg: ElementTextConfig) {
        // TODO hide cfg property?
        if (!this.textConfig) {
            this.textConfig = {};
        }
        extend(this.textConfig, cfg);
        this.markRedraw();
    }

    /**
     * Mark element needs to be repainted
     */
    markRedraw() {
        this.__dirty = true;
        this.__zr && this.__zr.refresh();
    }


    /**
     * Besides marking elements to be refreshed.
     * It will also invalid all cache and doing recalculate next frame.
     */
    dirty() {
        this.markRedraw();
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
     * @param path The key to fetch value from object. Mostly style or shape.
     * @param loop Whether to loop animation.
     * @example:
     *     el.animate('style', false)
     *         .when(1000, {x: 10} )
     *         .done(function(){ // Animation done })
     *         .start()
     */
    animate(key?: string, loop?: boolean) {
        let target = key ? (this as any)[key] : this;

        if (!target) {
            logError(
                'Property "'
                + key
                + '" is not existed in element '
                + this.id
            );
            return;
        }

        const animator = new Animator(target, loop);
        this.addAnimator(animator, key);
        return animator;
    }

    addAnimator(animator: Animator<any>, key: string): void {
        const zr = this.__zr;

        const el = this;
        const animators = el.animators;

        // TODO Can improve performance?
        animator.during(function () {
            el.updateDuringAnimation(key as string);
        }).done(function () {
            // FIXME Animator will not be removed if use `Animator#stop` to stop animation
            animators.splice(indexOf(animators, animator), 1);
        });

        animators.push(animator);

        // If animate after added to the zrender
        if (zr) {
            zr.animation.addAnimator(animator);
        }
    }

    updateDuringAnimation(key: string) {
        this.markRedraw();
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
        this.animators = [];

        return this;
    }

    /**
     * @example
     *  // Animate position
     *  el.animateTo({
     *      position: [10, 10]
     *  }, { done: () => { // done } })
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
     *  }, {
     *      duration: 100,
     *      delay: 100,
     *      easing: 'cubicOut',
     *      done: () => { // done }
     *  })
     */

    animateTo(target: Props, cfg: ElementAnimateConfig) {
        animateTo(this, target, cfg);
    }

    /**
     * Animate from the target state to current state.
     * The params and the return value are the same as `this.animateTo`.
     */

    // Overload definitions
    animateFrom(target: Props, cfg: ElementAnimateConfig) {
        animateTo(this, target, cfg, true);
    }

    /**
     * Interface of getting the minimum bounding box.
     */
    getBoundingRect(): BoundingRect {
        return null;
    }


    /**
     * The string value of `textPosition` needs to be calculated to a real postion.
     * For example, `'inside'` is calculated to `[rect.width/2, rect.height/2]`
     * by default. See `contain/text.js#calculateTextPosition` for more details.
     * But some coutom shapes like "pin", "flag" have center that is not exactly
     * `[width/2, height/2]`. So we provide this hook to customize the calculation
     * for those shapes. It will be called if the `style.textPosition` is a string.
     * @param {Obejct} [out] Prepared out object. If not provided, this method should
     *        be responsible for creating one.
     * @param {module:zrender/graphic/Style} style
     * @param {Object} rect {x, y, width, height}
     * @return {Obejct} out The same as the input out.
     *         {
     *             x: number. mandatory.
     *             y: number. mandatory.
     *             textAlign: string. optional. use style.textAlign by default.
     *             textVerticalAlign: string. optional. use style.textVerticalAlign by default.
     *         }
     */
    calculateTextPosition: (out: TextPositionCalculationResult, style: ElementTextConfig, rect: RectLike) => TextPositionCalculationResult


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

mixin(Element, Eventful);
mixin(Element, Transformable);

function animateTo<T>(
    animatable: Element<T>,
    target: Dictionary<any>,
    cfg: ElementAnimateConfig,
    reverse?: boolean
) {
    cfg = cfg || {};
    const animators: Animator<any>[] = [];
    animateToShallow(
        animatable,
        '',
        animatable,
        target,
        cfg.duration,
        cfg.delay,
        cfg.additive,
        animators,
        reverse
    );

    let count = animators.length;
    function done() {
        count--;
        if (!count) {
            cfg.done && cfg.done();
        }
    }

    // No animators. This should be checked before animators[i].start(),
    // because 'done' may be executed immediately if no need to animate.
    if (!count) {
        cfg.done && cfg.done();
    }
    // Start after all animators created
    // Incase any animator is done immediately when all animation properties are not changed
    for (let i = 0; i < animators.length; i++) {
        animators[i]
            .done(done)
            .start(cfg.easing, cfg.force);
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
    topKey: string,
    source: Dictionary<any>,
    target: Dictionary<any>,
    time: number,
    delay: number,
    additive: boolean,
    animators: Animator<any>[],
    reverse: boolean    // If `true`, animate from the `target` to current state.
) {
    const animatableKeys: string[] = [];
    const targetKeys = keys(target);
    for (let k = 0; k < targetKeys.length; k++) {
        const innerKey = targetKeys[k] as string;

        if (source[innerKey] != null) {
            if (isObject(target[innerKey]) && !isArrayLike(target[innerKey])) {
                if (topKey) {
                    logError('Only support 1 depth nest object animation.');
                    // Assign directly.
                    // TODO richText?
                    if (!reverse) {
                        source[innerKey] = target[innerKey];
                        animatable.updateDuringAnimation(topKey);
                    }
                    return;
                }
                animateToShallow(
                    animatable,
                    innerKey,
                    source[innerKey],
                    target[innerKey],
                    time,
                    delay,
                    additive,
                    animators,
                    reverse
                );
            }
            else {
                animatableKeys.push(innerKey);
            }
        }
        else if (target[innerKey] != null && !reverse) {
            // Assign directly.
            source[innerKey] = target[innerKey];
            animatable.updateDuringAnimation(topKey);
        }
    }

    const keyLen = animatableKeys.length;

    if (keyLen > 0) {
        let reversedTarget: Dictionary<any>;
        if (reverse) {
            reversedTarget = {};
            for (let i = 0; i < keyLen; i++) {
                let innerKey = animatableKeys[i];
                reversedTarget[innerKey] = source[innerKey];
                // Animate from target
                source[innerKey] = target[innerKey];
            }
        }

        // Find last animator animating same target.
        const existsAnimators = animatable.animators;
        let lastAnimator;
        for (let i = 0; i < existsAnimators.length; i++) {
            if (existsAnimators[i].getTarget() === source) {
                lastAnimator = existsAnimators[i];
            }
        }

        if (!additive && lastAnimator) {
            // Stop exists animation on specific tracks.
            // TODO Should invoke previous animation callback?
            lastAnimator.stopTracks(animatableKeys);
        }

        const animator = new Animator(source, false, lastAnimator);

        animator.whenWithKeys(
            time == null ? 500 : time,
            reverse ? reversedTarget : target,
            animatableKeys
        ).delay(delay || 0);

        animatable.addAnimator(animator, topKey);
        animators.push(animator);
    }
}


export default Element;