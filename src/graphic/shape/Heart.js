/**
 * 心形
 * @module zrender/graphic/shape/Heart
 */
define(function (require) {
    'use strict';
    
    return require('../Path').extend({
        
        type: 'heart',

        style: {
            a: 0, b: 0
        },

        buildPath: function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var a = style.a;
            var b = style.b;
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(
                x + a / 2, y - b * 2 / 3,
                x + a * 2, y + b / 3,
                x, y + b
            );
            ctx.bezierCurveTo(
                x - a *  2, y + b / 3,
                x - a / 2, y - b * 2 / 3,
                x, y
            );
        }
    });
});
