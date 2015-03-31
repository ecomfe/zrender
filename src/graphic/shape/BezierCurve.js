/**
 * 贝塞尔曲线
 * @module zrender/shape/BezierCurve
 */

define(function (require) {
    'use strict';

    return require('../Path').extend({

        type: 'bezier-curve',

        style: {
            stroke: '#000',
            fill: null,
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
            x3: 0,
            y3: 0
        },

        buildPath: function (ctx, style) {
            ctx.moveTo(style.x, style.y);

            if (style.x3 == null || style.y3 == null) {
                ctx.quadraticCurveTo(
                    style.x1, style.y1,
                    style.x2, style.y2
                );
            }
            else {
                ctx.bezierCurveTo(
                    style.x1, style.y1,
                    style.x2, style.y2,
                    style.x3, style.y3
                );
            }
        }
    });
});
