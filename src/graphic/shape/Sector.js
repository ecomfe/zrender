/**
 * 扇形
 * @module zrender/graphic/shape/Sector
 */

import Path from '../Path';
import fixClipWithShadow from '../helper/fixClipWithShadow';

export default Path.extend({

    type: 'sector',

    shape: {

        cx: 0,

        cy: 0,

        r0: 0,

        r: 0,

        startAngle: 0,

        endAngle: Math.PI * 2,

        clockwise: true
    },

    brush: fixClipWithShadow(Path.prototype.brush),

    buildPath: function (ctx, shape) {

        var x = shape.cx;
        var y = shape.cy;
        var r0 = Math.max(shape.r0 || 0, 0);
        var r = Math.max(shape.r, 0);
        var startAngle = shape.startAngle;
        var endAngle = shape.endAngle;
        var clockwise = shape.clockwise;

        var cos = Math.cos, sin = Math.sin;

        var c1 = cos(startAngle), c2 = cos(endAngle),
            s1 = sin(startAngle), s2 = sin(endAngle);

        // circular
        if(Math.abs(startAngle - endAngle) >= Math.PI * 2) {
            ctx.moveTo(c1 * r + x, s1 * r + y);
            ctx.arc(x, y, r, startAngle, endAngle, !clockwise);
            if(r0 !== 0) {
                ctx.moveTo(c2 * r0 + x, s2 * r0 + y);
                ctx.arc(x, y, r0, endAngle, startAngle, clockwise);
            }
        } else {
            ctx.moveTo(c1 * r0 + x, s1 * r0 + y);
            ctx.lineTo(c1 * r + x, s1 * r + y);
            ctx.arc(x, y, r, startAngle, endAngle, !clockwise);
            ctx.lineTo(c2 * r0 + x, s2 * r0 + y);

            (r0 !== 0) && ctx.arc(x, y, r0, endAngle, startAngle, clockwise);
        }

        ctx.closePath();
    }
});