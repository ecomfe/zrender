define(function (require) {

    var textContain = require('../../contain/text');
    var util = require('../../core/util');
    var roundRectHelper = require('./roundRect');

    var retrieve = util.retrieve;

    // TODO: Do not support 'start', 'end' yet.
    var VALID_TEXT_ALIGN = {left: 1, right: 1, center: 1};
    var VALID_TEXT_VERTICAL_ALIGN = {top: 1, bottom: 1, middle: 1};

    var helper = {};

    /**
     * @param {module:zrender/graphic/Style} style
     * @param {boolean} [inRectText=false]
     * @return {module:zrender/graphic/Style} The input style.
     */
    helper.normalizeTextStyle = function (style, inRectText) {
        // In rect text, outermost textFill and textStroke should not be overrided.
        normalizeStyle(style, !!inRectText);
        util.each(style.rich, normalizeStyle);
        return style;
    };

    function normalizeStyle(style) {
        if (style) {
            style.font = style.textFont || style.font;
            style.textAlign = validTextAlign(style.textAlign);
            style.textVerticalAlign = validTextVerticalAlign(
                style.textVerticalAlign || style.textBaseline
            );

            var textPadding = style.textPadding;
            if (textPadding) {
                style.textPadding = util.normalizeCssArray(style.textPadding);
            }
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {module:zrender/graphic/Style} style
     * @param {Object|boolean} [rect] {x, y, width, height}
     *                  If set false, rect text is not used.
     */
    helper.renderText = function (ctx, text, style, rect) {
        style.rich
            ? renderRichText(ctx, text, style, rect)
            : renderPlainText(ctx, text, style, rect);
    };

    function renderPlainText(ctx, text, style, rect) {
        var font = setCtx(ctx, 'font', style.font || textContain.DEFAULT_FONT);

        var block = textContain.parsePlainText(text, font);
        var textPadding = style.textPadding;
        var outerHeight = block.height;
        textPadding && (outerHeight += textPadding[0] + textPadding[2]);

        var textLines = block.lines;
        var lineHeight = block.lineHeight;

        var textAlign = style.textAlign;
        var textVerticalAlign = style.textVerticalAlign;

        var x = style.x || 0;
        var y = textContain.adjustTextY(style.y || 0, outerHeight, textVerticalAlign);

        var adjustedBox = adjustBlockPosition(x, y, textAlign, outerHeight, style, rect);
        x = adjustedBox.x;
        y = adjustedBox.y;
        textAlign = adjustedBox.textAlign;

        var needDrawBg = needDrawBackground(style);
        if (needDrawBg || textPadding) {
            // Consider performance, do not call getTextWidth util necessary.
            var textWidth = textContain.getWidth(text, font);
            var outerWidth = textWidth;
            textPadding && (outerWidth += textPadding[1] + textPadding[3]);

            needDrawBg && drawBackground(ctx, style, x, y, outerWidth, outerHeight);

            if (textPadding) {
                x = getTextXForPadding(x, textAlign, outerWidth, textWidth, textPadding);
                y += textPadding[0];
            }
        }

        setCtx(ctx, 'textAlign', textAlign || 'left');
        // Force baseline to be "middle". Otherwise, if using "top", the
        // text will offset downward a little bit in font "Microsoft YaHei".
        setCtx(ctx, 'textBaseline', 'middle');

        var textStroke = style.textStroke;
        var textFill = style.textFill;

        // Always set shadowBlur and shadowOffset to avoid leak from displayable.
        setCtx(ctx, 'shadowBlur', style.textShadowBlur);
        setCtx(ctx, 'shadowColor', style.textShadowColor || 'transparent');
        setCtx(ctx, 'shadowOffsetX', style.textShadowOffsetX);
        setCtx(ctx, 'shadowOffsetY', style.textShadowOffsetY);

        // `textBaseline` is set as 'middle'.
        y += lineHeight / 2;

        var textLineWidth = style.textLineWidth;
        var hasStroke = needStroke(textStroke, textLineWidth);
        var hasFill = needFill(textFill);

        if (hasStroke) {
            setCtx(ctx, 'lineWidth', textLineWidth);
            setCtx(ctx, 'strokeStyle', textStroke);
        }
        if (hasFill) {
            setCtx(ctx, 'fillStyle', textFill);
        }

        for (var i = 0; i < textLines.length; i++) {
            // Fill after stroke so the outline will not cover the main part.
            hasStroke && ctx.strokeText(textLines[i], x, y);
            hasFill && ctx.fillText(textLines[i], x, y);
            y += lineHeight;
        }
    }

    function renderRichText(ctx, text, style, rect) {
        var block = textContain.parseRichText(text, style);
        drawRichText(ctx, block, style, rect);
    }

    function drawRichText(ctx, block, style, rect) {
        var x = style.x || 0;
        var y = style.y || 0;
        var blockWidth = block.width;
        var outerWidth = block.outerWidth;
        var outerHeight = block.outerHeight;
        var textPadding = style.textPadding;
        var textAlign = style.textAlign;
        var textVerticalAlign = style.textVerticalAlign;

        var adjustedBox = adjustBlockPosition(
            x, y, textAlign, outerHeight, style, rect
        );
        x = adjustedBox.x;
        y = adjustedBox.y;
        textAlign = adjustedBox.textAlign;

        var x = textContain.adjustTextX(x, outerWidth, textAlign);
        var y = textContain.adjustTextY(y, outerHeight, textVerticalAlign);
        var xLeft = x;
        var lineTop = y;
        if (textPadding) {
            xLeft += textPadding[3];
            lineTop += textPadding[0];
        }
        var xRight = xLeft + blockWidth;

        needDrawBackground(style) && drawBackground(
            ctx, style, x, y, outerWidth, outerHeight
        );

        for (var i = 0; i < block.lines.length; i++) {
            var line = block.lines[i];
            var tokens = line.tokens;
            var tokenCount = tokens.length;
            var lineHeight = line.lineHeight;
            var usedWidth = line.width;

            var leftIndex = 0;
            var lineXLeft = xLeft;
            var lineXRight = xRight;
            var rightIndex = tokenCount - 1;
            var token;

            while (
                leftIndex < tokenCount
                && (token = tokens[leftIndex], !token.textAlign || token.textAlign === 'left')
            ) {
                placeToken(ctx, token, style, lineHeight, lineTop, lineXLeft, 'left');
                usedWidth -= token.width;
                lineXLeft += token.width;
                leftIndex++;
            }

            while (
                rightIndex >= 0
                && (token = tokens[rightIndex], token.textAlign === 'right')
            ) {
                placeToken(ctx, token, style, lineHeight, lineTop, lineXRight, 'right');
                usedWidth -= token.width;
                lineXRight -= token.width;
                rightIndex--;
            }

            // The other tokens are placed as textAlign 'center' if there is enough space.
            lineXLeft += (blockWidth - (lineXLeft - xLeft) - (xRight - lineXRight) - usedWidth) / 2;
            while (leftIndex <= rightIndex) {
                token = tokens[leftIndex];
                // Consider width specified by user, use 'center' rather than 'left'.
                placeToken(ctx, token, style, lineHeight, lineTop, lineXLeft + token.width / 2, 'center');
                lineXLeft += token.width;
                leftIndex++;
            }

            lineTop += lineHeight;
        }
    }

    function placeToken(ctx, token, style, lineHeight, lineTop, x, textAlign) {
        var tokenStyle = style.rich[token.styleName] || {};

        // 'ctx.textBaseline' is always set as 'middle', for sake of
        // the bias of "Microsoft YaHei".
        var textVerticalAlign = token.textVerticalAlign;
        var y = lineTop + lineHeight / 2;
        if (textVerticalAlign === 'top') {
            y = lineTop + token.height / 2;
        }
        else if (textVerticalAlign === 'bottom') {
            y = lineTop + lineHeight - token.height / 2;
        }

        needDrawBackground(tokenStyle) && drawBackground(
            ctx,
            tokenStyle,
            textAlign === 'right'
                ? x - token.width
                : textAlign === 'center'
                ? x - token.width / 2
                : x,
            y - token.height / 2,
            token.width,
            token.height
        );

        var textPadding = token.textPadding;
        if (textPadding) {
            x = getTextXForPadding(x, textAlign, token.width, token.textWidth, textPadding);
            y -= token.height / 2 - textPadding[2] - token.textHeight / 2;
        }

        setCtx(ctx, 'shadowBlur', retrieve(tokenStyle.textShadowBlur, style.textShadowBlur, 0));
        setCtx(ctx, 'shadowColor', tokenStyle.textShadowColor || style.textShadowColor || 'transparent');
        setCtx(ctx, 'shadowOffsetX', retrieve(tokenStyle.textShadowOffsetX, style.textShadowOffsetX, 0));
        setCtx(ctx, 'shadowOffsetY', retrieve(tokenStyle.textShadowOffsetY, style.textShadowOffsetY, 0));

        setCtx(ctx, 'textAlign', textAlign);
        // Force baseline to be "middle". Otherwise, if using "top", the
        // text will offset downward a little bit in font "Microsoft YaHei".
        setCtx(ctx, 'textBaseline', 'middle');

        setCtx(ctx, 'font', token.font || textContain.DEFAULT_FONT);

        var textStroke = tokenStyle.textStroke || style.textStroke;
        var textFill = tokenStyle.textFill || style.textFill;
        var textLineWidth = retrieve(tokenStyle.textLineWidth, style.textLineWidth);

        if (needStroke(textStroke, textLineWidth)) {
            setCtx(ctx, 'lineWidth', textLineWidth);
            setCtx(ctx, 'strokeStyle', textStroke);
            ctx.strokeText(token.text, x, y);
        }
        if (needFill(textFill)) {
            setCtx(ctx, 'fillStyle', textFill);
            ctx.fillText(token.text, x, y);
        }
    }

    function needDrawBackground(style) {
        return style.textBackgroundColor
            || (style.textBorderWidth && style.textBorderColor);
    }

    // style: {textBackgroundColor, textBorderWidth, textBorderColor, textBorderRadius}
    // shape: {x, y, width, height}
    function drawBackground(ctx, style, x, y, width, height) {
        var textBackgroundColor = style.textBackgroundColor;
        var textBorderWidth = style.textBorderWidth;
        var textBorderColor = style.textBorderColor;

        ctx.beginPath();
        var textBorderRadius = style.textBorderRadius;
        if (!textBorderRadius) {
            ctx.rect(x, y, width, height);
        }
        else {
            roundRectHelper.buildPath(ctx, {
                x: x, y: y, width: width, height: height, r: textBorderRadius
            });
        }
        ctx.closePath();

        setCtx(ctx, 'shadowBlur', style.textBoxShadowBlur || 0);
        setCtx(ctx, 'shadowColor', style.textBoxShadowColor || 'transparent');
        setCtx(ctx, 'shadowOffsetX', style.textBoxShadowOffsetX || 0);
        setCtx(ctx, 'shadowOffsetY', style.textBoxShadowOffsetY || 0);

        if (textBackgroundColor) {
            setCtx(ctx, 'fillStyle', textBackgroundColor);
            ctx.fill();
        }
        if (textBorderWidth && textBorderColor) {
            setCtx(ctx, 'lineWidth', textBorderWidth);
            setCtx(ctx, 'strokeStyle', textBorderColor);
            ctx.stroke();
        }
    }

    function adjustBlockPosition(x, y, textAlign, blockHeiht, style, rect) {
        var textPosition = style.textPosition;
        if (rect !== false) {
            rect = style.textPositionRect || rect;
        }

        // Text position represented by coord
        if (rect) {
            if (textPosition instanceof Array) {
                // Percent
                x = rect.x + parsePercent(textPosition[0], rect.width);
                y = rect.y + parsePercent(textPosition[1], rect.height);
            }
            else {
                var res = textContain.adjustTextPositionOnRect(
                    textPosition, rect, blockHeiht, style.textDistance
                );
                x = res.x;
                y = res.y;
                // Default align and baseline when has textPosition
                textAlign = textAlign || res.textAlign;
            }

            // textOffset is only support in RectText, otherwise
            // we have to adjust boundingRect for textOffset.
            var textOffset = style.textOffset;
            if (textOffset) {
                x += textOffset[0];
                y += textOffset[1];
            }
        }

        return {
            x: x, y: y, textAlign: textAlign
        };
    }

    function setCtx(ctx, prop, value) {
        // FIXME ??? performance try
        // if (ctx.__currentValues[prop] !== value) {
            ctx[prop] = ctx.__currentValues[prop] = value;
        // }
        return ctx[prop];
    }

    /**
     * @param {string} [stroke] If specified, do not check style.textStroke.
     * @param {string} [lineWidth] If specified, do not check style.textStroke.
     * @param {number} style
     */
    var needStroke = helper.needStroke = function (stroke, lineWidth) {
        return stroke != null && stroke !== 'none' && lineWidth > 0;
    };

    var needFill = helper.needFill = function (fill) {
        return fill != null && fill !== 'none';
    };

    function parsePercent(value, maxValue) {
        if (typeof value === 'string') {
            if (value.lastIndexOf('%') >= 0) {
                return parseFloat(value) / 100 * maxValue;
            }
            return parseFloat(value);
        }
        return value;
    }

    // Invalid value will cause state not change.
    function validTextAlign(val) {
        return (val == null || VALID_TEXT_ALIGN[val]) ? val : 'left';
    }

    function validTextVerticalAlign(val) {
        return (val == null || VALID_TEXT_VERTICAL_ALIGN[val]) ? val : 'top';
    }

    function getTextXForPadding(x, textAlign, outerWidth, textWidth, textPadding) {
        return textAlign === 'right'
            ? (x - textPadding[1])
            : textAlign === 'center'
            ? (x - outerWidth / 2 + textPadding[3] + textWidth / 2)
            : (x + textPadding[3]);
    }

    return helper;

});
