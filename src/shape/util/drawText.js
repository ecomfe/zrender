/**
 * 附加文本
 *
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 *          errorrik (errorrik@gmail.com)
 */

define(
    function ( require ) {
        var area = require('../../tool/area');

        function _fillText(ctx, text, x, y, textFont, textAlign, textBaseline) {
            if (textFont) {
                ctx.font = textFont;
            }
            ctx.textAlign = textAlign;
            ctx.textBaseline = textBaseline;
            var rect = _getTextRect(
                text, x, y, textFont, textAlign, textBaseline
            );
            
            text = (text + '').split('\n');
            var lineHeight = area.getTextHeight('国', textFont);
            
            switch (textBaseline) {
                case 'top':
                    y = rect.y;
                    break;
                case 'bottom':
                    y = rect.y + lineHeight;
                    break;
                default:
                    y = rect.y + lineHeight / 2;
            }
            
            for (var i = 0, l = text.length; i < l; i++) {
                ctx.fillText(text[i], x, y);
                y += lineHeight;
            }
        }

        /**
         * 返回矩形区域，用于局部刷新和文字定位
         * 
         * @inner
         * @param {Object} style
         */
        function _getTextRect(text, x, y, textFont, textAlign, textBaseline) {
            var width = area.getTextWidth(text, textFont);
            var lineHeight = area.getTextHeight('国', textFont);
            
            text = (text + '').split('\n');
            
            switch (textAlign) {
                case 'end':
                case 'right':
                    x -= width;
                    break;
                case 'center':
                    x -= (width / 2);
                    break;
            }

            switch (textBaseline) {
                case 'top':
                    break;
                case 'bottom':
                    y -= lineHeight * text.length;
                    break;
                default:
                    y -= lineHeight * text.length / 2;
            }

            return {
                x : x,
                y : y,
                width : width,
                height : lineHeight * text.length
            };
        }

        /**
         * 附加文本
         * 
         * @param {Context2D} ctx Canvas 2D上下文
         * @param {Object} style 样式
         * @param {Object} normalStyle 默认样式，用于定位文字显示
         */
        return function (ctx, style, normalStyle) {
            // 字体颜色策略
            style.textColor = style.textColor || style.color || style.strokeColor;
            ctx.fillStyle = style.textColor;

            if (style.textPosition == 'inside') {
                ctx.shadowColor = 'rgba(0,0,0,0)';   // 内部文字不带shadowColor
            }

            // 文本与图形间空白间隙
            var dd = 10;
            var al;         // 文本水平对齐
            var bl;         // 文本垂直对齐
            var tx;         // 文本横坐标
            var ty;         // 文本纵坐标

            var textPosition = style.textPosition       // 用户定义
                               || this.textPosition     // shape默认
                               || 'top';                // 全局默认

            switch (textPosition) {
                case 'inside': 
                case 'top': 
                case 'bottom': 
                case 'left': 
                case 'right': 
                    if (this.getRect) {
                        var rect = (normalStyle || style).__rect
                                   || this.getRect(normalStyle || style);

                        switch (textPosition) {
                            case 'inside':
                                tx = rect.x + rect.width / 2;
                                ty = rect.y + rect.height / 2;
                                al = 'center';
                                bl = 'middle';
                                if (style.brushType != 'stroke'
                                    && style.textColor == style.color
                                ) {
                                    ctx.fillStyle = '#fff';
                                }
                                break;
                            case 'left':
                                tx = rect.x - dd;
                                ty = rect.y + rect.height / 2;
                                al = 'end';
                                bl = 'middle';
                                break;
                            case 'right':
                                tx = rect.x + rect.width + dd;
                                ty = rect.y + rect.height / 2;
                                al = 'start';
                                bl = 'middle';
                                break;
                            case 'top':
                                tx = rect.x + rect.width / 2;
                                ty = rect.y - dd;
                                al = 'center';
                                bl = 'bottom';
                                break;
                            case 'bottom':
                                tx = rect.x + rect.width / 2;
                                ty = rect.y + rect.height + dd;
                                al = 'center';
                                bl = 'top';
                                break;
                        }
                    }
                    break;
                case 'start':
                case 'end':
                    var xStart;
                    var xEnd;
                    var yStart;
                    var yEnd;
                    if (typeof style.pointList != 'undefined') {
                        var pointList = style.pointList;
                        if (pointList.length < 2) {
                            // 少于2个点就不画了~
                            return;
                        }
                        var length = pointList.length;
                        switch (textPosition) {
                            case 'start':
                                xStart = pointList[0][0];
                                xEnd = pointList[1][0];
                                yStart = pointList[0][1];
                                yEnd = pointList[1][1];
                                break;
                            case 'end':
                                xStart = pointList[length - 2][0];
                                xEnd = pointList[length - 1][0];
                                yStart = pointList[length - 2][1];
                                yEnd = pointList[length - 1][1];
                                break;
                        }
                    }
                    else {
                        xStart = style.xStart || 0;
                        xEnd = style.xEnd || 0;
                        yStart = style.yStart || 0;
                        yEnd = style.yEnd || 0;
                    }

                    switch (textPosition) {
                        case 'start':
                            al = xStart < xEnd ? 'end' : 'start';
                            bl = yStart < yEnd ? 'bottom' : 'top';
                            tx = xStart;
                            ty = yStart;
                            break;
                        case 'end':
                            al = xStart < xEnd ? 'start' : 'end';
                            bl = yStart < yEnd ? 'top' : 'bottom';
                            tx = xEnd;
                            ty = yEnd;
                            break;
                    }
                    dd -= 4;
                    if (xStart != xEnd) {
                        tx -= (al == 'end' ? dd : -dd);
                    } 
                    else {
                        al = 'center';
                    }

                    if (yStart != yEnd) {
                        ty -= (bl == 'bottom' ? dd : -dd);
                    } 
                    else {
                        bl = 'middle';
                    }
                    break;
                case 'specific':
                    tx = style.textX || 0;
                    ty = style.textY || 0;
                    al = 'start';
                    bl = 'middle';
                    break;
            }

            if (tx != null && ty != null) {
                _fillText(
                    ctx,
                    style.text, 
                    tx, ty, 
                    style.textFont,
                    style.textAlign || al,
                    style.textBaseline || bl
                );
            }
        };
    }
);
