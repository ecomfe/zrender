/**
 * 贝塞尔平滑曲线
 * @module zrender/shape/util/smoothBezier
 * @author pissang (https://www.github.com/pissang)
 *         Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *         errorrik (errorrik@gmail.com)
 */

import {
    min as v2Min,
    max as v2Max,
    scale as v2Scale,
    distance as v2Distance,
    add as v2Add,
    clone as v2Clone,
    sub as v2Sub
} from '../../core/vector';

/**
 * 贝塞尔平滑曲线
 * @alias module:zrender/shape/util/smoothBezier
 * @param {Array} points 线段顶点数组
 * @param {number} smooth 平滑等级, 0-1
 * @param {boolean} isLoop
 * @param {Array} constraint 将计算出来的控制点约束在一个包围盒内
 *                           比如 [[0, 0], [100, 100]], 这个包围盒会与
 *                           整个折线的包围盒做一个并集用来约束控制点。
 * @param {Array} 计算出来的控制点数组
 */
export default function (points, smooth, isLoop, constraint) {
    var cps = [];

    var v = [];
    var v1 = [];
    var v2 = [];
    var prevPoint;
    var nextPoint;

    var min;
    var max;
    if (constraint) {
        min = [Infinity, Infinity];
        max = [-Infinity, -Infinity];
        for (var i = 0, len = points.length; i < len; i++) {
            v2Min(min, min, points[i]);
            v2Max(max, max, points[i]);
        }
        // 与指定的包围盒做并集
        v2Min(min, min, constraint[0]);
        v2Max(max, max, constraint[1]);
    }

    for (var i = 0, len = points.length; i < len; i++) {
        var point = points[i];

        if (isLoop) {
            prevPoint = points[i ? i - 1 : len - 1];
            nextPoint = points[(i + 1) % len];
        }
        else {
            if (i === 0 || i === len - 1) {
                cps.push(v2Clone(points[i]));
                continue;
            }
            else {
                prevPoint = points[i - 1];
                nextPoint = points[i + 1];
            }
        }

        v2Sub(v, nextPoint, prevPoint);

        // use degree to scale the handle length
        v2Scale(v, v, smooth);

        var d0 = v2Distance(point, prevPoint);
        var d1 = v2Distance(point, nextPoint);
        var sum = d0 + d1;
        if (sum !== 0) {
            d0 /= sum;
            d1 /= sum;
        }

        v2Scale(v1, v, -d0);
        v2Scale(v2, v, d1);
        var cp0 = v2Add([], point, v1);
        var cp1 = v2Add([], point, v2);
        if (constraint) {
            v2Max(cp0, cp0, min);
            v2Min(cp0, cp0, max);
            v2Max(cp1, cp1, min);
            v2Min(cp1, cp1, max);
        }
        cps.push(cp0);
        cps.push(cp1);
    }

    if (isLoop) {
        cps.push(cps.shift());
    }

    return cps;
}