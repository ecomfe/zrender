import Displayable, { DisplayableProps, DisplayableStatePropNames } from './Displayable';
import { getBoundingRect, DEFAULT_FONT } from '../contain/text';
import BoundingRect from '../core/BoundingRect';
import { PathStyleProps, DEFAULT_PATH_STYLE } from './Path';
import { extend } from '../core/util';

export interface TextStyleProps extends PathStyleProps {

    x?: number
    y?: number

    // TODO Text is assigned inside zrender
    text?: string

    font?: string

    textAlign?: CanvasTextAlign

    textBaseline?: CanvasTextBaseline
}

export const DEFAULT_TEXT_STYLE: TextStyleProps = extend({
    strokeFirst: true,
    font: DEFAULT_FONT,
    x: 0,
    y: 0,
    textAlign: 'left',
    textBaseline: 'top'
}, DEFAULT_PATH_STYLE);

interface TextProps extends DisplayableProps {
    style?: TextStyleProps
}

export type TextState = Pick<TextProps, DisplayableStatePropNames>

class ZRText extends Displayable<TextProps> {

    style: TextStyleProps

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

    useStyle(obj: TextStyleProps, inherited?: TextStyleProps) {
        this.innerUseStyle(obj, inherited || DEFAULT_TEXT_STYLE);
    }

    getBoundingRect(): BoundingRect {
        const style = this.style;

        if (!this._rect) {
            let text = style.text;
            text != null ? (text += '') : (text = '');

            const rect = getBoundingRect(
                text,
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

ZRText.prototype.type = 'text';
export default ZRText;