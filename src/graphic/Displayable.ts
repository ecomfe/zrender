/**
 * Base class of all displayable graphic objects
 * @module zrender/graphic/Displayable
 */

import Element, {ElementOption} from '../Element';
import BoundingRect, { RectLike } from '../core/BoundingRect';
import { Dictionary, PropType, AllPropTypes } from '../core/types';
import Path from './Path';
import { calculateTextPosition, RichTextContentBlock, PlainTextContentBlock } from '../container/helper/text';

type CalculateTextPositionResult = ReturnType<typeof calculateTextPosition>

export interface DisplayableOption extends ElementOption {
    style?: Dictionary<any>

    zlevel?: number
    z?: number
    z2?: number

    culling?: boolean

    // TODO list all cursors
    cursor?: string

    rectHover?: boolean

    progressive?: boolean

    incremental?: boolean
}

type DisplayableKey = keyof DisplayableOption
type DisplayablePropertyType = PropType<DisplayableOption, DisplayableKey>

export default class Displayable extends Element {

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

    style: Dictionary<any>

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
    __svgEl: SVGElement
    __tspanList: SVGTSpanElement[]
    __canCacheByTextString: boolean
    __text: string

    constructor(opts?: DisplayableOption, defaultStyle?: Dictionary<any>) {
        super(opts);

        this.attr(opts);

        if (!this.style) {
            // Create an empty style object.
            this.useStyle({});
        }

        if (defaultStyle) {
            for (let key in defaultStyle) {
                if (!(opts && opts.style && opts.style[key])) {
                    (this.style as any)[key] = defaultStyle[key];
                }
            }
        }
    }

    // Hook provided to developers.
    beforeBrush() {}
    afterBrush() {}

    // Hook provided to inherited classes.
    innerBeforeBrush() {}
    innerAfterBrush() {}

    /**
     * If displayable element contain coord x, y
     */
    contain(x: number, y: number) {
        return this.rectContain(x, y);
    }

    traverse<T>(
        cb: (this: T, el: Displayable) => void,
        context: T
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
            super.attrKV(key as keyof ElementOption, value);
        }
        else {
            if (!this.style) {
                this.useStyle(value as Dictionary<any>);
            }
            else {
                this.style.set(value as Dictionary<any>);
            }
        }
    }

    setStyle(obj: Dictionary<any>): void
    setStyle(obj: string, value: any): void
    setStyle(obj: string | Dictionary<any>, value?: any) {
        if (typeof obj === 'string') {
            this.style[obj] = value;
        }
        else {
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    this.style[key] = obj[key];
                }
            }
        }
        this.dirty(false);
        return this;
    }

    /**
     * Use given style object
     */
    useStyle(obj: Dictionary<any>) {
        this.style = obj;
    }

    /**
     * The string value of `textPosition` needs to be calculated to a real postion.
     * For example, `'inside'` is calculated to `[rect.width/2, rect.height/2]`
     * by default. See `contain/text.js#calculateTextPosition` for more details.
     * But some coutom shapes like "pin", "flag" have center that is not exactly
     * `[width/2, height/2]`. So we provide this hook to customize the calculation
     * for those shapes. It will be called if the `style.textPosition` is a string.
     * @param out Prepared out object. If not provided, this method should
     *        be responsible for creating one.
     * @param style
     * @param rect {x, y, width, height}
     * @return out The same as the input out.
     *         {
     *             x: number. mandatory.
     *             y: number. mandatory.
     *             textAlign: string. optional. use style.textAlign by default.
     *             textVerticalAlign: string. optional. use style.textVerticalAlign by default.
     *         }
     */
    calculateTextPosition: (out: CalculateTextPositionResult, style: Dictionary<any>, rect: RectLike) => CalculateTextPositionResult


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