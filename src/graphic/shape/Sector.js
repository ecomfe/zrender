/**
 * 扇形
 * @module zrender/graphic/shape/Sector
 */

// FIXME clockwise seems wrong
define(function (require) {

    return require('../Path').extend({

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

        buildPath: function (ctx, shape) {

            var x = shape.cx;   // 圆心x
            var y = shape.cy;   // 圆心y
            var r0 = shape.r0 || 0;     // 形内半径[0,r)
            var r = shape.r;            // 扇形外半径(0,r]
            var startAngle = shape.startAngle;
            var endAngle = shape.endAngle;
            var clockwise = shape.clockwise;

            var unitX = Math.cos(startAngle);
            var unitY = Math.sin(startAngle);

            ctx.moveTo(unitX * r0 + x, unitY * r0 + y);

            ctx.lineTo(unitX * r + x, unitY * r + y);

            ctx.arc(x, y, r, startAngle, endAngle, !clockwise);

            ctx.lineTo(
                Math.cos(endAngle) * r0 + x,
                Math.sin(endAngle) * r0 + y
            );

            if (r0 !== 0) {
                ctx.arc(x, y, r0, endAngle, startAngle, clockwise);
            }

            ctx.closePath();
        }
    });
});
