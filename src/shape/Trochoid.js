/**
 * 内外旋轮曲线
 * @module zrender/shape/Trochold
 * @author Neil (杨骥, 511415343@qq.com)
 * @example
 *     var Trochold = require('zrender/shape/Trochold');
 *     var shape = new Trochold({
 *         style: {
 *             x: 100,
 *             y: 100,
 *             r: 50,
 *             r0: 30,
 *             d: 50,
 *             strokeColor: '#eee',
 *             text: 'trochold'
 *         }
 *     });
 *     zr.addShape(shape);
 */

/**
 * @typedef {Object} ITrocholdStyle
 * @property {number} x 中心x坐标
 * @property {number} y 中心y坐标
 * @property {number} r 固定圆半径 内旋曲线时必须大于转动圆半径
 * @property {number} r0 转动圆半径
 * @property {number} d 点到内部转动圆的距离，等于r时曲线为摆线
 * @property {string} [location='in'] 内旋 out 外旋
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
        var Base = require('./Base');
        
        /**
         * @alias module:zrender/shape/Trochold
         * @param {Object} options
         * @constructor
         * @extends zrender/shape/Base
         */
        var Trochoid = function (options) {
            this.brushTypeOnly = 'stroke';  // 线条只能描边，填充后果自负
            Base.call(this, options);
            /**
             * 内外旋轮曲线绘制样式
             * @name module:zrender/shape/Trochold#style
             * @type {module:zrender/shape/Trochold~ITrocholdStyle}
             */
            /**
             * 内外旋轮曲线高亮绘制样式
             * @name module:zrender/shape/Trochold#highlightStyle
             * @type {module:zrender/shape/Trochold~ITrocholdStyle}
             */
        };

        Trochoid.prototype =  {
            type: 'trochoid',

            /**
             * 创建内外旋轮曲线路径
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Trochold~ITrocholdStyle} style
             */
            buildPath : function (ctx, style) {
                var _x1;
                var _y1;
                var _x2;
                var _y2;
                var _R = style.r;
                var _r = style.r0;
                var _d = style.d;
                var _offsetX = style.x;
                var _offsetY = style.y;
                var _delta = style.location == 'out' ? 1 : -1;

                var _math = require('../tool/math');

                if (style.location && _R <= _r) {
                    alert('参数错误');
                    return;
                }

                var _num = 0;
                var i = 1;
                var _theta;

                _x1 = (_R + _delta * _r) * _math.cos(0)
                    - _delta * _d * _math.cos(0) + _offsetX;
                _y1 = (_R + _delta * _r) * _math.sin(0)
                    - _d * _math.sin(0) + _offsetY;

                ctx.moveTo(_x1, _y1);

                // 计算结束时的i
                do {
                    _num++;
                }
                while ((_r * _num) % (_R + _delta * _r) !== 0);

                do {
                    _theta = Math.PI / 180 * i;
                    _x2 = (_R + _delta * _r) * _math.cos(_theta)
                         - _delta * _d * _math.cos((_R / _r +  _delta) * _theta)
                         + _offsetX;
                    _y2 = (_R + _delta * _r) * _math.sin(_theta)
                         - _d * _math.sin((_R / _r + _delta) * _theta)
                         + _offsetY;
                    ctx.lineTo(_x2, _y2);
                    i++;
                }
                while (i <= (_r * _num) / (_R + _delta * _r) * 360);


            },

            /**
             * 返回内外旋轮曲线包围盒矩形
             * @param {module:zrender/shape/Trochold~ITrocholdStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var _R = style.r;
                var _r = style.r0;
                var _d = style.d;
                var _delta = style.location == 'out' ? 1 : -1;
                var _s = _R + _d + _delta * _r;
                var _offsetX = style.x;
                var _offsetY = style.y;

                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                style.__rect = {
                    x : -_s - lineWidth + _offsetX,
                    y : -_s - lineWidth + _offsetY,
                    width : 2 * _s + 2 * lineWidth,
                    height : 2 * _s + 2 * lineWidth
                };
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Trochoid, Base);
        return Trochoid;
    }
);
