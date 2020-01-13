/**
 * 心形
 */

import Path from '../Path';

export default Path.extend({

    type: 'heart',

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
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(
            x + a / 2, y - b * 2 / 3,
            x + a * 2, y + b / 3,
            x, y + b
        );
        ctx.bezierCurveTo(
            x - a * 2, y + b / 3,
            x - a / 2, y - b * 2 / 3,
            x, y
        );
    }
});