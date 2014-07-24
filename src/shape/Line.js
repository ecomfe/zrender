/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：直线
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'line',         // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过'zrender/tool/guid'方法生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           xStart        : {number},  // 必须，起点横坐标
           yStart        : {number},  // 必须，起点纵坐标
           xEnd          : {number},  // 必须，终点横坐标
           yEnd          : {number},  // 必须，终点纵坐标
           strokeColor   : {color},   // 默认为'#000'，线条颜色（轮廓），支持rgba
           lineType      : {string},  // 默认为solid，线条类型，solid | dashed | dotted
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
       shape  : 'line',
       id     : '123456',
       zlevel : 1,
       style  : {
           xStart : 100,
           yStart : 100,
           xEnd : 200,
           yEnd : 200,
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