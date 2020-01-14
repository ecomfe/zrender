/**
 * 正多边形
 */

import Path, { PathOption } from '../Path';

const PI = Math.PI;
const sin = Math.sin;
const cos = Math.cos;

class IsogonShape {
    x = 0
    y = 0
    r = 0
    n = 0
}

export default class Isogon extends Path {

    type = 'isogon'

    shape: IsogonShape

    constructor(opts?: PathOption & {
        shape?: IsogonShape
    }) {
        super(opts, null, new IsogonShape())
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: IsogonShape) {
        const n = shape.n;
        if (!n || n < 2) {
            return;
        }

        const x = shape.x;
        const y = shape.y;
        const r = shape.r;

        const dStep = 2 * PI / n;
        let deg = -PI / 2;

        ctx.moveTo(x + r * cos(deg), y + r * sin(deg));
        for (let i = 0, end = n - 1; i < end; i++) {
            deg += dStep;
            ctx.lineTo(x + r * cos(deg), y + r * sin(deg));
        }

        ctx.closePath();

        return;
    }
}