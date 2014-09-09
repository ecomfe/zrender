/**
 * zrender: 图形空间辅助类
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         pissang (https://www.github.com/pissang)
 *
 * isInside：是否在区域内部
 * isOutside：是否在区域外部
 * getTextWidth：测算单行文本宽度
 */
define(
    function (require) {

        'use strict';

        var util = require('./util');
        var curve = require('./curve');

        var _ctx;
        
        var _textWidthCache = {};
        var _textHeightCache = {};
        var _textWidthCacheCounter = 0;
        var _textHeightCacheCounter = 0;
        var TEXT_CACHE_MAX = 5000;
        
        /**
         * 包含判断
         *
         * @param {Object} shape : 图形
         * @param {Object} area ： 目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         */
        function isInside(shape, area, x, y) {
            if (!area || !shape) {
                // 无参数或不支持类型
                return false;
            }
            var zoneType = shape.type;

            _ctx = _ctx || util.getContext();

            if (!isInsideRect(area.__rect || shape.getRect(area), x, y)) {
                // 不在矩形区域内直接返回false
                return false;
            }

            // 未实现或不可用时(excanvas不支持)则数学运算，主要是line，brokenLine，ring
            var _mathReturn = _mathMethod(zoneType, area, x, y);
            if (typeof _mathReturn != 'undefined') {
                return _mathReturn;
            }

            if (zoneType != 'bezier-curve'
                && shape.buildPath
                && _ctx.isPointInPath
            ) {
                return _buildPathMethod(shape, _ctx, area, x, y);
            }
            else if (_ctx.getImageData) {
                return _pixelMethod(shape, area, x, y);
            }

            // 上面的方法都行不通时
            switch (zoneType) {
                case 'heart': // 心形---------10 // Todo，不精确
                case 'droplet':// 水滴----------11 // Todo，不精确
                case 'ellipse': // Todo，不精确
                    return true;
                // 旋轮曲线  不准确
                case 'trochoid':
                    var _r = area.location == 'out'
                            ? area.r1 + area.r2 + area.d
                            : area.r1 - area.r2 + area.d;
                    return isInsideCircle(area, x, y, _r);
                // 玫瑰线 不准确
                case 'rose' :
                    return isInsideCircle(area, x, y, area.maxr);
                // 路径，椭圆，曲线等-----------------13
                default:
                    return false;   // Todo，暂不支持
            }
        }

        /**
         * 用数学方法判断，三个方法中最快，但是支持的shape少
         *
         * @param {string} zoneType ： 图形类型
         * @param {Object} area ：目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         * @return {boolean=} true表示坐标处在图形中
         */
        function _mathMethod(zoneType, area, x, y) {
            // 在矩形内则部分图形需要进一步判断
            switch (zoneType) {
                // 线-----------------------1
                case 'line':
                    return isInsideLine(area, x, y);
                // 折线----------------------2
                case 'broken-line':
                    return isInsideBrokenLine(area, x, y);
                // 文本----------------------3
                case 'text':
                    return true;
                // 圆环----------------------4
                case 'ring':
                    return _isInsideRing(area, x, y);
                // 矩形----------------------5
                case 'rectangle':
                    return true;
                // 圆形----------------------6
                case 'circle':
                    return isInsideCircle(area, x, y, area.r);
                // 扇形----------------------7
                case 'sector':
                    return isInsideSector(area, x, y);
                // 多边形---------------------8
                case 'path':
                     return isInsidePath(area, x, y);
                case 'polygon':
                case 'star':
                case 'isogon':
                    return isInsidePolygon(area, x, y);
                // 图片----------------------9
                case 'image':
                    return true;
            }
        }

        /**
         * 通过buildPath方法来判断，三个方法中较快，但是不支持线条类型的shape，
         * 而且excanvas不支持isPointInPath方法
         *
         * @param {Object} shape ： shape
         * @param {Object} context : 上下文
         * @param {Object} area ：目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         * @return {boolean} true表示坐标处在图形中
         */
        function _buildPathMethod(shape, context, area, x, y) {
            // 图形类实现路径创建了则用类的path
            context.beginPath();
            shape.buildPath(context, area);
            context.closePath();
            return context.isPointInPath(x, y);
        }

        /**
         * 通过像素值来判断，三个方法中最慢，但是支持广,不足之处是excanvas不支持像素处理
         *
         * @param {Object} shape  shape类
         * @param {Object} area 目标区域
         * @param {number} x  横坐标
         * @param {number} y  纵坐标
         * @return {boolean} true表示坐标处在图形中
         */
        function _pixelMethod(shape, area, x, y) {
            var _rect = area.__rect || shape.getRect(area);
            var _context = util.getPixelContext();
            var _offset = util.getPixelOffset();

            util.adjustCanvasSize(x, y);
            _context.clearRect(_rect.x, _rect.y, _rect.width, _rect.height);
            _context.beginPath();
            shape.brush(_context, { style: area });
            _context.closePath();

            return _isPainted(_context, x + _offset.x, y + _offset.y);
        }

        /**
         * 坐标像素值，判断坐标是否被作色
         *
         * @param {Object} context : 上下文
         * @param {number} x : 横坐标
         * @param {number} y : 纵坐标
         * @param {number=} unit : 触发的精度，越大越容易触发，可选，缺省是为1
         * @return {boolean} 已经被画过返回true
         */
        function _isPainted(context, x, y, unit) {
            var pixelsData;

            if (typeof unit != 'undefined') {
                unit = (unit || 1) >> 1;
                pixelsData = context.getImageData(
                    x - unit,
                    y - unit,
                    unit + unit,
                    unit + unit
                ).data;
            }
            else {
                pixelsData = context.getImageData(x, y, 1, 1).data;
            }

            var len = pixelsData.length;
            while (len--) {
                if (pixelsData[len] !== 0) {
                    return true;
                }
            }

            return false;
        }

        /**
         * !isInside
         */
        function isOutside(shape, area, x, y) {
            return !isInside(shape, area, x, y);
        }

        /**
         * 线段包含判断
         */
        function isInsideLine(area, x, y) {
            var _x1 = area.xStart;
            var _y1 = area.yStart;
            var _x2 = area.xEnd;
            var _y2 = area.yEnd;
            var _l = Math.max(area.lineWidth, 5);
            var _a = 0;
            var _b = _x1;

            var minX;
            var maxX;
            if (_x1 < _x2) {
                minX = _x1 - _l; maxX = _x2 + _l;
            }
            else {
                minX = _x2 - _l; maxX = _x1 + _l;
            }

            var minY;
            var maxY;
            if (_y1 < _y2) {
                minY = _y1 - _l; maxY = _y2 + _l;
            }
            else {
                minY = _y2 - _l; maxY = _y1 + _l;
            }

            if (x < minX || x > maxX || y < minY || y > maxY) {
                return false;
            }

            if (_x1 !== _x2) {
                _a = (_y1 - _y2) / (_x1 - _x2);
                _b = (_x1 * _y2 - _x2 * _y1) / (_x1 - _x2) ;
            }
            else {
                return Math.abs(x - _x1) <= _l / 2;
            }

            var _s = (_a * x - y + _b) * (_a * x - y + _b) / (_a * _a + 1);
            return _s <= _l / 2 * _l / 2;
        }

        function isInsideBrokenLine(area, x, y) {
            var pointList = area.pointList;
            var lineArea = {
                xStart : 0,
                yStart : 0,
                xEnd : 0,
                yEnd : 0,
                lineWidth : 0
            };
            for (var i = 0, l = pointList.length - 1; i < l; i++) {
                lineArea.xStart = pointList[i][0];
                lineArea.yStart = pointList[i][1];
                lineArea.xEnd = pointList[i + 1][0];
                lineArea.yEnd = pointList[i + 1][1];
                lineArea.lineWidth = Math.max(area.lineWidth, 10);

                if (isInsideLine(lineArea, x, y)) {
                    return true;
                }
            }

            return false;
        }

        function _isInsideRing(area, x, y) {
            return isInsideCircle(area, x, y, area.r)
                && !isInsideCircle({ x: area.x, y: area.y }, x, y, area.r0 || 0);
        }

        /**
         * 矩形包含判断
         */
        function isInsideRect(area, x, y) {
            return x >= area.x
                && x <= (area.x + area.width)
                && y >= area.y
                && y <= (area.y + area.height);
        }

        /**
         * 圆形包含判断
         */
        function isInsideCircle(area, x, y, r) {
            return (x - area.x) * (x - area.x) + (y - area.y) * (y - area.y)
                   < r * r;
        }

        /**
         * 扇形包含判断
         */
        function isInsideSector(area, x, y) {
            if (!isInsideCircle(area, x, y, area.r)
                || (area.r0 > 0
                    && isInsideCircle(
                            {
                                x : area.x,
                                y : area.y
                            },
                            x, y,
                            area.r0
                        )
                    )
            ) {
                // 大圆外或者小圆内直接false
                return false;
            }

            // 判断夹角
            if (Math.abs(area.endAngle - area.startAngle) >= 360) {
                // 大于360度的扇形，在环内就为true
                return true;
            }
            
            var angle = (360
                         - Math.atan2(y - area.y, x - area.x) / Math.PI
                         * 180)
                         % 360;
            var endA = (360 + area.endAngle) % 360;
            var startA = (360 + area.startAngle) % 360;
            if (endA > startA) {
                return (angle >= startA && angle <= endA);
            }

            return !(angle >= endA && angle <= startA);
        }

        /**
         * 多边形包含判断
         * 与 canvas 一样采用 non-zero winding rule
         */
        function isInsidePolygon(area, x, y) {
            var points = area.pointList;
            var N = points.length;
            var w = 0;

            for (var i = 0, j = N - 1; i < N; i++) {
                var x0 = points[j][0];
                var y0 = points[j][1];
                var x1 = points[i][0];
                var y1 = points[i][1];
                w += windingLine(x0, y0, x1, y1, x, y);
                j = i;
            }
            return w !== 0;
        }

        function windingLine(x0, y0, x1, y1, x, y) {
            if ((y > y0 && y > y1) || (y < y0 && y < y1)) {
                return 0;
            }
            if (y1 == y0) {
                return 0;
            }
            var dir = y1 < y0 ? 1 : -1;
            var t = (y - y0) / (y1 - y0);
            var x_ = t * (x1 - x0) + x0;

            return x_ > x ? dir : 0;
        }

        // 临时数组
        var roots = [-1, -1, -1];
        var extrema = [-1, -1];

        function swapExtrema() {
            var tmp = extrema[0];
            extrema[0] = extrema[1];
            extrema[1] = tmp;
        }
        function windingCubic(x0, y0, x1, y1, x2, y2, x3, y3, x, y) {
            // Quick reject
            if (
                (y > y0 && y > y1 && y > y2 && y > y3)
                || (y < y0 && y < y1 && y < y2 && y < y3)
            ) {
                return 0;
            }
            var nRoots = curve.cubicRootAt(y0, y1, y2, y3, y, roots);
            if (nRoots === 0) {
                return 0;
            }
            else {
                var w = 0;
                var nExtrema = -1;
                var y0_, y1_;
                for (var i = 0; i < nRoots; i++) {
                    var t = roots[i];
                    var x_ = curve.cubicAt(x0, x1, x2, x3, t);
                    if (x_ < x) { // Quick reject
                        continue;
                    }
                    if (nExtrema < 0) {
                        nExtrema = curve.cubicExtrema(y0, y1, y2, y3, extrema);
                        if (extrema[1] < extrema[0] && nExtrema > 1) {
                            swapExtrema();
                        }
                        y0_ = curve.cubicAt(y0, y1, y2, y3, extrema[0]);
                        if (nExtrema > 1) {
                            y1_ = curve.cubicAt(y0, y1, y2, y3, extrema[1]);
                        }
                    }
                    if (nExtrema == 2) {
                        // 分成三段单调函数
                        if (t < extrema[0]) {
                            w += y0_ < y0 ? 1 : -1;
                        } 
                        else if (t < extrema[1]) {
                            w += y1_ < y0_ ? 1 : -1;
                        } 
                        else {
                            w += y3 < y1_ ? 1 : -1;
                        }
                    } 
                    else {
                        // 分成两段单调函数
                        if (t < extrema[0]) {
                            w += y0_ < y0 ? 1 : -1;
                        } 
                        else {
                            w += y3 < y0_ ? 1 : -1;
                        }
                    }
                }
                return w;
            }
        }

        function windingQuadratic(x0, y0, x1, y1, x2, y2, x, y) {
            // Quick reject
            if (
                (y > y0 && y > y1 && y > y2)
                || (y < y0 && y < y1 && y < y2)
            ) {
                return 0;
            }
            var nRoots = curve.quadraticRootAt(y0, y1, y2, y, roots);
            if (nRoots === 0) {
                return 0;
            } 
            else {
                var t = curve.quadraticExtremum(y0, y1, y2);
                if (t >=0 && t <= 1) {
                    var w = 0;
                    var y_ = curve.quadraticAt(y0, y1, y2, t);
                    for (var i = 0; i < nRoots; i++) {
                        var x_ = curve.quadraticAt(x0, x1, x2, roots[i]);
                        if (x_ > x) {
                            continue;
                        }
                        if (roots[i] < t) {
                            w += y_ < y0 ? 1 : -1;
                        } 
                        else {
                            w += y2 < y_ ? 1 : -1;
                        }
                    }
                    return w;
                } 
                else {
                    var x_ = curve.quadraticAt(x0, x1, x2, roots[0]);
                    if (x_ > x) {
                        return 0;
                    }
                    return y2 < y0 ? 1 : -1;
                }
            }
        }
        
        // TODO
        // Arc 旋转
        function windingArc(cx, cy, a, b, theta, dTheta, clockwise, x, y) {
            y -= cy;
            if (y > b || y < -b) {
                return 0;
            }
            var tmp = Math.sqrt(b * b - y * y) * a / b;
            roots[0] = -tmp;
            roots[1] = tmp;

            var PI2 = Math.PI * 2;
            // Thresh to [0, 360]
            var startAngle = theta % PI2;
            var endAngle = (theta + dTheta) % PI2;
            if (startAngle < 0) {
                startAngle = startAngle + PI2;
            }
            if (endAngle < 0) {
                endAngle = endAngle + PI2;
            }
            if (clockwise) {
                // Make sure start angle is smaller than end angle
                if (startAngle >= endAngle) {
                    endAngle = endAngle + PI2;
                }
            } 
            else {
                // Make sure start angle is larger than end angle
                if (startAngle <= endAngle) {
                    endAngle = endAngle - PI2;
                }
            }

            var w = 0;
            for (var i = 0; i < 2; i++) {
                var x_ = roots[i];
                if (x_ + cx > x) {
                    // zr 使用scale来模拟椭圆，在缩放后角度会有细微的变化
                    // 所以这里先将 x 缩放至原来值
                    x_ *= b / a;
                    var angle = Math.atan2(y, x_);
                    var dir = clockwise ? -1 : 1;
                    if (angle < 0) {
                        angle = PI2 + angle;
                    }
                    if (
                        clockwise && (angle >= startAngle && angle <= endAngle)
                     || (!clockwise && (angle <= startAngle && angle >= endAngle))
                    ) {
                        if (angle > Math.PI / 2 && angle < Math.PI * 1.5) {
                            dir = -dir;
                        }
                        w += dir;
                    }
                }
            }
            return w;
        }

        /**
         * 路径包含判断
         * 与 canvas 一样采用 non-zero winding rule
         */
        function isInsidePath(area, x, y) {
            if (!area.pathArray) {
                var Path = require('../shape/Path');
                area.pathArray = Path.prototype.buildPathArray(area.path);
            }
            var w = 0;
            var pathArray = area.pathArray;
            var xi = 0;
            var yi = 0;
            var x0 = 0;
            var y0 = 0;
            var beginSubpath = true;

            var roots = [-1, -1, -1];
            for (var i = 0; i < pathArray.length; i++) {
                var seg = pathArray[i];
                var p = seg.points;
                // Begin a new subpath
                if (beginSubpath || seg.command === 'M') {
                    if (i > 0) {
                        // Close previous subpath
                        w += windingLine(xi, yi, x0, y0);
                        if (w !== 0) {
                            return true;
                        }
                    }
                    x0 = p[p.length - 2];
                    y0 = p[p.length - 1];
                    beginSubpath = false;
                }
                switch (seg.command) {
                    case 'M':
                        xi = p[0];
                        yi = p[1];
                        break;
                    case 'L':
                        w += windingLine(xi, yi, p[0], p[1], x, y);
                        xi = p[0];
                        yi = p[1];
                        break;
                    case 'C':
                        w += windingCubic(xi, yi, p[0], p[1], p[2], p[3], p[4], p[5], x, y);
                        xi = p[4];
                        yi = p[5];
                        break;
                    case 'Q':
                        w += windingQuadratic(xi, yi, p[0], p[1], p[2], p[3], p[4], p[5], x, y);
                        xi = p[2];
                        yi = p[3];
                        break;
                    case 'A':
                        // TODO Arc 旋转
                        // TODO Arc 判断的开销比较大
                        var cx = p[0];
                        var cy = p[1];
                        var rx = p[2];
                        var ry = p[3];
                        var theta = p[4];
                        var dTheta = p[5];
                        var x1 = Math.cos(theta) * rx + cx;
                        var y1 = Math.sin(theta) * ry + cy;
                        w += windingLine(xi, yi, x1, y1);
                        w += windingArc(cx, cy, rx, ry, theta, dTheta, p[7], x, y);
                        xi = Math.cos(theta + dTheta) * rx + cx;
                        yi = Math.sin(theta + dTheta) * ry + cy;
                        break;
                    case 'z':
                        beginSubpath = true;
                        break;
                }
            }
            w += windingLine(xi, yi, x0, y0, x, y);
            return w != 0;
        }
        
        /**
         * 测算多行文本宽度
         * @param {Object} text
         * @param {Object} textFont
         */
        function getTextWidth(text, textFont) {
            var key = text + ':' + textFont;
            if (_textWidthCache[key]) {
                return _textWidthCache[key];
            }
            _ctx = _ctx || util.getContext();
            _ctx.save();

            if (textFont) {
                _ctx.font = textFont;
            }
            
            text = (text + '').split('\n');
            var width = 0;
            for (var i = 0, l = text.length; i < l; i++) {
                width =  Math.max(
                    _ctx.measureText(text[i]).width,
                    width
                );
            }
            _ctx.restore();

            _textWidthCache[key] = width;
            if (++_textWidthCacheCounter > TEXT_CACHE_MAX) {
                // 内存释放
                _textWidthCacheCounter = 0;
                _textWidthCache = {};
            }
            
            return width;
        }
        
        /**
         * 测算多行文本高度
         * @param {Object} text
         * @param {Object} textFont
         */
        function getTextHeight(text, textFont) {
            var key = text + ':' + textFont;
            if (_textHeightCache[key]) {
                return _textHeightCache[key];
            }
            
            _ctx = _ctx || util.getContext();

            _ctx.save();
            if (textFont) {
                _ctx.font = textFont;
            }
            
            text = (text + '').split('\n');
            // 比较粗暴
            var height = (_ctx.measureText('国').width + 2) * text.length;

            _ctx.restore();

            _textHeightCache[key] = height;
            if (++_textHeightCacheCounter > TEXT_CACHE_MAX) {
                // 内存释放
                _textHeightCacheCounter = 0;
                _textHeightCache = {};
            }
            return height;
        }

        return {
            isInside : isInside,
            isOutside : isOutside,
            getTextWidth : getTextWidth,
            getTextHeight : getTextHeight,

            isInsidePath: isInsidePath,
            isInsidePolygon: isInsidePolygon,
            isInsideSector: isInsideSector,
            isInsideCircle: isInsideCircle,
            isInsideLine: isInsideLine,
            isInsideRect: isInsideRect,
            isInsideBrokenLine: isInsideBrokenLine
        };
    }
);
