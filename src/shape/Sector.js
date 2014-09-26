/**
 * 扇形
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 * @module zrender/shape/Sector
 * @example
 *     var Sector = require('zrender/shape/Sector');
 *     var shape = new Sector({
 *         style: {
 *             x: 100,
 *             y: 100,
 *             r: 60,
 *             r0: 30,
 *             startAngle: 0,
 *             endEngle: 180
 *         } 
 *     });
 *     zr.addShape(shape);
 */

/**
 * @typedef {Object} ISectorStyle
 * @property {number} x 圆心x坐标
 * @property {number} y 圆心y坐标
 * @property {number} r 外圆半径
 * @property {number} [r0=0] 内圆半径，指定后将出现内弧，同时扇边长度为`r - r0`
 * @property {number} startAngle 起始角度，`[0, 360)`
 * @property {number} endAngle 结束角度，`(0, 360]`
 * @property {string} [brushType='fill']
 * @property {string} [color='#000000'] 填充颜色
 * @property {string} [strokeColor='#000000'] 描边颜色
 * @property {string} [lineCape='butt'] 线帽样式，可以是 butt, round, square
 * @property {number} [lineWidth=1] 描边宽度
 * @property {number} [opacity=1] 绘制透明度
 * @property {number} [shadowBlur=0] 阴影模糊度，大于0有效
 * @property {string} [shadowColor='#000000'] 阴影颜色
 * @property {number} [shadowOffsetX=0] 阴影横向偏移
 * @property {number} [shadowOffsetY=0] 阴影纵向偏移
 * @property {string} [text] 图形中的附加文本
 * @property {string} [textColor='#000000'] 文本颜色
 * @property {string} [textFont] 附加文本样式，eg:'bold 18px verdana'
 * @property {string} [textPosition='end'] 附加文本位置, 可以是 inside, left, right, top, bottom
 * @property {string} [textAlign] 默认根据textPosition自动设置，附加文本水平对齐。
 *                                可以是start, end, left, right, center
 * @property {string} [textBaseline] 默认根据textPosition自动设置，附加文本垂直对齐。
 *                                可以是top, bottom, middle, alphabetic, hanging, ideographic
 */

define(
    function (require) {
        var math = require('../tool/math');
        var Base = require('./Base');

        /**
         * @alias module:zrender/shape/Sector
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Sector = function (options) {
            Base.call(this, options);
            /**
             * 扇形绘制样式
             * @name module:zrender/shape/Sector#style
             * @type {module:zrender/shape/Sector~ISectorStyle}
             */
            /**
             * 扇形高亮绘制样式
             * @name module:zrender/shape/Sector#highlightStyle
             * @type {module:zrender/shape/Sector~ISectorStyle}
             */
        };

        Sector.prototype = {
            type: 'sector',

            /**
             * 创建扇形路径
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Sector~ISectorStyle} style
             */
            buildPath : function (ctx, style) {
                var x = style.x;   // 圆心x
                var y = style.y;   // 圆心y
                var r0 = typeof style.r0 == 'undefined'     // 形内半径[0,r)
                         ? 0 : style.r0;
                var r = style.r;                            // 扇形外半径(0,r]
                var startAngle = style.startAngle;          // 起始角度[0,360)
                var endAngle = style.endAngle;              // 结束角度(0,360]

                if (Math.abs(endAngle - startAngle) >= 360) {
                    // 大于360度的扇形简化为圆环画法
                    ctx.arc(x, y, r, 0, Math.PI * 2, false);
                    if (r0 !== 0) {
                        ctx.moveTo(x + r0, y);
                        ctx.arc(x, y, r0, 0, Math.PI * 2, true);
                    }
                    return;
                }
                
                startAngle = math.degreeToRadian(startAngle);
                endAngle = math.degreeToRadian(endAngle);

                var PI2 = Math.PI * 2;
                var cosStartAngle = math.cos(startAngle);
                var sinStartAngle = math.sin(startAngle);
                ctx.moveTo(
                    cosStartAngle * r0 + x,
                    y - sinStartAngle * r0
                );

                ctx.lineTo(
                    cosStartAngle * r + x,
                    y - sinStartAngle * r
                );

                ctx.arc(x, y, r, PI2 - startAngle, PI2 - endAngle, true);

                ctx.lineTo(
                    math.cos(endAngle) * r0 + x,
                    y - math.sin(endAngle) * r0
                );

                if (r0 !== 0) {
                    ctx.arc(x, y, r0, PI2 - endAngle, PI2 - startAngle, false);
                }

                ctx.closePath();

                return;
            },

            /**
             * 返回扇形包围盒矩形
             * @param {module:zrender/shape/Sector~ISectorStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var x = style.x;   // 圆心x
                var y = style.y;   // 圆心y
                var r0 = typeof style.r0 == 'undefined'     // 形内半径[0,r)
                         ? 0 : style.r0;
                var r = style.r;                            // 扇形外半径(0,r]
                var startAngle = style.startAngle;          // 起始角度[0,360)
                var endAngle = style.endAngle;              // 结束角度(0,360]
                
                if (Math.abs(endAngle - startAngle) >= 360) {
                    // 大于360度的扇形简化为圆环bbox
                    style.__rect = require('./Ring').prototype.getRect(style);
                    return style.__rect;
                }
                
                startAngle = (720 + startAngle) % 360;
                endAngle = (720 + endAngle) % 360;
                if (endAngle <= startAngle) {
                    endAngle += 360;
                }
                var pointList = [];
                if (startAngle <= 90 && endAngle >= 90) {
                    pointList.push([
                        x, y - r
                    ]);
                }
                if (startAngle <= 180 && endAngle >= 180) {
                    pointList.push([
                        x - r, y
                    ]);
                }
                if (startAngle <= 270 && endAngle >= 270) {
                    pointList.push([
                        x, y + r
                    ]);
                }
                if (startAngle <= 360 && endAngle >= 360) {
                    pointList.push([
                        x + r, y
                    ]);
                }

                startAngle = math.degreeToRadian(startAngle);
                endAngle = math.degreeToRadian(endAngle);


                pointList.push([
                    math.cos(startAngle) * r0 + x,
                    y - math.sin(startAngle) * r0
                ]);

                pointList.push([
                    math.cos(startAngle) * r + x,
                    y - math.sin(startAngle) * r
                ]);

                pointList.push([
                    math.cos(endAngle) * r + x,
                    y - math.sin(endAngle) * r
                ]);

                pointList.push([
                    math.cos(endAngle) * r0 + x,
                    y - math.sin(endAngle) * r0
                ]);

                style.__rect = require('./Polygon').prototype.getRect({
                    brushType : style.brushType,
                    lineWidth : style.lineWidth,
                    pointList : pointList
                });
                
                return style.__rect;
            }
        };


        require('../tool/util').inherits(Sector, Base);
        return Sector;
    }
);
