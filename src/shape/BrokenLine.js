/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：折线
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'brokenLine',         // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过'zrender/tool/guid'方法生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           pointList     : {Array},   // 必须，各个顶角坐标
           smooth        : {Number},  // 默认为0
           strokeColor   : {color},   // 默认为'#000'，线条颜色（轮廓），支持rgba
           lineType      : {string},  // 默认为solid，线条类型，solid | dashed | dotted
           lineWidth     : {number},  // 默认为1，线条宽度
           lineCap       : {string},  // 默认为butt，线帽样式。butt | round | square
           lineJoin      : {string},  // 默认为miter，线段连接样式。miter | round | bevel
           miterLimit    : {number},  // 默认为10，最大斜接长度，仅当lineJoin为miter时生效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为end，附加文本位置。
                                      // start | end
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
    function (require) {
        var Base = require('./Base');
        var smoothSpline = require('./util/smoothSpline');
        var smoothBezier = require('./util/smoothBezier');
        var dashedLineTo = require('./util/dashedLineTo');

        function BrokenLine( options ) {
            this.brushTypeOnly = 'stroke';  //线条只能描边，填充后果自负
            this.textPosition = 'end';
            Base.call(this, options);
        }

        BrokenLine.prototype =  {
            type: 'broken-line',

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
                
                var len = Math.min(
                    style.pointList.length, 
                    Math.round(style.pointListLength || style.pointList.length)
                );
                
                if (style.smooth && style.smooth !== 'spline') {
                    var controlPoints = smoothBezier(
                        pointList, style.smooth
                    );

                    ctx.moveTo(pointList[0][0], pointList[0][1]);
                    var cp1;
                    var cp2;
                    var p;
                    for (var i = 0; i < len - 1; i++) {
                        cp1 = controlPoints[i * 2];
                        cp2 = controlPoints[i * 2 + 1];
                        p = pointList[i + 1];
                        ctx.bezierCurveTo(
                            cp1[0], cp1[1], cp2[0], cp2[1], p[0], p[1]
                        );
                    }
                } 
                else {
                    if (style.smooth === 'spline') {
                        pointList = smoothSpline(pointList);
                        len = pointList.length;
                    }
                    if (!style.lineType || style.lineType == 'solid') {
                        //默认为实线
                        ctx.moveTo(pointList[0][0],pointList[0][1]);
                        for (var i = 1; i < len; i++) {
                            ctx.lineTo(pointList[i][0],pointList[i][1]);
                        }
                    }
                    else if (style.lineType == 'dashed'
                            || style.lineType == 'dotted'
                    ) {
                        var dashLength = (style.lineWidth || 1) 
                                         * (style.lineType == 'dashed' ? 5 : 1);
                        ctx.moveTo(pointList[0][0],pointList[0][1]);
                        for (var i = 1; i < len; i++) {
                            dashedLineTo(
                                ctx,
                                pointList[i - 1][0], pointList[i - 1][1],
                                pointList[i][0], pointList[i][1],
                                dashLength
                            );
                        }
                    }
                }
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                return require('./Polygon').prototype.getRect(style);
            }
        };

        require('../tool/util').inherits(BrokenLine, Base);
        return BrokenLine;
    }
);
