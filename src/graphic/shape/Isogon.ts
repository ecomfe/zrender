/**
 * 正多边形
 */

import Path, { PathProps } from '../Path';
import { PI_OVER_2, PI2, mathSin, mathCos } from '../../core/math';


export class IsogonShape {
    x = 0
    y = 0
    r = 0
    n = 0
}

export interface IsogonProps extends PathProps {
    shape?: Partial<IsogonShape>
}
class Isogon extends Path<IsogonProps> {

    shape: IsogonShape

    constructor(opts?: IsogonProps) {
        super(opts);
    }

    getDefaultShape() {
        return new IsogonShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: IsogonShape) {
        const n = shape.n;
        if (!n || n < 2) {
            return;
        }

        const x = shape.x;
        const y = shape.y;
        const r = shape.r;

        const dStep = PI2 / n;
        let deg = -PI_OVER_2;

        ctx.moveTo(x + r * mathCos(deg), y + r * mathSin(deg));
        for (let i = 0, end = n - 1; i < end; i++) {
            deg += dStep;
            ctx.lineTo(x + r * mathCos(deg), y + r * mathSin(deg));
        }

        ctx.closePath();

        return;
    }
}

Isogon.prototype.type = 'isogon';

export default Isogon;
