/**
 * Base class of all displayable graphic objects
 * @module zrender/graphic/Displayable
 */


import Style, {StyleProps} from './Style';
import Element, {ElementProps} from '../Element';
import BoundingRect, { RectLike } from '../core/BoundingRect';
import { Dictionary, PropType, AllPropTypes } from '../core/types';
import Path from './Path';
import * as textHelper from './helper/text';
import {WILL_BE_RESTORED} from './constant';
import { calculateTextPosition, RichTextContentBlock, PlainTextContentBlock } from '../contain/text';

type CalculateTextPositionResult = ReturnType<typeof calculateTextPosition>

export interface DisplayableProps extends ElementProps {
    style?: StyleProps

    zlevel?: number
    z?: number
    z2?: number

    culling?: boolean

    // TODO list all cursors
    cursor?: string

    rectHover?: boolean

    progressive?: boolean

    incremental?: boolean

    invisible?: boolean
}

type DisplayableKey = keyof DisplayableProps
type DisplayablePropertyType = PropType<DisplayableProps, DisplayableKey>

type StyleKeys = keyof StyleProps

const tmpRect = new BoundingRect();

export default class Displayable<Props extends DisplayableProps = DisplayableProps> extends Element<Props> {

    /**
     * Whether the displayable object is visible. when it is true, the displayable object
     * is not drawn, but the mouse event can still trigger the object.
     */
    invisible: boolean

    z: number

    z2: number

    /**
     * The z level determines the displayable object can be drawn in which layer canvas.
     */
    zlevel: number

    /**
     * If enable culling
     */
    culling: boolean

    /**
     * Mouse cursor when hovered
     */
    cursor: string

    /**
     * If hover area is bounding rect
     */
    rectHover: boolean
    /**
     * For increamental rendering
     */
    incremental: boolean

    style: Style

    protected _rect: BoundingRect

    /************* Properties will be inejected in other modules. *******************/

    // Shapes for cascade clipping.
    // Can only be `null`/`undefined` or an non-empty array, MUST NOT be an empty array.
    // because it is easy to only using null to check whether clipPaths changed.
    __clipPaths: Path[]

    // FOR TEXT
    __dirtyText = false
    __textCotentBlock: RichTextContentBlock | PlainTextContentBlock
    __computedFont: string
    __styleFont: string

    // FOR HOVER Connections for hovered elements.
    __hoverMir: Displayable
    __from: Displayable

    // FOR SVG PAINTER
    __textSvgEl: SVGElement
    __svgEl: SVGElement
    __tspanList: SVGTSpanElement[]
    __canCacheByTextString: boolean
    __text: string

    // FOR ECHARTS
    /**
     * hoverStyle will be set in echarts.
     */
    hoverStyle: StyleProps
    /**
     * If use individual hover layer. It is set in echarts
     */
    useHoverLayer: boolean

    constructor(opts?: Props, defaultStyle?: Props['style']) {
        super(opts);

        this.attr(opts);

        if (!this.style) {
            // Create an empty style object.
            this.useStyle({});
        }

        if (defaultStyle) {
            for (let key in defaultStyle) {
                if (!(opts && opts.style && opts.style[key as StyleKeys])) {
                    (this.style as any)[key] = defaultStyle[key as StyleKeys];
                }
            }
        }
    }

    beforeBrush(ctx: CanvasRenderingContext2D) {}

    afterBrush(ctx: CanvasRenderingContext2D) {}

    /**
     * Graphic drawing method.
     */
    // Interface
    brush(ctx: CanvasRenderingContext2D, prevEl?: Displayable) {}

    /**
     * If displayable element contain coord x, y
     */
    contain(x: number, y: number) {
        return this.rectContain(x, y);
    }

    traverse<Context>(
        cb: (this: Context, el: Displayable<Props>) => void,
        context?: Context
    ) {
        cb.call(context, this);
    }

    /**
     * If bounding rect of element contain coord x, y
     */
    rectContain(x: number, y: number) {
        const coord = this.transformCoordToLocal(x, y);
        const rect = this.getBoundingRect();
        return rect.contain(coord[0], coord[1]);
    }

    /**
     * Mark displayable element dirty and refresh next frame
     */
    dirty(dirtyShape?: boolean) {
        this.__dirty = this.__dirtyText = true;
        this._rect = null;
        this.__zr && this.__zr.refresh();
    }

    /**
     * If displayable object binded any event
     * @return {boolean}
     */

    /**
     * Alias for animate('style')
     * @param {boolean} loop
     */
    animateStyle(loop: boolean) {
        return this.animate('style', loop);
    }

    attrKV(key: DisplayableKey, value: DisplayablePropertyType) {
        if (key !== 'style') {
            super.attrKV(key as keyof ElementProps, value);
        }
        else {
            if (!this.style) {
                this.useStyle(value as Props['style']);
            }
            else {
                this.style.set(value as Props['style']);
            }
        }
    }
    setStyle(key: Props['style']): this
    setStyle(key: keyof Props['style'], value?: AllPropTypes<Props['style']>): this
    setStyle(key: Props['style'] | keyof Props['style'], value?: AllPropTypes<Props['style']>): this {
        this.style.set(key as keyof StyleProps, value);
        this.dirty(false);
        return this;
    }

    /**
     * Use given style object
     */
    useStyle(obj: Props['style']) {
        this.style = new Style(obj);
        this.dirty(false);
        return this;
    }

    /**
     * Draw text in a rect with specified position.
     * @param  {CanvasRenderingContext2D} ctx
     * @param  {Object} rect Displayable rect
     */
    drawRectText(ctx: CanvasRenderingContext2D, rect: RectLike) {
        const style = this.style;

        rect = style.textRect || rect;

        // Optimize, avoid normalize every time.
        this.__dirty && textHelper.normalizeTextStyle(style);

        let text = style.text;

        // Convert to string
        text != null && (text += '');

        if (!textHelper.needDrawText(text, style)) {
            return;
        }

        // FIXME
        // Do not provide prevEl to `textHelper.renderText` for ctx prop cache,
        // but use `ctx.save()` and `ctx.restore()`. Because the cache for rect
        // text propably break the cache for its host elements.
        ctx.save();

        // Transform rect to view space
        const transform = this.transform;
        if (!style.transformText) {
            if (transform) {
                tmpRect.copy(rect);
                tmpRect.applyTransform(transform);
                rect = tmpRect;
            }
        }
        else {
            this.setTransform(ctx);
        }

        // transformText and textRotation can not be used at the same time.
        textHelper.renderText(this as unknown as Displayable, ctx, text, style, rect, WILL_BE_RESTORED);

        ctx.restore();
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
    calculateTextPosition: (out: CalculateTextPositionResult, style: StyleProps, rect: RectLike) => CalculateTextPositionResult


    protected static initDefaultProps = (function () {
        const dispProto = Displayable.prototype;
        dispProto.type = 'displayable';
        dispProto.invisible = false;
        dispProto.z = 0;
        dispProto.z2 = 0;
        dispProto.zlevel = 0;
        dispProto.culling = false;
        dispProto.cursor = 'pointer';
        dispProto.rectHover = false;
        dispProto.incremental = false;
        dispProto._rect = null;
        dispProto.__dirtyText = false;
    })()
}