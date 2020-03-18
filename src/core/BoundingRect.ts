/**
 * @module echarts/core/BoundingRect
 */

import * as vec2 from './vector';
import * as matrix from './matrix';

const v2ApplyTransform = vec2.applyTransform;
const mathMin = Math.min;
const mathMax = Math.max;

const lt: vec2.VectorArray = [];
const rb: vec2.VectorArray = [];
const lb: vec2.VectorArray = [];
const rt: vec2.VectorArray = [];

class BoundingRect {

    x: number

    y: number

    width: number

    height: number

    constructor(x?: number, y?: number, width?: number, height?: number) {

        if (width < 0) {
            x = x + width;
            width = -width;
        }
        if (height < 0) {
            y = y + height;
            height = -height;
        }

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    union(other: BoundingRect) {
        const x = mathMin(other.x, this.x);
        const y = mathMin(other.y, this.y);

        this.width = mathMax(
            other.x + other.width,
            this.x + this.width
        ) - x;
        this.height = mathMax(
            other.y + other.height,
            this.y + this.height
        ) - y;
        this.x = x;
        this.y = y;
    }

    applyTransform(m: matrix.MatrixArray) {
        // In case usage like this
        // el.getBoundingRect().applyTransform(el.transform)
        // And element has no transform
        if (!m) {
            return;
        }
        lt[0] = lb[0] = this.x;
        lt[1] = rt[1] = this.y;
        rb[0] = rt[0] = this.x + this.width;
        rb[1] = lb[1] = this.y + this.height;

        v2ApplyTransform(lt, lt, m);
        v2ApplyTransform(rb, rb, m);
        v2ApplyTransform(lb, lb, m);
        v2ApplyTransform(rt, rt, m);

        this.x = mathMin(lt[0], rb[0], lb[0], rt[0]);
        this.y = mathMin(lt[1], rb[1], lb[1], rt[1]);
        const maxX = mathMax(lt[0], rb[0], lb[0], rt[0]);
        const maxY = mathMax(lt[1], rb[1], lb[1], rt[1]);
        this.width = maxX - this.x;
        this.height = maxY - this.y;
    }

    calculateTransform(b: RectLike): matrix.MatrixArray {
        const a = this;
        const sx = b.width / a.width;
        const sy = b.height / a.height;

        const m = matrix.create();

        // 矩阵右乘
        matrix.translate(m, m, [-a.x, -a.y]);
        matrix.scale(m, m, [sx, sy]);
        matrix.translate(m, m, [b.x, b.y]);

        return m;
    }

    intersect(b: RectLike): boolean {
        if (!b) {
            return false;
        }

        if (!(b instanceof BoundingRect)) {
            // Normalize negative width/height.
            b = BoundingRect.create(b);
        }

        const a = this;
        const ax0 = a.x;
        const ax1 = a.x + a.width;
        const ay0 = a.y;
        const ay1 = a.y + a.height;

        const bx0 = b.x;
        const bx1 = b.x + b.width;
        const by0 = b.y;
        const by1 = b.y + b.height;

        return !(ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0);
    }

    contain(x: number, y: number): boolean {
        const rect = this;
        return x >= rect.x
            && x <= (rect.x + rect.width)
            && y >= rect.y
            && y <= (rect.y + rect.height);
    }

    clone() {
        return new BoundingRect(this.x, this.y, this.width, this.height);
    }

    /**
     * Copy from another rect
     */
    copy(other: RectLike) {
        this.x = other.x;
        this.y = other.y;
        this.width = other.width;
        this.height = other.height;
    }

    plain() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    static create(rect: RectLike): BoundingRect {
        return new BoundingRect(rect.x, rect.y, rect.width, rect.height);
    }
}


export type RectLike = {
    x: number
    y: number
    width: number
    height: number
}

export default BoundingRect;