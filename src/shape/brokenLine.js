/*
 * zrender
 * Copyright 2012 Baidu Inc. All rights reserved.
 * 
 * desc:    zrender是一个Canvas绘图类库，mvc封装实现数据驱动绘图，图形事件封装
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 * 
 * shape类：折线
 * 可配图形属性：
   {   
       // 基础属性
       shape  : 'brokenLine',         // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见
       
       // 样式属性，默认状态样式样式属性
       style  : {
           pointList     : {Array},   // 必须，各个顶角坐标
           strokeColor   : {color},   // 默认为'#000'，线条颜色（轮廓），支持rgba
           lineType      : {string},  // 默认为solid，线条类型，solid | dashed | dotted
           lineWidth     : {number},  // 默认为1，线条宽度
           lineCap       : {string},  // 默认为butt，线帽样式。butt | round | square
           lineJoin      : {string},  // 默认为miter，线段连接样式。miter | round | bevel
           miterLimit    : {number},  // 默认为10，最大斜接长度，仅当lineJoin为miter时生效
           
           alpha         : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上
           
           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本文字样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为end，附加文本位置。
                                      // start | end
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle | 
                                      // alphabetic | hanging | ideographic 
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // textPosition == 'inside' ? '#000' : color
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
       shape  : 'brokenLine',
       id     : '123456',
       zlevel : 1,
       style  : {
           pointList : [[10, 10], [300, 20], [298, 400], [50, 450]],
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
    function(require) {
        function BrokenLine() {
            this.type = 'brokenLine';
            this.brushTypeOnly = 'stroke';  //线条只能描边，填充后果自负
        }
        
        BrokenLine.prototype =  {
            /**
             * 创建多边形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
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
                }
                else if (style.lineType == 'dashed' || style.lineType == 'dotted') {
                    //画虚线的方法  by loutongbing@baidu.com
                    var dashPattern = [
                        style.lineWidth * (style.lineType == 'dashed' ? 6 : 1), 
                        style.lineWidth * 4
                    ];
                    ctx.moveTo(pointList[0][0],pointList[0][1]);
                    for (var i = 1, l = pointList.length; i < l; i++) {
                        var fromX = pointList[i - 1][0];
                        var toX = pointList[i][0];
                        var fromY = pointList[i - 1][1];
                        var toY = pointList[i][1];
                        var dx = toX - fromX;
                        var dy = toY - fromY;
                        var angle = Math.atan2(dy, dx);
                        var x = fromX;
                        var y = fromY;
                        var idx = 0;
                        var draw = true;
                        var dashLength;
                        var nx;
                        var ny;
                        
                        while (!((dx < 0 ? x <= toX : x >= toX) && (dy < 0 ? y <= toY : y >= toY))) {
                            dashLength = dashPattern[idx++ % dashPattern.length];
                            nx = x + (Math.cos(angle) * dashLength);
                            x = dx < 0 ? Math.max(toX, nx) : Math.min(toX, nx);
                            ny = y + (Math.sin(angle) * dashLength);
                            y = dy < 0 ? Math.max(toY, ny) : Math.min(toY, ny);
                            if (draw) {
                                ctx.lineTo(x, y);
                            }
                            else {
                                ctx.moveTo(x, y);
                            }
                            draw = !draw;
                        }
                    }
                }
                
                return;
            },
            
            /**
             * 附加文本
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             * 
             * Todo:细节，需要考虑lineWidth影响
             */
            drawText : function(ctx, style) {
                var pointList = style.pointList;
                if (pointList.length < 2) {
                    // 少于2个点就不画了~
                    return;
                }
                var length = pointList.length;
                ctx.fillStyle = style.textColor;
                var al;         // 文本水平对齐
                var tx;         // 文本横坐标
                var ty;         // 文本纵坐标
                var dd = 10;    // 文本与图形间空白间隙
                switch (style.textPosition) {
                    case "start":
                        al = pointList[0][0] < pointList[1][0]  
                             ? 'end' : 'start';
                        tx = pointList[0][0] - (al == 'end' ? dd : -dd);
                        ty = pointList[0][1];
                        break;
                    case "end":
                    default :
                        al = pointList[length - 2][0] 
                             < pointList[length - 1][0]   
                             ? 'start' : 'end';
                        tx = pointList[length - 1][0] 
                             - (al == 'start' ? -dd : dd);
                        ty = pointList[length - 1][1];
                        break;
                }
                
                if (style.textFont) {
                    ctx.font = style.textFont;
                }
                ctx.textAlign = style.textAlign || al;
                ctx.textBaseline = style.textBaseLine || 'middle';
                
                ctx.fillText(style.text, tx, ty);
            },
            
            /**
             * 漂移，重载基类方法
             * @param e 实体
             * @param dx 横坐标变化
             * @param dy 纵坐标变化
             */
            drift : function(e, dx, dy){
                var shape = require('../shape');
                var PolygonInstance = shape.get('polygon');
                PolygonInstance.drift(e, dx, dy);
            }
        }
        
        var base = require('./base');
        base.derive(BrokenLine);
        
        return BrokenLine;
    }
);