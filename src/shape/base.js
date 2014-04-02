/**
 * zrender : shape基类
 *
 * desc:    zrender是一个轻量级的Canvas类库，MVC封装，数据驱动，提供类Dom事件模型。
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * 可配图形属性：
   {
       // 基础属性，详见各shape
       shape  : {string},       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 变换
       position : {array},        // 默认为[0, 0], shape的坐标
       rotation : {number|array}, // 默认为[0, 0, 0]，shape绕自身旋转的角度，不被translate 影响
                                  // 后两个值为旋转的origin
       scale : {array},           // 默认为[1, 1, 0, 0], shape纵横缩放比例，不被translate影响
                                  // 后两个值为缩放的origin

       // 样式属性，详见各shape，默认状态样式属性
       style  : {Object},

       // 样式属性，详见各shape，高亮样式属性，当不存在highlightStyle时使用默认样式扩展显示
       highlightStyle : {Object},

       // 交互属性，zrender支持，非图形类实现
       hoverable : {boolean},   // 默认为true，可悬浮响应，默认悬浮响应为高亮显示
                                // 可在onbrush中捕获并阻塞高亮绘画
       clickable : {boolean},   // 默认为false，可点击响应，影响鼠标hover时图标是否为可点击样式
                                // 为false则阻断点击事件抛出，为true可在onclick中捕获
       draggable : {boolean},   // 默认为false，可拖拽响应，默认拖拽响应改变图形位置，
                                // 可在ondrift中捕获并阻塞默认拖拽行为

       // 事件属性
       onbrush : {Function}, // 默认为null，当前图形被刷画时回调，可用于实现自定义绘画
                 // 回传参数为：
                 // @param {2D Context} context 当前canvas context
                 // @param {Object} shape 当前shape
                 // @param {boolean} isHighlight 是否高亮
                 // @return {boolean} 回调返回true则不执行默认绘画
       ondrift : {Function}, // 默认为null，当前图形被拖拽改变位置时回调，可用于限制拖拽范围
                 // 回传参数为：
                 // @param {Object} shape 当前shape
                 // @param {number} dx x方向变化
                 // @param {number} dy y方向变化
       onclick : {Function}, // 默认为null，当前图形点击响应，回传参数为：
                 // @param {Object} eventPacket 对象内容如下：
                 // @param {string} eventPacket.type 事件类型，EVENT.CLICK
                 // @param {event} eventPacket.event 原始dom事件对象
                 // @param {Object} eventPacket.target 当前图形shape对象
                 // @return {boolean} 回调返回true则阻止抛出全局事件

       onmousewheel : {Function}, // 默认为null，当前图形上鼠标滚轮触发，回传参数格式同onclick，其中：
                      // 事件类型为confit.EVENT.MOUSEWHEEL
                      // @return {boolean} 回调返回true则阻止抛出全局事件

       onmousemove : {Function}, // 默认为null，当前图上形鼠标（或手指）移动触发，回传参数格式同onclick，其中：
                     // 事件类型为confit.EVENT.MOUSEMOVE
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       onmouseover : {Function}, // 默认为null，鼠标（或手指）移动到当前图形上触发，回传参数格式同onclick：
                     // 事件类型为confit.EVENT.MOUSEOVER
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       onmouseout : {Function}, // 默认为null，鼠标（或手指）从当前图形移开，回传参数格式同onclick，其中：
                    // 事件类型为confit.EVENT.MOUSEOUT
                    // @return {boolean} 回调返回true则阻止抛出全局事件

       onmousedown : {Function}, // 默认为null，鼠标按钮（或手指）按下，回传参数格式同onclick，其中：
                     // 事件类型为confit.EVENT.MOUSEDOWN
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       onmouseup : {Function}, // 默认为null，鼠标按钮（或手指）松开，回传参数格式同onclick，其中：
                   // 事件类型为confit.EVENT.MOUSEUP
                   // @return {boolean} 回调返回true则阻止抛出全局事件

       ondragstart : {Function}, // 默认为null，开始拖拽时触发，回传参数格式同onclick，其中：
                     // 事件类型为confit.EVENT.DRAGSTART
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       ondragend : {Function}, // 默认为null，拖拽完毕时触发，回传参数格式同onclick，其中：
                   // 事件类型为confit.EVENT.DRAGEND
                   // @return {boolean} 回调返回true则阻止抛出全局事件

       ondragenter : {Function}, // 默认为null，拖拽图形元素进入目标图形元素时触发
                     // 回传参数格式同onclick，其中：
                     // @param {string} eventPacket.type 事件类型，EVENT.DRAGENTER
                     // @param {Object} eventPacket.target 目标图形元素shape对象
                     // @param {Object} eventPacket.dragged 拖拽图形元素shape对象
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       ondragover : {Function}, // 默认为null，拖拽图形元素在目标图形元素上移动时触发，
                    // 回传参数格式同onclick，其中：
                    // @param {string} eventPacket.type 事件类型，EVENT.DRAGOVER
                    // @param {Object} eventPacket.target 目标图形元素shape对象
                    // @param {Object} eventPacket.dragged 拖拽图形元素shape对象
                    // @return {boolean} 回调返回true则阻止抛出全局事件

       ondragleave : {Function}, // 默认为null，拖拽图形元素离开目标图形元素时触发，
                     // 回传参数格式同onclick，其中：
                     // @param {string} eventPacket.type 事件类型，EVENT.DRAGLEAVE
                     // @param {Object} eventPacket.target 目标图形元素shape对象
                     // @param {Object} eventPacket.dragged 拖拽图形元素shape对象
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       ondrop : {Function}, // 默认为null，拖拽图形元素放在目标图形元素内时触发，
                // 回传参数格式同onclick，其中：
                // @param {string} eventPacket.type 事件类型，EVENT.DRAG
                // @param {Object} eventPacket.target 目标图形元素shape对象
                // @param {Object} eventPacket.dragged 拖拽图形元素shape对象
                // @return {boolean} 回调返回true则阻止抛出全局事件
   }
 */
define(
    function(require) {

        var self;
        var area = require('../tool/area');
        var matrix = require('../tool/matrix');
        var vec2 = require('../tool/vector');

        /**
         * 派生实现通用功能
         * @param {Object} clazz 图形类
         */
        function derive(clazz) {
            var methods = [             // 派生实现的基类方法
                    'brush',
                    'setContext',
                    'dashedLineTo',
                    'smoothBezier',
                    'smoothSpline',
                    'drawText',
                    'getHighlightStyle',
                    'getHighlightZoom',
                    'drift',
                    'isCover',
                    'updateTransform'
                ];
            var len = methods.length;
            var proto = clazz.prototype;
            var i = 0;
            var method;

            for (; i < len; i++) {
                method = methods[i];
                if (!proto[method]) {
                    proto[method] = self[method];
                }
            }
        }

        /**
         * 画刷
         * @param ctx       画布句柄
         * @param e         形状实体
         * @param isHighlight   是否为高亮状态
         * @param updateCallback 需要异步加载资源的shape可以通过这个callback(e)
         *                       让painter更新视图，base.brush没用，需要的话重载brush
         */
        function brush(ctx, e, isHighlight) {
            var style = e.style || {};

            if (this.brushTypeOnly) {
                style.brushType = this.brushTypeOnly;
            }

            if (isHighlight) {
                // 根据style扩展默认高亮样式
                style = this.getHighlightStyle(
                    style,
                    e.highlightStyle || {},
                    this.brushTypeOnly
                );
            }

            if (this.brushTypeOnly == 'stroke') {
                style.strokeColor = style.strokeColor || style.color;
            }

            ctx.save();
            this.setContext(ctx, style);

            // 设置transform
            if (e.__needTransform) {
                ctx.transform.apply(ctx,this.updateTransform(e));
            }

            ctx.beginPath();
            this.buildPath(ctx, style);
            if (this.brushTypeOnly != 'stroke') {
                ctx.closePath();
            }

            switch (style.brushType) {
                case 'fill':
                    ctx.fill();
                    break;
                case 'stroke':
                    style.lineWidth > 0 && ctx.stroke();
                    break;
                case 'both':
                    ctx.fill();
                    style.lineWidth > 0 && ctx.stroke();
                    break;
                default:
                    ctx.fill();
            }

            if (typeof style.text != 'undefined') {
                this.drawText(ctx, style, e.style);
            }

            ctx.restore();

            return;
        }

        /**
         * 画布通用设置
         * @param ctx       画布句柄
         * @param style     通用样式
         */
        function setContext(ctx, style) {
            // 简单判断不做严格类型检测
            if (style.color) {
                ctx.fillStyle = style.color;
            }

            if (style.strokeColor) {
                ctx.strokeStyle = style.strokeColor;
            }

            if (typeof style.opacity != 'undefined') {
                ctx.globalAlpha = style.opacity;
            }

            if (style.lineCap) {
                ctx.lineCap = style.lineCap;
            }

            if (style.lineJoin) {
                ctx.lineJoin = style.lineJoin;
            }

            if (style.miterLimit) {
                ctx.miterLimit = style.miterLimit;
            }

            if (typeof style.lineWidth != 'undefined') {
                ctx.lineWidth = style.lineWidth;
            }

            if (typeof style.shadowBlur != 'undefined') {
                ctx.shadowBlur = style.shadowBlur;
            }

            if (style.shadowColor) {
                ctx.shadowColor = style.shadowColor;
            }

            if (typeof style.shadowOffsetX != 'undefined') {
                ctx.shadowOffsetX = style.shadowOffsetX;
            }

            if (typeof style.shadowOffsetY != 'undefined') {
                ctx.shadowOffsetY = style.shadowOffsetY;
            }
        }
        
        /**
         * 虚线lineTo 
         */
        function dashedLineTo(ctx, x1, y1, x2, y2, dashLength) {
            dashLength = typeof dashLength == 'undefined'
                         ? 5 : dashLength;
            var deltaX = x2 - x1;
            var deltaY = y2 - y1;
            var numDashes = Math.floor(
                Math.sqrt(deltaX * deltaX + deltaY * deltaY) / dashLength
            );
            for (var i = 0; i < numDashes; ++i) {
                ctx[i % 2 === 0 ? 'moveTo' : 'lineTo'](
                    x1 + (deltaX / numDashes) * i,
                    y1 + (deltaY / numDashes) * i
                );
            }
        }
        
        /**
         * 贝塞尔平滑曲线 
         */
        function smoothBezier(points, smooth, loop) {
            var len = points.length;
            var cps = [];

            var v = [];
            var v1 = [];
            var v2 = [];
            var prevPoint;
            var nextPoint;
            for(var i = 0; i < len; i++){
                var point = points[i];
                var prevPoint;
                var nextPoint;
                if (loop) {
                    prevPoint = points[i === 0 ? len-1 : i-1];
                    nextPoint = points[(i + 1) % len];
                } else {
                    if (i === 0 || i === len-1) {
                        cps.push(points[i]);
                        continue;
                    } else {
                        prevPoint = points[i-1];
                        nextPoint = points[i+1];
                    }
                }

                vec2.sub(v, nextPoint, prevPoint);

                //use degree to scale the handle length
                vec2.scale(v, v, smooth);

                var d0 = vec2.distance(point, prevPoint);
                var d1 = vec2.distance(point, nextPoint);
                var sum = d0 + d1;
                d0 /= sum;
                d1 /= sum;

                vec2.scale(v1, v, -d0);
                vec2.scale(v2, v, d1);

                cps.push(vec2.add([], point, v1));
                cps.push(vec2.add([], point, v2));
            }
            if (loop) {
                cps.push(cps.shift());
            }
            return cps;
        }

        /**
         * 多线段平滑曲线 Catmull-Rom spline
         */
        function smoothSpline(points, loop) {
            var len = points.length;
            var ret = [];

            var distance = 0;
            for (var i = 1; i < len; i++) {
                distance += vec2.distance(points[i-1], points[i]);
            }
            var segs = distance / 5;
            segs = segs < len ? len : segs;
            for (var i = 0; i < segs; i++) {
                var pos;
                if (loop) {
                    pos = i / (segs-1) * len;
                } else {
                    pos = i / (segs-1) * (len - 1);
                }
                var idx = Math.floor(pos);

                var w = pos - idx;

                var p0;
                var p1 = points[idx % len];
                var p2;
                var p3;
                if (!loop) {
                    p0 = points[idx === 0 ? idx : idx - 1];
                    p2 = points[idx > len - 2 ? len - 1 : idx + 1];
                    p3 = points[idx > len - 3 ? len - 1 : idx + 2];
                } else {
                    p0 = points[(idx -1 + len) % len];
                    p2 = points[(idx + 1) % len];
                    p3 = points[(idx + 2) % len];
                }

                var w2 = w * w;
                var w3 = w * w2;

                ret.push([
                    _interpolate(p0[0], p1[0], p2[0], p3[0], w, w2, w3),
                    _interpolate(p0[1], p1[1], p2[1], p3[1], w, w2, w3)
                ]);
            }
            return ret;
        }

        function _interpolate(p0, p1, p2, p3, t, t2, t3) {
            var v0 = (p2 - p0) * 0.5;
            var v1 = (p3 - p1) * 0.5;
            return (2 * (p1 - p2) + v0 + v1) * t3 
                    + (- 3 * (p1 - p2) - 2 * v0 - v1) * t2
                    + v0 * t + p1;
        }
        
        /**
         * 附加文本
         * @param {Context2D} ctx Canvas 2D上下文
         * @param {Object} style 样式
         * @param {Object} normalStyle 默认样式，用于定位文字显示
         */
        function drawText(ctx, style, normalStyle) {
            // 字体颜色策略
            style.textColor= style.textColor
                            || style.color
                            || style.strokeColor;
            ctx.fillStyle = style.textColor;

            if (style.textPosition == 'inside') {
                ctx.shadowColor = 'rgba(0,0,0,0)';   // 内部文字不带shadowColor
            }

            // 文本与图形间空白间隙
            var dd = 10;
            var al;         // 文本水平对齐
            var bl;         // 文本垂直对齐
            var tx;         // 文本横坐标
            var ty;         // 文本纵坐标

            var textPosition = style.textPosition       // 用户定义
                               || this.textPosition     // shape默认
                               || 'top';                // 全局默认

            if ((textPosition == 'inside'
                || textPosition == 'top'
                || textPosition == 'bottom'
                || textPosition == 'left'
                || textPosition == 'right')
                && this.getRect // 矩形定位文字的图形必须提供getRect方法
            ) {
                var rect = (normalStyle || style).__rect
                           || this.getRect(normalStyle || style);
                switch (textPosition) {
                    case 'inside':
                        tx = rect.x + rect.width / 2;
                        ty = rect.y + rect.height / 2;
                        al = 'center';
                        bl = 'middle';
                        if (style.brushType != 'stroke'
                            && style.textColor == style.color
                        ) {
                            ctx.fillStyle = '#fff';
                        }
                        break;
                    case 'left':
                        tx = rect.x - dd;
                        ty = rect.y + rect.height / 2;
                        al = 'end';
                        bl = 'middle';
                        break;
                    case 'right':
                        tx = rect.x + rect.width + dd;
                        ty = rect.y + rect.height / 2;
                        al = 'start';
                        bl = 'middle';
                        break;
                    case 'top':
                        tx = rect.x + rect.width / 2;
                        ty = rect.y - dd;
                        al = 'center';
                        bl = 'bottom';
                        break;
                    case 'bottom':
                        tx = rect.x + rect.width / 2;
                        ty = rect.y + rect.height + dd;
                        al = 'center';
                        bl = 'top';
                        break;
                }
            }
            else if (textPosition == 'start' || textPosition == 'end') {
                var xStart;
                var xEnd;
                var yStart;
                var yEnd;
                if (typeof style.pointList != 'undefined') {
                    var pointList = style.pointList;
                    if (pointList.length < 2) {
                        // 少于2个点就不画了~
                        return;
                    }
                    var length = pointList.length;
                    switch (textPosition) {
                        case 'start':
                            xStart = pointList[0][0];
                            xEnd = pointList[1][0];
                            yStart = pointList[0][1];
                            yEnd = pointList[1][1];
                            break;
                        case 'end':
                            xStart = pointList[length - 2][0];
                            xEnd = pointList[length - 1][0];
                            yStart = pointList[length - 2][1];
                            yEnd = pointList[length - 1][1];
                            break;
                    }
                }
                else {
                    xStart = style.xStart || 0;
                    xEnd = style.xEnd || 0;
                    yStart = style.yStart || 0;
                    yEnd = style.yEnd || 0;
                }
                switch (textPosition) {
                    case 'start':
                        al = xStart < xEnd ? 'end' : 'start';
                        bl = yStart < yEnd ? 'bottom' : 'top';
                        tx = xStart;
                        ty = yStart;
                        break;
                    case 'end':
                        al = xStart < xEnd ? 'start' : 'end';
                        bl = yStart < yEnd ? 'top' : 'bottom';
                        tx = xEnd;
                        ty = yEnd;
                        break;
                }
                dd -= 4;
                if (xStart != xEnd) {
                    tx -= (al == 'end' ? dd : -dd);
                } else {
                    al = 'center';
                }
                if (yStart != yEnd) {
                    ty -= (bl == 'bottom' ? dd : -dd);
                } else {
                    bl = 'middle';
                }
            }
            else if (textPosition == 'specific') {
                tx = style.textX || 0;
                ty = style.textY || 0;
                al = 'start';
                bl = 'middle';
            }

            if (typeof tx != 'undefined' && typeof ty != 'undefined') {
                _fillText(
                    ctx,
                    style.text, 
                    tx, ty, 
                    style.textFont,
                    style.textAlign || al,
                    style.textBaseline || bl
                );
            }
        }
        
        function _fillText(ctx, text, x, y, textFont, textAlign, textBaseline) {
            if (textFont) {
                ctx.font = textFont;
            }
            ctx.textAlign = textAlign;
            ctx.textBaseline = textBaseline;
            var rect = _getTextRect(
                text, x, y, textFont, textAlign, textBaseline
            );
            
            text = (text + '').split('\n');
            var lineHeight = area.getTextHeight('国', textFont);
            var x = x;
            var y;
            if (textBaseline == 'top') {
                y = rect.y;
            }
            else if (textBaseline == 'bottom') {
                y = rect.y + lineHeight;
            }
            else {
                y = rect.y + lineHeight / 2;
            }
            
            for (var i = 0, l = text.length; i < l; i++) {
                ctx.fillText(text[i], x, y);
                y += lineHeight;
            }
        }
        /**
         * 返回矩形区域，用于局部刷新和文字定位
         * @param {Object} style
         */
        function _getTextRect(text, x, y, textFont, textAlign, textBaseline) {
            var width = area.getTextWidth(text, textFont);
            var lineHeight = area.getTextHeight('国', textFont);
            
            text = (text + '').split('\n');
            
            var textX = x;                 //默认start == left
            if (textAlign == 'end' || textAlign == 'right') {
                textX -= width;
            }
            else if (textAlign == 'center') {
                textX -= (width / 2);
            }

            var textY;
            if (textBaseline == 'top') {
                textY = y;
            }
            else if (textBaseline == 'bottom') {
                textY = y - lineHeight * text.length;
            }
            else {
                // middle
                textY = y - lineHeight * text.length / 2;
            }

            return {
                x : textX,
                y : textY,
                width : width,
                height : lineHeight * text.length
            };
        }
    
        /**
         * 根据默认样式扩展高亮样式
         * @param ctx Canvas 2D上下文
         * @param {Object} style 默认样式
         * @param {Object} highlightStyle 高亮样式
         */
        function getHighlightStyle(style, highlightStyle, brushTypeOnly) {
            var newStyle = {};
            for (var k in style) {
                newStyle[k] = style[k];
            }

            var color = require('../tool/color');
            var highlightColor = color.getHighlightColor();
            // 根据highlightStyle扩展
            if (style.brushType != 'stroke') {
                // 带填充则用高亮色加粗边线
                newStyle.strokeColor = highlightColor;
                newStyle.lineWidth = (style.lineWidth || 1)
                                      + this.getHighlightZoom();
                newStyle.brushType = 'both';
            }
            else {
                if (brushTypeOnly != 'stroke') {
                    // 描边型的则用原色加工高亮
                    newStyle.strokeColor = highlightColor;
                    newStyle.lineWidth = (style.lineWidth || 1)
                                          + this.getHighlightZoom();
                } else {
                    // 线型的则用原色加工高亮
                    newStyle.strokeColor = highlightStyle.strokeColor
                                           || color.mix(
                                                 style.strokeColor,
                                                 color.toRGB(highlightColor)
                                              );
                }
            }

            // 可自定义覆盖默认值
            for (var k in highlightStyle) {
                if (typeof highlightStyle[k] != 'undefined') {
                    newStyle[k] = highlightStyle[k];
                }
            }

            return newStyle;
        }

        /**
         * 高亮放大效果参数
         * 当前统一设置为6，如有需要差异设置，通过this.type判断实例类型
         */
        function getHighlightZoom() {
            return this.type != 'text' ? 6 : 2;
        }

        /**
         * 默认漂移
         * @param e 图形实体
         * @param dx 横坐标变化
         * @param dy 纵坐标变化
         */
        function drift(e, dx, dy) {
            e.position[0] += dx;
            e.position[1] += dy;
        }

        /**
         * 默认区域包含判断
         * @param e 图形实体
         * @param x 横坐标
         * @param y 纵坐标
         */
        function isCover(e, x, y) {
            //对鼠标的坐标也做相同的变换
            if(e.__needTransform && e._transform){
                var inverseMatrix = [];
                matrix.invert(inverseMatrix, e._transform);

                var originPos = [x, y];
                matrix.mulVector(originPos, inverseMatrix, [x, y, 1]);

                if (x == originPos[0] && y == originPos[1]) {
                    // 避免外部修改导致的__needTransform不准确
                    if (Math.abs(e.rotation[0]) > 0.0001
                        || Math.abs(e.position[0]) > 0.0001
                        || Math.abs(e.position[1]) > 0.0001
                        || Math.abs(e.scale[0] - 1) > 0.0001
                        || Math.abs(e.scale[1] - 1) > 0.0001
                    ) {
                        e.__needTransform = true;
                    } else {
                        e.__needTransform = false;
                    }
                }

                x = originPos[0];
                y = originPos[1];
            }

            // 快速预判并保留判断矩形
            var rect;
            if (e.style.__rect) {
                rect = e.style.__rect;
            }
            else {
                rect = this.getRect(e.style);
                e.style.__rect = rect;
            }
            if (x >= rect.x
                && x <= (rect.x + rect.width)
                && y >= rect.y
                && y <= (rect.y + rect.height)
            ) {
                // 矩形内
                return area.isInside(this, e.style, x, y);
            }
            else {
                return false;
            }

        }

        function updateTransform(e) {
            var _transform = e._transform || matrix.create();
            matrix.identity(_transform);
            if (e.scale && (e.scale[0] !== 1 || e.scale[1] !== 1)) {
                var originX = e.scale[2] || 0;
                var originY = e.scale[3] || 0;
                if (originX || originY ) {
                    matrix.translate(
                        _transform, _transform, [-originX, -originY]
                    );
                }
                matrix.scale(_transform, _transform, e.scale);
                if ( originX || originY ) {
                    matrix.translate(
                        _transform, _transform, [originX, originY]
                    );
                }
            }
            if (e.rotation) {
                if (e.rotation instanceof Array) {
                    if (e.rotation[0] !== 0) {
                        var originX = e.rotation[1] || 0,
                            originY = e.rotation[2] || 0;
                        if (originX || originY ) {
                            matrix.translate(
                                _transform, _transform, [-originX, -originY]
                            );
                        }
                        matrix.rotate(_transform, _transform, e.rotation[0]);
                        if (originX || originY ) {
                            matrix.translate(
                                _transform, _transform, [originX, originY]
                            );
                        }
                    }
                }else{
                    if (e.rotation !== 0) {
                        matrix.rotate(_transform, _transform, e.rotation);
                    }
                }
            }
            if (e.position && (e.position[0] !==0 || e.position[1] !== 0)) {
                matrix.translate(_transform, _transform, e.position);
            }
            // 保存这个变换矩阵
            e._transform = _transform;

            return _transform;
        }

        self = {
            derive : derive,
            brush : brush,
            setContext : setContext,
            dashedLineTo : dashedLineTo,
            smoothBezier : smoothBezier,
            smoothSpline : smoothSpline,
            drawText : drawText,
            getHighlightStyle : getHighlightStyle,
            getHighlightZoom : getHighlightZoom,
            drift : drift,
            isCover : isCover,

            updateTransform : updateTransform
        };

        return self;
    }
);