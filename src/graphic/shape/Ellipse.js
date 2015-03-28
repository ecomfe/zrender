/**
 * 水滴形状
 * @module zrender/graphic/shape/Ellipse
 */

define(function (require) {
    'use strict';

    return require('../Path').extend({
        
        type: 'ellipse',

        style: {
            a: 0, b: 0
        },

        buildPath: function (ctx, style) {
            var k = 0.5522848;
            var x = style.x;
            var y = style.y;
            var a = style.a;
            var b = style.b;
            var ox = a * k; // 水平控制点偏移量
            var oy = b * k; // 垂直控制点偏移量
            // 从椭圆的左端点开始顺时针绘制四条三次贝塞尔曲线
            ctx.moveTo(x - a, y);
            ctx.bezierCurveTo(x - a, y - oy, x - ox, y - b, x, y - b);
            ctx.bezierCurveTo(x + ox, y - b, x + a, y - oy, x + a, y);
            ctx.bezierCurveTo(x + a, y + oy, x + ox, y + b, x, y + b);
            ctx.bezierCurveTo(x - ox, y + b, x - a, y + oy, x - a, y);
            ctx.closePath();
        }
    });
});
