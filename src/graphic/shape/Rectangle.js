/**
 * 矩形
 * @module zrender/graphic/shape/Rectangle
 */

define(function (require) {
    var roundRectHelper = require('../helper/roundRect');

    return require('../Path').extend({

        type: 'rectangle',

        style: {
            // 左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
            // r缩写为1         相当于 [1, 1, 1, 1]
            // r缩写为[1]       相当于 [1, 1, 1, 1]
            // r缩写为[1, 2]    相当于 [1, 2, 1, 2]
            // r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]
            r: 0,

            x: 0,
            y: 0,
            width: 0,
            height: 0
        },

        buildPath: function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            if (!style.r) {
                ctx.moveTo(x, y);
                ctx.lineTo(x + width, y);
                ctx.lineTo(x + width, y + height);
                ctx.lineTo(x, y + height);
                ctx.lineTo(x, y);
            }
            else {
                roundRectHelper.buildPath(ctx, style);
            }
            ctx.closePath();
            return;
        }
    });
});
