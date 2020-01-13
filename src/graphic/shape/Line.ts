/**
 * 直线
 * @module zrender/graphic/shape/Line
 */

import Path from '../Path';
import {subPixelOptimizeLine} from '../helper/subPixelOptimize';

// Avoid create repeatly.
var subPixelOptimizeOutputShape = {};

export default Path.extend({

    type: 'line',

    shape: {
        // Start point
        x1: 0,
        y1: 0,
        // End point
        x2: 0,
        y2: 0,

        percent: 1
    },

    style: {
        stroke: '#000',
        fill: null
    },

    buildPath: function (ctx, shape) {
        var x1;
        var y1;
        var x2;
        var y2;

        if (this.subPixelOptimize) {
            subPixelOptimizeLine(subPixelOptimizeOutputShape, shape, this.style);
            x1 = subPixelOptimizeOutputShape.x1;
            y1 = subPixelOptimizeOutputShape.y1;
            x2 = subPixelOptimizeOutputShape.x2;
            y2 = subPixelOptimizeOutputShape.y2;
        }
        else {
            x1 = shape.x1;
            y1 = shape.y1;
            x2 = shape.x2;
            y2 = shape.y2;
        }

        var percent = shape.percent;

        if (percent === 0) {
            return;
        }

        ctx.moveTo(x1, y1);

        if (percent < 1) {
            x2 = x1 * (1 - percent) + x2 * percent;
            y2 = y1 * (1 - percent) + y2 * percent;
        }
        ctx.lineTo(x2, y2);
    },

    /**
     * Get point at percent
     * @param  {number} percent
     * @return {Array.<number>}
     */
    pointAt: function (p) {
        var shape = this.shape;
        return [
            shape.x1 * (1 - p) + shape.x2 * p,
            shape.y1 * (1 - p) + shape.y2 * p
        ];
    }
});