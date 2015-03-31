/**
 * 正多边形
 * @module zrender/shape/Isogon
 * @author sushuang (宿爽, sushuang0322@gmail.com)
 */
define(function (require) {
    'use strict';

    var PI = Math.PI;
    var sin = Math.sin;
    var cos = Math.cos;

    return require('../Path').extend({
        
        type: 'isogon',

        style: {
            x: 0, y: 0,
            r: 0, n: 0
        },

        buildPath: function (ctx, style) {
            var n = style.n;
            if (!n || n < 2) {
                return;
            }

            var x = style.x;
            var y = style.y;
            var r = style.r;

            var dStep = 2 * PI / n;
            var deg = -PI / 2;

            ctx.moveTo(x + r * cos(deg), y + r * sin(deg));
            for (var i = 0, end = n - 1; i < end; i++) {
                deg += dStep;
                ctx.lineTo(x + r * cos(deg), y + r * sin(deg))
            }

            ctx.closePath();

            return;
        }
    });
});
