/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com) , 
 *         strwind (@劲风FEI, yaofeifei@baidu.com)
 *
 * shape类：矩形
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'rectangle',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过'zrender/tool/guid'方法生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，左上角横坐标
           y             : {number},  // 必须，左上角纵坐标
           width         : {number},  // 必须，宽度
           height        : {number},  // 必须，高度
           radius        : {array},   // 默认为[0]，圆角 
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
       shape  : 'rectangle',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           width : 150,
           height : 50,
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
        
        function Rectangle(options) {
            Base.call(this, options);
        }

        Rectangle.prototype =  {
            type: 'rectangle',

            /**
             * 绘制圆角矩形
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            _buildRadiusPath: function(ctx, style) {
                //左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
                //r缩写为1         相当于 [1, 1, 1, 1]
                //r缩写为[1]       相当于 [1, 1, 1, 1]
                //r缩写为[1, 2]    相当于 [1, 2, 1, 2]
                //r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]
                var x = style.x;
                var y = style.y;
                var width = style.width;
                var height = style.height;
                var r = style.radius;
                var r1; 
                var r2; 
                var r3; 
                var r4;
                  
                if(typeof r === 'number') {
                    r1 = r2 = r3 = r4 = r;
                }
                else if(r instanceof Array) {
                    if (r.length === 1) {
                        r1 = r2 = r3 = r4 = r[0];
                    }
                    else if(r.length === 2) {
                        r1 = r3 = r[0];
                        r2 = r4 = r[1];
                    }
                    else if(r.length === 3) {
                        r1 = r[0];
                        r2 = r4 = r[1];
                        r3 = r[2];
                    } else {
                        r1 = r[0];
                        r2 = r[1];
                        r3 = r[2];
                        r4 = r[3];
                    }
                } else {
                    r1 = r2 = r3 = r4 = 0;
                }
                ctx.moveTo(x + r1, y);
                ctx.lineTo(x + width - r2, y);
                r2 !== 0 && ctx.quadraticCurveTo(
                    x + width, y, x + width, y + r2
                );
                ctx.lineTo(x + width, y + height - r3);
                r3 !== 0 && ctx.quadraticCurveTo(
                    x + width, y + height, x + width - r3, y + height
                );
                ctx.lineTo(x + r4, y + height);
                r4 !== 0 && ctx.quadraticCurveTo(
                    x, y + height, x, y + height - r4
                );
                ctx.lineTo(x, y + r1);
                r1 !== 0 && ctx.quadraticCurveTo(x, y, x + r1, y);
            },
            
            /**
             * 创建矩形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                if(!style.radius) {
                    ctx.moveTo(style.x, style.y);
                    ctx.lineTo(style.x + style.width, style.y);
                    ctx.lineTo(style.x + style.width, style.y + style.height);
                    ctx.lineTo(style.x, style.y + style.height);
                    ctx.lineTo(style.x, style.y);
                    //ctx.rect(style.x, style.y, style.width, style.height);
                } else {
                    this._buildRadiusPath(ctx, style);
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
                    x : Math.round(style.x - lineWidth / 2),
                    y : Math.round(style.y - lineWidth / 2),
                    width : style.width + lineWidth,
                    height : style.height + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Rectangle, Base);
        return Rectangle;
    }
);