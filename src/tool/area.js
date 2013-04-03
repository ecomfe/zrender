/**
 * 图形空间辅助类:
 * isInside：是否在区域内部
 * isOutside：是否在区域外部
 */
define(
    function(require) {
        require( "js!../lib/excanvas.js" );
        if (document.createElement('canvas').getContext) {
            G_vmlCanvasManager = false;
        }
        
        var _ctx;
        if (G_vmlCanvasManager){
            _ctx = G_vmlCanvasManager.initElement(document.createElement('div')).getContext('2d');
        }
        else {
            _ctx = document.createElement('canvas').getContext('2d');            
        }
        
        /**
         * 包含判断
         * @param {string} zoneType : 图形类别
         * @param {Object} area ： 目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         */
        function isInside(zoneType, area, x, y) {
            var shape = require('../shape');
            if (!area) {
                return false;
            }
            
            var sectorClazz = shape.get(zoneType);
            if (zoneType != 'line' 
                && zoneType != 'brokenLine'
                && sectorClazz 
                && sectorClazz.buildPath 
                && _ctx.isPointInPath
            ) {
                // 图形类实现路径创建了则用类的path
                _ctx.beginPath();
                sectorClazz.buildPath(_ctx, area);
                _ctx.closePath();
                return _ctx.isPointInPath(x, y);
            } 
            else {
                // 未实现或不可用时则数学运算，主要是line，brokenLine，text，ring
                 switch (zoneType) {
                    //线-----------------------
                    case 'line':
                        return _isInsideLine(area, x, y);
                    //折线----------------------
                    case 'brokenLine':
                        return _isInsideBrokenLine(area, x, y);
                    //文本----------------------
                    case 'text':
                        return _isInsideText(area, x, y);
                    //圆环----------------------
                    case 'ring':
                        return _isInsideRing(area, x, y);
                    //矩形----------------------
                    case 'rectangle':
                        return _isInsideRectangle(area, x, y);
                    //圆型----------------------
                    case 'circle':
                        return _isInsideCircle(area, x, y);
                    //扇形----------------------
                    case 'sector':
                        return _isInsideSector(area, x, y);
                    //多边形---------------------
                    case 'polygon':
                        return _isInsidePolygon(area, x, y);
                }
            }
           
            // 不支持类型
            return false;
        }
        
        /**
         * !isInside 
         */
        function isOutside(zoneType, area, x, y) {
            return !isInside(zoneType, area, x, y);
        }
        
        /**
         * 线段包含判断 
         */
        function _isInsideLine(area, x, y) {
            //水平、垂直快捷判断
            if (area.xStart == area.xEnd) {
                //垂直线判断
                return area.yStart <= y 
                       && area.yEnd >= y 
                       && Math.abs(area.xStart - x) < (area.lineWidth || 1);
            }
            if (area.yStart == area.yEnd){
                //水平线判断
                return area.xStart <= x 
                       && area.xEnd >= x 
                       && Math.abs(area.yStart - y) < (area.lineWidth || 1);
            }
            //斜线判断
            if (_isInsideRectangle(
                    {
                        x : Math.min(area.xStart, area.xEnd) - area.lineWidth,
                        y : Math.min(area.yStart, area.yEnd) - area.lineWidth,
                        width : Math.abs(area.xStart - area.xEnd) 
                                + area.lineWidth,
                        height : Math.abs(area.yStart - area.yEnd) 
                                + area.lineWidth
                    },
                    x,
                    y
                )
            ) {
                //在矩形内再说，点线距离少于线宽
                return Math.abs(
                           Math.abs(
                               (area.xStart - x) 
                               * (area.yStart - area.yEnd)
                               / (area.xStart - area.xEnd) 
                               - area.yStart
                           ) - y
                       ) 
                       < (area.lineWidth || 1);
            }
            else {
                return false;
            }
        }
        
        function _isInsideBrokenLine(area, x, y) {
            var pointList = area.pointList;
            // 线段hover需要余弦正弦，先弄个长方区域判断不在区域内直接返回false加速判断
            var minX = Number.MAX_VALUE;
            var minY = Number.MAX_VALUE;
            var maxX = Number.MIN_VALUE;
            var maxY = Number.MIN_VALUE;
            for (var i = 0, l = pointList.length; i < l; i++) {
                minX = Math.min(minX, pointList[i][0]);
                minY = Math.min(minY, pointList[i][1]);
                maxX = Math.max(maxX, pointList[i][0]);
                maxY = Math.max(maxY, pointList[i][1]);
            }
            var rectangleArea = {
                x : minX,
                y : minY,
                width : maxX - minX,
                height : maxY - minY
            }
            if (!isInside('rectangle', rectangleArea, x, y)) {
                return false;
            }
            
            // 在方形区域内再判断
            var util = require('../tool/util');
            var lineArea = util.clone(area);
            var insideCatch = false;
            for (var i = 0, l = pointList.length - 1; i < l; i++) {
                lineArea.xStart = pointList[i][0];
                lineArea.yStart = pointList[i][1];
                lineArea.xEnd = pointList[i + 1][0];
                lineArea.yEnd = pointList[i + 1][1];
                insideCatch = _isInsideLine(lineArea, x, y);
                if (insideCatch) {
                    break;
                }
            }
            return insideCatch;
        }
        /**
         * 文字包含判断 
         */
        function _isInsideText(area, x, y) {
            var width =  getTextWidth(area.text, area.textFont);
            var height = typeof area.textFont != 'undefined' 
                         ? (area.textFont.match(/\d+/) - 0) : 10; //比较粗暴
            
            var textX = area.x;                 //默认start == left
            if (area.textAlign == 'end' || area.textAlign == 'right') {
                textX -= width;
            } else if (area.textAlign == 'center') {
                textX -= (width / 2);
            }
            var textY = area.y - height / 2;    //默认middle
            if (area.textBaseline == 'top') {
                textY += height / 2;
            } else if (area.textBaseline == 'bottom') {
                textX -= height / 2;
            }
            return _isInsideRectangle(
                        {
                            x : textX,
                            y : textY,
                            width : width,
                            height : height
                        },
                        x,y
                    )
        }
        
        function _isInsideRing(area, x, y) {
            if (isInside('circle', area, x, y)
                && isOutside(
                    'circle',
                    {
                        x : area.x,
                        y : area.y,
                        r : area.r0
                    }, 
                    x, y
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
        function _isInsideCircle(area, x, y) {
            if (Math.abs(x - area.x) > area.r || Math.abs(y - area.y) > area.r) {
                return false   ;
            }
            var l2 = Math.pow(x - area.x, 2) + Math.pow(y - area.y, 2);
            return l2 < Math.pow((area.r || 0), 2);
        }
        
        /**
         * 扇形包含判断 
         */
        function _isInsideSector(area, x, y) {
            if (isOutside('circle', area, x, y)
                || (area.r0 > 0 
                    && isInside(
                            'circle',
                            {
                                x : area.x,
                                y : area.y,
                                r : area.r0
                            }, 
                            x, y
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
                return (angle >= area.startAngle && angle <= area.endAngle);
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
            var left = 0;
            var right = 0;
                
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
        
        function getTextWidth(text, textFont) {
            var width;
            _ctx.save();
            if (textFont) {
                _ctx.font = textFont;
            }
            width = _ctx.measureText(text).width;
            _ctx.restore();
            return width;
        }
        
        return {
            isInside : isInside,
            isOutside : isOutside,
            getTextWidth : getTextWidth
        }
    }  
);
