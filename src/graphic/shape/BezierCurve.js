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
            cpx1: 0,
            cpy1: 0
            // cpx2: 0,
            // cpy2: 0
        },

        style: {
            stroke: '#000',
            fill: null
        },

        buildPath: function (ctx, shape) {
            ctx.moveTo(shape.x1, shape.y1);

            if (shape.cpx2 == null || shape.cpy2 == null) {
                ctx.quadraticCurveTo(
                    shape.cpx1, shape.cpy1,
                    shape.x2, shape.y2
                );
            }
            else {
                ctx.bezierCurveTo(
                    shape.cpx1, shape.cpy1,
                    shape.cpx2, shape.cpy2,
                    shape.x2, shape.y2
                );
            }
        }
    });
});
