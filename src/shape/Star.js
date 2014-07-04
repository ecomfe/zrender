/**
 * zrender
 *
 * @author sushuang (宿爽, sushuang@baidu.com)
 *
 * shape类：n角星（n>3）
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'star',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过'zrender/tool/guid'方法生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，n角星外接圆心横坐标
           y             : {number},  // 必须，n角星外接圆心纵坐标
           r             : {number},  // 必须，n角星外接圆半径
           r0            : {number},  // n角星内部顶点（凹点）的外接圆半径，
                                      // 如果不指定此参数，则自动计算：取相隔外部顶点连线的交点作内部顶点
           n             : {number},  // 必须，指明几角星
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效
           lineJoin      : {string},  // 默认为miter，线段连接样式。miter | round | bevel

           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为outside，附加文本位置。
                                      // outside | inside
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
       shape  : 'star',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           r : 150,
           n : 5,
           color : '#eee'
       },
       myName : 'kener',   // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    function (require) {

        var math = require('../tool/math');
        var sin = math.sin;
        var cos = math.cos;
        var PI = Math.PI;

        var Base = require('./Base');

        function Star(options) {
            Base.call(this, options);
        }

        Star.prototype = {
            type: 'star',

            /**
             * 创建n角星（n>3）路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                var n = style.n;
                if (!n || n < 2) { return; }

                var x = style.x;
                var y = style.y;
                var r = style.r;
                var r0 = style.r0;

                // 如果未指定内部顶点外接圆半径，则自动计算
                if (r0 == null) {
                    r0 = n > 4
                        // 相隔的外部顶点的连线的交点，
                        // 被取为内部交点，以此计算r0
                        ? r * cos(2 * PI / n) / cos(PI / n)
                        // 二三四角星的特殊处理
                        : r / 3;
                }

                var dStep = PI / n;
                var deg = -PI / 2;
                var xStart = x + r * cos(deg);
                var yStart = y + r * sin(deg);
                deg += dStep;

                // 记录边界点，用于判断inside
                var pointList = style.pointList = [];
                pointList.push([xStart, yStart]);
                for (var i = 0, end = n * 2 - 1, ri; i < end; i ++) {
                    ri = i % 2 === 0 ? r0 : r;
                    pointList.push([x + ri * cos(deg), y + ri * sin(deg)]);
                    deg += dStep;
                }
                pointList.push([xStart, yStart]);

                // 绘制
                ctx.moveTo(pointList[0][0], pointList[0][1]);
                for (var i = 0; i < pointList.length; i ++) {
                    ctx.lineTo(pointList[i][0], pointList[i][1]);
                }

                return;
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
                    x : Math.round(style.x - style.r - lineWidth / 2),
                    y : Math.round(style.y - style.r - lineWidth / 2),
                    width : style.r * 2 + lineWidth,
                    height : style.r * 2 + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Star, Base);
        return Star;
    }
);