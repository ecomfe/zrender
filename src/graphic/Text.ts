import Displayable, { DisplayableOption } from './Displayable';
import { getBoundingRect, DEFAULT_FONT } from '../contain/text';
import BoundingRect from '../core/BoundingRect';
import { PathStyleOption, DEFAULT_PATH_STYLE } from './Path';
import { AllPropTypes } from '../core/types';
import { trim, extend } from '../core/util';

export interface TextStyleOption extends PathStyleOption {

    x?: number
    y?: number

    // TODO Text is assigned inside zrender
    text?: string

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

    // TODO Put in text group
    // /**
    //  * It helps merging respectively, rather than parsing an entire font string.
    //  */
    fontStyle?: string
    // /**
    //  * It helps merging respectively, rather than parsing an entire font string.
    //  */
    fontWeight?: string
    // /**
    //  * It helps merging respectively, rather than parsing an entire font string.
    //  */
    fontFamily?: string
    // /**
    //  * It helps merging respectively, rather than parsing an entire font string.
    //  * Should be 12 but not '12px'.
    //  * @type {number}
    //  */
    fontSize?: number

    textAlign?: CanvasTextAlign

    textBaseline?: CanvasTextBaseline
}

export const DEFAULT_TEXT_STYLE: TextStyleOption = extend({
    strokeFirst: true,
    font: DEFAULT_FONT,
    x: 0,
    y: 0,
    textAlign: 'left',
    textBaseline: 'top'
}, DEFAULT_PATH_STYLE);

class StyleCtor {}
StyleCtor.prototype = DEFAULT_TEXT_STYLE;

interface TextOption extends DisplayableOption {
    style?: TextOption
}

function makeFont(style: TextStyleOption): string {
    // FIXME in node-canvas fontWeight is before fontStyle
    // Use `fontSize` `fontFamily` to check whether font properties are defined.
    const font = (style.fontSize || style.fontFamily) && [
        style.fontStyle,
        style.fontWeight,
        (style.fontSize || 12) + 'px',
        // If font properties are defined, `fontFamily` should not be ignored.
        style.fontFamily || 'sans-serif'
    ].join(' ');
    return font && trim(font) || style.textFont || style.font;
}

interface ZText {
    constructor(opts?: TextOption): void

    attr(key: TextOption): ZText
    attr(key: keyof TextOption, value: AllPropTypes<TextOption>): ZText

    setStyle(key: TextStyleOption): ZText
    setStyle(key: keyof TextStyleOption, value: AllPropTypes<TextStyleOption>): ZText
}

class ZText extends Displayable {
    type = 'text'

    style: TextStyleOption

    private _normalizeFont() {
        this.style.font = makeFont(this.style);
    }

    hasStroke() {
        const style = this.style;
        const stroke = style.stroke;
        return stroke != null && stroke !== 'none' && style.lineWidth > 0;
    }

    hasFill() {
        const style = this.style;
        const fill = style.fill;
        return fill != null && fill !== 'none';
    }

    useStyle(obj: TextStyleOption) {
        this.style = new StyleCtor();
        extend(this.style, obj);
    }

    innerBeforeBrush() {
        this._normalizeFont();
    }

    getBoundingRect(): BoundingRect {
        const style = this.style;

        // Optimize, avoid normalize every time.
        this._normalizeFont();

        if (!this._rect) {
            let text = style.text;
            text != null ? (text += '') : (text = '');

            const rect = getBoundingRect(
                style.text + '',
                style.font,
                style.textAlign,
                style.textBaseline
            );

            rect.x += style.x || 0;
            rect.y += style.y || 0;

            if (this.hasStroke()) {
                const w = style.lineWidth;
                rect.x -= w / 2;
                rect.y -= w / 2;
                rect.width += w;
                rect.height += w;
            }

            this._rect = rect;
        }

        return this._rect;
    }
}
export default ZText;