/**
 * 贝塞尔曲线
 * @module zrender/shape/BezierCurve
 */

define(function (require) {
    'use strict';

    return require('../Path').extend({

        type: 'bezier-curve',

        shape: {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
            x3: 0,
            y3: 0
            // x4: 0,
            // y4: 0
        },

        style: {
            stroke: '#000',
            fill: null
        },

        buildPath: function (ctx, shape) {
            ctx.moveTo(shape.x1, shape.y1);

            if (shape.x4 == null || shape.y4 == null) {
                ctx.quadraticCurveTo(
                    shape.x2, shape.y2,
                    shape.x3, shape.y3
                );
            }
            else {
                ctx.bezierCurveTo(
                    shape.x2, shape.y2,
                    shape.x3, shape.y3,
                    shape.x4, shape.y4
                );
            }
        }
    });
});
