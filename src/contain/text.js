define(function (require) {

    var textWidthCache = {};
    var textWidthCacheCounter = 0;
    var TEXT_CACHE_MAX = 5000;

    var util = require('../core/util');
    var BoundingRect = require('../core/BoundingRect');

    function getTextWidth(text, textFont) {
        var key = text + ':' + textFont;
        if (textWidthCache[key]) {
            return textWidthCache[key];
        }

        var textLines = (text + '').split('\n');
        var width = 0;

        for (var i = 0, l = textLines.length; i < l; i++) {
            // measureText 可以被覆盖以兼容不支持 Canvas 的环境
            width =  Math.max(textContain.measureText(textLines[i], textFont).width, width);
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

        var textWidth = textRect.width;
        var textHeight = textRect.height;

        var halfWidth = width / 2 - textWidth / 2;
        var halfHeight = height / 2 - textHeight / 2;

        switch (textPosition) {
            case 'left':
                x -= distance + textWidth;
                y += halfHeight;
                break;
            case 'right':
                x += width + distance;
                y += halfHeight;
                break;
            case 'top':
                x += halfWidth;
                y -= distance + textHeight;
                break;
            case 'bottom':
                x += halfWidth;
                y += height + distance;
                break;
            case 'inside':
                x += halfWidth;
                y += halfHeight;
                break;
            case 'insideLeft':
                x += distance;
                y += halfHeight;
                break;
            case 'insideRight':
                x += width - textWidth - distance;
                y += halfHeight;
                break;
            case 'insideTop':
                x += halfWidth;
                y += distance;
                break;
            case 'insideBottom':
                x += halfWidth;
                y += height - textHeight - distance;
                break;
            case 'insideTopLeft':
                x += distance;
                y += distance;
                break;
            case 'insideTopRight':
                x += width - textWidth - distance;
                y += distance;
                break;
            case 'insideBottomLeft':
                x += distance;
                y += height - textHeight - distance;
                break;
            case 'insideBottomRight':
                x += width - textWidth - distance;
                y += height - textHeight - distance;
                break;
        }

        return {
            x: x,
            y: y
        };
    }

    /**
     * Show ellipsis if overflow.
     *
     * @param  {string} text
     * @param  {string} textFont
     * @param  {string} containerWidth
     * @param  {Object} [options]
     * @param  {number} [options.ellipsis='...']
     * @param  {number} [options.maxIterations=3]
     * @param  {number} [options.minCharacters=3]
     * @return {string}
     */
    function textEllipsis(text, textFont, containerWidth, options) {
        if (!containerWidth) {
            return '';
        }

        options = util.defaults({
            ellipsis: '...',
            minCharacters: 3,
            maxIterations: 3,
            cnCharWidth: getTextWidth('国', textFont),
            // FIXME
            // 未考虑非等宽字体
            ascCharWidth: getTextWidth('a', textFont)
        }, options, true);

        containerWidth -= getTextWidth(options.ellipsis);

        var textLines = (text + '').split('\n');

        for (var i = 0, len = textLines.length; i < len; i++) {
            textLines[i] = textLineTruncate(
                textLines[i], textFont, containerWidth, options
            );
        }

        return textLines.join('\n');
    }

    function textLineTruncate(text, textFont, containerWidth, options) {
        // FIXME
        // 粗糙得写的，尚未考虑性能和各种语言、字体的效果。
        for (var i = 0;; i++) {
            var lineWidth = getTextWidth(text, textFont);

            if (lineWidth < containerWidth || i >= options.maxIterations) {
                text += options.ellipsis;
                break;
            }

            var subLength = i === 0
                ? estimateLength(text, containerWidth, options)
                : Math.floor(text.length * containerWidth / lineWidth);

            if (subLength < options.minCharacters) {
                text = '';
                break;
            }

            text = text.substr(0, subLength);
        }

        return text;
    }

    function estimateLength(text, containerWidth, options) {
        var width = 0;
        var i = 0;
        for (var len = text.length; i < len && width < containerWidth; i++) {
            var charCode = text.charCodeAt(i);
            width += (0 <= charCode && charCode <= 127)
                ? options.ascCharWidth : options.cnCharWidth;
        }
        return i;
    }

    var textContain = {

        getWidth: getTextWidth,

        getBoundingRect: getTextRect,

        adjustTextPositionOnRect: adjustTextPositionOnRect,

        ellipsis: textEllipsis,

        measureText: function (text, textFont) {
            var ctx = util.getContext();
            ctx.font = textFont;
            return ctx.measureText(text);
        }

    };

    return textContain;
});