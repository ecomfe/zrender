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
        var area = require('../tool/area');
        
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
                
                if (typeof style.text == 'undefined') {
                    return;
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

                var text = (style.text + '').split('\n');
                var lineHeight = area.getTextHeight('国', style.textFont);
                var rect = this.getRect(style);
                var x = style.x;
                var y;
                if (style.textBaseline == 'top') {
                    y = rect.y;
                }
                else if (style.textBaseline == 'bottom') {
                    y = rect.y + lineHeight;
                }
                else {
                    y = rect.y + lineHeight / 2;
                }
                
                for (var i = 0, l = text.length; i < l; i++) {
                    if (style.maxWidth) {
                        switch (style.brushType) {
                            case 'fill':
                                ctx.fillText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                break;
                            case 'stroke':
                                ctx.strokeText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                break;
                            case 'both':
                                ctx.strokeText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                ctx.fillText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                break;
                            default:
                                ctx.fillText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                        }
                    }
                    else{
                        switch (style.brushType) {
                            case 'fill':
                                ctx.fillText(text[i], x, y);
                                break;
                            case 'stroke':
                                ctx.strokeText(text[i], x, y);
                                break;
                            case 'both':
                                ctx.strokeText(text[i], x, y);
                                ctx.fillText(text[i], x, y);
                                break;
                            default:
                                ctx.fillText(text[i], x, y);
                        }
                    }
                    y += lineHeight;
                }

                ctx.restore();
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var width = area.getTextWidth(style.text, style.textFont);
                var lineHeight = area.getTextHeight('国', style.textFont);
                
                var text = (style.text + '').split('\n');

                var textX = style.x;                 //默认start == left
                if (style.textAlign == 'end' || style.textAlign == 'right') {
                    textX -= width;
                }
                else if (style.textAlign == 'center') {
                    textX -= (width / 2);
                }

                var textY;
                if (style.textBaseline == 'top') {
                    textY = style.y;
                }
                else if (style.textBaseline == 'bottom') {
                    textY = style.y - lineHeight * text.length;
                }
                else {
                    // middle
                    textY = style.y - lineHeight * text.length / 2;
                }

                return {
                    x : textX,
                    y : textY,
                    width : width,
                    height : lineHeight * text.length
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
