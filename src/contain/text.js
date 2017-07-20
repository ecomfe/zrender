define(function (require) {

    var util = require('../core/util');
    var BoundingRect = require('../core/BoundingRect');
    var retrieve = util.retrieve;

    var textWidthCache = {};
    var textWidthCacheCounter = 0;

    var TEXT_CACHE_MAX = 5000;
    var STYLE_REG = /\{([a-zA-Z_]+)\|([^}]*)\}/g;
    var DEFAULT_FONT = '12px sans-serif';

    /**
     * @public
     * @param {string} text
     * @param {string} font
     * @return {number} width
     */
    function getTextWidth(text, font) {
        font = font || DEFAULT_FONT;
        var key = text + ':' + font;
        if (textWidthCache[key]) {
            return textWidthCache[key];
        }

        var textLines = (text + '').split('\n');
        var width = 0;

        for (var i = 0, l = textLines.length; i < l; i++) {
            // measureText 可以被覆盖以兼容不支持 Canvas 的环境
            width = Math.max(measureText(textLines[i], font).width, width);
        }

        if (textWidthCacheCounter > TEXT_CACHE_MAX) {
            textWidthCacheCounter = 0;
            textWidthCache = {};
        }
        textWidthCacheCounter++;
        textWidthCache[key] = width;

        return width;
    }

    /**
     * @public
     * @param {string} text
     * @param {string} font
     * @param {string} [textAlign='left']
     * @param {string} [textVerticalAlign='top']
     * @param {Array.<number>} [textPadding]
     * @param {Object} [rich]
     * @return {Object} {x, y, width, height, lineHeight}
     */
    function getTextRect(text, font, textAlign, textVerticalAlign, textPadding, rich) {
        return rich
            ? getRichTextRect(text, font, textAlign, textVerticalAlign, textPadding, rich)
            : getPlainTextRect(text, font, textAlign, textVerticalAlign, textPadding);
    }

    function getPlainTextRect(text, font, textAlign, textVerticalAlign, textPadding) {
        var block = parsePlainText(text, font, textVerticalAlign);
        var outerWidth = getTextWidth(text, font);
        var outerHeight = block.height;

        if (textPadding) {
            outerWidth += textPadding[1] + textPadding[3];
            outerHeight += textPadding[0] + textPadding[2];
        }

        var x = adjustTextX(0, outerWidth, textAlign);
        var y = adjustTextY(0, outerHeight, textVerticalAlign);

        var rect = new BoundingRect(x, y, outerWidth, outerHeight);
        rect.lineHeight = block.lineHeight;

        return rect;
    }

    function getRichTextRect(text, font, textAlign, textVerticalAlign, textPadding, rich) {
        var block = parseRichText(text, {
            rich: rich,
            font: font,
            textAlign: textAlign,
            textPadding: textPadding
        });
        var width = block.outerWidth;
        var height = block.outerHeight;

        var x = adjustTextX(0, width, textAlign);
        var y = adjustTextY(0, height, textVerticalAlign);

        return new BoundingRect(x, y, width, height);
    }

    /**
     * @public
     * @param {number} x
     * @param {number} width
     * @param {string} [textAlign='left']
     * @return {number} Adjusted x.
     */
    function adjustTextX(x, width, textAlign) {
        // FIXME Right to left language
        if (textAlign === 'right') {
            x -= width;
        }
        else if (textAlign === 'center') {
            x -= width / 2;
        }
        return x;
    }

    /**
     * @public
     * @param {number} y
     * @param {number} height
     * @param {string} [textVerticalAlign='top']
     * @return {number} Adjusted y.
     */
    function adjustTextY(y, height, textVerticalAlign) {
        if (textVerticalAlign === 'middle') {
            y -= height / 2;
        }
        else if (textVerticalAlign === 'bottom') {
            y -= height;
        }
        return y;
    }

    /**
     * @public
     * @param {stirng} textPosition
     * @param {Object} rect {x, y, width, height}
     * @param {number} textHeight
     * @param {number} distance
     * @return {Object} {x, y, textAlign}
     */
    function adjustTextPositionOnRect(textPosition, rect, textHeight, distance) {

        var x = rect.x;
        var y = rect.y;

        var height = rect.height;
        var width = rect.width;

        var halfHeight = height / 2 - textHeight / 2;

        var textAlign = 'left';

        switch (textPosition) {
            case 'left':
                x -= distance;
                y += halfHeight;
                textAlign = 'right';
                break;
            case 'right':
                x += distance + width;
                y += halfHeight;
                textAlign = 'left';
                break;
            case 'top':
                x += width / 2;
                y -= distance + textHeight;
                textAlign = 'center';
                break;
            case 'bottom':
                x += width / 2;
                y += height + distance;
                textAlign = 'center';
                break;
            case 'inside':
                x += width / 2;
                y += halfHeight;
                textAlign = 'center';
                break;
            case 'insideLeft':
                x += distance;
                y += halfHeight;
                textAlign = 'left';
                break;
            case 'insideRight':
                x += width - distance;
                y += halfHeight;
                textAlign = 'right';
                break;
            case 'insideTop':
                x += width / 2;
                y += distance;
                textAlign = 'center';
                break;
            case 'insideBottom':
                x += width / 2;
                y += height - textHeight - distance;
                textAlign = 'center';
                break;
            case 'insideTopLeft':
                x += distance;
                y += distance;
                textAlign = 'left';
                break;
            case 'insideTopRight':
                x += width - distance;
                y += distance;
                textAlign = 'right';
                break;
            case 'insideBottomLeft':
                x += distance;
                y += height - textHeight - distance;
                break;
            case 'insideBottomRight':
                x += width - distance;
                y += height - textHeight - distance;
                textAlign = 'right';
                break;
        }

        return {
            x: x,
            y: y,
            textAlign: textAlign
        };
    }

    /**
     * Show ellipsis if overflow.
     *
     * @public
     * @param  {string} text
     * @param  {string} containerWidth
     * @param  {string} font
     * @param  {number} [ellipsis='...']
     * @param  {Object} [options]
     * @param  {number} [options.maxIterations=3]
     * @param  {number} [options.minChar=0] If truncate result are less
     *                  then minChar, ellipsis will not show, which is
     *                  better for user hint in some cases.
     * @param  {number} [options.placeholder=''] When all truncated, use the placeholder.
     * @return {string}
     */
    function truncateText(text, containerWidth, font, ellipsis, options) {
        if (!containerWidth) {
            return '';
        }

        options = options || {};

        ellipsis = retrieve(ellipsis, '...');
        var maxIterations = retrieve(options.maxIterations, 2);
        var minChar = retrieve(options.minChar, 0);
        // FIXME
        // Other languages?
        var cnCharWidth = getTextWidth('国', font);
        // FIXME
        // Consider proportional font?
        var ascCharWidth = getTextWidth('a', font);
        var placeholder = retrieve(options.placeholder, '');

        // Example 1: minChar: 3, text: 'asdfzxcv', truncate result: 'asdf', but not: 'a...'.
        // Example 2: minChar: 3, text: '维度', truncate result: '维', but not: '...'.
        var contentWidth = containerWidth = Math.max(0, containerWidth - 1); // Reserve some gap.
        for (var i = 0; i < minChar && contentWidth >= ascCharWidth; i++) {
            contentWidth -= ascCharWidth;
        }

        var ellipsisWidth = getTextWidth(ellipsis);
        if (ellipsisWidth > contentWidth) {
            ellipsis = '';
            ellipsisWidth = 0;
        }

        contentWidth = containerWidth - ellipsisWidth;

        var textLines = (text + '').split('\n');

        for (var i = 0, len = textLines.length; i < len; i++) {
            var textLine = textLines[i];
            var lineWidth = getTextWidth(textLine, font);

            if (lineWidth <= containerWidth) {
                continue;
            }

            for (var j = 0;; j++) {
                if (lineWidth <= contentWidth || j >= maxIterations) {
                    textLine += ellipsis;
                    break;
                }

                var subLength = j === 0
                    ? estimateLength(textLine, contentWidth, ascCharWidth, cnCharWidth)
                    : lineWidth > 0
                    ? Math.floor(textLine.length * contentWidth / lineWidth)
                    : 0;

                textLine = textLine.substr(0, subLength);
                lineWidth = getTextWidth(textLine, font);
            }

            if (textLine === '') {
                textLine = placeholder;
            }

            textLines[i] = textLine;
        }

        return textLines.join('\n');
    }

    function estimateLength(text, contentWidth, ascCharWidth, cnCharWidth) {
        var width = 0;
        var i = 0;
        for (var len = text.length; i < len && width < contentWidth; i++) {
            var charCode = text.charCodeAt(i);
            width += (0 <= charCode && charCode <= 127) ? ascCharWidth : cnCharWidth;
        }
        return i;
    }

    /**
     * @public
     * @param {string} font
     * @return {number} line height
     */
    function getLineHeight(font) {
        // FIXME A rough approach.
        return getTextWidth('国', font);
    }

    /**
     * @public
     * @param {string} text
     * @param {string} font
     * @return {Object} width
     */
    function measureText(text, font) {
        var ctx = util.getContext();
        ctx.font = font || DEFAULT_FONT;
        return ctx.measureText(text);
    }

    /**
     * @public
     * @param {string} text
     * @param {string} font
     * @return {Object} block: {lineHeight, lines, height}
     */
    function parsePlainText(text, font) {
        var lines = (text + '').split('\n');
        var lineHeight = getLineHeight(font);
        var height = lines.length * lineHeight;
        var y = 0;

        return {
            lines: lines,
            height: height,
            lineHeight: lineHeight,
            y: y
        };
    }

    /**
     * For example: 'some text {a|some text}other text{b|some text}xxx{c|}xxx'
     * Also consider 'bbbb{a|xxx\nzzz}xxxx\naaaa'.
     *
     * @public
     * @param {string} text
     * @param {Object} style
     * @param {Object} style.rich Styles of rich text.
     * @param {string} [style.font]
     * @param {string} [style.textAlign]
     * @return {Object} block
     * {
     *      width,
     *      height,
     *      lines: [{
     *          lineHeight,
     *          width,
     *          tokens: [[{
     *              styleName,
     *              text,
     *              width,      // include textPadding
     *              height,     // include textPadding
     *              textWidth, // pure text width
     *              textHeight, // pure text height
     *              lineHeihgt,
     *              font,
     *              textAlign,
     *              textVerticalAlign
     *          }], [...], ...]
     *      }, ...]
     * }
     * If styleName is undefined, it is plain text.
     */
    function parseRichText(text, style) {
        var block = {lines: [], width: 0, height: 0};

        text != null && (text += '');
        if (!text) {
            return block;
        }

        var lastIndex = STYLE_REG.lastIndex = 0;
        var result;
        while ((result = STYLE_REG.exec(text)) != null)  {
            var matchedIndex = result.index;
            if (matchedIndex > lastIndex) {
                pushTokens(block, text.substring(lastIndex, matchedIndex));
            }
            pushTokens(block, result[2], result[1]);
            lastIndex = STYLE_REG.lastIndex;
        }

        if (lastIndex < text.length) {
            pushTokens(block, text.substring(lastIndex, text.length));
        }

        var lines = block.lines;
        var baseLineHeight = textContain.getLineHeight(style.font);
        var blockHeight = 0;
        var blockWidth = 0;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var lineHeight = baseLineHeight;
            var lineWidth = 0;

            for (var j = 0; j < line.tokens.length; j++) {
                var token = line.tokens[j];
                var tokenStyle = style.rich[token.styleName] || {};
                // textPadding should not inherit from style.
                var textPadding = token.textPadding = tokenStyle.textPadding;

                // textFont has been asigned to font by `normalizeStyle`.
                var font = token.font = tokenStyle.font || style.font;

                // Real text height is used when textVerticalAlign specified in token.
                var textHeight = token.textHeight = textContain.getLineHeight(font);
                textPadding && (textHeight += textPadding[0] + textPadding[2]);
                token.height = textHeight;
                token.lineHeight = util.retrieve(tokenStyle.lineHeight, style.lineHeight, textHeight);

                token.textAlign = tokenStyle && tokenStyle.textAlign || style.textAlign;
                token.textVerticalAlign = tokenStyle && tokenStyle.textVerticalAlign || 'middle';

                var textWidth = token.textWidth = textContain.getWidth(token.text, font);
                var tokenWidth = tokenStyle.width;
                if (tokenWidth == null) {
                    tokenWidth = textWidth;
                    textPadding && (tokenWidth += textPadding[1] + textPadding[3]);
                }
                lineWidth += (token.width = tokenWidth);
                tokenStyle && (lineHeight = Math.max(lineHeight, token.lineHeight));
            }

            line.width = lineWidth;
            line.lineHeight = lineHeight;
            blockHeight += lineHeight;
            blockWidth = Math.max(blockWidth, lineWidth);
        }

        block.outerWidth = block.width = blockWidth;
        block.outerHeight = block.height = blockHeight;

        var textPadding = style.textPadding;
        if (textPadding) {
            block.outerWidth += textPadding[1] + textPadding[3];
            block.outerHeight += textPadding[0] + textPadding[2];
        }

        return block;
    }

    function pushTokens(block, str, styleName) {
        var strs = str.split('\n');
        var lines = block.lines;

        for (var i = 0; i < strs.length; i++) {
            var token = {
                styleName: styleName,
                text: strs[i]
            };
            // Other tokens always start a new line.
            if (i) {
                // If there is '', insert it as a placeholder.
                lines.push({tokens: [token]});
            }
            // The first token should be appended to the last line.
            else {
                var tokens = (lines[lines.length - 1] || (lines[0] = {tokens: []})).tokens;
                // Consider ''.split('\n') => ['', '\n', ''], the '' at the first item
                // (which is a placeholder) should be replaced by new token.
                (tokens.length === 1 && !tokens[0].text)
                    ? (tokens[0] = token)
                    // Consider '', only insert when it is the first item.
                    // Otherwise a redundant '' will affect textAlign in line.
                    : ((token.text || !tokens.length) && tokens.push(token));
            }
        }
    }

    var textContain = {

        getWidth: getTextWidth,

        getBoundingRect: getTextRect,

        adjustTextPositionOnRect: adjustTextPositionOnRect,

        truncateText: truncateText,

        measureText: measureText,

        getLineHeight: getLineHeight,

        parsePlainText: parsePlainText,

        parseRichText: parseRichText,

        adjustTextX: adjustTextX,

        adjustTextY: adjustTextY,

        DEFAULT_FONT: DEFAULT_FONT
    };

    return textContain;
});