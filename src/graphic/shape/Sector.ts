/**
 * 扇形
 * @module zrender/graphic/shape/Sector
 */

import Path from '../Path';
import fixClipWithShadow from '../helper/fixClipWithShadow';
import PathProxy from '../../core/PathProxy';

interface SectorShape {
    cx: number
    cy: number
    r0: number
    r: number
    startAngle: number
    endAngle: number
    clockwise: boolean
}

export default class Sector extends Path {

    type = 'sector'

    shape: SectorShape = {

        cx: 0,

        cy: 0,

        r0: 0,

        r: 0,

        startAngle: 0,

        endAngle: Math.PI * 2,

        clockwise: true
    }

    brush = fixClipWithShadow(Path.prototype.brush)

    buildPath(ctx: CanvasRenderingContext2D | PathProxy, shape: SectorShape) {

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