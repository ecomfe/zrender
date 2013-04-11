/*
 * zrender
 * Copyright 2012 Baidu Inc. All rights reserved.
 * 
 * desc:    zrender是一个Canvas绘图类库，mvc封装实现数据驱动绘图，图形事件封装
 * author:  loutongbing@baidu.com)
 * 
 * shape类：椭圆
 * 可配图形属性：
   {   
       // 基础属性
       shape  : 'ellipse',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
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
           
           alpha         : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上
           
           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本文字样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle | 
                                      // alphabetic | hanging | ideographic 
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // textPosition == 'inside' ? '#fff' : color
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
       shape  : 'circle',
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
    function(require) {
        function Ellipse() {
            this.type = 'ellipse';
        }
        
        Ellipse.prototype =  {
            /**
             * 创建圆形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                 var r = (style.a > style.b) ? style.a : style.b; 
                 var ratioX = style.a / r; //横轴缩放比率
                 var ratioY = style.b / r;
                ctx.scale(ratioX, ratioY); 
                ctx.arc(style.x/ratioX, style.y/ratioY, r, 0, Math.PI * 2, true);
                ctx.scale(1/ratioX, 1/ratioY);
                return;
            },
            
            /**
             * 附加文本
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            drawText : function(ctx, style, isHighlight) {
                ctx.fillStyle = style.textColor;
                
                var al;         // 文本水平对齐
                var bl;         // 文本垂直对齐
                var tx;         // 文本横坐标
                var ty;         // 文本纵坐标
                
                // 文本与图形间空白间隙
                var dd_x = 10 + (style.a - 0);  
                var dd_y = 10 + (style.b - 0);  
                
                switch (style.textPosition) {
                    case "inside":
                        tx = style.x;
                        ty = style.y;
                        al = 'center';
                        bl = 'middle';
                        if (style.brushType != 'stroke'
                            && style.textColor == style.color
                        ) {
                            ctx.fillStyle = '#fff';
                        }
                        break;
                    case "left":
                        tx = style.x - dd_x;
                        ty = style.y;
                        al = 'end';
                        bl = 'middle';
                        break;
                    case "right":
                        tx = style.x + dd_x;
                        ty = style.y;
                        al = 'start';
                        bl = 'middle';
                        break;
                    case "bottom":
                        tx = style.x;
                        ty = style.y + dd_y;
                        al = 'center';
                        bl = 'top';
                        break;
                    case "top":
                    default:
                        tx = style.x;
                        ty = style.y - dd_y;
                        al = 'center';
                        bl = 'bottom';
                        break;
                }
                
                if (style.textFont) {
                    ctx.font = style.textFont;
                }
                ctx.textAlign = style.textAlign || al;
                ctx.textBaseline = style.textBaseLine || bl;
                
                ctx.fillText(style.text, tx, ty);
            }
        }
        
        var base = require('./base');
        base.derive(Ellipse);
        
        return Ellipse;
    }
);