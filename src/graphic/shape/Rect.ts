/**
 * 矩形
 * @module zrender/graphic/shape/Rect
 */

import Path from '../Path';
import * as roundRectHelper from '../helper/roundRect';
import {subPixelOptimizeRect} from '../helper/subPixelOptimize';

// Avoid create repeatly.
var subPixelOptimizeOutputShape = {};

export default Path.extend({

    type: 'rect',

    shape: {
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

    buildPath: function (ctx, shape) {
        var x;
        var y;
        var width;
        var height;

        if (this.subPixelOptimize) {
            subPixelOptimizeRect(subPixelOptimizeOutputShape, shape, this.style);
            x = subPixelOptimizeOutputShape.x;
            y = subPixelOptimizeOutputShape.y;
            width = subPixelOptimizeOutputShape.width;
            height = subPixelOptimizeOutputShape.height;
            subPixelOptimizeOutputShape.r = shape.r;
            shape = subPixelOptimizeOutputShape;
        }
        else {
            x = shape.x;
            y = shape.y;
            width = shape.width;
            height = shape.height;
        }

        if (!shape.r) {
            ctx.rect(x, y, width, height);
        }
        else {
            roundRectHelper.buildPath(ctx, shape);
        }
        ctx.closePath();
        return;
    }
});