/**
 * zrender
 *
 * @author Neil (杨骥, yangji01@baidu.com)
 *
 * shape类：玫瑰线
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'rose', // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过'zrender/tool/guid'方法生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 默认为0， 圆心的横坐标
           y             : {number},  // 默认为0， 圆心的纵坐标
           r             : {Array<number>},  // 必须，每个线条的最大长度
           k             : {number},  // 必须，决定花瓣数量，当n为1时，奇数即为花瓣数，偶数时花瓣数量翻倍
           n             : {number=},  // 默认为1，必须为整数，与k共同决定花瓣的数量
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
       shape  : 'rose',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 100,
           y : 100,
           r1 : 50,
           r2 : 30,
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
        
        function Rose(options) {
            this.brushTypeOnly = 'stroke';  //线条只能描边，填充后果自负
            Base.call(this, options);
        }

        Rose.prototype =  {
            type: 'rose',

            /**
             * 创建线条路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
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

                for (var i = 0, _len = _R.length; i < _len ; i ++) {
                    _r = _R[i];

                    for (var j = 0; j <= 360 * _n; j ++) {
                        _x = _r
                             * _math.sin(_k / _n * j % 360, true)
                             * _math.cos( j, true)
                             + _offsetX;
                        _y = _r
                             * _math.sin(_k / _n * j % 360, true)
                             * _math.sin( j, true)
                             + _offsetY;
                        ctx.lineTo( _x, _y );
                    }
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
                
                var _R = style.r;
                var _offsetX = style.x;
                var _offsetY = style.y;
                var _max = 0;

                for (var i = 0, _len = _R.length; i < _len ; i ++) {
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
                    x : - _max - lineWidth + _offsetX,
                    y : - _max - lineWidth + _offsetY,
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