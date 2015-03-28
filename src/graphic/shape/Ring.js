/**
 * 圆环
 * @module zrender/graphic/shape/Ring
 */
define(function (require) {

    return require('../Path').extend({

        type: 'ring',

        style: {
            r: 0,
            r0: 0
        },

        buildPath: function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var PI2 = Math.PI * 2;
            ctx.arc(x, y, style.r, 0, PI2, false);
            ctx.moveTo(x + style.r0, y);
            ctx.arc(x, y, style.r0, 0, PI2, true);
        }
    });
});
