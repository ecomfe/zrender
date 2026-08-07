import Transformable, {TRANSFORMABLE_PROPS, TransformProp} from './core/Transformable';
import { AnimationEasing } from './animation/easing';
import Animator, {copyAnimatableValue} from './animation/Animator';
import { ZRenderType } from './zrender';
import {
    Dictionary, ElementEventName, ZRRawEvent, BuiltinTextPosition, AllPropTypes,
    TextVerticalAlign, TextAlign, MapToType,
    NullUndefined, ArrayLike
} from './core/types';
import Path from './graphic/Path';
import BoundingRect, { RectLike } from './core/BoundingRect';
import Eventful from './core/Eventful';
import ZRText, { DefaultTextStyle } from './graphic/Text';
import { calculateTextPosition, TextPositionCalculationResult, parsePercent } from './contain/text';
import {
    guid,
    isObject,
    keys,
    extend,
    indexOf,
    logError,
    mixin,
    isArrayLike,
    isGradientObject,
    filter,
    reduce,
    assert
} from './core/util';
import Polyline from './graphic/shape/Polyline';
import Group from './graphic/Group';
import Point from './core/Point';
import { LIGHT_LABEL_COLOR, DARK_LABEL_COLOR } from './config';
import { parse, stringify } from './tool/color';
import { REDRAW_BIT } from './graphic/constants';
import { invert } from './core/matrix';

export interface ElementAnimateConfig {
    /**
     * Special values:
     *  - If `duration` is `null | undefined`, a default value can be set internally.
     *  - `duration: 0` means complete the animation in the next animation frame.
     *    NOTICE: `duration: 0` is not necessarily the same as `animationProps: 0`.
     *    @see ZR_ELEMENT_STOP_ANIMATION_ON_PROPS for details.
     */
    duration?: number
    delay?: number
    easing?: AnimationEasing

    /**
     * NOTICE:
     *  - `rawPercent` ranges from 0 to 1 and increase monotonically over time.
     *  - `percent` is the result after applying a easing function (if any). Therefore, it is probably not linear
     *    and may not monotonic, and does not necessarily range from 0 to 1 (may less than 0 or greater than 1 in
     *    certain moments), which depends on the easing function.
     *    The last call to `during` must pass `percent: 1, rawPercent: 1` if animation completes with no abortion.
     *  - Calling with `percent: 1, rawPercent: 1` (`during(1, 1)`) occurs if and only if this animation completes
     *    with no abortion or values are assigned directly with no animation, and this `during` call is immediately
     *    before a `done` call.
     *    But only `rawPercent === 1` can be used to determine the animation completion, since
     *    `percent: 1, rawPercent < 1` may occur in a non-monotonic easing.
     *  - Calling with `rawPercent: 0` does not necessarily occur.
     *
     * @see ZR_SYNC_MULTIPLE_ANIMATIONS
     */
    during?: (percent: number, rawPercent: number) => void
    /**
     * `done` will be called when all of the animations of the target props are
     * "done" or "aborted", and at least one "done" happened.
     * Common cases: animations declared, but some of them are aborted (e.g., by state change).
     * The calling of `animationTo` done rather than aborted if at least one done happened.
     * @see ZR_ELEMENT_ANIMATE_TO_DONE_CB_ISSUE
     */
    done?: () => void
    /**
     * `aborted` is called when all of the animations of the target props are "aborted".
     * @see ZR_ELEMENT_ANIMATE_TO_DONE_CB_ISSUE
     */
    aborted?: () => void
    /**
     * Whether to discard all previous callbacks (`during`, `done`, `aborted`) regardless of
     * whether new callbacks are provided.
     * NOTE: `el.useState` should not support `cleanCb: true`.
     * @see ZR_ELEMENT_ANIMATE_TO_DONE_CB_ISSUE for the reason.
     */
    cleanCb?: boolean

    scope?: string

    /**
     * @see ZR_ELEMENT_ANIMATION_CALLBACK_WHEN_NO_ANIMATION
     */
    force?: boolean

    /**
     * Whether to use additive animation.
     */
    additive?: boolean

    /**
     * Whether to set to final state before animation started.
     * It can be useful if something you want to calculate depends on the final state of element.
     * Like bounding rect for text layout.
     *
     * Only available in `el.animateTo`.
     */
    setToFinal?: boolean
}

/**
 * A nested map to specify which properties in the given `props` should animate. If not specified, animate all.
 *
 * Optional values:
 *  - For the outermost level of `animationProps`:
 *    `true | false | null | undefined` indicate animating all given props (for historical reasons).
 *    e.g., consider cases:
 *      ```js
 *      el.animateTo({x: 10, style: {opacity: 1}}, null, undefined);
 *      // All the given props should animate, since `animationProps` is `undefined`.
 *      ```
 *  - For inner levels of `animationProps`:
 *    Only truthy values indcate animating all given props.
 *    e.g., consider cases:
 *      ```js
 *      el.animateTo({x: 10, style: {opacity: 1}}, null, {x: true, style: undefined});
 *      el.animateTo({x: 10, style: {opacity: 1}}, null, {x: true});
 *      // `style.opacity` should not animate, since `style` is absent or falsy in `animationProps`.
 *      ```
 *  - ELEMENT_ANIMATION_PROPS_NONE (`0`, a falsy value) is designated as a sentinel to stop all given props
 *    (considered backward compatibility).
 *    @see ZR_ELEMENT_STOP_ANIMATION_ON_PROPS
 */
type ElementAnimationProps<Props extends ElementProps = ElementProps> =
    MapToType<Props, boolean> | boolean | typeof ELEMENT_ANIMATION_PROPS_NONE | NullUndefined;
// @see ZR_ELEMENT_STOP_ANIMATION_ON_PROPS
export const ELEMENT_ANIMATION_PROPS_NONE = 0;

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
     * Rect that text will be positioned.
     * Default to be the boundingRect of the host element.
     * The coords of `layoutRect` is based on the target element, but not global.
     *
     * [NOTICE]: boundingRect includes `lineWidth`, which is inconsistent with
     *  the general element placement principle, where `lineWidth` is not counted.
     */
    layoutRect?: RectLike

    /**
     * Offset of the label.
     * The difference of offset and position is that it will be applied
     * in the rotation
     */
    offset?: number[]

    /**
     * Origin or rotation. Which is relative to the bounding box of the attached element.
     * Can be percent value. Relative to the bounding box.
     * If specified center. It will be center of the bounding box.
     *
     * Only available when position and rotation are both set.
     */
    origin?: (number | string)[] | 'center'

    /**
     * Distance to the rect
     * @default 5
     */
    distance?: number

    /**
     * If use local user space. Which will apply host's transform
     *
     * [NOTICE]: If the host element may rotate to non-parallel to screen x/y,
     *  need to use `local:true`, otherwise the transformed layout rect may not be expected.
     *
     * @default false
     */
    local?: boolean

    /**
     * `insideFill` is a color string or left empty.
     * If a `textContent` is "inside", its final `fill` will be picked by this priority:
     * `textContent.style.fill` > `textConfig.insideFill` > "auto-calculated-fill"
     * In most cases, "auto-calculated-fill" is white.
     */
    insideFill?: string

    /**
     * `insideStroke` is a color string or left empty.
     * If a `textContent` is "inside", its final `stroke` will be picked by this priority:
     * `textContent.style.stroke` > `textConfig.insideStroke` > "auto-calculated-stroke"
     *
     * The rule of getting "auto-calculated-stroke":
     * If (A) the `fill` is specified in style (either in `textContent.style` or `textContent.style.rich`)
     * or (B) needed to draw text background (either defined in `textContent.style` or `textContent.style.rich`)
     * "auto-calculated-stroke" will be null.
     * Otherwise, "auto-calculated-stroke" will be the same as `fill` of this element if possible, or null.
     *
     * The reason of (A) is not decisive:
     * 1. If users specify `fill` in style and still use "auto-calculated-stroke", the effect
     * is not good and unexpected in some cases. It not easy and seams unnecessary to auto calculate
     * a proper `stroke` for the given `fill`, since they can specify `stroke` themselves.
     * 2. Backward compat.
     */
    insideStroke?: string

    /**
     * `outsideFill` is a color string or left empty.
     * If a `textContent` is "inside", its final `fill` will be picked by this priority:
     * `textContent.style.fill` > `textConfig.outsideFill` > #000
     */
    outsideFill?: string

    /**
     * `outsideStroke` is a color string or left empty.
     * If a `textContent` is not "inside", its final `stroke` will be picked by this priority:
     * `textContent.style.stroke` > `textConfig.outsideStroke` > "auto-calculated-stroke"
     *
     * The rule of getting "auto-calculated-stroke":
     * If (A) the `fill` is specified in style (either in `textContent.style` or `textContent.style.rich`)
     * or (B) needed to draw text background (either defined in `textContent.style` or `textContent.style.rich`)
     * "auto-calculated-stroke" will be null.
     * Otherwise, "auto-calculated-stroke" will be a neer white color to distinguish "front end"
     * label with messy background (like other text label, line or other graphic).
     */
    outsideStroke?: string

    /**
     * Tell zrender I can sure this text is inside or not.
     * In case position is not using builtin `inside` hints.
     */
    inside?: boolean

    /**
     * Auto calculate overflow area by `textConfig.layoutRect` (if any) or `host.boundingRect`.
     * It makes sense only if label is inside. It ensure the text does not overflow the host.
     * Useful in `text.style.overflow` and `text.style.lineOverflow`.
     *
     * If `textConfig.rotation` or `text.rotation exists`, it works correctly only when the rotated text is parallel
     * to its host (i.e. 0, PI/2, PI, PI*3/2, 2*PI, ...). Do not supported other cases until a real scenario arises.
     */
    autoOverflowArea?: boolean
}
export interface ElementTextGuideLineConfig {
    /**
     * Anchor for text guide line.
     * Notice: Won't work
     */
    anchor?: Point

    /**
     * If above the target element.
     */
    showAbove?: boolean

    /**
     * Candidates of connectors. Used when autoCalculate is true and anchor is not specified.
     */
    candidates?: ('left' | 'top' | 'right' | 'bottom')[]
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

export interface ElementProps extends Partial<ElementEventHandlerProps>, Partial<Pick<Transformable, TransformProp>> {
    name?: string
    ignore?: boolean
    isGroup?: boolean
    draggable?: boolean | 'horizontal' | 'vertical'

    silent?: boolean
    ignoreHostSilent?: boolean

    ignoreClip?: boolean
    globalScaleRatio?: number

    textConfig?: ElementTextConfig
    textContent?: ZRText

    clipPath?: Path
    drift?: Element['drift']

    extra?: Dictionary<unknown>

    // For echarts animation.
    anid?: string
}

// Properties can be used in state.
export const PRESERVED_NORMAL_STATE = '__zr_normal__';
// export const PRESERVED_MERGED_STATE = '__zr_merged__';

const PRIMARY_STATES_KEYS = (TRANSFORMABLE_PROPS as any).concat(['ignore']) as [TransformProp, 'ignore'];
const DEFAULT_ANIMATABLE_MAP = reduce(TRANSFORMABLE_PROPS, (obj, key) => {
    obj[key] = true;
    return obj;
}, {ignore: false} as Partial<Record<ElementStatePropNames, boolean>>);

export type ElementStatePropNames = (typeof PRIMARY_STATES_KEYS)[number] | 'textConfig';
export type ElementState = Pick<ElementProps, ElementStatePropNames> & ElementCommonState

export type ElementCommonState = {
    /**
     * NOTICE: Only canvas renderer supports hover layer. Users must not set hoverLayer
     * flag in non-canvas renderer, otherwise it may cause unexpected behavior.
     *
     * A truthy value (regardless of number or boolean) means hover layer is used.
     */
    hoverLayer?: boolean | number
}

export type ElementCalculateTextPosition = (
    out: TextPositionCalculationResult,
    style: ElementTextConfig,
    rect: RectLike
) => TextPositionCalculationResult;

const tmpTextPosCalcRes = {} as TextPositionCalculationResult;
const tmpBoundingRect = new BoundingRect(0, 0, 0, 0);
const tmpInnerTextTrans: number[] = [];


// It indicates a status of the element - whether it should be rendered or have been rendered
// in a hover layer.
// It also record the restriction of props changes when entering the hover status.
// A falsy value means not in haver layer; a truthy value means in haver layer.
export type InHoverLayerKind =
    typeof IN_HOVER_LAYER_KIND_NO
    | typeof IN_HOVER_LAYER_KIND_ONLY_STYLE_CHANGE;
    // | typeof IN_HOVER_LAYER_KIND_NO_LIMIT;
// Not in hover layer.
export const IN_HOVER_LAYER_KIND_NO = 0;
// In hover layer and only style change when entering hover layer.
export const IN_HOVER_LAYER_KIND_ONLY_STYLE_CHANGE = 1;
// In hover layer and no restriction of changing.
// export const IN_HOVER_LAYER_KIND_NO_LIMIT = 2;


// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Element<Props extends ElementProps = ElementProps> extends Transformable,
    Eventful<{
        [key in ElementEventName]: (e: ElementEvent) => void | boolean
    } & {
        [key in string]: (...args: any) => void | boolean
    }>,
    ElementEventHandlerProps {
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
     * When this element has `__hostTarget` (e.g., this is a `textContent`), whether
     * its silent is controlled by that host silent. They may need separate silent
     * settings. e.g., the host do not have `fill` but only `stroke`, or their mouse
     * events serve for different features.
     */
    ignoreHostSilent: boolean

    /**
     * 是否是 Group
     */
    isGroup: boolean

    /**
     * Whether it can be dragged.
     */
    draggable: boolean | 'horizontal' | 'vertical'

    /**
     * Whether is it dragging.
     */
    dragging: boolean

    parent: Group

    /**
     * CAUTION: Do not visit it from outside directly except you
     * can clearly manage the risk. For example,
     *  ```js
     *  el.animateTo(target);
     *  el.animators[0].during(cb); // This is INCORRECT!
     *  // el.animators[0] is not necessarily created by this call to `el.animateTo`,
     *  // but actually, for example, created by previous state change.
     *  ```
     */
    animators: Animator<any>[] = []

    /**
     * If ignore clip from it's parent or hosts.
     * Applied on itself and all it's children.
     *
     * NOTE: It won't affect the clipPath set on the children.
     */
    ignoreClip: boolean

    /**
     * If element is used as a component of other element.
     */
    __hostTarget: Element

    /**
     * ZRender instance will be assigned when element is associated with zrender
     */
    __zr: ZRenderType

    /**
     * Dirty bits.
     * From which painter will determine if this displayable object needs brush.
     */
    __dirty: number

    /**
     * If element was painted on the screen
     */
    __isRendered: boolean;

    /**
     * This flag indicates whether this element requests rendering on a hover layer.
     *
     * Hover layer is typically useful for large data case (including progressive rendering case),
     * where the underlying layers can remain not dirty for most hovering
     * interactions.
     *
     * [HOVER_LAYER_CONSTRAINTS]:
     *
     *  The "hover layer" mechanism expects the changes are applied only on a hover layer, while the original
     *  layer should not be repainted. However, subsequent user operations may still require the original layer
     *  to be repainted. If the element props have been modified due to hover state switching, the final effect
     *  will differ unexpectedly after repainting.
     *  For example, suppose a hover state defines different opacity, color and transform scale. when hovering
     *  triggers that state, an extra glyph with those props is rendered on the hover layer and overlays the
     *  the original glyph, but the original layer remains unchanged. The final effect is a visual composition
     *  of the two. Then if clicking something to trigger a repaint of all layers (e.g., click echarts legend
     *  to hide and then show them, or triggered by axisPointer, where hover style is expected to keep displaying),
     *  and if it is rendered on the normal layer differently, the final composition is changed unexpectedly.
     *
     *  Several candidate approches may resolve this issue:
     *  (A) Clone elements for hover layer rendering. This might be a thorough solution, since all of the original
     *    elements remain intact and can be repainted to the original layer without changes.
     *  (B) Introduce a separate `__hoverStyle` to keep the original `this.style` unchanged, and only styles
     *    changes are allowed in entering or leaving hover layer via `useState` and `useStates` while other changes
     *    are ignored. And for simplicity, and no separate structures are provided for storing other props.
     *    This approach can resolve many cases, but is still problematic in some cases.
     *
     *  PENDING:
     *    1. Currently we simply implement (B), until some concrete scenarios require (A) in future.
     *    2. [HOVER_LAYER_CONSTRAINTS_TEXT]
     *      Consider:
     *        - Text style change may lead to creating or updating of subText elements (TSpan).
     *        - An special handling can be make in (B) - if the element is not rendered on the original layer
     *          (typically due to `ignore: true` or `invisible: true`), it can be rendered to the hover layer
     *          without the restriction "only style can change". This is useful to the scenario "hover an
     *          element to show its _textContent".
     *      All these cases require display list to be re-built, or need a exclusive display list for hover layer,
     *      and more precise dirty bit (REDRAW_BIT) handling is needed for that.
     *      But it would introduce considerable complexity. And unlike `Path`, rendering the same text in multiple
     *      layers may cause undesirable visual effect. Therefore, we do not implement it unless required. Currently
     *      hover layer is disabled for text. Text must still be rendered, since it may carry important infomation.
     */
    __inHover: InHoverLayerKind

    __clipPaths?: Path[]

    /**
     * path to clip the elements and its children, if it is a group.
     * @see http://www.w3.org/TR/2dcontext/#clipping-region
     */
    private _clipPath?: Path

    /**
     * Attached text element.
     * `position`, `style.textAlign`, `style.textVerticalAlign`
     * of element will be ignored if textContent.position is set
     */
    private _textContent?: ZRText

    /**
     * Text guide line.
     */
    private _textGuide?: Polyline

    /**
     * Config of textContent. Including layout, color, ...etc.
     */
    textConfig?: ElementTextConfig

    /**
     * Config for guide line calculating.
     *
     * NOTE: This is just a property signature. READ and WRITE are all done in echarts.
     */
    textGuideLineConfig?: ElementTextGuideLineConfig

    // FOR ECHARTS
    /**
     * Id for mapping animation
     */
    anid: string

    extra: Dictionary<unknown>

    currentStates?: string[] = []
    // prevStates is for storage in echarts.
    prevStates?: string[]
    /**
     * Store of element state.
     * '__normal__' key is preserved for default properties.
     */
    states: Dictionary<ElementState> = {}

    /**
     * Animation config applied on state switching.
     */
    stateTransition: ElementAnimateConfig

    /**
     * Proxy function for getting state with given stateName.
     * ZRender will first try to get with stateProxy. Then find from states if stateProxy returns nothing
     *
     * targetStates will be given in useStates
     */
    stateProxy?: (stateName: string, targetStates?: string[]) => ElementState

    protected _normalState: ElementState

    // Temporary storage for inside text color configuration.
    private _innerTextDefaultStyle: DefaultTextStyle

    constructor(props?: Props) {
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

        if (this.__dirty) {
            this.updateInnerText();
        }
    }

    updateInnerText(forceUpdate?: boolean) {
        // Update textContent
        const textEl = this._textContent;
        if (textEl && (!textEl.ignore || forceUpdate)) {
            if (!this.textConfig) {
                this.textConfig = {};
            }
            const textConfig = this.textConfig;
            const isLocal = textConfig.local;
            const innerTransformable = textEl.innerTransformable;

            let textAlign: TextAlign;
            let textVerticalAlign: TextVerticalAlign;

            let textStyleChanged = false;

            // Apply host's transform.
            innerTransformable.parent = isLocal ? this as unknown as Group : null;

            let innerOrigin = false;

            // Reset x/y/rotation
            innerTransformable.copyTransform(textEl);

            const hasPosition = textConfig.position != null;
            const autoOverflowArea = textConfig.autoOverflowArea;

            let layoutRect: BoundingRect;
            if (autoOverflowArea || hasPosition) {
                layoutRect = tmpBoundingRect;
                if (textConfig.layoutRect) {
                    layoutRect.copy(textConfig.layoutRect);
                }
                else {
                    layoutRect.copy(this.getBoundingRect());
                }
                if (!isLocal) {
                    layoutRect.applyTransform(this.transform);
                }
            }

            // Force set attached text's position if `position` is in config.
            if (hasPosition) {
                if (this.calculateTextPosition) {
                    this.calculateTextPosition(tmpTextPosCalcRes, textConfig, layoutRect);
                }
                else {
                    calculateTextPosition(tmpTextPosCalcRes, textConfig, layoutRect);
                }

                // TODO Should modify back if textConfig.position is set to null again.
                // Or textContent is detached.
                innerTransformable.x = tmpTextPosCalcRes.x;
                innerTransformable.y = tmpTextPosCalcRes.y;

                // User specified align/verticalAlign has higher priority, which is
                // useful in the case that attached text is rotated 90 degree.
                textAlign = tmpTextPosCalcRes.align;
                textVerticalAlign = tmpTextPosCalcRes.verticalAlign;

                const textOrigin = textConfig.origin;
                if (textOrigin && textConfig.rotation != null) {
                    let relOriginX;
                    let relOriginY;
                    if (textOrigin === 'center') {
                        relOriginX = layoutRect.width * 0.5;
                        relOriginY = layoutRect.height * 0.5;
                    }
                    else {
                        relOriginX = parsePercent(textOrigin[0], layoutRect.width);
                        relOriginY = parsePercent(textOrigin[1], layoutRect.height);
                    }

                    innerOrigin = true;
                    innerTransformable.originX = -innerTransformable.x + relOriginX + (isLocal ? 0 : layoutRect.x);
                    innerTransformable.originY = -innerTransformable.y + relOriginY + (isLocal ? 0 : layoutRect.y);
                }
            }


            if (textConfig.rotation != null) {
                innerTransformable.rotation = textConfig.rotation;
            }

            // TODO
            const textOffset = textConfig.offset;
            if (textOffset) {
                innerTransformable.x += textOffset[0];
                innerTransformable.y += textOffset[1];

                // Not change the user set origin.
                if (!innerOrigin) {
                    innerTransformable.originX = -textOffset[0];
                    innerTransformable.originY = -textOffset[1];
                }
            }

            const innerTextDefaultStyle = this._innerTextDefaultStyle || (this._innerTextDefaultStyle = {});

            if (autoOverflowArea) {
                const overflowRect = innerTextDefaultStyle.overflowRect =
                    innerTextDefaultStyle.overflowRect || new BoundingRect(0, 0, 0, 0);
                innerTransformable.getLocalTransform(tmpInnerTextTrans);
                invert(tmpInnerTextTrans, tmpInnerTextTrans);
                BoundingRect.copy(overflowRect, layoutRect);
                // If transform to a non-orthogonal state (e.g. rotate PI/3), the result of this "apply"
                // is not expected. But we don't need to address it until a real scenario arises.
                overflowRect.applyTransform(tmpInnerTextTrans);
            }
            else {
                innerTextDefaultStyle.overflowRect = null;
            }
            // [CAUTION] Do not change `innerTransformable` below.

            // Calculate text color
            const isInside = textConfig.inside == null  // Force to be inside or not.
                ? (typeof textConfig.position === 'string' && textConfig.position.indexOf('inside') >= 0)
                : textConfig.inside;

            let textFill;
            let textStroke;
            let autoStroke;
            if (isInside && this.canBeInsideText()) {
                // In most cases `textContent` need this "auto" strategy.
                // So by default be 'auto'. Otherwise users need to literally
                // set `insideFill: 'auto', insideStroke: 'auto'` each time.
                textFill = textConfig.insideFill;
                textStroke = textConfig.insideStroke;

                if (textFill == null || textFill === 'auto') {
                    textFill = this.getInsideTextFill();
                }
                if (textStroke == null || textStroke === 'auto') {
                    textStroke = this.getInsideTextStroke(textFill);
                    autoStroke = true;
                }
            }
            else {
                textFill = textConfig.outsideFill;
                textStroke = textConfig.outsideStroke;

                if (textFill == null || textFill === 'auto') {
                    textFill = this.getOutsideFill();
                }
                // By default give a stroke to distinguish "front end" label with
                // messy background (like other text label, line or other graphic).
                // If textContent.style.fill specified, this auto stroke will not be used.
                if (textStroke == null || textStroke === 'auto') {
                    // If some time need to customize the default stroke getter,
                    // add some kind of override method.
                    textStroke = this.getOutsideStroke(textFill);
                    autoStroke = true;
                }
            }
            // Default `textFill` should must have a value to ensure text can be displayed.
            textFill = textFill || '#000';

            if (textFill !== innerTextDefaultStyle.fill
                || textStroke !== innerTextDefaultStyle.stroke
                || autoStroke !== innerTextDefaultStyle.autoStroke
                || textAlign !== innerTextDefaultStyle.align
                || textVerticalAlign !== innerTextDefaultStyle.verticalAlign
            ) {

                textStyleChanged = true;

                innerTextDefaultStyle.fill = textFill;
                innerTextDefaultStyle.stroke = textStroke;
                innerTextDefaultStyle.autoStroke = autoStroke;
                innerTextDefaultStyle.align = textAlign;
                innerTextDefaultStyle.verticalAlign = textVerticalAlign;

                textEl.setDefaultTextStyle(innerTextDefaultStyle);
            }

            // Mark textEl to update transform.
            // DON'T use markRedraw. It will cause Element itself to dirty again.
            textEl.__dirty |= REDRAW_BIT;

            if (textStyleChanged) {
                // Only mark style dirty if necessary. Update ZRText is costly.
                textEl.dirtyStyle(true);
            }
        }
    }

    protected canBeInsideText() {
        return true;
    }

    protected getInsideTextFill(): string | undefined {
        return '#fff';
    }

    protected getInsideTextStroke(textFill: string): string | undefined {
        return '#000';
    }

    protected getOutsideFill(): string | undefined {
        return this.__zr && this.__zr.isDarkMode() ? LIGHT_LABEL_COLOR : DARK_LABEL_COLOR;
    }

    protected getOutsideStroke(textFill: string): string {
        const backgroundColor = this.__zr && this.__zr.getBackgroundColor();
        let colorArr = typeof backgroundColor === 'string' && parse(backgroundColor as string);
        if (!colorArr) {
            colorArr = [255, 255, 255, 1];
        }
        // Assume blending on a white / black(dark) background.
        const alpha = colorArr[3];
        const isDark = this.__zr.isDarkMode();
        for (let i = 0; i < 3; i++) {
            colorArr[i] = colorArr[i] * alpha + (isDark ? 0 : 255) * (1 - alpha);
        }
        colorArr[3] = 1;
        return stringify(colorArr, 'rgba');
    }

    traverse<Context>(
        cb: (this: Context, el: Element<Props>) => void,
        context?: Context
    ) {}

    protected attrKV(key: string, value: unknown) {
        if (key === 'textConfig') {
            this.setTextConfig(value as ElementTextConfig);
        }
        else if (key === 'textContent') {
            this.setTextContent(value as ZRText);
        }
        else if (key === 'clipPath') {
            this.setClipPath(value as Path);
        }
        else if (key === 'extra') {
            this.extra = this.extra || {};
            extend(this.extra, value);
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
        this.markRedraw();
    }

    /**
     * Show the element
     */
    show() {
        this.ignore = false;
        this.markRedraw();
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
    saveCurrentToNormalState(toState: ElementState) {
        this._innerSaveToNormal(toState);

        // If we are switching from normal to other state during animation.
        // We need to save final value of animation to the normal state. Not interpolated value.
        const normalState = this._normalState;
        for (let i = 0; i < this.animators.length; i++) {
            const animator = this.animators[i];
            const fromStateTransition = animator.__fromStateTransition;
            // Ignore animation from state transition(except normal).
            // Ignore loop animation.
            if (animator.getLoop() || fromStateTransition && fromStateTransition !== PRESERVED_NORMAL_STATE) {
                continue;
            }

            const targetName = animator.targetName;
            // Respecting the order of animation if multiple animator is
            // animating on the same property(If additive animation is used)
            const target = targetName
                ? (normalState as any)[targetName] : normalState;
            // Only save keys that are changed by the states.
            animator.saveTo(target);
        }
    }

    protected _innerSaveToNormal(toState: ElementState) {
        let normalState = this._normalState;
        if (!normalState) {
            // Clear previous stored normal states when switching from normalState to otherState.
            normalState = this._normalState = {};
        }
        if (toState.textConfig && !normalState.textConfig) {
            normalState.textConfig = this.textConfig;
        }

        this._savePrimaryToNormal(toState, normalState, PRIMARY_STATES_KEYS);
    }

    protected _savePrimaryToNormal(
        toState: Dictionary<any>, normalState: Dictionary<any>, primaryKeys: readonly string[]
    ) {
        for (let i = 0; i < primaryKeys.length; i++) {
            let key = primaryKeys[i];
            // Only save property that will be changed by toState
            // and has not been saved to normalState yet.
            if (toState[key] != null && !(key in normalState)) {
                (normalState as any)[key] = (this as any)[key];
            }
        }
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
    clearStates(noAnimation?: boolean) {
        this.useState(PRESERVED_NORMAL_STATE, false, noAnimation);
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
    useState(stateName: string, keepCurrentStates?: boolean, noAnimation?: boolean, forceUseHoverLayer?: boolean) {

        // Use preserved word __normal__
        // TODO: Only restore changed properties when restore to normal???
        const toNormalState = stateName === PRESERVED_NORMAL_STATE;
        const hasStates = this.hasState();

        if (!hasStates && toNormalState) {
            // If switched from normal to normal.
            return;
        }

        const currentStates = this.currentStates;
        const animationCfg = this.stateTransition;

        // No need to change in following cases:
        // 1. Keep current states. and already being applied before.
        // 2. Don't keep current states. And new state is same with the only one exists state.
        if (indexOf(currentStates, stateName) >= 0 && (keepCurrentStates || currentStates.length === 1)) {
            return;
        }

        let state;
        if (this.stateProxy && !toNormalState) {
            state = this.stateProxy(stateName);
        }

        if (!state) {
            state = (this.states && this.states[stateName]);
        }

        if (!state && !toNormalState) {
            logError(`State ${stateName} not exists.`);
            return;
        }

        if (!toNormalState) {
            this.saveCurrentToNormalState(state);
        }

        const textContent = this._textContent;
        const useHoverLayer = shouldUseHoverLayer(this, textContent, state, forceUseHoverLayer);
        if (useHoverLayer && !this.__inHover) {
            // Enter hover layer before states update.
            this.__inHover = useHoverLayer;
        }

        this._applyStateObj(
            stateName,
            state,
            this._normalState,
            keepCurrentStates,
            canTransition(this, noAnimation, animationCfg),
            animationCfg,
        );

        // Also set text content.
        const textGuide = this._textGuide;
        if (textContent) {
            // Force textContent use hover layer if self is using it.
            textContent.useState(stateName, keepCurrentStates, noAnimation, !!useHoverLayer);
        }
        if (textGuide) {
            textGuide.useState(stateName, keepCurrentStates, noAnimation, !!useHoverLayer);
        }

        if (toNormalState) {
            // Clear state
            this.currentStates = [];
            // Reset normal state.
            this._normalState = {};
        }
        else {
            if (!keepCurrentStates) {
                this.currentStates = [stateName];
            }
            else {
                this.currentStates.push(stateName);
            }
        }

        // Update animating target to the new object after state changed.
        this._updateAnimationTargets();

        this.markRedraw();

        if (!useHoverLayer && this.__inHover) {
            // Leave hover layer after states update and markRedraw.
            this.__inHover = IN_HOVER_LAYER_KIND_NO;
            // NOTE: avoid unexpected refresh when moving out from hover layer!!
            // Only clear from hover layer.
            this.__dirty &= ~REDRAW_BIT;
        }

        // Return used state.
        return state;
    }

    /**
     * Apply multiple states.
     * @param states States list.
     */
    useStates(states: string[], noAnimation?: boolean, forceUseHoverLayer?: boolean) {
        if (!states.length) {
            this.clearStates();
        }
        else {
            const stateObjects: ElementState[] = [];
            const currentStates = this.currentStates;
            const len = states.length;
            let notChange = len === currentStates.length;
            if (notChange) {
                for (let i = 0; i < len; i++) {
                    if (states[i] !== currentStates[i]) {
                        notChange = false;
                        break;
                    }
                }
            }
            if (notChange) {
                return;
            }

            for (let i = 0; i < len; i++) {
                const stateName = states[i];
                let stateObj: ElementState;
                if (this.stateProxy) {
                    stateObj = this.stateProxy(stateName, states);
                }
                if (!stateObj) {
                    stateObj = this.states[stateName];
                }
                if (stateObj) {
                    stateObjects.push(stateObj);
                }
            }

            const lastStateObj = stateObjects[len - 1];
            const textContent = this._textContent;
            const useHoverLayer = shouldUseHoverLayer(this, textContent, lastStateObj, forceUseHoverLayer);
            if (useHoverLayer && !this.__inHover) {
                // Enter hover layer before states update.
                this.__inHover = useHoverLayer;
            }

            const mergedState = this._mergeStates(stateObjects);
            const animationCfg = this.stateTransition;

            this.saveCurrentToNormalState(mergedState);

            this._applyStateObj(
                states.join(','),
                mergedState,
                this._normalState,
                false,
                canTransition(this, noAnimation, animationCfg),
                animationCfg,
            );

            const textGuide = this._textGuide;
            if (textContent) {
                textContent.useStates(states, noAnimation, !!useHoverLayer);
            }
            if (textGuide) {
                textGuide.useStates(states, noAnimation, !!useHoverLayer);
            }

            this._updateAnimationTargets();

            // Create a copy
            this.currentStates = states.slice();
            this.markRedraw();

            if (!useHoverLayer && this.__inHover) {
                // Leave hover layer after states update and markRedraw.
                this.__inHover = IN_HOVER_LAYER_KIND_NO;
                // NOTE: avoid unexpected refresh when moving out from hover layer!!
                // Only clear from hover layer.
                this.__dirty &= ~REDRAW_BIT;
            }
        }
    }

    /**
     * Return if el.silent or any ancestor element has silent true.
     */
    isSilent() {
        // Follow the logic of `Handler.ts`#`isHover`.
        let el: Element = this;
        while (el) {
            if (el.silent) {
                return true;
            }
            const hostEl = el.__hostTarget;
            el = hostEl ? (el.ignoreHostSilent ? null : hostEl) : el.parent;
        }
        return false;
    }

    /**
     * Update animation targets when reference is changed.
     */
    private _updateAnimationTargets() {
        for (let i = 0; i < this.animators.length; i++) {
            const animator = this.animators[i];
            if (animator.targetName) {
                animator.changeTarget((this as any)[animator.targetName]);
            }
        }
    }

    /**
     * Remove state
     * @param state State to remove
     */
    removeState(state: string) {
        const idx = indexOf(this.currentStates, state);
        if (idx >= 0) {
            const currentStates = this.currentStates.slice();
            currentStates.splice(idx, 1);
            this.useStates(currentStates);
        }
    }

    /**
     * Replace exists state.
     * @param oldState
     * @param newState
     * @param forceAdd If still add when even if replaced target not exists.
     */
    replaceState(oldState: string, newState: string, forceAdd: boolean) {
        const currentStates = this.currentStates.slice();
        const idx = indexOf(currentStates, oldState);
        const newStateExists = indexOf(currentStates, newState) >= 0;
        if (idx >= 0) {
            if (!newStateExists) {
                // Replace the old with the new one.
                currentStates[idx] = newState;
            }
            else {
                // Only remove the old one.
                currentStates.splice(idx, 1);
            }
        }
        else if (forceAdd && !newStateExists) {
            currentStates.push(newState);
        }
        this.useStates(currentStates);
    }

    /**
     * Toggle state.
     */
    toggleState(state: string, enable: boolean) {
        if (enable) {
            this.useState(state, true);
        }
        else {
            this.removeState(state);
        }
    }

    protected _mergeStates(states: ElementState[]) {
        const mergedState: ElementState = {};
        let mergedTextConfig: ElementTextConfig;
        for (let i = 0; i < states.length; i++) {
            const state = states[i];
            extend(mergedState, state);

            if (state.textConfig) {
                mergedTextConfig = mergedTextConfig || {};
                extend(mergedTextConfig, state.textConfig);
            }
        }
        if (mergedTextConfig) {
            mergedState.textConfig = mergedTextConfig;
        }

        return mergedState;
    }

    protected _applyStateObj(
        stateName: string,
        state: ElementState,
        normalState: ElementState,
        keepCurrentStates: boolean,
        transition: boolean,
        animationCfg: ElementAnimateConfig
    ) {
        if (this.__inHover === IN_HOVER_LAYER_KIND_ONLY_STYLE_CHANGE) {
            return;
        }

        const needsRestoreToNormal = !(state && keepCurrentStates);
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
            if (normalState.textConfig) {   // Only restore if changed and saved.
                this.textConfig = normalState.textConfig;
            }
        }

        const transitionTarget: Dictionary<any> = {};
        let hasTransition = false;

        for (let i = 0; i < PRIMARY_STATES_KEYS.length; i++) {
            const key = PRIMARY_STATES_KEYS[i];
            const propNeedsTransition = transition && DEFAULT_ANIMATABLE_MAP[key];

            if (state && state[key] != null) {
                if (propNeedsTransition) {
                    hasTransition = true;
                    transitionTarget[key] = state[key];
                }
                else {
                    // Replace if it exist in target state
                    (this as any)[key] = state[key];
                }
            }
            else if (needsRestoreToNormal) {
                if (normalState[key] != null) {
                    if (propNeedsTransition) {
                        hasTransition = true;
                        transitionTarget[key] = normalState[key];
                    }
                    else {
                        // Restore to normal state
                        (this as any)[key] = normalState[key];
                    }
                }
            }
        }

        if (!transition) {
            // Keep the running animation to the new values after states changed.
            // Not simply stop animation. Or it may have jump effect.
            for (let i = 0; i < this.animators.length; i++) {
                const animator = this.animators[i];
                const targetName = animator.targetName;
                // Ignore loop animation
                if (!animator.getLoop()) {
                    animator.__changeFinalValue(targetName
                        ? ((state || normalState) as any)[targetName]
                        : (state || normalState)
                    );
                }
            }
        }

        if (hasTransition) {
            this._transitionState(
                stateName,
                transitionTarget as Props,
                animationCfg
            );
        }
    }

    /**
     * Component is some elements attached on this element for specific purpose.
     * Like clipPath, textContent
     */
    private _attachComponent(componentEl: Element) {
        if (componentEl.__zr && !componentEl.__hostTarget) {
            if (process.env.NODE_ENV !== 'production') {
                throw new Error('Text element has been added to zrender.');
            }
            return;
        }

        if (componentEl === this) {
            if (process.env.NODE_ENV !== 'production') {
                throw new Error('Recursive component attachment.');
            }
            return;
        }

        const zr = this.__zr;
        if (zr) {
            // Needs to add self to zrender. For rerender triggering, or animation.
            componentEl.addSelfToZr(zr);
        }

        componentEl.__zr = zr;
        componentEl.__hostTarget = this as unknown as Element;
    }

    private _detachComponent(componentEl: Element) {
        if (componentEl.__zr) {
            componentEl.removeSelfFromZr(componentEl.__zr);
        }

        componentEl.__zr = null;
        componentEl.__hostTarget = null;
    }

    /**
     * Get clip path
     */
    getClipPath() {
        return this._clipPath;
    }

    /**
     * Set clip path
     *
     * clipPath can't be shared between two elements.
     */
    setClipPath(clipPath: Path) {
        // Remove previous clip path
        if (this._clipPath && this._clipPath !== clipPath) {
            this.removeClipPath();
        }

        this._attachComponent(clipPath);

        this._clipPath = clipPath;
        this.markRedraw();
    }

    /**
     * Remove clip path
     */
    removeClipPath() {
        const clipPath = this._clipPath;
        if (clipPath) {
            this._detachComponent(clipPath);
            this._clipPath = null;
            this.markRedraw();
        }
    }

    /**
     * Get attached text content.
     */
    getTextContent(): ZRText {
        return this._textContent;
    }

    /**
     * Attach text on element
     */
    setTextContent(textEl: ZRText) {
        const previousTextContent = this._textContent;
        if (previousTextContent === textEl) {
            return;
        }
        // Remove previous textContent
        if (previousTextContent && previousTextContent !== textEl) {
            this.removeTextContent();
        }
        if (process.env.NODE_ENV !== 'production') {
            if (textEl.__zr && !textEl.__hostTarget) {
                throw new Error('Text element has been added to zrender.');
            }
        }

        textEl.innerTransformable = new Transformable();

        this._attachComponent(textEl);

        this._textContent = textEl;

        this.markRedraw();
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
     * Remove text config
     */
    removeTextConfig() {
        this.textConfig = null;
        this.markRedraw();
    }

    /**
     * Remove attached text element.
     */
    removeTextContent() {
        const textEl = this._textContent;
        if (textEl) {
            textEl.innerTransformable = null;
            this._detachComponent(textEl);
            this._textContent = null;
            this._innerTextDefaultStyle = null;
            this.markRedraw();
        }
    }

    getTextGuideLine(): Polyline {
        return this._textGuide;
    }

    setTextGuideLine(guideLine: Polyline) {
        // Remove previous clip path
        if (this._textGuide && this._textGuide !== guideLine) {
            this.removeTextGuideLine();
        }

        this._attachComponent(guideLine);

        this._textGuide = guideLine;

        this.markRedraw();
    }

    removeTextGuideLine() {
        const textGuide = this._textGuide;
        if (textGuide) {
            this._detachComponent(textGuide);
            this._textGuide = null;
            this.markRedraw();
        }
    }
    /**
     * Mark element needs to be repainted
     */
    markRedraw() {
        this.__dirty |= REDRAW_BIT;
        const zr = this.__zr;
        if (zr) {
            if (this.__inHover) {
                zr.refreshHover();
            }
            else {
                zr.refresh();
            }
        }

        // Used as a clipPath or textContent
        if (this.__hostTarget) {
            this.__hostTarget.markRedraw();
        }
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
        if (this.__zr === zr) {
            return;
        }

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
        if (this._textGuide) {
            this._textGuide.addSelfToZr(zr);
        }
    }

    /**
     * Remove self from zrender instance.
     * Not recursively because it will be invoked when element added to storage.
     */
    removeSelfFromZr(zr: ZRenderType) {
        if (!this.__zr) {
            return;
        }

        this.__zr = null;
        // Remove animation
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
        if (this._textGuide) {
            this._textGuide.removeSelfFromZr(zr);
        }
    }

    /**
     * 动画
     *
     * @param path The key to fetch value from object. Mostly style or shape.
     * @param loop Whether to loop animation.
     * @param allowDiscreteAnimation Whether to allow discrete animation
     * @example:
     *     el.animate('style', false)
     *         .when(1000, {x: 10} )
     *         .done(function(){ // Animation done })
     *         .start()
     */
    animate(key?: string, loop?: boolean, allowDiscreteAnimation?: boolean) {
        let target = key ? (this as any)[key] : this;

        if (process.env.NODE_ENV !== 'production') {
            if (!target) {
                logError(
                    'Property "'
                    + key
                    + '" is not existed in element '
                    + this.id
                );
                return;
            }
        }

        const animator = new Animator(target, loop, allowDiscreteAnimation);
        key && (animator.targetName = key);
        this.addAnimator(animator, key);
        return animator;
    }

    addAnimator(animator: Animator<any>, key: string): void {
        const zr = this.__zr;

        const el = this;

        animator.during(function () {
            el.updateDuringAnimation(key as string);
        }).done(function () {
            const animators = el.animators;
            // FIXME Animator will not be removed if use `Animator#stop` to stop animation
            const idx = indexOf(animators, animator);
            if (idx >= 0) {
                animators.splice(idx, 1);
            }
        });

        this.animators.push(animator);

        // If animate after added to the zrender
        if (zr) {
            zr.animation.addAnimator(animator);
        }

        // Wake up zrender to start the animation loop.
        zr && zr.wakeUp();
    }

    updateDuringAnimation(key: string) {
        this.markRedraw();
    }

    /**
     * CAUTION: In practice, stop all animations may be unexpected in many scenarios,
     * e.g., some animations are started and managed by other modules.
     * @see ZR_ELEMENT_STOP_ANIMATION_ON_PROPS for a more precise alternative.
     *
     * @param forwardToLast Whether to move to last frame before stopping.
     */
    stopAnimation(scope?: string, forwardToLast?: boolean) {
        const animators = this.animators;
        const len = animators.length;
        const leftAnimators: Animator<any>[] = [];
        for (let i = 0; i < len; i++) {
            const animator = animators[i];
            if (!scope || scope === animator.scope) {
                animator.stop(forwardToLast);
            }
            else {
                leftAnimators.push(animator);
            }
        }
        this.animators = leftAnimators;

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
     *
     * CAUTION: @see ZR_ELEMENT_ANIMATE_TO_DONE_CB_ISSUE
     * CAUTION: Do not use `el.animateTo` together with `el.animate`, otherwise the result may be incorrect.
     */
    animateTo(
        target: Props, cfg?: ElementAnimateConfig, animationProps?: ElementAnimationProps<Props>
    ) {
        animateTo(this, target, cfg, animationProps);
    }

    /**
     * Animate from the target state to current state.
     * The params and the value are the same as `this.animateTo`.
     *
     * CAUTION: @see ZR_ELEMENT_ANIMATE_TO_DONE_CB_ISSUE
     * CAUTION: Do not use `el.animateFrom` together with `el.animate`, otherwise the result may be incorrect.
     */
    animateFrom(
        target: Props, cfg: ElementAnimateConfig, animationProps?: ElementAnimationProps<Props>
    ) {
        animateTo(this, target, cfg, animationProps, true);
    }

    protected _transitionState(
        stateName: string, target: Props, cfg?: ElementAnimateConfig, animationProps?: MapToType<Props, boolean>
    ) {
        const animators = animateTo(this, target, cfg, animationProps);
        for (let i = 0; i < animators.length; i++) {
            animators[i].__fromStateTransition = stateName;
        }
    }

    /**
     * Interface of getting the minimum bounding box.
     */
    getBoundingRect(): BoundingRect {
        return null;
    }

    getPaintRect(): BoundingRect {
        return null;
    }

    /**
     * The string value of `textPosition` needs to be calculated to a real postion.
     * For example, `'inside'` is calculated to `[rect.width/2, rect.height/2]`
     * by default. See `contain/text.js#calculateTextPosition` for more details.
     * But some custom shapes like "pin", "flag" have center that is not exactly
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
     *             align: string. optional. use style.textAlign by default.
     *             verticalAlign: string. optional. use style.textVerticalAlign by default.
     *         }
     */
    calculateTextPosition: ElementCalculateTextPosition;

    protected static initDefaultProps = (function () {
        const elProto = Element.prototype;
        elProto.type = 'element';
        elProto.name = '';

        elProto.ignore =
        elProto.silent =
        elProto.ignoreHostSilent =
        elProto.isGroup =
        elProto.draggable =
        elProto.dragging =
        elProto.ignoreClip = false;

        elProto.__inHover = IN_HOVER_LAYER_KIND_NO;

        elProto.__dirty = REDRAW_BIT;


        const logs: Dictionary<boolean> = {};
        function logDeprecatedError(key: string, xKey: string, yKey: string) {
            if (!logs[key + xKey + yKey]) {
                console.warn(`DEPRECATED: '${key}' has been deprecated. use '${xKey}', '${yKey}' instead`);
                logs[key + xKey + yKey] = true;
            }
        }
        // Legacy transform properties. position and scale
        function createLegacyProperty(
            key: string,
            privateKey: string,
            xKey: string,
            yKey: string
        ) {
            // eslint-disable-next-line @echarts-x/ec/no-props-polyfill-uncertain
            Object.defineProperty(elProto, key, {
                get() {
                    if (process.env.NODE_ENV !== 'production') {
                        logDeprecatedError(key, xKey, yKey);
                    }
                    if (!this[privateKey]) {
                        const pos: number[] = this[privateKey] = [];
                        enhanceArray(this, pos);
                    }
                    return this[privateKey];
                },
                set(pos: number[]) {
                    if (process.env.NODE_ENV !== 'production') {
                        logDeprecatedError(key, xKey, yKey);
                    }
                    this[xKey] = pos[0];
                    this[yKey] = pos[1];
                    this[privateKey] = pos;
                    enhanceArray(this, pos);
                }
            });
            function enhanceArray(self: any, pos: number[]) {
                // eslint-disable-next-line @echarts-x/ec/no-props-polyfill-uncertain
                Object.defineProperty(pos, 0, {
                    get() {
                        return self[xKey];
                    },
                    set(val: number) {
                        self[xKey] = val;
                    }
                });
                // eslint-disable-next-line @echarts-x/ec/no-props-polyfill-uncertain
                Object.defineProperty(pos, 1, {
                    get() {
                        return self[yKey];
                    },
                    set(val: number) {
                        self[yKey] = val;
                    }
                });
            }
        }
        if (Object.defineProperty
            // Just don't support ie8
            // && (!(env as any).browser.ie || (env as any).browser.version > 8)
        ) {
            createLegacyProperty('position', '_legacyPos', 'x', 'y');
            createLegacyProperty('scale', '_legacyScale', 'scaleX', 'scaleY');
            createLegacyProperty('origin', '_legacyOrigin', 'originX', 'originY');
        }
    })()
}

mixin(Element, Eventful);
mixin(Element, Transformable);


/**
 * @tutorial [ZR_ELEMENT_ANIMATE_TO_DONE_CB_ISSUE]:
 *  Do not use `done` and `aborted` callback unless you are fully aware the limitations under the current
 *  implementation.
 *  It is not intuitive for users to understand whether the previous `done`, `aborted` and `during` will be called
 *  after another call to `animateTo`. For example,
 *      ```ts
 *      function test1() {
 *          el.animateTo({scaleX: 5, x: 100, style: {opacity: 1}}, {duration: 3000, done: done1, aborted: aborted1});
 *          el.animateTo({scaleX: 50}, {duration: 3000, done: done2});
 *      } // Finally, only `done1` and `done2` are called.
 *      function test2() {
 *          el.animateTo({scaleX: 5, style: {opacity: 1}}, {duration: 3000, done: done1, aborted: aborted1});
 *          el.animateTo({scaleX: 50}, {duration: 3000, done: done2});
 *      } // Finally, only `done1` and `done2` are called.
 *      function test3() {
 *          el.animateTo({scaleX: 5}, {duration: 3000, done: done1, aborted: aborted1});
 *          el.animateTo({scaleX: 50}, {duration: 3000, done: done2});
 *      } // Finally, only `aborted1` and `done2` are called.
 *      ```
 *  This subtlety is likely to confuse users. To avoid this issue, a pattern can be used if `done`/`during` need
 *  to be used:
 *    - Ensure previous callbacks can be removed per call to `el.animateTo`/`el.animateFrom`, which can be achieved by
 *      - either ensure keys of props are always the same;
 *      - or always use `cleanCb: true`.
 *    - Do not use `aborted`.
 *    - Ensure `props` passed to `el.animateTo`/`el.animateForm` are not fully contained by `props` passed to
 *      `el.useState` (intersection is allowed). See DEFAULT_PATH_ANIMATION_PROPS. The reason is, `el.useState`
 *      does not support callback and should not use `cleanCb: true`. Callbacks provided by
 *      `el.animateTo`/`el.animateFrom` may be discarded by a subsequent call to `el.useState` if `props` are fully
 *      contained, even if `cleanCb: false`.
 *  @test <zrender/test/animation-api-cases.html>
 *
 *
 * @tutorial [ZR_ELEMENT_ANIMATION_CALLBACK_WHEN_NO_ANIMATION]:
 *  Caller's code arrangement may be affected by the following difference:
 *  - If `cfg.force` is a falsy value (the default):
 *    In some cases animators are not created (e.g., when target values are the same as the initial values, or
 *    animation is disabled by `animationProps`). In this cases, `done` and `during` (with `rawPercent: 1`) are called
 *    immediately in the call to `el.animateTo`/`el.animateFrom`. This is a historical behavior; we keep compatible.
 *  - Otherwise (if `cfg.force` is a truthy value):
 *    At least one animator is created, and `done` and `during` are not called immediately, but are called when the
 *    clip of the animator is handled, typically in next frames.
 *    There are additional nuances in this case:
 *    - If the animation is disabled by ELEMENT_ANIMATION_PROPS_NONE:
 *      `during` is called only once, and `rawPercent: 1` is passed. Otherwise, calls to `during` with `rawPercent`
 *      less then `1` is inconsistent with the semantics of "no animation", and cause unexpected effect if `during`
 *      is used to update other elements.
 *    - Otherwise:
 *      `during` is called normally with percent increasing gradually. This feature can be used to create an
 *      animator and handle all updates in `during`.
 *
 *
 * @tutorial [ZR_ELEMENT_STOP_ANIMATION_ON_PROPS]:
 *  - [ZR_ELEMENT_ANIMATE_RETARGET_EXISTING_ANIMATION]:
 *    ```js
 *    el.animateTo({x: 100}, {during: 1000});
 *    // Then animation on `x` is started.
 *    el.animateTo({x: 200}, {during: 1000});
 *    // Then the existing animations on `x` are retargetd.
 *    // That is, a new animator are created (based on the current and target value),
 *    // and `x` is removed from the existing animator.
 *    ```
 *  - [ZR_ELEMENT_ANIMATE_CURRENT_TARGET_VALUE_THE_SAME]:
 *    If `force` is falsy, animation will not be created if the current value and the target value are the same.
 *    `done` and `during(1)` will be called immediately. This is a historicall behavior and keep compatible.
 *    PENDING:
 *      One except is 2d Array does not perform this comparison. This is a historical behavior. However it affects
 *      the timing of callback `done` and `during(1)` invocation, which may confuse users.
 *  - [ELEMENT_ANIMATION_PROPS_NONE]:
 *    To stop animations of specific props while allowing other animations to continue, we can simply
 *    Pass ELEMENT_ANIMATION_PROPS_NONE to `animationProps`. This approach is more precise than `el.stopAnimation()`.
 *      - el.animateTo(props, cfg, ELEMENT_ANIMATION_PROPS_NONE);
 *        Values in `props` are assigned to `el` immediately, and existing animations on `props` are stopped.
 *      - el.animateFrom(props, cfg, ELEMENT_ANIMATION_PROPS_NONE);
 *        `el` retains its current values, and existing animations on `props` are stopped.
 *        In this case, only keys in `props` are used.
 *    For example,
 *      ```js
 *      el.animateTo({x: 10, style: {opacity: 1}}, null, ELEMENT_ANIMATION_PROPS_NONE);
 *      // NOTE: `duration` can be omitted if passing ELEMENT_ANIMATION_PROPS_NONE.
 *      ```
 *  - [ZR_ELEMENT_ANIMATE_PROP_NULL_UNDEFINED]:
 *    If the target value or the current value is null/undefined (non-animatable), animations are not created and
 *    existing animations on these props (if any) will be stopped.
 *    ```js
 *    el.animateTo({shape: {__myPts: [[111, 3], [222, 5]]}}, {duration: 300});
 *    // Previously, `__myPts` is `undefined`. Therefore, the new value is assigned directly and
 *    // no animation is created.
 *    el.animateTo({shape: {__myPts: [[151, 37], [252, 57]]}}, {duration: 300});
 *    // Animation on `__myPts` is created.
 *    el.animateTo({shape: {__myPts: null}, {duration: 300});
 *    // `__myPts` is directly set to `null` and the existing animation is stopped and discarded.
 *    ```
 *  - NOTICE:
 *    - `cfg.additive` must be falsy, otherwise nothing can be stopped.
 *    - Callbacks (`done`, `aborted`, `during`) will be called normally if provided,
 *      - `cfg.force: true`: they are called in an later frame.
 *      - Otherwise, they are called immediately in this frame.
 *  - IMPL_MEMO:
 *    - The following sentences behave the same way:
 *      ```js
 *      el.animateTo({x: 10, style: {opacity: 1}}, null, ELEMENT_ANIMATION_PROPS_NONE);
 *      el.animateTo({x: 10, style: {opacity: 1}}, null, {style: {}});
 *      // NOTE: When indending to disable all animations, if using empty objects instead of
 *      // ELEMENT_ANIMATION_PROPS_NONE, every level needs an empty object, which is inconvenient.
 *      ```
 *    - `duration: 0` does not necessarily behave the same way as ELEMENT_ANIMATION_PROPS_NONE.
 *      ```ts
 *      // `x` will be changed immediately:
 *      el.animateTo({x: 10}, null, ELEMENT_ANIMATION_PROPS_NONE);
 *      // `x` will be modified to the final value in the next frame, rather than changing immediately:
 *      el.animateTo({x: 10}, {duration: 0});
 *      // `x` will be modified to the final value in a frame after 1000ms:
 *      el.animateTo({x: 10}, {duration: 0, delay: 1000});
 *      // `x` will be modified to the final value immediately, but animators may still be created, although
 *      // effectively not necessary - there is no special optimization for `duration: 0, delay: 0, setToFinal: true`,
 *      // since we opt to support ELEMENT_ANIMATION_PROPS_NONE.
 *      el.animateTo({x: 10}, {duration: 0, setToFinal: true});
 *      ```
 *  @test <zrender/test/animation-api-cases.html>
 *
 *
 * @tutorial [ZR_ELEMENT_ANIMATE_PROP_OBJECT_REFERENCE_CHANGE]
 *  ```js
 *  const points1 = [[11, 3], [21, 5], [31, 7]];
 *  const points2 = [[311, 33], [321, 35], [331, 37]];
 *  el.setShape({points: points1});
 *  el.animateTo({shape: {points: points2}}, cfg); // or `el.animateFrom`
 *  // Then `el.shape.points` may be `points1` or `points2` - this is not garanteed.
 *  // But thereafter, `el.shape.points` will never change to another object if no more explicit call.
 *  // That is, the animating value of `el.shape.points` can be used externally.
 *  // For example, shared by another element:
 *  const el2 = new Polygon({shape: {points: el.shape.points}});
 *  ```
 *
 *
 * @tutorial [ZR_SYNC_MULTIPLE_ANIMATIONS]
 *  If intending to update other elements in multiple `during`s, `SBarrier` can be used to sync them.
 */
function animateTo<Props>(
    animatable: Element<Props>,
    target: Dictionary<any>,
    cfg: ElementAnimateConfig,
    // @see ZR_ELEMENT_STOP_ANIMATION_ON_PROPS
    animationProps: ElementAnimationProps<Props>,
    reverse?: boolean
) {
    cfg = cfg || {};

    if (cfg.cleanCb) {
        const existingAnimators = animatable.animators;
        for (let i = 0; i < existingAnimators.length; i++) {
            existingAnimators[i].cleanCb();
        }
    }

    let duration = cfg.duration;
    if (duration == null) {
        duration = animationProps !== ELEMENT_ANIMATION_PROPS_NONE ? 500 : 0;
    }
    if (!duration) {
        // In practice, animation frame time gap is typically greater or equal than 16ms.
        // So we use a small positive duration (`1`) instead of `0`. Otherwise, we have
        // to handle `0` duration everywhere (e.g., when calculating percent or interpolation).
        // And this strategy is fine since no need to be precise here.
        // NOTICE: `1` is also smaller than the default `ZRender['_sleepAfterStill']`, otherwise
        // the `during` may not be called when ELEMENT_ANIMATION_PROPS_NONE is used.
        duration = 1;
    }

    const newAnimators: Animator<any>[] = [];
    animateToShallow(
        animatable,
        '', // topmost `topKey` must be '', which is used in test cases.
        animatable,
        target,
        cfg,
        duration,
        animationProps,
        newAnimators,
        reverse
    );

    let newAnimatorsLength = newAnimators.length;
    const cfgDone = cfg.done;
    const cfgAborted = cfg.aborted;
    const cfgDuring = cfg.during;

    if (!newAnimatorsLength) {
        // @see ZR_ELEMENT_ANIMATION_CALLBACK_WHEN_NO_ANIMATION
        cfgDuring && cfgDuring(1, 1);
        cfgDone && cfgDone();
        return newAnimators;
    }

    const cbDoneAborted = (cfgDone || cfgAborted)
        ? animateToCreateDoneAbortedCb(cfg, newAnimatorsLength)
        : null;
    const cbDuring = cfgDuring
        ? animateToCreateDuringCb(cfg)
        : null;

    // Start after all animators created
    // Incase any animator is done immediately when all animation properties are not changed
    for (let i = 0; i < newAnimatorsLength; i++) {
        const animator = newAnimators[i];

        if (process.env.NODE_ENV !== 'production') {
            // Using `__aTDn` `__aTAb` `__aTDr` is based on the fact that residual animators
            // never enter this code.
            assert(!animator.__aTDn && !animator.__aTAb && !animator.__aTDr);
        }
        if (cbDoneAborted) {
            animator.done(animator.__aTDn = cbDoneAborted.dn);
            animator.aborted(animator.__aTAb = cbDoneAborted.ab);
        }
        if (cfgDuring) {
            // If `newAnimators[0]` is removed in future, a next `animator` in `newAnimators`
            // will be found to carry `cbDuring` (see `animateToChooseNextDuringOwner`).
            animator.__aTDr = cbDuring;
            if (i === 0) {
                animator.during(cbDuring);
                animator.__aTDrOw = true;
            }
        }

        if (cfg.force) {
            animator.duration(duration);
        }

        animator.start(cfg.easing);
    }

    return newAnimators;
}

function animateToCreateDoneAbortedCb(cfg: ElementAnimateConfig, finishCount: number) {
    const cfgDone = cfg.done;
    const cfgAborted = cfg.aborted;
    let doneHappened = false;

    function doneCb() {
        doneHappened = true;
        abortedOrDoneCb();
    };
    doneCb.__zrAniTo = true;

    function abortedOrDoneCb() {
        finishCount--;
        if (finishCount <= 0) {
            doneHappened
                ? (cfgDone && cfgDone())
                : (cfgAborted && cfgAborted());
        }
    };
    abortedOrDoneCb.__zrAniTo = true;

    return {dn: doneCb, ab: abortedOrDoneCb};
}

function animateToCreateDuringCb<Props>(cfg: ElementAnimateConfig) {
    const cfgDuring = cfg.during;
    function duringCb(target: Element<Props>, percent: number, rawPercent: number): void {
        // Considering part of animators may be discarded by later `el.animateTo`/`el.animateFrom`,
        // during is added to every animators, and `cfg.during` should be triggered only once
        // for each `rawPercent`.
        cfgDuring(percent, rawPercent);
    }
    duringCb.__zrAniTo = true;

    return duringCb;
}

function isValueSame(val1: any, val2: any) {
    return val1 === val2
        // Only check 1 dimension array
        || isArrayLike(val1) && isArrayLike(val2) && is1DArraySame(val1, val2);
    // PENDING: 2d array behave differently? @see ZR_ELEMENT_ANIMATE_CURRENT_TARGET_VALUE_THE_SAME
}

function is1DArraySame(arr0: ArrayLike<number>, arr1: ArrayLike<number>) {
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

function animateToShallow<Props>(
    animatable: Element<Props>,
    topKey: string,
    animateObj: Dictionary<any>,
    target: Dictionary<any>,
    cfg: ElementAnimateConfig,
    // `cfg.duration` should not be used in this method.
    duration: ElementAnimateConfig['duration'],
    animationProps: ElementAnimationProps<Props>,
    // Output. All new added animators.
    newAnimators: Animator<any>[],
    // If `true`, animate from the `target` to current state.
    reverse: boolean
): void {
    // IMPL_NOTE:
    //  - animators are organized according to `animateObj` object tree.
    //    e.g., animateObj: {x: 100, y: 200, style: {opacity: 1}, shape: {width: 20}}
    //    The finally created animators can be:
    //    [
    //      animator0, // For style.opacity; targetName (topKey) is 'style'.
    //      animator1, // For shape.x, shape.y; targetName (topKey) is 'shape'.
    //      animator2, // For x, y; targetName (topKey) is ''.
    //    ]
    //  - `existingAnimators` may have more than one animators for a specific `topKey`. e.g.,
    //      el.animateTo({x: 1, y:2, scaleX: 3});
    //      el.animateTo({x: 10, y:20});
    //      el.animateTo({x: 100});
    //    Then more than one animators with `topKey: ''` exist in `existingAnimators`.

    const targetKeys = keys(target);

    const delay = cfg.delay;
    const additive = cfg.additive;
    const setToFinal = cfg.setToFinal;
    const existingAnimators = animatable.animators;
    const animateByDict = isObject(animationProps);

    let animationKeys: string[] = [];
    const stopKeys: string[] = [];
    const isOutermostLevel = !topKey;

    for (let k = 0; k < targetKeys.length; k++) {
        const innerKey = targetKeys[k] as string;
        const targetVal = target[innerKey];
        let directlyAssignAndStop = false;

        const animateOnInnerKey =
            animateByDict ? (animationProps as Dictionary<any>)[innerKey]
            // Otherwise, determine whether to animate all given props or animate nothing.
            // ELEMENT_ANIMATION_PROPS_NONE may need to be passed to `animateToShallow` recursively.
            : animationProps === ELEMENT_ANIMATION_PROPS_NONE ? ELEMENT_ANIMATION_PROPS_NONE
            // The outermost level have a different behavior. See the reason in
            // the comments of `ElementAnimationProps`.
            : (isOutermostLevel || !!animationProps);

        if (isObject(targetVal)
            && !isArrayLike(targetVal)
            && !isGradientObject(targetVal)
        ) {
            if (// logError('Only support 1 depth nest object animation.');
                // TODO richText?
                !isOutermostLevel
                // PENDING: Theoretically, direct assign is invalid here for cases like
                // `animateObj['style'] == null`, but we still retain this logic for backward compatibility.
                || animateObj[innerKey] == null
            ) {
                directlyAssignAndStop = true;
            }
            else {
                animateToShallow(
                    animatable,
                    innerKey,
                    animateObj[innerKey],
                    targetVal,
                    cfg,
                    duration,
                    animateOnInnerKey,
                    newAnimators,
                    reverse
                );
            }
        }
        else if (
            targetVal != null
            && animateObj[innerKey] != null
            && animateOnInnerKey
        ) {
            // In this case, animation (newly added or retarget) can be performed
            // (if the following other conditions are satisfied).
            animationKeys.push(innerKey);
            stopKeys.push(innerKey);
        }
        else {
            directlyAssignAndStop = true;
        }

        if (directlyAssignAndStop) {
            if (!reverse) {
                // In this case no animation should occur; set to the target value directly.
                animateObj[innerKey] = targetVal;
                animatable.updateDuringAnimation(topKey);
            }
            stopKeys.push(innerKey);
        }
    }

    // Stop previous animations on the relevant props.
    if (!additive && stopKeys.length) {
        // Stop existing animators on specific properties. Ensure a property is handled by no more than one animator.
        for (let i = existingAnimators.length - 1; i >= 0; i--) {
            const animator = existingAnimators[i];
            // Different levels of `topKey`s are mutually distinct by coincidence, thereby only comparing `topKey`.
            if (animator.targetName === topKey
                && animator.stopTracks(stopKeys) // return true if all tracks are aborted.
            ) {
                existingAnimators.splice(i, 1);
                animateToChooseNextDuringOwner(animator, existingAnimators);
            }
        }
    }

    // Ignore values not changed.
    // NOTE: Must filter it after previous animation stopped
    // and make sure the value to compare is using initial frame if animation is not started yet when setToFinal is used.
    if (!cfg.force) {
        animationKeys = filter(animationKeys, function (key) {
            return !isValueSame(target[key], animateObj[key]);
        });
    }
    const keyLen = animationKeys.length;

    if (keyLen > 0
        // `cfg.force` is mainly used for invoking `during` and `done` callback even if animation is not necessary.
        // At least one animator should be added for this purpose. `!animators.length` means only add that
        // animator once.
        || (cfg.force && !newAnimators.length)
    ) {
        let revertedSource: Dictionary<any>;
        let reversedTarget: Dictionary<any>;
        let sourceClone: Dictionary<any>;
        if (reverse) {
            reversedTarget = {};
            if (setToFinal) {
                revertedSource = {};
            }
            for (let i = 0; i < keyLen; i++) {
                const innerKey = animationKeys[i];
                reversedTarget[innerKey] = animateObj[innerKey];
                if (setToFinal) {
                    revertedSource[innerKey] = target[innerKey];
                }
                else {
                    // The usage of "animateFrom" expects that the element props has been updated directly to
                    // "final" values outside, and input the "from" values here (i.e., in variable `target` here).
                    // So here we assign the "from" values directly to element here (rather that in the next frame)
                    // to prevent the "final" values from being read in any other places (like other running
                    // animator during callbacks).
                    // But if `setToFinal: true` this feature can not be satisfied.
                    animateObj[innerKey] = target[innerKey];
                }
            }
        }
        else if (setToFinal) {
            sourceClone = {};
            for (let i = 0; i < keyLen; i++) {
                const innerKey = animationKeys[i];
                // NOTE: Must clone source after the stopTracks. The property may be modified in stopTracks.
                sourceClone[innerKey] = copyAnimatableValue(null, animateObj[innerKey]);
                // Use copy, not change the original reference
                // Copy from target to source.
                animateObj[innerKey] = copyAnimatableValue(animateObj[innerKey], target[innerKey]);
            }
        }

        const animator = new Animator(animateObj, false, false, additive ? filter(
            existingAnimators,
            // Use key string instead object reference because ref may be changed.
            function (animator) {
                return animator.targetName === topKey;
            }
        ) : null, animationProps === ELEMENT_ANIMATION_PROPS_NONE);

        animator.targetName = topKey;
        if (cfg.scope) {
            animator.scope = cfg.scope;
        }

        if (setToFinal && revertedSource) {
            animator.whenWithKeys(0, revertedSource, animationKeys);
        }
        if (sourceClone) {
            animator.whenWithKeys(0, sourceClone, animationKeys);
        }

        animator.whenWithKeys(
            duration,
            reverse ? reversedTarget : target,
            animationKeys
        ).delay(delay || 0);

        animatable.addAnimator(animator, topKey);
        newAnimators.push(animator);
    }
}

function animateToChooseNextDuringOwner(
    removedOwner: Animator<Element>,
    existingAnimators: Animator<Element>[]
): void {
    if (!removedOwner.__aTDrOw) {
        return;
    }
    const duringCb = removedOwner.__aTDr;
    for (let j = 0; j < existingAnimators.length; j++) {
        if (existingAnimators[j].__aTDr === duringCb) {
            existingAnimators[j].during(duringCb);
            existingAnimators[j].__aTDrOw = true;
            return;
        }
    }
}

function shouldUseHoverLayer(
    el: Element,
    textContent: Element,
    nextState: ElementState,
    forceUseHoverLayer: boolean
): InHoverLayerKind {
    return (
            !((nextState && nextState.hoverLayer) || forceUseHoverLayer)
            // PENDING: See HOVER_LAYER_CONSTRAINTS_TEXT for the reasons.
            || isTextRelatedEl(el)
            || (textContent && isTextRelatedEl(textContent))
        )
        ? IN_HOVER_LAYER_KIND_NO
        // If using haver layer and previously it is not in a hover layer and invisible.
        // PENDING: See HOVER_LAYER_CONSTRAINTS_TEXT for the reasons.
        // : (!el.__inHover && (el.ignore || (el as DisplayableProps).invisible))
        // ? IN_HOVER_LAYER_KIND_NO_LIMIT
        // Otherwise (typically, perviously anything has been painted on the original layer),
        // only styles can be modified. See more detailed reasons in `HOVER_LAYER_CONSTRAINTS`.
        : IN_HOVER_LAYER_KIND_ONLY_STYLE_CHANGE;
}

function isTextRelatedEl(el: Element<ElementProps>): boolean {
    return el.type === 'text' || el.type === 'tspan';
}


function canTransition(
    el: Element,
    noAnimation: boolean,
    animationCfg: ElementAnimateConfig
): boolean {
    return !noAnimation && !el.__inHover && animationCfg && animationCfg.duration > 0;
}


export default Element;
