/**
 * 圆弧
 */

import Path, { PathOption } from '../Path';

class ArcShape {
    cx = 0;
    cy = 0;
    r = 0;
    startAngle = 0;
    endAngle = Math.PI * 2
    clockwise? = true
}

export default class Arc extends Path {

    type = 'Arc'

    shape: ArcShape

    constructor(opts?: PathOption & {
        shape?: Partial<ArcShape>
    }) {
        super(opts, {
            stroke: '#000',
            fill: null
        }, new ArcShape());
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: ArcShape) {

        const x = shape.cx;
        const y = shape.cy;
        const r = Math.max(shape.r, 0);
        const startAngle = shape.startAngle;
        const endAngle = shape.endAngle;
        const clockwise = shape.clockwise;

        const unitX = Math.cos(startAngle);
        const unitY = Math.sin(startAngle);

        ctx.moveTo(unitX * r + x, unitY * r + y);
        ctx.arc(x, y, r, startAngle, endAngle, !clockwise);
    }
}
