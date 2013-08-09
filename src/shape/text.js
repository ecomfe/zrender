/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：文字
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'text',         // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，横坐标
           y             : {number},  // 必须，纵坐标
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，线条颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 必须，文本内容
           textFont      : {string},  // 默认为null，文本文字样式，eg:'bold 18px verdana'
           textAlign     : {string},  // 默认为start，文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认为middle，文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           maxWidth      : {number}   // 默认为null，最大宽度
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
       shape  : 'text',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           color : 'red',
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
    function(require) {
        function Text() {
            this.type = 'text';
        }

        Text.prototype =  {
            /**
             * 画刷，重载基类方法
             * @param {Context2D} ctx Canvas 2D上下文
             * @param e 图形形状实体
             * @param isHighlight 是否为高亮状态
             */
            brush : function(ctx, e, isHighlight) {
                var style = e.style || {};
                if (isHighlight) {
                    // 根据style扩展默认高亮样式
                    style = this.getHighlightStyle(
                        style, e.highlightStyle || {}
                    );
                }

                ctx.save();
                this.setContext(ctx, style);

                // 设置transform
                if (e.__needTransform) {
                    ctx.transform.apply(ctx,this.updateTransform(e));
                }

                if (style.textFont) {
                    ctx.font = style.textFont;
                }
                ctx.textAlign = style.textAlign || 'start';
                ctx.textBaseline = style.textBaseline || 'middle';

                if (style.maxWidth) {
                    switch (style.brushType) {
                        case 'fill':
                            ctx.fillText(
                                style.text,
                                style.x, style.y, style.maxWidth
                            );
                            break;
                        case 'stroke':
                            ctx.strokeText(
                                style.text,
                                style.x, style.y, style.maxWidth
                            );
                            break;
                        case 'both':
                            ctx.strokeText(
                                style.text,
                                style.x, style.y, style.maxWidth
                            );
                            ctx.fillText(
                                style.text,
                                style.x, style.y, style.maxWidth
                            );
                            break;
                        default:
                            ctx.fillText(
                                style.text,
                                style.x, style.y, style.maxWidth
                            );
                    }
                }
                else{
                    switch (style.brushType) {
                        case 'fill':
                            ctx.fillText(style.text, style.x, style.y);
                            break;
                        case 'stroke':
                            ctx.strokeText(style.text, style.x, style.y);
                            break;
                        case 'both':
                            ctx.strokeText(style.text, style.x, style.y);
                            ctx.fillText(style.text, style.x, style.y);
                            break;
                        default:
                            ctx.fillText(style.text, style.x, style.y);
                    }
                }

                ctx.restore();
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var area = require('../tool/area');

                var width =  area.getTextWidth(style.text, style.textFont);
                var height = area.getTextWidth('国', style.textFont); //比较粗暴

                var textX = style.x;                 //默认start == left
                if (style.textAlign == 'end' || style.textAlign == 'right') {
                    textX -= width;
                }
                else if (style.textAlign == 'center') {
                    textX -= (width / 2);
                }

                var textY = style.y - height / 2;    //默认middle
                if (style.textBaseline == 'top') {
                    textY += height / 2;
                }
                else if (style.textBaseline == 'bottom') {
                    textX -= height / 2;
                }

                return {
                    x : textX,
                    y : textY,
                    width : width,
                    height : height
                };
            }
        };

        var base = require('./base');
        base.derive(Text);
        
        var shape = require('../shape');
        shape.define('text', new Text());

        return Text;
    }
);
