/**
 * zrender
 */
define(
    function (require) {
        var Base = require('./Base');
        var dashedLineTo = require('./util/dashedLineTo');
        
        function Line(options) {
            this.brushTypeOnly = 'stroke';  //线条只能描边，填充后果自负
            this.textPosition = 'end';
            Base.call(this, options);
        }

        Line.prototype =  {
            type: 'line',

            /**
             * 创建线条路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                if (!style.lineType || style.lineType == 'solid') {
                    //默认为实线
                    ctx.moveTo(style.xStart, style.yStart);
                    ctx.lineTo(style.xEnd, style.yEnd);
                }
                else if (style.lineType == 'dashed'
                        || style.lineType == 'dotted'
                ) {
                    var dashLength = (style.lineWidth || 1)  
                                     * (style.lineType == 'dashed' ? 5 : 1);
                    dashedLineTo(
                        ctx,
                        style.xStart, style.yStart,
                        style.xEnd, style.yEnd,
                        dashLength
                    );
                }
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var lineWidth = style.lineWidth || 1;
                style.__rect = {
                    x : Math.min(style.xStart, style.xEnd) - lineWidth,
                    y : Math.min(style.yStart, style.yEnd) - lineWidth,
                    width : Math.abs(style.xStart - style.xEnd)
                            + lineWidth,
                    height : Math.abs(style.yStart - style.yEnd)
                             + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Line, Base);
        return Line;
    }
);