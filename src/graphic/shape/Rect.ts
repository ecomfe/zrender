/**
 * 矩形
 * @module zrender/graphic/shape/Rect
 */

import Path, { PathOption } from '../Path';
import * as roundRectHelper from '../helper/roundRect';
import {subPixelOptimizeRect} from '../helper/subPixelOptimize';

class RectShape {
    // 左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
    // r缩写为1         相当于 [1, 1, 1, 1]
    // r缩写为[1]       相当于 [1, 1, 1, 1]
    // r缩写为[1, 2]    相当于 [1, 2, 1, 2]
    // r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]
    r?: number | number[]

    x = 0
    y = 0
    width = 0
    height = 0
}

// Avoid create repeatly.
const subPixelOptimizeOutputShape = {};

export default class Rect extends Path {

    type = 'rect'

    shape: RectShape

    constructor(opts?: PathOption & {
        shape?: Partial<RectShape>
    }) {
        super(opts, null, new RectShape())
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: RectShape) {
        let x: number;
        let y: number;
        let width: number;
        let height: number;

        if (this.subPixelOptimize) {
            const optimizedShape = subPixelOptimizeRect(subPixelOptimizeOutputShape, shape, this.style);
            x = optimizedShape.x;
            y = optimizedShape.y;
            width = optimizedShape.width;
            height = optimizedShape.height;
            optimizedShape.r = shape.r;
            shape = optimizedShape;
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
    }
}