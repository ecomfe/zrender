/**
 * 玫瑰线
 * @module zrender/graphic/shape/Rose
 */

import Path, { PathOption } from '../Path';

var sin = Math.sin;
var cos = Math.cos;
var radian = Math.PI / 180;

class RoseShape {
    cx = 0
    cy = 0
    r: number[] = []
    k = 0
    n = 1
}

export default class Rose extends Path {

    type = 'rose'

    shape: RoseShape

    constructor(opts?: PathOption & {
        shape?: RoseShape
    }) {
        super(opts, {
            fill: null,
            stroke: '#000'
        }, new RoseShape())
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: RoseShape) {
        const R = shape.r;
        const k = shape.k;
        const n = shape.n;
        const x0 = shape.cx;
        const y0 = shape.cy;
        let x;
        let y;
        let r;


        ctx.moveTo(x0, y0);

        for (let i = 0, len = R.length; i < len; i++) {
            r = R[i];

            for (let j = 0; j <= 360 * n; j++) {
                x = r
                        * sin(k / n * j % 360 * radian)
                        * cos(j * radian)
                        + x0;
                y = r
                        * sin(k / n * j % 360 * radian)
                        * sin(j * radian)
                        + y0;
                ctx.lineTo(x, y);
            }
        }
    }
}