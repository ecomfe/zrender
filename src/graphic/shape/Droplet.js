/**
 * 水滴形状
 * @module zrender/graphic/shape/Droplet
 */

define(function (require) {
    'use strict';

    return require('../Path').extend({
        
        type: 'droplet',

        style: {
            a: 0, b: 0
        },

        buildPath : function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var a = style.a;
            var b = style.b;
            ctx.moveTo(style.x, style.y + style.a);
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
});
