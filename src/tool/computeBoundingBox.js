/**
 * zrender: 计算包围盒
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         pissang(https://github.com/pissang)
 *         errorrik (errorrik@gmail.com)
 */

define(
    function (require) {
        var vec2 = require('./vector');

        /**
         * 计算包围盒
         */
        function computeBoundingBox(points, min, max) {
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
         * 计算三阶贝塞尔曲线的包围盒
         * http://pissang.net/blog/?p=91
         */
        function computeCubeBezierBoundingBox(p0, p1, p2, p3, min, max) {
            var xDim = _computeCubeBezierExtremitiesDim(
                p0[0], p1[0], p2[0], p3[0]
            );
            var yDim = _computeCubeBezierExtremitiesDim(
                p0[1], p1[1], p2[1], p3[1]
            );

            xDim.push(p0[0], p3[0]);
            yDim.push(p0[1], p3[1]);

            var left = Math.min.apply(null, xDim);
            var right = Math.max.apply(null, xDim);
            var top = Math.min.apply(null, yDim);
            var bottom = Math.max.apply(null, yDim);

            min[0] = left;
            min[1] = top;
            max[0] = right;
            max[1] = bottom;
        }

        function _computeCubeBezierExtremitiesDim(p0, p1, p2, p3) {
            var extremities = [];

            var b = 6 * p2 - 12 * p1 + 6 * p0;
            var a = 9 * p1 + 3 * p3 - 3 * p0 - 9 * p2;
            var c = 3 * p1 - 3 * p0;

            var tmp = b * b - 4 * a * c;
            if (tmp > 0){
                var tmpSqrt = Math.sqrt(tmp);
                var t1 = (-b + tmpSqrt) / (2 * a);
                var t2 = (-b - tmpSqrt) / (2 * a);
                extremities.push(t1, t2);
            } 
            else if (tmp === 0) {
                extremities.push(-b / (2 * a));
            }

            var result = [];
            for (var i = 0; i < extremities.length; i++) {
                var t = extremities[i];
                if (Math.abs(2 * a * t + b) > 0.0001 && t < 1 && t > 0) {
                    var ct = 1 - t;
                    var val = ct * ct * ct * p0 
                            + 3 * ct * ct * t * p1
                            + 3 * ct * t * t * p2
                            + t * t *t * p3;

                    result.push(val);
                }
            }

            return result;
        }

        /**
         * 计算二阶贝塞尔曲线的包围盒
         * http://pissang.net/blog/?p=91
         */
        function computeQuadraticBezierBoundingBox(p0, p1, p2, min, max) {
            // Find extremities, where derivative in x dim or y dim is zero
            var tmp = (p0[0] + p2[0] - 2 * p1[0]);
            // p1 is center of p0 and p2 in x dim
            var t1;
            if (tmp === 0) {
                t1 = 0.5;
            } else {
                t1 = (p0[0] - p1[0]) / tmp;
            }

            tmp = (p0[1] + p2[1] - 2 * p1[1]);
            // p1 is center of p0 and p2 in y dim
            var t2;
            if (tmp === 0) {
                t2 = 0.5;
            } else {
                t2 = (p0[1] - p1[1]) / tmp;
            }

            t1 = Math.max(Math.min(t1, 1), 0);
            t2 = Math.max(Math.min(t2, 1), 0);

            var ct1 = 1-t1;
            var ct2 = 1-t2;

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

            return computeBoundingBox(
                        [p0.slice(), p2.slice(), [x1, y1], [x2, y2]],
                        min, max
                    );
        }

        /**
         * 计算圆弧的包围盒
         * http://pissang.net/blog/?p=91
         */
        var computeArcBoundingBox = (function(){
            var start = [];
            var end = [];
            // At most 4 extremities
            var extremities = [[], [], [], []];
            return function(
                center, radius, startAngle, endAngle, clockwise, min, max
            ) {
                clockwise = clockwise ? 1 : -1;
                start[0] = Math.cos(startAngle);
                start[1] = Math.sin(startAngle) * clockwise;
                vec2.scale(start, start, radius);
                vec2.add(start, start, center);

                end[0] = Math.cos(endAngle);
                end[1] = Math.sin(endAngle) * clockwise;
                vec2.scale(end, end, radius);
                vec2.add(end, end, center);
                
                startAngle = startAngle % (Math.PI * 2);
                if (startAngle < 0) {
                    startAngle = startAngle + Math.PI * 2;
                }
                endAngle = endAngle % (Math.PI * 2);
                if (endAngle < 0) {
                    endAngle = endAngle + Math.PI * 2;
                }

                if (startAngle > endAngle) {
                    endAngle += Math.PI * 2;
                }
                var number = 0;
                for (var angle = 0; angle < endAngle; angle += Math.PI / 2) {
                    if (angle > startAngle) {
                        var extremity = extremities[number++];
                        extremity[0] = Math.cos(angle);
                        extremity[1] = Math.sin(angle) * clockwise;
                        vec2.scale(extremity, extremity, radius);
                        vec2.add(extremity, extremity, center);
                    }
                }
                var points = extremities.slice(0, number);
                points.push(start, end);
                computeBoundingBox(points, min, max);
            };
        })();

        computeBoundingBox.cubeBezier = computeCubeBezierBoundingBox;
        computeBoundingBox.quadraticBezier = computeQuadraticBezierBoundingBox;
        computeBoundingBox.arc = computeArcBoundingBox;

        return computeBoundingBox;
    }
);
