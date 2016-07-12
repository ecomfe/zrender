define(function (require) {

    var textWidthCache = {};
    var textWidthCacheCounter = 0;
    var TEXT_CACHE_MAX = 5000;

    var util = require('../core/util');
    var BoundingRect = require('../core/BoundingRect');
    var retrieve = util.retrieve;

    function getTextWidth(text, textFont) {
        var key = text + ':' + textFont;
        if (textWidthCache[key]) {
            return textWidthCache[key];
        }

        var textLines = (text + '').split('\n');
        var width = 0;

        for (var i = 0, l = textLines.length; i < l; i++) {
            // measureText 可以被覆盖以兼容不支持 Canvas 的环境
            width = Math.max(textContain.measureText(textLines[i], textFont).width, width);
        }

        if (textWidthCacheCounter > TEXT_CACHE_MAX) {
            textWidthCacheCounter = 0;
            textWidthCache = {};
        }
        textWidthCacheCounter++;
        textWidthCache[key] = width;

        return width;
    }

    function getTextRect(text, textFont, textAlign, textBaseline) {
        var textLineLen = ((text || '') + '').split('\n').length;

        var width = getTextWidth(text, textFont);
        // FIXME 高度计算比较粗暴
        var lineHeight = getTextWidth('国', textFont);
        var height = textLineLen * lineHeight;

        var rect = new BoundingRect(0, 0, width, height);
        // Text has a special line height property
        rect.lineHeight = lineHeight;

        switch (textBaseline) {
            case 'bottom':
            case 'alphabetic':
                rect.y -= lineHeight;
                break;
            case 'middle':
                rect.y -= lineHeight / 2;
                break;
            // case 'hanging':
            // case 'top':
        }

        // FIXME Right to left language
        switch (textAlign) {
            case 'end':
            case 'right':
                rect.x -= rect.width;
                break;
            case 'center':
                rect.x -= rect.width / 2;
                break;
            // case 'start':
            // case 'left':
        }

        return rect;
    }

    function adjustTextPositionOnRect(textPosition, rect, textRect, distance) {

        var x = rect.x;
        var y = rect.y;

        var height = rect.height;
        var width = rect.width;

        var textHeight = textRect.height;

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
            textAlign: textAlign,
            textBaseline: 'top'
        };
    }

    /**
     * Show ellipsis if overflow.
     *
     * @param  {string} text
     * @param  {string} containerWidth
     * @param  {string} textFont
     * @param  {number} [ellipsis='...']
     * @param  {Object} [options]
     * @param  {number} [options.maxIterations=3]
     * @param  {number} [options.minChar=0] If truncate result are less
     *                  then minChar, ellipsis will not show, which is
     *                  better for user hint in some cases.
     * @param  {number} [options.placeholder=''] When all truncated, use the placeholder.
     * @return {string}
     */
    function truncateText(text, containerWidth, textFont, ellipsis, options) {
        if (!containerWidth) {
            return '';
        }

        options = options || {};

        ellipsis = retrieve(ellipsis, '...');
        var maxIterations = retrieve(options.maxIterations, 2);
        var minChar = retrieve(options.minChar, 0);
        // FIXME
        // Other languages?
        var cnCharWidth = getTextWidth('国', textFont);
        // FIXME
        // Consider proportional font?
        var ascCharWidth = getTextWidth('a', textFont);
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
            var lineWidth = getTextWidth(textLine, textFont);

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
                lineWidth = getTextWidth(textLine, textFont);
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

    var textContain = {

        getWidth: getTextWidth,

        getBoundingRect: getTextRect,

        adjustTextPositionOnRect: adjustTextPositionOnRect,

        truncateText: truncateText,

        measureText: function (text, textFont) {
            var ctx = util.getContext();
            ctx.font = textFont || '12px sans-serif';
            return ctx.measureText(text);
        }
    };

    return textContain;
});