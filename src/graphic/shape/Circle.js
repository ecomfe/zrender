/**
 * 圆形
 * @module zrender/shape/Circle
 */

define(function (require) {
    'use strict';

    return require('../Path').extend({
        
        type: 'circle',

        style: {
            cx: 0,
            cy: 0,
            r: 0
        },

        buildPath : function (ctx, style) {
            // Better stroking in ShapeBundle
            ctx.moveTo(style.cx + style.r, style.cy);
            ctx.arc(style.cx, style.cy, style.r, 0, Math.PI * 2, true);
            return;
        }
    });
});
