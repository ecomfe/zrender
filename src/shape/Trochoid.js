/**
 * zrender
 *
 * @author Neil (杨骥, yangji01@baidu.com)
 *
 * shape类：内外旋轮曲线
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'trochoid', // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过'zrender/tool/guid'方法生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 默认为0， 圆心的横坐标
           y             : {number},  // 默认为0， 圆心的纵坐标
           r            : {number},   // 必须，固定圆半径 内旋曲线时必须大于转动圆半径
           r0            : {number},  // 必须，转动圆半径
           d             : {number},  // 必须，点到内部转动圆的距离，等于r时曲线为摆线
           location      : {string},  // 默认为‘in’ 内旋 out 外旋
           strokeColor   : {color},   // 默认为'#000'，线条颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度
           lineCap       : {string},  // 默认为butt，线帽样式。butt | round | square

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为end，附加文本位置。
                                      // inside | start | end
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#000' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'hypotrochoid',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 100,
           y : 100,
           r : 50,
           r0 : 30,
           d  : 50,
           strokeColor : '#eee',
           lineWidth : 20,
           text : 'Baidu'
       },
       myName : 'kener',  //可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    function (require) {
        var Base = require('./Base');
        
        function Trochoid(options) {
            this.brushTypeOnly = 'stroke';  //线条只能描边，填充后果自负
            Base.call(this, options);
        }

        Trochoid.prototype =  {
            type: 'trochoid',

            /**
             * 创建线条路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
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

                //计算结束时的i
                do {
                  _num ++;
                }
                while ( ( _r * _num ) % ( _R + _delta * _r ) !== 0);

                do {
                    _theta = Math.PI / 180 * i;
                    _x2 = (_R + _delta * _r) * _math.cos(_theta)
                         - _delta * _d * _math.cos((_R / _r +  _delta) * _theta)
                         + _offsetX;
                    _y2 = (_R + _delta * _r) * _math.sin(_theta)
                         - _d * _math.sin((_R / _r + _delta) * _theta)
                         + _offsetY;
                    ctx.lineTo( _x2, _y2 );
                    i ++;
                }
                while (i <= ( _r * _num) / (_R + _delta * _r) * 360);


            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
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
                    x : - _s - lineWidth + _offsetX,
                    y : - _s - lineWidth + _offsetY,
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