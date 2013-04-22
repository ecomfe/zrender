/**
 * zrender : 图形空间辅助类
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 *  
 * isInside：是否在区域内部
 * isOutside：是否在区域外部
 */
define(
    function(require) {
        var shape = require('../shape');
        var util = require('../tool/util');
        
        var _ctx;
        
        /**
         * 包含判断
         * @param {string} zoneType : 图形类别
         * @param {Object} area ： 目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         */
        function isInside(zoneType, area, x, y) {
            if (!area) {
                return false;
            }
            
            if (!_ctx) {
                _ctx = util.getContext();
            }
            
            var sectorClazz = shape.get(zoneType);
            if (!sectorClazz) {
                // 不支持类型
                return false;
            }

            if (zoneType != 'line' 
                && zoneType != 'brokenLine'
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
                // 未实现或不可用时(excanvas不支持)则数学运算，主要是line，brokenLine，ring
                if (!_isInsideRectangle(sectorClazz.getRect(area), x, y)) {
                    // 不在矩形区域内直接返回
                    return false;
                }
                
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
                        return _isInsideCircle(area, x, y);
                    //扇形----------------------7
                    case 'sector':
                        return _isInsideSector(area, x, y);
                    //多边形---------------------8
                    case 'polygon':
                        return _isInsidePolygon(area, x, y);
                    //图片----------------------9
                    case 'image':
                        return true;
                    //心形----------------------10
                    case 'heart':
                        return true;    // Todo，不精确
                    //水滴----------------------11
                    case 'droplet':
                        return true;    // Todo，不精确
                    //椭圆----------------------12
                    case 'ellipse':
                        return false;    // Todo，不精确
                    //路径----------------------13
                    case 'path':
                        return false;   // Todo，暂不支持
                }
            }
            
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
            return Math.abs(
                       Math.abs(
                           (area.xStart - x) 
                           * (area.yStart - area.yEnd)
                           / (area.xStart - area.xEnd) 
                           - area.yStart
                       ) 
                       - y
                  ) 
                  < (area.lineWidth || 1);
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
                insideCatch = isInside('line', lineArea, x, y);
                if (insideCatch) {
                    break;
                }
            }
            return insideCatch;
        }
        
        function _isInsideRing(area, x, y) {
            if (isInside('circle', area, x, y)
                && isOutside(
                    'circle',
                    {
                        x : area.x,
                        y : area.y,
                        r : area.r0 || 0
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
            return (x - area.x) * (x - area.x) + (y - area.y) * (y - area.y)
                   < area.r * area.r;
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
            if (!_ctx) {
                _ctx = util.getContext();
            }
            
            _ctx.save();
            if (textFont) {
                _ctx.font = textFont;
            }
            var width = _ctx.measureText(text).width;
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
