import Displayable from './Displayable';
import * as zrUtil from '../core/util';
import * as textContain from '../contain/text';
import * as textHelper from './helper/text';
import {ContextCachedBy} from './constant';

/**
 * @alias zrender/graphic/Text
 * @extends module:zrender/graphic/Displayable
 * @constructor
 * @param {Object} opts
 */
var Text = function (opts) { // jshint ignore:line
    Displayable.call(this, opts);
};

Text.prototype = {

    constructor: Text,

    type: 'text',

    brush: function (ctx, prevEl) {
        var style = this.style;

        // Optimize, avoid normalize every time.
        this.__dirty && textHelper.normalizeTextStyle(style, true);

        // Use props with prefix 'text'.
        style.fill = style.stroke = style.shadowBlur = style.shadowColor =
            style.shadowOffsetX = style.shadowOffsetY = null;

        var text = style.text;
        // Convert to string
        text != null && (text += '');

        // Do not apply style.bind in Text node. Because the real bind job
        // is in textHelper.renderText, and performance of text render should
        // be considered.
        // style.bind(ctx, this, prevEl);

        if (!textHelper.needDrawText(text, style)) {
            // The current el.style is not applied
            // and should not be used as cache.
            ctx.__attrCachedBy = ContextCachedBy.NONE;
            return;
        }

        this.setTransform(ctx);

        textHelper.renderText(this, ctx, text, style, null, prevEl);

        this.restoreTransform(ctx);
    },

    getBoundingRect: function () {
        var style = this.style;

        // Optimize, avoid normalize every time.
        this.__dirty && textHelper.normalizeTextStyle(style, true);

        if (!this._rect) {
            var text = style.text;
            text != null ? (text += '') : (text = '');

            var rect = textContain.getBoundingRect(
                style.text + '',
                style.font,
                style.textAlign,
                style.textVerticalAlign,
                style.textPadding,
                style.textLineHeight,
                style.rich
            );

            rect.x += style.x || 0;
            rect.y += style.y || 0;

            if (textHelper.getStroke(style.textStroke, style.textStrokeWidth)) {
                var w = style.textStrokeWidth;
                rect.x -= w / 2;
                rect.y -= w / 2;
                rect.width += w;
                rect.height += w;
            }

            this._rect = rect;
        }

        return this._rect;
    }
};

zrUtil.inherits(Text, Displayable);

export default Text;