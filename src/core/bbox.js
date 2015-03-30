/**
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *         pissang(https://github.com/pissang)
 *         errorrik (errorrik@gmail.com)
 */
define(function (require) {

    var vec2 = require('./vector');
    var curve = require('./curve');

    var bbox = {};
    var mathMin = Math.min;
    var mathMax = Math.max;
    var mathSin = Math.sin;
    var mathCos = Math.cos;

    var start = vec2.create();
    var end = vec2.create();
    var extremity = vec2.create();

    var PI2 = Math.PI * 2;
    /**
     * 从顶点数组中计算出最小包围盒，写入`min`和`max`中
     * @module zrender/core/bbox
     * @param {Array<Object>} points 顶点数组
     * @param {number} min
     * @param {number} max
     */
    bbox.fromPoints = function(points, min, max) {
        if (points.length === 0) {
            return;
        }
        var left = points[0][0];
        var right = points[0][0];
        var top = points[0][1];
        var bottom = points[0][1];
        
        for (var i = 1; i < points.length; i++) {
            var p = points[i];
            if (p[0] < left) {
                left = p[0];
            }
            if (p[0] > right) {
                right = p[0];
            }
            if (p[1] < top) {
                top = p[1];
            }
            if (p[1] > bottom) {
                bottom = p[1];
            }
        }

        min[0] = left;
        min[1] = top;
        max[0] = right;
        max[1] = bottom;
    }

    /**
     * 从三阶贝塞尔曲线(p0, p1, p2, p3)中计算出最小包围盒，写入`min`和`max`中
     * @memberOf module:zrender/core/bbox
     * @param {Array.<number>} p0
     * @param {Array.<number>} p1
     * @param {Array.<number>} p2
     * @param {Array.<number>} p3
     * @param {Array.<number>} min
     * @param {Array.<number>} max
     */
    bbox.fromCubic = function(p0, p1, p2, p3, min, max) {
        var xDim = [];
        var yDim = [];
        curve.cubicExtrema(p0[0], p1[0], p2[0], p3[0], xDim);
        for (var i = 0; i < xDim.length; i++) {
            xDim[i] = curve.cubicAt(p0[0], p1[0], p2[0], p3[0], xDim[i]);
        }
        curve.cubicExtrema(p0[1], p1[1], p2[1], p3[1], yDim);
        for (var i = 0; i < yDim.length; i++) {
            yDim[i] = curve.cubicAt(p0[1], p1[1], p2[1], p3[1], yDim[i]);
        }

        xDim.push(p0[0], p3[0]);
        yDim.push(p0[1], p3[1]);

        var left = mathMin.apply(null, xDim);
        var right = mathMax.apply(null, xDim);
        var top = mathMin.apply(null, yDim);
        var bottom = mathMax.apply(null, yDim);

        min[0] = left;
        min[1] = top;
        max[0] = right;
        max[1] = bottom;
    }

    /**
     * 从二阶贝塞尔曲线(p0, p1, p2)中计算出最小包围盒，写入`min`和`max`中
     * @memberOf module:zrender/core/bbox
     * @param {Array.<number>} p0
     * @param {Array.<number>} p1
     * @param {Array.<number>} p2
     * @param {Array.<number>} min
     * @param {Array.<number>} max
     */
    bbox.fromQuadratic = function(p0, p1, p2, min, max) {
        // Find extremities, where derivative in x dim or y dim is zero
        var t1 = 
            mathMax(
                mathMin(curve.quadraticExtremum(p0[0], p1[0], p2[0]), 1), 0
            );
        var t2 = 
            mathMax(
                mathMin(curve.quadraticExtremum(p0[1], p1[1], p2[1]), 1), 0
            );

        var ct1 = 1 - t1;
        var ct2 = 1 - t2;

        var x1 = ct1 * ct1 * p0[0] 
                 + 2 * ct1 * t1 * p1[0] 
                 + t1 * t1 * p2[0];
        var y1 = ct1 * ct1 * p0[1] 
                 + 2 * ct1 * t1 * p1[1] 
                 + t1 * t1 * p2[1];

        var x2 = ct2 * ct2 * p0[0] 
                 + 2 * ct2 * t2 * p1[0] 
                 + t2 * t2 * p2[0];
        var y2 = ct2 * ct2 * p0[1] 
                 + 2 * ct2 * t2 * p1[1] 
                 + t2 * t2 * p2[1];
        min[0] = mathMin(p0[0], p2[0], x1, x2);
        min[1] = mathMin(p0[1], p2[1], y1, y2);
        max[0] = mathMax(p0[0], p2[0], x1, x2);
        max[1] = mathMax(p0[1], p2[1], y1, y2);
    }

    /**
     * 从圆弧中计算出最小包围盒，写入`min`和`max`中
     * @method
     * @memberOf module:zrender/core/bbox
     * @param {Array.<number>} center 圆弧中心点
     * @param {number} radius 圆弧半径
     * @param {number} startAngle 圆弧开始角度
     * @param {number} endAngle 圆弧结束角度
     * @param {number} anticlockwise 是否是顺时针
     * @param {Array.<number>} min
     * @param {Array.<number>} max
     */
    bbox.fromArc = function (
        x, y, r, startAngle, endAngle, anticlockwise, min, max
    ) { 
        if (Math.abs(startAngle - endAngle) >= PI2) {
            // Is a circle
            min[0] = x - r;
            min[1] = y - r;
            max[0] = x + r;
            max[1] = y + r;
            return;
        }

        start[0] = mathCos(startAngle) * r + x;
        start[1] = mathSin(startAngle) * r + y;

        end[0] = mathCos(endAngle) * r + x;
        end[1] = mathSin(endAngle) * r + y;

        vec2.min(min, start, end);
        vec2.max(max, start, end);
        
        // Thresh to [0, Math.PI * 2]
        startAngle = startAngle % (PI2);
        if (startAngle < 0) {
            startAngle = startAngle + PI2;
        }
        endAngle = endAngle % (PI2);
        if (endAngle < 0) {
            endAngle = endAngle + PI2;
        }

        if (startAngle > endAngle && !anticlockwise) {
            endAngle += PI2;
        } else if (startAngle < endAngle && anticlockwise) {
            startAngle += PI2;
        }
        if (anticlockwise) {
            var tmp = endAngle;
            endAngle = startAngle;
            startAngle = tmp;
        }

        // var number = 0;
        // var step = (anticlockwise ? -Math.PI : Math.PI) / 2;
        for (var angle = 0; angle < endAngle; angle += Math.PI / 2) {
            if (angle > startAngle) {
                extremity[0] = mathCos(angle) * r + x;
                extremity[1] = mathSin(angle) * r + y;

                vec2.min(min, extremity, min);
                vec2.max(max, extremity, max);
            }
        }
    };

    return bbox;
});
