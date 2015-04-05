/**
 * 圆形
 * @module zrender/shape/Circle
 */

define(function (require) {
    'use strict';

    return require('../Path').extend({
        
        type: 'circle',

        shape: {
            cx: 0,
            cy: 0,
            r: 0
        },

        buildPath : function (ctx, shape) {
            // Better stroking in ShapeBundle
            ctx.moveTo(shape.cx + shape.r, shape.cy);
            ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2, true);
            return;
        }
    });
});
