/**
 * 扇形
 * @module zrender/graphic/shape/Sector
 */

import Path, { PathOption } from '../Path';
import fixClipWithShadow from '../helper/fixClipWithShadow';

class SectorShape {
    cx: number = 0
    cy: number = 0
    r0: number = 0
    r: number = 0
    startAngle: number = 0
    endAngle: number = Math.PI * 2
    clockwise: boolean = true
}

interface SectorOption extends PathOption {
    shape?: Partial<SectorShape>
}
export default class Sector extends Path<SectorOption> {

    type = 'sector'

    shape: SectorShape

    brush = fixClipWithShadow(Path.prototype.brush)

    constructor(opts?: SectorOption) {
        super(opts, null, new SectorShape());
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: SectorShape) {

        const x = shape.cx;
        const y = shape.cy;
        const r0 = Math.max(shape.r0 || 0, 0);
        const r = Math.max(shape.r, 0);
        const startAngle = shape.startAngle;
        const endAngle = shape.endAngle;
        const clockwise = shape.clockwise;

        const unitX = Math.cos(startAngle);
        const unitY = Math.sin(startAngle);

        ctx.moveTo(unitX * r0 + x, unitY * r0 + y);

        ctx.lineTo(unitX * r + x, unitY * r + y);

        ctx.arc(x, y, r, startAngle, endAngle, !clockwise);

        ctx.lineTo(
            Math.cos(endAngle) * r0 + x,
            Math.sin(endAngle) * r0 + y
        );

        if (r0 !== 0) {
            ctx.arc(x, y, r0, endAngle, startAngle, clockwise);
        }

        ctx.closePath();
    }
}