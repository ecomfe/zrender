/**
 * 圆形
 */

import Path, { PathProps } from '../Path';

export class CircleShape {
    cx = 0
    cy = 0
    r = 0
}

export interface CircleProps extends PathProps {
    shape?: Partial<CircleShape>
}
class Circle extends Path<CircleProps> {

    shape: CircleShape

    constructor(opts?: CircleProps) {
        super(opts);
    }

    getDefaultShape() {
        return new CircleShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: CircleShape, inBundle: boolean) {
        // Better stroking in ShapeBundle
        // Always do it may have performence issue ( fill may be 2x more cost)
        if (inBundle) {
            ctx.moveTo(shape.cx + shape.r, shape.cy);
        }
        // else {
        //     if (ctx.allocate && !ctx.data.length) {
        //         ctx.allocate(ctx.CMD_MEM_SIZE.A);
        //     }
        // }
        // Better stroking in ShapeBundle
        // ctx.moveTo(shape.cx + shape.r, shape.cy);
        ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
    }
};

Circle.prototype.type = 'circle';

export default Circle;