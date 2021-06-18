import Path, { PathProps } from '../Path';
import * as roundSectorHelper from '../helper/roundSector';

export class SectorShape {
    cx = 0
    cy = 0
    r0 = 0
    r = 0
    startAngle = 0
    endAngle = Math.PI * 2
    clockwise = true
    cornerRadius = 0
    innerCornerRadius = 0
}

export interface SectorProps extends PathProps {
    shape?: Partial<SectorShape>
}

class Sector extends Path<SectorProps> {

    shape: SectorShape

    constructor(opts?: SectorProps) {
        super(opts);
    }

    getDefaultShape() {
        return new SectorShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: SectorShape) {
        roundSectorHelper.buildPath(ctx, shape)
    }

    isZeroArea() {
        return this.shape.startAngle === this.shape.endAngle
            || this.shape.r === this.shape.r0;
    }
}

Sector.prototype.type = 'sector';

export default Sector;
