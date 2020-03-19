/**
 * Base class of all displayable graphic objects
 * @module zrender/graphic/Displayable
 */

import Element, {ElementProps} from '../Element';
import BoundingRect, { RectLike } from '../core/BoundingRect';
import { PropType, AllPropTypes, Dictionary } from '../core/types';
import Path from './Path';
import { easingType } from '../animation/easing';
import { extend, changePrototype } from '../core/util';

// type CalculateTextPositionResult = ReturnType<typeof calculateTextPosition>

export interface CommonStyleProps {
    shadowBlur?: number
    shadowOffsetX?: number
    shadowOffsetY?: number
    shadowColor?: string

    opacity?: number
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
     */
    blend?: string
}

export const DEFAULT_COMMON_STYLE: CommonStyleProps = {
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowColor: '#000',
    opacity: 1,
    blend: 'source-over'
}

export interface DisplayableProps extends ElementProps {
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

    batch?: boolean
    invisible?: boolean
}

type DisplayableKey = keyof DisplayableProps
type DisplayablePropertyType = PropType<DisplayableProps, DisplayableKey>

class Displayable<Props extends DisplayableProps = DisplayableProps> extends Element<Props> {

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
    /**
     * If element can be batched
     */
    batch: boolean

    style: Dictionary<any>

    __dirtyStyle: boolean

    protected _rect: BoundingRect

    /************* Properties will be inejected in other modules. *******************/

    // Shapes for cascade clipping.
    // Can only be `null`/`undefined` or an non-empty array, MUST NOT be an empty array.
    // because it is easy to only using null to check whether clipPaths changed.
    __clipPaths: Path[]

    // FOR HOVER Connections for hovered elements.
    __hoverMir: Displayable
    __from: Displayable

    // FOR SVG PAINTER
    __svgEl: SVGElement

    // FOR ECHARTS
    /**
     * hoverStyle will be set in echarts.
     */
    hoverStyle: Dictionary<any>
    /**
     * If use individual hover layer. It is set in echarts
     */
    useHoverLayer: boolean

    constructor(opts?: Props, defaultStyle?: Props['style']) {
        super(opts);

        // this.attr(opts);

        // Extend properties
        // No deep clone.
        // So if property value is an object like shape. please do not reuse.
        for (var name in opts) {
            if (opts.hasOwnProperty(name)) {
                if (name === 'style') {
                    this.useStyle(opts.style);
                }
                else {
                    (this as any)[name] = (opts as Dictionary<any>)[name];
                }
            }
        }

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
    // Executed between beforeBrush / afterBrush
    innerBeforeBrush() {}
    innerAfterBrush() {}

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
     * Alias for animate('style')
     * @param loop
     */
    animateStyle(loop: boolean) {
        return this.animate('style', loop);
    }

    // Override updateDuringAnimation
    updateDuringAnimation(targetKey: string) {
        if (targetKey === 'style') {
            this.dirtyStyle();
        }
        else {
            this.dirty();
        }
    }

    attrKV(key: DisplayableKey, value: DisplayablePropertyType) {
        if (key !== 'style') {
            super.attrKV(key as keyof DisplayableProps, value);
        }
        else {
            if (!this.style) {
                this.useStyle(value as Dictionary<any>);
            }
            else {
                this.setStyle(value as Dictionary<any>);
            }
        }
    }

    setStyle(obj: Props["style"]): void
    setStyle(obj: keyof Props["style"], value: Props["style"]): void
    setStyle(obj: keyof Props["style"] | Props["style"], value?: AllPropTypes<Props["style"]>) {
        if (typeof obj === 'string') {
            this.style[obj] = value;
        }
        else {
            for (let key in obj as Props["style"]) {
                if (obj.hasOwnProperty(key)) {
                    this.style[key] = (obj as Props["style"])[key];
                }
            }
        }
        this.dirtyStyle();
        return this;
    }

    dirtyStyle() {
        this.__dirtyStyle = true;
        this.dirty();
        // Clear bounding rect.
        this._rect = null;
    }

    /**
     * Use given style object
     */
    useStyle(obj: Props["style"], inherited?: Props["style"]) {
        if (inherited) {
            // inherited value can be accessed from prototype
            this.style = changePrototype(obj, inherited);
        }
        else {
            this.style = obj;
        }
        this.dirtyStyle();
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
    // calculateTextPosition: (out: CalculateTextPositionResult, style: Dictionary<any>, rect: RectLike) => CalculateTextPositionResult


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
        dispProto.batch = false;
        dispProto._rect = null;

        dispProto.__dirtyStyle = true;
    })()
}

export default Displayable;