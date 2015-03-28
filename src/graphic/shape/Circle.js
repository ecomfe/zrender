/**
 * 圆形
 * @module zrender/shape/Circle
 */

define(function (require) {
    'use strict';

    return require('../Path').extend({
        
        type: 'circle',

        style: {
            r: 0
        },

        buildPath : function (ctx, style) {
            // Better stroking in ShapeBundle
            ctx.moveTo(style.x + style.r, style.y);
            ctx.arc(style.x, style.y, style.r, 0, Math.PI * 2, true);
            return;
        }
    });
});
