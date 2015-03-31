/**
 * 圆环
 * @module zrender/graphic/shape/Ring
 */
define(function (require) {

    return require('../Path').extend({

        type: 'ring',

        style: {
            cx: 0,
            cy: 0,
            r: 0,
            r0: 0
        },

        buildPath: function (ctx, style) {
            var x = style.cx;
            var y = style.cy;
            var PI2 = Math.PI * 2;
            ctx.arc(x, y, style.r, 0, PI2, false);
            ctx.moveTo(x + style.r0, y);
            ctx.arc(x, y, style.r0, 0, PI2, true);
        }
    });
});
