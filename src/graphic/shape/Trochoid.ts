/**
 * 内外旋轮曲线
 * @module zrender/graphic/shape/Trochold
 */

import Path, { PathProps } from '../Path';
import { DEGREE_TO_RADIAN, mathSin, mathCos } from '../../core/math';


export class TrochoidShape {
    cx = 0
    cy = 0
    r = 0
    r0 = 0
    d = 0
    location = 'out'
}

export interface TrochoidProps extends PathProps {
    shape?: Partial<TrochoidShape>
}
class Trochoid extends Path<TrochoidProps> {

    shape: TrochoidShape

    constructor(opts?: TrochoidProps) {
        super(opts);
    }

    getDefaultStyle() {
        return {
            stroke: '#000',
            fill: null as string
        };
    }

    getDefaultShape() {
        return new TrochoidShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: TrochoidShape) {
        const R = shape.r;
        const r = shape.r0;
        const d = shape.d;
        const offsetX = shape.cx;
        const offsetY = shape.cy;
        const delta = shape.location === 'out' ? 1 : -1;
        let x1;
        let y1;
        let x2;
        let y2;

        if (shape.location && R <= r) {
            return;
        }

        let num = 0;
        let i = 1;
        let theta;

        x1 = (R + delta * r) * mathCos(0)
            - delta * d * mathCos(0) + offsetX;
        y1 = (R + delta * r) * mathSin(0)
            - d * mathSin(0) + offsetY;

        ctx.moveTo(x1, y1);

        // 计算结束时的i
        do {
            num++;
        }
        while ((r * num) % (R + delta * r) !== 0);

        do {
            theta = DEGREE_TO_RADIAN * i;
            x2 = (R + delta * r) * mathCos(theta)
                    - delta * d * mathCos((R / r + delta) * theta)
                    + offsetX;
            y2 = (R + delta * r) * mathSin(theta)
                    - d * mathSin((R / r + delta) * theta)
                    + offsetY;
            ctx.lineTo(x2, y2);
            i++;
        }
        while (i <= (r * num) / (R + delta * r) * 360);

    }
}

Trochoid.prototype.type = 'trochoid';
export default Trochoid;