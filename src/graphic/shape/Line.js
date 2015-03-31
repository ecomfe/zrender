/**
 * 直线
 * @module zrender/shape/Line
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 */
define(function (require) {
    return require('../Path').extend({
        
        type: 'line',

        style: {
            stroke: '#000',
            fill: null,
            // End point
            x1: 0,
            y1: 0
        },

        buildPath: function (ctx, style) {
            ctx.moveTo(style.x, style.y);
            ctx.lineTo(style.x1, style.y1);
        }
    });
});
