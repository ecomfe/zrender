/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：扇形
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'sector',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，圆心横坐标
           y             : {number},  // 必须，圆心纵坐标
           r0            : {number},  // 默认为0，内圆半径，指定后将出现内弧，同时扇边长度 = r - r0
           r             : {number},  // 必须，外圆半径
           startAngle    : {number},  // 必须，起始角度[0, 360)
           endAngle      : {number},  // 必须，结束角度(0, 360]
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
       shape  : 'sector',
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
        var math = require('../tool/math');

        function Sector() {
            this.type = 'sector';
        }

        Sector.prototype = {
            /**
             * 创建扇形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                var x = style.x;   // 圆心x
                var y = style.y;   // 圆心y
                var r0 = typeof style.r0 == 'undefined'     // 形内半径[0,r)
                         ? 0 : style.r0;
                var r = style.r;                            // 扇形外半径(0,r]
                var startAngle = style.startAngle;          // 起始角度[0,360)
                var endAngle = style.endAngle;              // 结束角度(0,360]
                var PI2 = Math.PI * 2;

                startAngle = math.degreeToRadian(startAngle);
                endAngle = math.degreeToRadian(endAngle);

                //sin&cos已经在tool.math中缓存了，放心大胆的重复调用
                ctx.moveTo(
                    math.cos(startAngle) * r0 + x,
                    y - math.sin(startAngle) * r0
                );

                ctx.lineTo(
                    math.cos(startAngle) * r + x,
                    y - math.sin(startAngle) * r
                );

                ctx.arc(x, y, r, PI2 - startAngle, PI2 - endAngle, true);

                ctx.lineTo(
                    math.cos(endAngle) * r0 + x,
                    y - math.sin(endAngle) * r0
                );

                if (r0 !== 0) {
                    ctx.arc(x, y, r0, PI2 - endAngle, PI2 - startAngle, false);
                }

                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var x = style.x;   // 圆心x
                var y = style.y;   // 圆心y
                var r0 = typeof style.r0 == 'undefined'     // 形内半径[0,r)
                         ? 0 : style.r0;
                var r = style.r;                            // 扇形外半径(0,r]
                var startAngle = style.startAngle;          // 起始角度[0,360)
                var endAngle = style.endAngle;              // 结束角度(0,360]
                var pointList = [];
                if (startAngle < 90 && endAngle > 90) {
                    pointList.push([
                        x, y - r
                    ]);
                }
                if (startAngle < 180 && endAngle > 180) {
                    pointList.push([
                        x - r, y
                    ]);
                }
                if (startAngle < 270 && endAngle > 270) {
                    pointList.push([
                        x, y + r
                    ]);
                }
                if (startAngle < 360 && endAngle > 360) {
                    pointList.push([
                        x + r, y
                    ]);
                }

                startAngle = math.degreeToRadian(startAngle);
                endAngle = math.degreeToRadian(endAngle);


                pointList.push([
                    math.cos(startAngle) * r0 + x,
                    y - math.sin(startAngle) * r0
                ]);

                pointList.push([
                    math.cos(startAngle) * r + x,
                    y - math.sin(startAngle) * r
                ]);

                pointList.push([
                    math.cos(endAngle) * r + x,
                    y - math.sin(endAngle) * r
                ]);

                pointList.push([
                    math.cos(endAngle) * r0 + x,
                    y - math.sin(endAngle) * r0
                ]);

                var shape = require('../shape');
                return shape.get('polygon').getRect({
                    brushType : style.brushType,
                    lineWidth : style.lineWidth,
                    pointList : pointList
                });
            }
        };

        var base = require('./base');
        base.derive(Sector);
        
        var shape = require('../shape');
        shape.define('sector', new Sector());

        return Sector;
    }
);