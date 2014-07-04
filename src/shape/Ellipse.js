/**
 * zrender
 *
 * author: loutongbing@baidu.com
 *
 * shape类：椭圆
 * Todo：excanvas bug ~ 连续scale保持?? IE8下不建议使用
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'ellipse',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过'zrender/tool/guid'方法生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，椭圆心横坐标
           y             : {number},  // 必须，椭圆心纵坐标
           a             : {number},  // 必须，椭圆横轴半径
           b             : {number},  // 必须，椭圆纵轴半径
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
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
       shape  : 'ellipse',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           a : 100,
           b : 50,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    function (require) {
        var Base = require('./Base');

        function Ellipse(options) {
            Base.call(this, options);
        }

        Ellipse.prototype = {
            type: 'ellipse',

            /**
             * 创建圆形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                var k = 0.5522848;
                var x = style.x;
                var y = style.y;
                var a =style.a;
                var b = style.b;
                var ox = a * k; // 水平控制点偏移量
                var oy = b * k; // 垂直控制点偏移量
                //从椭圆的左端点开始顺时针绘制四条三次贝塞尔曲线
                ctx.moveTo(x - a, y);
                ctx.bezierCurveTo(x - a, y - oy, x - ox, y - b, x, y - b);
                ctx.bezierCurveTo(x + ox, y - b, x + a, y - oy, x + a, y);
                ctx.bezierCurveTo(x + a, y + oy, x + ox, y + b, x, y + b);
                ctx.bezierCurveTo(x - ox, y + b, x - a, y + oy, x - a, y);
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
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
                    x : Math.round(style.x - style.a - lineWidth / 2),
                    y : Math.round(style.y - style.b - lineWidth / 2),
                    width : style.a * 2 + lineWidth,
                    height : style.b * 2 + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Ellipse, Base);
        return Ellipse;
    }
);