/**
 * 直线
 * @module zrender/graphic/shape/Line
 */
define(function (require) {
    return require('../Path').extend({
        
        type: 'line',

        shape: {
            // Start point
            x1: 0,
            y1: 0,
            // End point
            x2: 0,
            y2: 0
        },

        style: {
            stroke: '#000',
            fill: null
        },

        buildPath: function (ctx, shape) {
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
        }
    });
});
