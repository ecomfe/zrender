/**
 * 圆形
 */

import Path, { PathProps } from '../Path';
import { PI2 } from '../../core/math';

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

    buildPath(ctx: CanvasRenderingContext2D, shape: CircleShape) {
        // Use moveTo to start a new sub path.
        // Or it will be connected to other subpaths when in CompoundPath
        ctx.moveTo(shape.cx + shape.r, shape.cy);
        ctx.arc(shape.cx, shape.cy, shape.r, 0, PI2);
    }
};

Circle.prototype.type = 'circle';

export default Circle;