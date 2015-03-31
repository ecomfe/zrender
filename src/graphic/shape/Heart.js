/**
 * 心形
 * @module zrender/graphic/shape/Heart
 */
define(function (require) {
    'use strict';
    
    return require('../Path').extend({
        
        type: 'heart',

        style: {
            cx: 0,
            cy: 0,
            width: 0,
            height: 0
        },

        buildPath: function (ctx, style) {
            var x = style.cx;
            var y = style.cy;
            var a = style.width;
            var b = style.height;
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
