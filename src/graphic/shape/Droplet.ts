/**
 * 水滴形状
 */

import Path from '../Path';

export default Path.extend({

    type: 'droplet',

    shape: {
        cx: 0,
        cy: 0,
        width: 0,
        height: 0
    },

    buildPath: function (ctx, shape) {
        const x = shape.cx;
        const y = shape.cy;
        const a = shape.width;
        const b = shape.height;

        ctx.moveTo(x, y + a);
        ctx.bezierCurveTo(
            x + a,
            y + a,
            x + a * 3 / 2,
            y - a / 3,
            x,
            y - b
        );
        ctx.bezierCurveTo(
            x - a * 3 / 2,
            y - a / 3,
            x - a,
            y + a,
            x,
            y + a
        );
        ctx.closePath();
    }
});