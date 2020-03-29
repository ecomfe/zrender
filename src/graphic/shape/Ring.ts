/**
 * 圆环
 */

import Path, { PathProps } from '../Path';

class RingShape {
    cx = 0
    cy = 0
    r = 0
    r0 = 0
}

interface RingProps extends PathProps {
    shape?: Partial<RingShape>
}
class Ring extends Path<RingProps> {

    shape: RingShape

    constructor(opts?: RingProps) {
        super(opts);
    }

    getDefaultShape() {
        return new RingShape();
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

Ring.prototype.type = 'ring';
export default Ring;