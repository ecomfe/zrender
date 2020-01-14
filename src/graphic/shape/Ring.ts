/**
 * 圆环
 */

import Path, { PathOption } from '../Path';

class RingShape {
    cx = 0
    cy = 0
    r = 0
    r0 = 0
}

export default class Ring extends Path {

    type = 'ring'

    shape: RingShape

    constructor(opts?: PathOption & {
        shape?: RingShape
    }) {
        super(opts, null, new RingShape())
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: RingShape) {
        const x = shape.cx;
        const y = shape.cy;
        const PI2 = Math.PI * 2;
        ctx.moveTo(x + shape.r, y);
        ctx.arc(x, y, shape.r, 0, PI2, false);
        ctx.moveTo(x + shape.r0, y);
        ctx.arc(x, y, shape.r0, 0, PI2, true);
    }
}