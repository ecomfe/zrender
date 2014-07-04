/**
 * 贝塞尔平滑曲线 
 *
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 *          errorrik (errorrik@gmail.com)
 */

define(
    function ( require ) {
        var vector = require('../../tool/vector');

        /**
         * 贝塞尔平滑曲线 
         */
        return function (points, smooth, isLoop) {
            var cps = [];

            var v = [];
            var v1 = [];
            var v2 = [];
            var prevPoint;
            var nextPoint;

            for (var i = 0, len = points.length; i < len; i++) {
                var point = points[i];
                var prevPoint;
                var nextPoint;

                if (isLoop) {
                    prevPoint = points[i ? i - 1 : len - 1];
                    nextPoint = points[(i + 1) % len];
                } 
                else {
                    if (i === 0 || i === len - 1) {
                        cps.push(points[i]);
                        continue;
                    } 
                    else {
                        prevPoint = points[i - 1];
                        nextPoint = points[i + 1];
                    }
                }

                vector.sub(v, nextPoint, prevPoint);

                //use degree to scale the handle length
                vector.scale(v, v, smooth);

                var d0 = vector.distance(point, prevPoint);
                var d1 = vector.distance(point, nextPoint);
                var sum = d0 + d1;
                d0 /= sum;
                d1 /= sum;

                vector.scale(v1, v, -d0);
                vector.scale(v2, v, d1);

                cps.push(vector.add([], point, v1));
                cps.push(vector.add([], point, v2));
            }
            
            if (isLoop) {
                cps.push(cps.shift());
            }

            return cps;
        };
    }
);
