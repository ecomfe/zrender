/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：多边形
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'polygon',      // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           pointList     : {Array},   // 必须，多边形各个顶角坐标
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
       shape  : 'polygon',
       id     : '123456',
       zlevel : 1,
       style  : {
           pointList : [[10, 10], [300, 20], [298, 400], [50, 450]]
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
        function Polygon() {
            this.type = 'polygon';
        }

        Polygon.prototype = {
            /**
             * 画刷
             * @param ctx       画布句柄
             * @param e         形状实体
             * @param isHighlight   是否为高亮状态
             * @param updateCallback 需要异步加载资源的shape可以通过这个callback(e)
             *                       让painter更新视图，base.brush没用，需要的话重载brush
             */
            brush : function (ctx, e, isHighlight) {
                var style = e.style || {};
                if (isHighlight) {
                    // 根据style扩展默认高亮样式
                    style = this.getHighlightStyle(
                        style,
                        e.highlightStyle || {}
                    );
                }

                ctx.save();
                this.setContext(ctx, style);
    
                // 设置transform
                if (e.__needTransform) {
                    ctx.transform.apply(ctx,this.updateTransform(e));
                }
                ctx.beginPath();
                this.buildPath(ctx, style);
                ctx.closePath();

                if (style.brushType == 'stroke' || style.brushType == 'both') {
                    ctx.stroke();
                }
                
                if (style.brushType == 'fill' 
                    || style.brushType == 'both'
                    || typeof style.brushType == 'undefined' // 默认为fill
                ) {
                    if (style.lineType == 'dashed' 
                        || style.lineType == 'dotted'
                    ) {
                        // 特殊处理，虚线围不成path，实线再build一次
                        ctx.beginPath();
                        this.buildPath(
                            ctx, 
                            {
                                lineType: 'solid',
                                lineWidth: style.lineWidth,
                                pointList: style.pointList
                            }
                        );
                        ctx.closePath();
                    }
                    ctx.fill();
                }
    
                if (style.text) {
                    this.drawText(ctx, style, e.style);
                }
    
                ctx.restore();
    
                return;
            },
        
            /**
             * 创建多边形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                // 虽然能重用brokenLine，但底层图形基于性能考虑，重复代码减少调用吧
                var pointList = style.pointList;
                if (pointList.length < 2) {
                    // 少于2个点就不画了~
                    return;
                }
                if (!style.lineType || style.lineType == 'solid') {
                    //默认为实线
                    ctx.moveTo(pointList[0][0],pointList[0][1]);
                    for (var i = 1, l = pointList.length; i < l; i++) {
                        ctx.lineTo(pointList[i][0],pointList[i][1]);
                    }
                    ctx.lineTo(pointList[0][0], pointList[0][1]);
                }
                else if (style.lineType == 'dashed'
                        || style.lineType == 'dotted'
                ) {
                    var dashLength = style._dashLength
                                     || (style.lineWidth || 1) 
                                        * (style.lineType == 'dashed' ? 5 : 1);
                    style._dashLength = dashLength;
                    ctx.moveTo(pointList[0][0],pointList[0][1]);
                    for (var i = 1, l = pointList.length; i < l; i++) {
                        this.dashedLineTo(
                            ctx,
                            pointList[i - 1][0], pointList[i - 1][1],
                            pointList[i][0], pointList[i][1],
                            dashLength
                        );
                    }
                    this.dashedLineTo(
                        ctx,
                        pointList[pointList.length - 1][0], 
                        pointList[pointList.length - 1][1],
                        pointList[0][0],
                        pointList[0][1],
                        dashLength
                    );
                }

                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var minX =  Number.MAX_VALUE;
                var maxX =  Number.MIN_VALUE;
                var minY = Number.MAX_VALUE;
                var maxY = Number.MIN_VALUE;

                var pointList = style.pointList;
                for(var i = 0, l = pointList.length; i < l; i++) {
                    if (pointList[i][0] < minX) {
                        minX = pointList[i][0];
                    }
                    if (pointList[i][0] > maxX) {
                        maxX = pointList[i][0];
                    }
                    if (pointList[i][1] < minY) {
                        minY = pointList[i][1];
                    }
                    if (pointList[i][1] > maxY) {
                        maxY = pointList[i][1];
                    }
                }

                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(minX - lineWidth / 2),
                    y : Math.round(minY - lineWidth / 2),
                    width : maxX - minX + lineWidth,
                    height : maxY - minY + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Polygon);
        
        var shape = require('../shape');
        shape.define('polygon', new Polygon());

        return Polygon;
    }
);