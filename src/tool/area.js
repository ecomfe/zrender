/**
 * zrender: 图形空间辅助类
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * isInside：是否在区域内部
 * isOutside：是否在区域外部
 * getTextWidth：测算单行文本宽度
 */
define(
    function(require) {
        var util = require('../tool/util');

        var _ctx;

        /**
         * 包含判断
         * @param {string} shapeClazz : 图形类
         * @param {Object} area ： 目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         */
        function isInside(shapeClazz, area, x, y) {
            if (!area || !shapeClazz) {
                // 无参数或不支持类型
                return false;
            }
            var zoneType = shapeClazz.type;

            if (!_ctx) {
                _ctx = util.getContext();
            }
            if (!_isInsideRectangle(
                    area.__rect || shapeClazz.getRect(area), x, y
                 )
             ) {
                // 不在矩形区域内直接返回false
                return false;
            }

            // 未实现或不可用时(excanvas不支持)则数学运算，主要是line，brokenLine，ring
            var _mathReturn = _mathMethod(zoneType, area, x, y);

            if (typeof _mathReturn != 'undefined') {
                return _mathReturn;
            }

            if (zoneType != 'beziercurve'
                && shapeClazz.buildPath
                && _ctx.isPointInPath
            ) {
                return _buildPathMethod(shapeClazz, _ctx, area, x, y);
            }
            else if (_ctx.getImageData) {
                return _pixelMethod(shapeClazz, area, x, y);
            }

            // 上面的方法都行不通时
            switch (zoneType) {
                //心形----------------------10
                case 'heart':
                    return true;    // Todo，不精确
                //水滴----------------------11
                case 'droplet':
                    return true;    // Todo，不精确
                case 'ellipse':
                    return true;     // Todo，不精确
                // 旋轮曲线  不准确
                case 'trochoid':
                    var _r = area.location == 'out'
                            ? area.r1 + area.r2 + area.d
                            : area.r1 - area.r2 + area.d;
                    return _isInsideCircle(area, x, y, _r);
                // 玫瑰线 不准确
                case 'rose' :
                    return _isInsideCircle(area, x, y, area.maxr);
                //路径，椭圆，曲线等-----------------13
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
                //线-----------------------1
                case 'line':
                    return _isInsideLine(area, x, y);
                //折线----------------------2
                case 'brokenLine':
                    return _isInsideBrokenLine(area, x, y);
                //文本----------------------3
                case 'text':
                    return true;
                //圆环----------------------4
                case 'ring':
                    return _isInsideRing(area, x, y);
                //矩形----------------------5
                case 'rectangle':
                    return true;
                //圆形----------------------6
                case 'circle':
                    return _isInsideCircle(area, x, y, area.r);
                //扇形----------------------7
                case 'sector':
                    return _isInsideSector(area, x, y);
                //多边形---------------------8
                case 'path':
                    return _isInsidePath(area, x, y);
                case 'polygon':
                case 'star':
                case 'isogon':
                    return _isInsidePolygon(area, x, y);
                //图片----------------------9
                case 'image':
                    return true;
            }
        }

        /**
         * 通过buildPath方法来判断，三个方法中较快，但是不支持线条类型的shape，
         * 而且excanvas不支持isPointInPath方法
         *
         * @param {Object} shapeClazz ： shape类
         * @param {Object} context : 上下文
         * @param {Object} area ：目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         * @return {boolean} true表示坐标处在图形中
         */
        function _buildPathMethod(shapeClazz, context, area, x, y) {
            // 图形类实现路径创建了则用类的path
            context.beginPath();
            shapeClazz.buildPath(context, area);
            context.closePath();
            return context.isPointInPath(x, y);
        }

        /**
         * 通过像素值来判断，三个方法中最慢，但是支持广,不足之处是excanvas不支持像素处理
         *
         * @param {Object} shapeClazz ： shape类
         * @param {Object} area ：目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         * @return {boolean} true表示坐标处在图形中
         */
        function _pixelMethod(shapeClazz, area, x, y) {
            var _rect = area.__rect || shapeClazz.getRect(area);
            var _context = util.getPixelContext();
            var _offset = util.getPixelOffset();

            util.adjustCanvasSize(x, y);
            _context.clearRect(_rect.x, _rect.y, _rect.width, _rect.height);
            _context.beginPath();
            shapeClazz.brush(_context, {style : area});
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
                unit = Math.floor((unit || 1 )/ 2);
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
        function isOutside(shapeClazz, area, x, y) {
            return !isInside(shapeClazz, area, x, y);
        }

        /**
         * 线段包含判断
         */
        function _isInsideLine(area, x, y) {
            var _x1 = area.xStart;
            var _y1 = area.yStart;
            var _x2 = area.xEnd;
            var _y2 = area.yEnd;
            var _l = Math.max(area.lineWidth, 3);
            var _a = 0;
            var _b = _x1;

            if (_x1 !== _x2) {
                _a = (_y1 - _y2) / (_x1 - _x2);
                _b = (_x1 * _y2 - _x2 * _y1) / (_x1 - _x2) ;
            }
            else {
                return Math.abs(x - _x1) <= _l / 2;
            }

            var _s = (_a * x - y + _b) * (_a * x - y + _b) / (_a * _a + 1);
            return  _s <= _l / 2 * _l / 2;
        }

        function _isInsideBrokenLine(area, x, y) {
            var pointList = area.pointList;
            var lineArea;
            var insideCatch = false;
            for (var i = 0, l = pointList.length - 1; i < l; i++) {
                lineArea = {
                    xStart : pointList[i][0],
                    yStart : pointList[i][1],
                    xEnd : pointList[i + 1][0],
                    yEnd : pointList[i + 1][1],
                    lineWidth : area.lineWidth
                };
                if (!_isInsideRectangle(
                        {
                            x : Math.min(lineArea.xStart, lineArea.xEnd)
                                - lineArea.lineWidth,
                            y : Math.min(lineArea.yStart, lineArea.yEnd)
                                - lineArea.lineWidth,
                            width : Math.abs(lineArea.xStart - lineArea.xEnd)
                                    + lineArea.lineWidth,
                            height : Math.abs(lineArea.yStart - lineArea.yEnd)
                                     + lineArea.lineWidth
                        },
                        x,y
                    )
                ) {
                    // 不在矩形区内跳过
                    continue;
                }
                insideCatch = _isInsideLine(lineArea, x, y);
                if (insideCatch) {
                    break;
                }
            }
            return insideCatch;
        }

        function _isInsideRing(area, x, y) {
            if (_isInsideCircle(area, x, y, area.r)
                && !_isInsideCircle(
                    {
                        x : area.x,
                        y : area.y
                    },
                    x, y,
                    area.r0 || 0
                )
            ){
                // 大圆内，小圆外
                return true;
            }
            return false;
        }

        /**
         * 矩形包含判断
         */
        function _isInsideRectangle(area, x, y) {
            if (x >= area.x
                && x <= (area.x + area.width)
                && y >= area.y
                && y <= (area.y + area.height)
            ) {
                return true;
            }
            return false;
        }

        /**
         * 圆形包含判断
         */
        function _isInsideCircle(area, x, y, r) {
            return (x - area.x) * (x - area.x) + (y - area.y) * (y - area.y)
                   < r * r;
        }

        /**
         * 扇形包含判断
         */
        function _isInsideSector(area, x, y) {
            if (!_isInsideCircle(area, x, y, area.r)
                || (area.r0 > 0
                    && _isInsideCircle(
                            {
                                x : area.x,
                                y : area.y
                            },
                            x, y,
                            area.r0
                        )
                    )
            ){
                // 大圆外或者小圆内直接false
                return false;
            }
            else {
                // 判断夹角
                var angle = (360
                             - Math.atan2(y - area.y, x - area.x)
                             / Math.PI
                             * 180)
                             % 360;
                var endA = (360 + area.endAngle) % 360;
                var startA = (360 + area.startAngle) % 360;
                if (endA > startA) {
                    return (angle >= startA && angle <= endA);
                } else {
                    return !(angle >= endA && angle <= startA);
                }

            }
        }

        /**
         * 多边形包含判断
         * 警告：下面这段代码会很难看，建议跳过~
         */
        function _isInsidePolygon(area, x, y) {
            /**
             * 射线判别法
             * 如果一个点在多边形内部，任意角度做射线肯定会与多边形要么有一个交点，要么有与多边形边界线重叠
             * 如果一个点在多边形外部，任意角度做射线要么与多边形有一个交点，
             * 要么有两个交点，要么没有交点，要么有与多边形边界线重叠。
             */
            var i;
            var j;
            var polygon = area.pointList;
            var N = polygon.length;
            var inside = false;
            var redo = true;
            var v;

            for (i = 0; i < N; ++i) {
                // 是否在顶点上
                if (polygon[i][0] == x && polygon[i][1] == y ) {
                    redo = false;
                    inside = true;
                    break;
                }
            }

            if (redo) {
                redo = false;
                inside = false;
                for (i = 0,j = N - 1;i < N;j = i++) {
                    if ((polygon[i][1] < y && y < polygon[j][1])
                        || (polygon[j][1] < y && y < polygon[i][1])
                    ) {
                        if (x <= polygon[i][0] || x <= polygon[j][0]) {
                            v = (y - polygon[i][1])
                                * (polygon[j][0] - polygon[i][0])
                                / (polygon[j][1] - polygon[i][1])
                                + polygon[i][0];
                            if (x < v) {          // 在线的左侧
                                inside = !inside;
                            }
                            else if (x == v) {   // 在线上
                                inside = true;
                                break;
                            }
                        }
                    }
                    else if (y == polygon[i][1]) {
                        if (x < polygon[i][0]) {    // 交点在顶点上
                            polygon[i][1] > polygon[j][1] ? --y : ++y;
                            //redo = true;
                            break;
                        }
                    }
                    else if (polygon[i][1] == polygon[j][1] // 在水平的边界线上
                             && y == polygon[i][1]
                             && ((polygon[i][0] < x && x < polygon[j][0])
                                 || (polygon[j][0] < x && x < polygon[i][0]))
                    ) {
                        inside = true;
                        break;
                    }
                }
            }
            return inside;
        }
        
        /**
         * 路径包含判断，依赖多边形判断
         */
        function _isInsidePath(area, x, y) {
            if (!area.pointList) {
                require('../shape').get('path').buildPath(_ctx, area);
            }
            var pointList = area.pointList;
            var insideCatch = false;
            for (var i = 0, l = pointList.length; i < l; i++) {
                insideCatch = _isInsidePolygon(
                    { pointList : pointList[i] }, x, y
                );
                if (insideCatch) {
                    break;
                }
            }
            return insideCatch;
        }

        /**
         * 测算多行文本宽度
         * @param {Object} text
         * @param {Object} textFont
         */
        function getTextWidth(text, textFont) {
            if (!_ctx) {
                _ctx = util.getContext();
            }

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

            return width;
        }
        
        /**
         * 测算多行文本高度
         * @param {Object} text
         * @param {Object} textFont
         */
        function getTextHeight(text, textFont) {
            if (!_ctx) {
                _ctx = util.getContext();
            }

            _ctx.save();
            if (textFont) {
                _ctx.font = textFont;
            }
            
            text = (text + '').split('\n');
            //比较粗暴
            var height = (_ctx.measureText('国').width + 2) * text.length;

            _ctx.restore();

            return height;
        }

        return {
            isInside : isInside,
            isOutside : isOutside,
            getTextWidth : getTextWidth,
            getTextHeight : getTextHeight
        };
    }
);
