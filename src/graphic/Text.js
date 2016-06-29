/**
 * Text element
 * @module zrender/graphic/Text
 *
 * TODO Wrapping
 *
 * Text not support gradient
 */

define(function (require) {

    var Displayable = require('./Displayable');
    var zrUtil = require('../core/util');
    var textContain = require('../contain/text');

    /**
     * @alias zrender/graphic/Text
     * @extends module:zrender/graphic/Displayable
     * @constructor
     * @param {Object} opts
     */
    var Text = function (opts) {
        Displayable.call(this, opts);
    };

    Text.prototype = {

        constructor: Text,

        type: 'text',

        brush: function (ctx, prevEl) {
            var style = this.style;
            var x = style.x || 0;
            var y = style.y || 0;
            // Convert to string
            var text = style.text;

            // Convert to string
            text != null && (text += '');

            // Always bind style
            style.bind(ctx, this, prevEl);

            if (text) {

                this.setTransform(ctx);

                var textBaseline;
                var textAlign = style.textAlign;
                if (style.textVerticalAlign) {
                    var rect = textContain.getBoundingRect(
                        text, ctx.font, style.textAlign, 'top'
                    );
                    // Ignore textBaseline
                    textBaseline = 'middle';
                    switch (style.textVerticalAlign) {
                        case 'middle':
                            y -= rect.height / 2 - rect.lineHeight / 2;
                            break;
                        case 'bottom':
                            y -= rect.height - rect.lineHeight / 2;
                            break;
                        default:
                            y += rect.lineHeight / 2;
                    }
                }
                else {
                    textBaseline = style.textBaseline;
                }

                ctx.font = style.textFont || style.font;
                ctx.textAlign = textAlign || 'left';
                // Use canvas default left textAlign. Giving invalid value will cause state not change
                if (ctx.textAlign !== textAlign) {
                    ctx.textAlign = 'left';
                }
                ctx.textBaseline = textBaseline || 'alphabetic';
                // Use canvas default alphabetic baseline
                if (ctx.textBaseline !== textBaseline) {
                    ctx.textBaseline = 'alphabetic';
                }

                var lineHeight = textContain.measureText('国', ctx.font).width;

                var textLines = text.split('\n');
                for (var i = 0; i < textLines.length; i++) {
                    style.hasFill() && ctx.fillText(textLines[i], x, y);
                    style.hasStroke() && ctx.strokeText(textLines[i], x, y);
                    y += lineHeight;
                }

                this.restoreTransform(ctx);
            }
        },

        getBoundingRect: function () {
            if (!this._rect) {
                var style = this.style;
                var textVerticalAlign = style.textVerticalAlign;
                var rect = textContain.getBoundingRect(
                    style.text + '', style.textFont || style.font, style.textAlign,
                    textVerticalAlign ? 'top' : style.textBaseline
                );
                switch (textVerticalAlign) {
                    case 'middle':
                        rect.y -= rect.height / 2;
                        break;
                    case 'bottom':
                        rect.y -= rect.height;
                        break;
                }
                rect.x += style.x || 0;
                rect.y += style.y || 0;
                this._rect = rect;
            }
            return this._rect;
        }
    };

    zrUtil.inherits(Text, Displayable);

    return Text;
});