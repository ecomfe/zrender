/**
 * 玫瑰线
 * @module zrender/shape/Rose
 * @author Neil (杨骥, 511415343@qq.com)
 * @example
 *     var Rose = require('zrender/shape/Rose');
 *     var shape = new Rose({
 *         style: {
 *             x: 100,
 *             y: 100,
 *             r1: 50,
 *             r2: 30,
 *             d: 50,
 *             strokeColor: '#eee',
 *             lineWidth: 3
 *         }
 *     });
 *     zr.addShape(shape);
 */

/**
 * @typedef {Object} IRoseStyle
 * @property {number} x 中心x坐标
 * @property {number} y 中心y坐标
 * @property {number} r 每个线条的最大长度
 * @property {number} k 花瓣数量，当n为1时，奇数即为花瓣数，偶数时花瓣数量翻倍
 * @property {number} [n=1] 必须为整数，与k共同决定花瓣的数量
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
         * @alias module:zrender/shape/Rose
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Rose = function (options) {
            this.brushTypeOnly = 'stroke';  // 线条只能描边，填充后果自负
            Base.call(this, options);
            /**
             * 玫瑰线绘制样式
             * @name module:zrender/shape/Rose#style
             * @type {module:zrender/shape/Rose~IRoseStyle}
             */
            /**
             * 玫瑰线高亮绘制样式
             * @name module:zrender/shape/Rose#highlightStyle
             * @type {module:zrender/shape/Rose~IRoseStyle}
             */
        };

        Rose.prototype =  {
            type: 'rose',

            /**
             * 创建玫瑰线路径
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Rose~IRoseStyle} style
             */
            buildPath : function (ctx, style) {
                var _x;
                var _y;
                var _R = style.r;
                var _r;
                var _k = style.k;
                var _n = style.n || 1;

                var _offsetX = style.x;
                var _offsetY = style.y;

                var _math = require('../tool/math');
                ctx.moveTo(_offsetX, _offsetY);

                for (var i = 0, _len = _R.length; i < _len ; i++) {
                    _r = _R[i];

                    for (var j = 0; j <= 360 * _n; j++) {
                        _x = _r
                             * _math.sin(_k / _n * j % 360, true)
                             * _math.cos(j, true)
                             + _offsetX;
                        _y = _r
                             * _math.sin(_k / _n * j % 360, true)
                             * _math.sin(j, true)
                             + _offsetY;
                        ctx.lineTo(_x, _y);
                    }
                }
            },

            /**
             * 返回玫瑰线包围盒矩形
             * @param {module:zrender/shape/Rose~IRoseStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var _R = style.r;
                var _offsetX = style.x;
                var _offsetY = style.y;
                var _max = 0;

                for (var i = 0, _len = _R.length; i < _len ; i++) {
                    if (_R[i] > _max) {
                        _max = _R[i];
                    }
                }
                style.maxr = _max;

                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                style.__rect = {
                    x : -_max - lineWidth + _offsetX,
                    y : -_max - lineWidth + _offsetY,
                    width : 2 * _max + 3 * lineWidth,
                    height : 2 * _max + 3 * lineWidth
                };
                return style.__rect;
            }
        };
        
        require('../tool/util').inherits(Rose, Base);
        return Rose;
    }
);
