/**
 * Mixin for drawing text in a element bounding rect
 * @module zrender/mixin/RectText
 */

define(function (require) {

    var textContain = require('../../contain/text');
    var BoundingRect = require('../../core/BoundingRect');

    var tmpRect = new BoundingRect();

    var RectText = function () {};

    function parsePercent(value, maxValue) {
        if (typeof value === 'string') {
            if (value.lastIndexOf('%') >= 0) {
                return parseFloat(value) / 100 * maxValue;
            }
            return parseFloat(value);
        }
        return value;
    }

    function setTransform(ctx, m) {
        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    }

    RectText.prototype = {

        constructor: RectText,

        /**
         * Draw text in a rect with specified position.
         * @param  {CanvasRenderingContext} ctx
         * @param  {Object} rect Displayable rect
         * @return {Object} textRect Alternative precalculated text bounding rect
         */
        drawRectText: function (ctx, rect, textRect) {
            var style = this.style;
            var text = style.text;
            // Convert to string
            text != null && (text += '');
            if (!text) {
                return;
            }

            // FIXME
            ctx.save();

            var x;
            var y;
            var textPosition = style.textPosition;
            var distance = style.textDistance;
            var align = style.textAlign;
            var font = style.textFont || style.font;
            var baseline = style.textBaseline;
            var verticalAlign = style.textVerticalAlign;

            textRect = textRect || textContain.getBoundingRect(text, font, align, baseline);

            // Transform rect to view space
            var transform = this.transform;
            if (transform) {
                tmpRect.copy(rect);
                tmpRect.applyTransform(transform);
                rect = tmpRect;
            }

            // Text position represented by coord
            if (textPosition instanceof Array) {
                // Percent
                x = rect.x + parsePercent(textPosition[0], rect.width);
                y = rect.y + parsePercent(textPosition[1], rect.height);
                align = align || 'left';
                baseline = baseline || 'top';

                if (verticalAlign) {
                    switch (verticalAlign) {
                        case 'middle':
                            y -= textRect.height / 2 - textRect.lineHeight / 2;
                            break;
                        case 'bottom':
                            y -= textRect.height - textRect.lineHeight / 2;
                            break;
                        default:
                            y += textRect.lineHeight / 2;
                    }
                    // Force bseline to be middle
                    baseline = 'middle';
                }
            }
            else {
                var res = textContain.adjustTextPositionOnRect(
                    textPosition, rect, textRect, distance
                );
                x = res.x;
                y = res.y;
                // Default align and baseline when has textPosition
                align = align || res.textAlign;
                baseline = baseline || res.textBaseline;
            }

            // Use canvas default left textAlign. Giving invalid value will cause state not change
            ctx.textAlign = align || 'left';
            // Use canvas default alphabetic baseline
            ctx.textBaseline = baseline || 'alphabetic';

            var textFill = style.textFill;
            var textStroke = style.textStroke;
            textFill && (ctx.fillStyle = textFill);
            textStroke && (ctx.strokeStyle = textStroke);
            ctx.font = font;

            // Text shadow
            // Always set shadowBlur and shadowOffset to avoid leak from displayable
            ctx.shadowBlur = style.textShadowBlur;
            ctx.shadowColor = style.textShadowColor || 'transparent';
            ctx.shadowOffsetX = style.textShadowOffsetX;
            ctx.shadowOffsetY = style.textShadowOffsetY;

            var textLines = text.split('\n');
            for (var i = 0; i < textLines.length; i++) {
                textFill && ctx.fillText(textLines[i], x, y);
                textStroke && ctx.strokeText(textLines[i], x, y);
                y += textRect.lineHeight;
            }

            ctx.restore();
        }
    };

    return RectText;
});