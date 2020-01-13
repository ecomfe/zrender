/**
 * 正多边形
 */

import Path from '../Path';

var PI = Math.PI;
var sin = Math.sin;
var cos = Math.cos;

export default Path.extend({

    type: 'isogon',

    shape: {
        x: 0,
        y: 0,
        r: 0,
        n: 0
    },

    buildPath: function (ctx, shape) {
        const n = shape.n;
        if (!n || n < 2) {
            return;
        }

        const x = shape.x;
        const y = shape.y;
        const r = shape.r;

        const dStep = 2 * PI / n;
        let deg = -PI / 2;

        ctx.moveTo(x + r * cos(deg), y + r * sin(deg));
        for (let i = 0, end = n - 1; i < end; i++) {
            deg += dStep;
            ctx.lineTo(x + r * cos(deg), y + r * sin(deg));
        }

        ctx.closePath();

        return;
    }
});