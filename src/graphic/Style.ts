
import fixShadow from './helper/fixShadow';
import {ContextCachedBy} from './constant';
import { RectLike } from '../core/BoundingRect';
import Displayable from './Displayable';
import { VectorArray } from '../core/vector';
import { Dictionary, PropType, TextVerticalAlign, ImageLike, TextAlign, ZRCanvasRenderingContext } from '../core/types';
import { LinearGradientObject } from './LinearGradient';
import { RadialGradientObject } from './RadialGradient';
import Path from './Path';
import { PatternObject } from './Pattern';
import { GradientObject } from './Gradient';

const STYLE_COMMON_PROPS = [
    ['shadowBlur', 0], ['shadowOffsetX', 0], ['shadowOffsetY', 0], ['shadowColor', '#000'],
    ['lineCap', 'butt'], ['lineJoin', 'miter'], ['miterLimit', 10]
];

// const SHADOW_PROPS = STYLE_COMMON_PROPS.slice(0, 4);
// const LINE_PROPS = STYLE_COMMON_PROPS.slice(4);

function createLinearGradient(ctx: CanvasRenderingContext2D, obj: LinearGradientObject, rect: RectLike) {
    let x = obj.x == null ? 0 : obj.x;
    let x2 = obj.x2 == null ? 1 : obj.x2;
    let y = obj.y == null ? 0 : obj.y;
    let y2 = obj.y2 == null ? 0 : obj.y2;

    if (!obj.global) {
        x = x * rect.width + rect.x;
        x2 = x2 * rect.width + rect.x;
        y = y * rect.height + rect.y;
        y2 = y2 * rect.height + rect.y;
    }

    // Fix NaN when rect is Infinity
    x = isNaN(x) ? 0 : x;
    x2 = isNaN(x2) ? 1 : x2;
    y = isNaN(y) ? 0 : y;
    y2 = isNaN(y2) ? 0 : y2;

    const canvasGradient = ctx.createLinearGradient(x, y, x2, y2);

    return canvasGradient;
}

function createRadialGradient(ctx: CanvasRenderingContext2D, obj: RadialGradientObject, rect: RectLike) {
    const width = rect.width;
    const height = rect.height;
    const min = Math.min(width, height);

    let x = obj.x == null ? 0.5 : obj.x;
    let y = obj.y == null ? 0.5 : obj.y;
    let r = obj.r == null ? 0.5 : obj.r;
    if (!obj.global) {
        x = x * width + rect.x;
        y = y * height + rect.y;
        r = r * min;
    }

    const canvasGradient = ctx.createRadialGradient(x, y, 0, x, y, r);

    return canvasGradient;
}

export class TextStyleProps {

    // TODO Text is assigned inside zrender
    text?: string
    // TODO Text not support PatternObject | LinearGradientObject | RadialGradientObject yet.
    textFill?: string | PatternObject | LinearGradientObject | RadialGradientObject
    textStroke?: string | PatternObject | LinearGradientObject | RadialGradientObject
    /**
     * textStroke may be set as some color as a default
     * value in upper applicaion, where the default value
     * of textStrokeWidth should be 0 to make sure that
     * user can choose to do not use text stroke.
     */
    textStrokeWidth?: number

    /**
     * If `fontSize` or `fontFamily` exists, `font` will be reset by
     * `fontSize`, `fontStyle`, `fontWeight`, `fontFamily`.
     * So do not visit it directly in upper application (like echarts),
     * but use `contain/text#makeFont` instead.
     */
    font?: string
    /**
     * The same as font. Use font please.
     * @deprecated
     */
    textFont?: string


    /**
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontStyle?: 'normal' | 'italic' | 'oblique'
    /**
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number
    /**
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontFamily?: string
    /**
     * It helps merging respectively, rather than parsing an entire font string.
     * Should be 12 but not '12px'.
     * @type {number}
     */
    fontSize?: number

    textAlign?: TextAlign
    textVerticalAlign?: TextVerticalAlign
    /**
     * Use textVerticalAlign instead
     * @deprecated
     */
    textBaseline?: TextVerticalAlign

    textLineHeight?: number
    textWidth?: number | string
    /**
     * Only for textBackground.
     */
    textHeight?: number
    /**
     * Reserved for special functinality, like 'hr'.
     */
    textTag?: string

    textShadowColor?: string
    textShadowBlur?: number
    textShadowOffsetX?: number
    textShadowOffsetY?: number

    textBackgroundColor?: string | {
        image: ImageLike | string
    }

    /**
     * Can be `2` or `[2, 4]` or `[2, 3, 4, 5]`
     */
    textPadding?: number | number[]

    textBorderColor?: string
    textBorderWidth?: number
    textBorderRadius?: number | number[]

    textBoxShadowColor?: string
    textBoxShadowBlur?: number
    textBoxShadowOffsetX?: number
    textBoxShadowOffsetY?: number
}

export class StyleProps extends TextStyleProps {
    // For text and image
    x?: number
    y?: number

    fill?: string | PatternObject | LinearGradientObject | RadialGradientObject
    stroke?: string | PatternObject | LinearGradientObject | RadialGradientObject

    opacity?: number
    fillOpacity?: number
    strokeOpacity?: number

    /**
     * `true` is not supported.
     * `false`/`null`/`undefined` are the same.
     * `false` is used to remove lineDash in some
     * case that `null`/`undefined` can not be set.
     * (e.g., emphasis.lineStyle in echarts)
     */
    lineDash?: false | number[]
    lineDashOffset?: number

    shadowBlur?: number
    shadowOffsetX?: number
    shadowOffsetY?: number
    shadowColor?: string

    lineWidth?: number
    lineCap?: CanvasLineCap
    lineJoin?: CanvasLineJoin

    miterLimit?: number
    strokeNoScale?: boolean

    // Option about text
    // Bounding rect text configuration
    // Not affected by element transform
    text?: string
    /**
     * 'inside', 'left', 'right', 'top', 'bottom'
     * [x, y]
     * Based on x, y of rect.
     */
    textPosition?: string | number[]
    /**
     * If not specified, use the boundingRect of a `displayable`.
     */
    textRect?: RectLike
    textOffset?: number[]
    textDistance?: number

    /**
     * Whether transform text.
     * Only available in Path and Image element,
     * where the text is called as `RectText`.
     */
    transformText?: boolean

    /**
     * Text rotate around position of Path or Image.
     * The origin of the rotation can be specified by `textOrigin`.
     * Only available in Path and Image element,
     * where the text is called as `RectText`.
     */
    textRotation?: number

    /**
     * Text origin of text rotation.
     * Useful in the case like label rotation of circular symbol.
     * Only available in Path and Image element, where the text is called
     * as `RectText` and the element is called as "host element".
     * The value can be:
     * + If specified as a coordinate like `[10, 40]`, it is the `[x, y]`
     * base on the left-top corner of the rect of its host element.
     * + If specified as a string `center`, it is the center of the rect of
     * its host element.
     * + By default, this origin is the `textPosition`.
     */
    textOrigin?: 'center' | VectorArray

    // TODO Support number?
    textPadding?: number | number[]

    /**
     * Text styles for rich text.
     */
    rich?: Dictionary<TextStyleProps>

    truncate?: {
        outerWidth?: number
        outerHeight?: number
        ellipsis?: string
        placeholder?: string
        minChar?: number
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
     */
    blend?: string
}



// Provide optional
// type TextStyleOption = Partial<TextStylelImpl>
// type StyleOption = Partial<StyleImpl>

type StyleKey = keyof StyleProps

type StyleValueType = PropType<StyleProps, StyleKey>
// type StyleValueType = number | string | number[] | boolean
//     | VectorArray | Dictionary<TextStyleOption> | RectLike
//     | PatternObject | CanvasGradient
//     | CanvasLineCap | CanvasLineJoin


export default class Style extends StyleProps {

    // fill: string | LinearGradientObject | RadialGradientObject | PatternObject = '#000'
    // stroke: string | LinearGradientObject | RadialGradientObject | PatternObject = null

    // opacity = 1

    // lineDashOffset = 0

    // shadowBlur = 0

    // shadowOffsetX = 0

    // shadowOffsetY = 0

    // shadowColor = '#000'

    // lineWidth = 1

    // lineCap: CanvasLineCap = 'butt'

    // lineJoin: CanvasLineJoin

    // miterLimit = 10

    // strokeNoScale = false

    // textWidth: number | string

    // textHeight: number

    // textStrokeWidth = 0

    // textPosition: string | number[] = 'inside'

    // textDistance = 5

    // textShadowColor = 'transparent'

    // textShadowBlur = 0

    // textShadowOffsetX = 0

    // textShadowOffsetY = 0

    // textBoxShadowColor = 'transparent'

    // textBoxShadowBlur = 0

    // textBoxShadowOffsetX = 0

    // textBoxShadowOffsetY = 0

    // transformText: boolean

    // textRotation = 0

    // textBorderWidth = 0

    // textBorderRadius = 0

    constructor(opts?: StyleProps) {
        super()
        if (opts) {
            this.extendFrom(opts, true);
        }
    }

    bind(ctx: CanvasRenderingContext2D, el: Displayable, prevEl: Displayable) {
        const style = this;
        const prevStyle = prevEl && prevEl.style;
        // If no prevStyle, it means first draw.
        // Only apply cache if the last time cachced by this function.
        const notCheckCache = !prevStyle || (ctx as any).__attrCachedBy !== ContextCachedBy.STYLE_BIND;

        (ctx as ZRCanvasRenderingContext).__attrCachedBy = ContextCachedBy.STYLE_BIND;

        for (let i = 0; i < STYLE_COMMON_PROPS.length; i++) {
            const prop = STYLE_COMMON_PROPS[i];
            const styleName = prop[0];

            if (notCheckCache || style[styleName as StyleKey] !== prevStyle[styleName as StyleKey]) {
                // FIXME Invalid property value will cause style leak from previous element.
                (ctx as any)[styleName] =
                    fixShadow(ctx, styleName as string, (style[styleName as StyleKey] || prop[1]) as number);
            }
        }

        if ((notCheckCache || style.fill !== prevStyle.fill)) {
            ctx.fillStyle = style.fill as string;
        }
        if ((notCheckCache || style.stroke !== prevStyle.stroke)) {
            ctx.strokeStyle = style.stroke as string;
        }
        if ((notCheckCache || style.opacity !== prevStyle.opacity)) {
            ctx.globalAlpha = style.opacity == null ? 1 : style.opacity;
        }

        if ((notCheckCache || style.blend !== prevStyle.blend)) {
            ctx.globalCompositeOperation = style.blend || 'source-over';
        }
        if (this.hasStroke()) {
            const lineWidth = style.lineWidth;
            ctx.lineWidth = lineWidth / (
                (this.strokeNoScale && el && (<Path>el).getLineScale) ? (<Path>el).getLineScale() : 1
            );
        }
    }

    hasFill() {
        const fill = this.fill;
        return fill != null && fill !== 'none';
    }

    hasStroke() {
        const stroke = this.stroke;
        return stroke != null && stroke !== 'none' && this.lineWidth > 0;
    }

    /**
     * Extend from other style
     * @param {zrender/graphic/Style} otherStyle
     * @param {boolean} overwrite true: overwrirte any way.
     *                            false: overwrite only when !target.hasOwnProperty
     *                            null/undefined: overwrite when property is not null/undefined.
     */
    extendFrom(otherStyle: StyleProps, overwrite?: boolean) {
        if (otherStyle) {
            for (let name in otherStyle) {
                if (otherStyle.hasOwnProperty(name)
                    && (overwrite === true
                        || (
                            overwrite === false
                                ? !this.hasOwnProperty(name)
                                : otherStyle[name as StyleKey] != null
                        )
                    )
                ) {
                    // FIXME as any
                    (this as any)[name] = otherStyle[name as StyleKey];
                }
            }
        }
    }

    /**
     * Batch setting style with a given object
     */
    set(obj: StyleProps | StyleKey, value?: StyleValueType) {
        if (typeof obj === 'string') {
            (this as any)[obj] = value;
        }
        else {
            this.extendFrom(obj, true);
        }
    }

    /**
     * Clone
     * @return {zrender/graphic/Style} [description]
     */
    clone() {
        const newStyle = new Style();
        newStyle.extendFrom(this, true);
        return newStyle;
    }

    static getGradient(ctx: CanvasRenderingContext2D, obj: GradientObject, rect: RectLike) {
        const canvasGradient = obj.type === 'radial'
            ? createRadialGradient(ctx, obj as RadialGradientObject, rect)
            : createLinearGradient(ctx, obj as LinearGradientObject, rect);

        const colorStops = obj.colorStops;
        for (let i = 0; i < colorStops.length; i++) {
            canvasGradient.addColorStop(
                colorStops[i].offset, colorStops[i].color
            );
        }
        return canvasGradient;
    }

    private static initDefaultProps = (function () {
        let styleProto = Style.prototype;
        styleProto.fill = '#000';
        styleProto.stroke = null;
        styleProto.opacity = 1;
        styleProto.lineDashOffset = 0;
        styleProto.shadowBlur = 0;
        styleProto.shadowOffsetX = 0;
        styleProto.shadowOffsetY = 0;
        styleProto.shadowColor = '#000';
        styleProto.lineWidth = 1;
        styleProto.lineCap = 'butt';
        styleProto.miterLimit = 10;
        styleProto.strokeNoScale = false;
        styleProto.textStrokeWidth = 0;
        styleProto.textPosition = 'inside';
        styleProto.textDistance = 5;
        styleProto.textShadowColor = 'transparent';
        styleProto.textShadowBlur = 0;
        styleProto.textShadowOffsetX = 0;
        styleProto.textShadowOffsetY = 0;
        styleProto.textBoxShadowColor = 'transparent';
        styleProto.textBoxShadowBlur = 0;
        styleProto.textBoxShadowOffsetX = 0;
        styleProto.textBoxShadowOffsetY = 0;
        styleProto.textRotation = 0;
        styleProto.textBorderWidth = 0;
        styleProto.textBorderRadius = 0;
    })()
};
