/**
 * zrender
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * desc:    zrender是一个轻量级的Canvas类库，MVC封装，数据驱动，提供类Dom事件模型。
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 * 
 * shape类：圆
 * 可配图形属性：
   {   
       // 基础属性
       shape  : 'circle',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见
       
       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，圆心横坐标
           y             : {number},  // 必须，圆心纵坐标
           r             : {number},  // 必须，圆半径
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
           r : 50,
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
        function Circle() {
            this.type = 'circle';
        }
        
        Circle.prototype =  {
            /**
             * 创建圆形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                ctx.arc(style.x, style.y, style.r, 0, Math.PI * 2, true);
                return;
            },
            
            /**
             * 返回矩形区域，用于局部刷新和文字定位 
             * @param {Object} style
             */
            getRect : function(style) {
                return {
                    x : style.x - style.r,
                    y : style.y - style.r,
                    width : style.r * 2,
                    height : style.r * 2
                }
            }
        }
        
        var base = require('./base');
        base.derive(Circle);
        
        return Circle;
    }
);