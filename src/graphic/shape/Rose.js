/**
 * 玫瑰线
 * @module zrender/shape/Rose
 */
define(function (require) {

    var sin = Math.sin;
    var cos = Math.cos;
    var radian = Math.PI / 180;

    return require('../Path').extend({

        type: 'rose',

        style: {
            brushType: 'stroke',
            r: [],
            k: 0,
            n: 1
        },

        buildPath: function (ctx, style) {
            var x;
            var y;
            var R = style.r;
            var r;
            var k = style.k;
            var n = style.n;

            var x0 = style.x;
            var y0 = style.y;

            ctx.moveTo(x0, y0);

            for (var i = 0, len = R.length; i < len ; i++) {
                r = R[i];

                for (var j = 0; j <= 360 * n; j++) {
                    x = r
                         * sin(k / n * j % 360 * radian)
                         * cos(j * radian) 
                         + x0;
                    y = r
                         * sin(k / n * j % 360 * radian)
                         * sin(j * radian)
                         + y0;
                    ctx.lineTo(x, y);
                }
            }
        }
    });
});
