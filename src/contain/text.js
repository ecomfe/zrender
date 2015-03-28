define(function (require) {

    var textWidthCache = {};
    var textWidthCacheCounter = 0;
    var TEXT_CACHE_MAX = 5000;

    var util = require('../core/util');

    function getTextWidth(text, textFont) {
        var key = text + ':' + textFont;
        if (textWidthCache[key]) {
            return textWidthCache[key];
        }

        var ctx = util.getContext();
        var textLines = (text + '').split('\n');
        var width = 0;

        ctx.font = textFont;
        for (var i = 0, l = textLines.length; i < l; i++) {
            width =  Math.max(ctx.measureText(textLines[i]).width, width);
        }

        if (textWidthCacheCounter > TEXT_CACHE_MAX) {
            textWidthCacheCounter = 0;
            textWidthCache = {};
        }
        textWidthCacheCounter++;
        textWidthCache[key] = width;

        return width;
    };

    function getTextRect(text, textFont, textAlign, textBaseline) {
        var textLineLen = text.split('\n').length;

        var width = getTextWidth(text, textFont);
        // FIXME 高度计算比较粗暴
        var lineHeight = getTextWidth('国', textFont);
        var height = textLineLen * lineHeight;

        var rect = {
            x: 0,
            y: 0,
            width: width,
            height: height,

            // Text has a special line height property
            lineHeight: lineHeight
        };

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
        };

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
    };

    return {
        getWidth: getTextWidth,

        getRect: getTextRect
    };
});