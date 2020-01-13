import Displayable from './Displayable';
import * as zrUtil from '../core/util';
import * as textContain from '../contain/text';
import * as textHelper from './helper/text';
import {ContextCachedBy} from './constant';
import BoundingRect from '../core/BoundingRect';
import { ZRCanvasRenderingContext } from '../core/types';

export default class Text extends Displayable {
    type = 'text'

    brush(ctx: CanvasRenderingContext2D, prevEl: Displayable) {
        const style = this.style;

        // Optimize, avoid normalize every time.
        this.__dirty && textHelper.normalizeTextStyle(style);

        // Use props with prefix 'text'.
        style.fill = style.stroke = style.shadowBlur = style.shadowColor =
            style.shadowOffsetX = style.shadowOffsetY = null;

        let text = style.text;
        // Convert to string
        text != null && (text += '');

        // Do not apply style.bind in Text node. Because the real bind job
        // is in textHelper.renderText, and performance of text render should
        // be considered.
        // style.bind(ctx, this, prevEl);

        if (!textHelper.needDrawText(text, style)) {
            // The current el.style is not applied
            // and should not be used as cache.
            (ctx as ZRCanvasRenderingContext).__attrCachedBy = ContextCachedBy.NONE;
            return;
        }

        this.setTransform(ctx);

        textHelper.renderText(this, ctx, text, style, null, prevEl);

        this.restoreTransform(ctx);
    }

    getBoundingRect(): BoundingRect {
        const style = this.style;

        // Optimize, avoid normalize every time.
        this.__dirty && textHelper.normalizeTextStyle(style);

        if (!this._rect) {
            let text = style.text;
            text != null ? (text += '') : (text = '');

            const rect = textContain.getBoundingRect(
                style.text + '',
                style.font,
                style.textAlign,
                style.textVerticalAlign,
                style.textPadding as number[],
                style.textLineHeight,
                style.rich,
                style.truncate
            );

            rect.x += style.x || 0;
            rect.y += style.y || 0;

            if (textHelper.getStroke(style.textStroke, style.textStrokeWidth)) {
                const w = style.textStrokeWidth;
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