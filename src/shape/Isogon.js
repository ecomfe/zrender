/**
 * 正多边形
 * @module zrender/shape/Isogon
 * @author sushuang (宿爽, sushuang0322@gmail.com)
 */

/**
 * @typedef {Object} IIsogonStyle
 * @property {number} x 正n边形外接圆心x坐标
 * @property {number} y 正n边形外接圆心y坐标
 * @property {number} r 正n边形外接圆半径
 * @property {number} n 指明正几边形
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
        var sin = math.sin;
        var cos = math.cos;
        var PI = Math.PI;

        var Base = require('./Base');

        /**
         * @constructor
         * @alias module:zrender/shape/Isogon
         * @param {Object} options
         */
        function Isogon(options) {
            Base.call(this, options);
            /**
             * 多边形绘制样式
             * @name module:zrender/shape/Isogon#style
             * @type {module:zrender/shape/Isogon~IIsogonStyle}
             */
            /**
             * 多边形高亮绘制样式
             * @name module:zrender/shape/Isogon#highlightStyle
             * @type {module:zrender/shape/Isogon~IIsogonStyle}
             */
        }

        Isogon.prototype = {
            type: 'isogon',

            /**
             * 创建n角星（n>=3）路径
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Isogon~IIsogonStyle} style
             */
            buildPath : function (ctx, style) {
                var n = style.n;
                if (!n || n < 2) {
                    return;
                }

                var x = style.x;
                var y = style.y;
                var r = style.r;

                var dStep = 2 * PI / n;
                var deg = -PI / 2;
                var xStart = x + r * cos(deg);
                var yStart = y + r * sin(deg);
                deg += dStep;

                // 记录边界点，用于判断insight
                var pointList = style.pointList = [];
                pointList.push([ xStart, yStart ]);
                for (var i = 0, end = n - 1; i < end; i++) {
                    pointList.push([ x + r * cos(deg), y + r * sin(deg) ]);
                    deg += dStep;
                }
                pointList.push([ xStart, yStart ]);

                // 绘制
                ctx.moveTo(pointList[0][0], pointList[0][1]);
                for (var i = 0; i < pointList.length; i++) {
                    ctx.lineTo(pointList[i][0], pointList[i][1]);
                }
                ctx.closePath();

                return;
            },

            /**
             * 计算返回正多边形的包围盒矩形
             * @param {module:zrender/shape/Isogon~IIsogonStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                style.__rect = {
                    x : Math.round(style.x - style.r - lineWidth / 2),
                    y : Math.round(style.y - style.r - lineWidth / 2),
                    width : style.r * 2 + lineWidth,
                    height : style.r * 2 + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Isogon, Base);
        return Isogon;
    }
);
