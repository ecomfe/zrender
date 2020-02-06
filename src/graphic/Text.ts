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

    font?: string

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
        this.dirtyStyle();
        this.style = new StyleCtor();
        extend(this.style, obj);
    }

    getBoundingRect(): BoundingRect {
        const style = this.style;

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