/**
 * 扇形
 * @module zrender/graphic/shape/Sector
 */

define(function (require) {

    return require('../Path').extend({
        
        type: 'sector',

        style: {

            cx: 0,

            cy: 0,

            r0: 0,

            r: 0,

            startAngle: 0,

            endAngle: 0,

            clockwise: true
        },

        buildPath: function (ctx, style) {

            var x = style.cx;   // 圆心x
            var y = style.cy;   // 圆心y
            var r0 = style.r0 || 0;     // 形内半径[0,r)
            var r = style.r;            // 扇形外半径(0,r]
            var startAngle = style.startAngle;
            var endAngle = style.endAngle;
            var clockwise = style.clockwise;

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
