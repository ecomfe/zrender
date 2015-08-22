/**
 * Mixin for drawing text in a element bounding rect
 * @module zrender/mixin/RectText
 */

define(function (require) {

    var textContain = require('../../contain/text');

    var RectText = function () {};

    RectText.prototype = {

        constructor: RectText,

        /**
         * Draw text in a rect with specified position.
         * @param  {CanvasRenderingContext} ctx
         * @param  {Object} rect Wrapping rect
         * @return {Object} textRect Alternative precalculated text bounding rect
         */
        drawRectText: function (ctx, rect, textRect) {
            var style = this.style;
            var text = this.style.text;
            if (! text) {
                return;
            }
            var x;
            var y;
            var textPosition = style.textPosition;
            var distance = style.textDistance;
            var align = style.textAlign;
            var font = style.textFont;
            var baseline = style.textBaseline;

            textRect = textRect || textContain.getBoundingRect(text, font, align, baseline);

            // Text position represented by coord
            if (textPosition instanceof Array) {
                x = rect.x + textPosition[0];
                y = rect.y + textPosition[1];

                ctx.textAlign = align;
                ctx.textBaseline = baseline;
            }
            else {
                var newPos = textContain.adjustTextPositionOnRect(
                    textPosition, rect, textRect, distance
                );
                x = newPos.x;
                y = newPos.y;
                // Draw text
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
            }

            var textFill = style.textFill;
            var textStroke = style.textStroke;
            textFill && (ctx.fillStyle = textFill);
            textStroke && (ctx.strokeStyle = textStroke);
            ctx.font = font;

            var textLines = text.split('\n');
            for (var i = 0; i < textLines.length; i++) {
                textFill && ctx.fillText(textLines[i], x, y);
                textStroke && ctx.strokeText(textLines[i], x, y);
                y += textRect.lineHeight;
            }
        }
    };

    return RectText;
});