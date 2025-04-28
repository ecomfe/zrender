/**
 * @module echarts/core/BoundingRect
 */

import * as matrix from './matrix';
import Point, { PointLike } from './Point';

const mathMin = Math.min;
const mathMax = Math.max;

const lt = new Point();
const rb = new Point();
const lb = new Point();
const rt = new Point();

const _intersectCtx = createIntersectContext();
const _minTv = _intersectCtx.minTv;
const _maxTv = _intersectCtx.maxTv;
const _lenMinMax = [0, 0];

class BoundingRect {

    x: number
    y: number
    width: number
    height: number

    constructor(x: number, y: number, width: number, height: number) {
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

        // If x is -Infinity and width is Infinity (like in the case of
        // IncrementalDisplayble), x + width would be NaN
        if (isFinite(this.x) && isFinite(this.width)) {
            this.width = mathMax(
                other.x + other.width,
                this.x + this.width
            ) - x;
        }
        else {
            this.width = other.width;
        }

        if (isFinite(this.y) && isFinite(this.height)) {
            this.height = mathMax(
                other.y + other.height,
                this.y + this.height
            ) - y;
        }
        else {
            this.height = other.height;
        }

        this.x = x;
        this.y = y;
    }

    applyTransform(m: matrix.MatrixArray) {
        BoundingRect.applyTransform(this, this, m);
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

    /**
     * @param mtv
     *  If it's not overlapped. it means needs to move `b` rect with Maximum Translation Vector to be overlapped.
     *  Else it means needs to move `b` rect with Minimum Translation Vector to be not overlapped.
     */
    intersect(
        b: RectLike,
        mtv?: PointLike,
        opt?: BoundingRectIntersectOpt
    ): boolean {
        if (!b) {
            return false;
        }

        if (!(b instanceof BoundingRect)) {
            // Normalize negative width/height.
            b = BoundingRect.create(b);
        }

        const a = this;

        _intersectCtx.reset(opt, !!mtv);

        const touchThreshold = _intersectCtx.touchThreshold;
        const axTouchThld = Math.min(a.width / 2, touchThreshold);
        const ayTouchThld = Math.min(a.height / 2, touchThreshold);
        const bxTouchThld = Math.min(b.width / 2, touchThreshold);
        const byTouchThld = Math.min(b.height / 2, touchThreshold);

        const ax0 = a.x + axTouchThld;
        const ax1 = a.x + a.width - axTouchThld;
        const ay0 = a.y + ayTouchThld;
        const ay1 = a.y + a.height - ayTouchThld;

        const bx0 = b.x + bxTouchThld;
        const bx1 = b.x + b.width - bxTouchThld;
        const by0 = b.y + byTouchThld;
        const by1 = b.y + b.height - byTouchThld;

        const overlap = !(ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0);

        if (mtv) {
            _lenMinMax[0] = Infinity;
            _lenMinMax[1] = 0;

            this._intersectOneDim(ax0, ax1, bx0, bx1, 'x', 'y', _lenMinMax);
            this._intersectOneDim(ay0, ay1, by0, by1, 'y', 'x', _lenMinMax);

            Point.copy(
                mtv,
                overlap
                    ? (_intersectCtx.useDir ? _intersectCtx.dirMinTv : _minTv)
                    : _maxTv
            );
        }

        return overlap;
    }

    private _intersectOneDim(
        a0: number, a1: number, b0: number, b1: number,
        updateDim: 'x' | 'y', zeroDim: 'x' | 'y',
        lenMinMax: number[] // [min, max], be shared and will be modified.
    ) {
        const d0 = Math.abs(a1 - b0);
        const d1 = Math.abs(b1 - a0);
        const d01min = Math.min(d0, d1);

        if (a1 < b0 || b1 < a0) {
            if (d01min > lenMinMax[1]) {
                lenMinMax[1] = d01min;
                _maxTv[zeroDim] = 0;
                if (d0 < d1) {
                    _maxTv[updateDim] = -d0; // b is on the right/bottom(larger x/y)
                }
                else {
                    _maxTv[updateDim] = d1; // b is on the left/top(smaller x/y)
                }
            }
        }
        else {
            if (d01min < lenMinMax[0] || _intersectCtx.useDir) {
                // If bidirectional, both dist0 dist1 need to check,
                // otherwise only check the smaller one.
                lenMinMax[0] = Math.min(d01min, lenMinMax[0]);
                if (d0 < d1 || !_intersectCtx.bidirectional) {
                    _minTv[updateDim] = d0; // b is on the right/bottom(larger x/y)
                    _minTv[zeroDim] = 0;
                    if (_intersectCtx.useDir) {
                        _intersectCtx.calcDirMTV();
                    }
                }
                if (d0 >= d1 || !_intersectCtx.bidirectional) {
                    _minTv[updateDim] = -d1; // b is on the left/top(smaller x/y)
                    _minTv[zeroDim] = 0;
                    if (_intersectCtx.useDir) {
                        _intersectCtx.calcDirMTV();
                    }
                }
            }
        }
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
        BoundingRect.copy(this, other);
    }

    plain(): RectLike {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * If not having NaN or Infinity with attributes
     */
    isFinite(): boolean {
        return isFinite(this.x)
            && isFinite(this.y)
            && isFinite(this.width)
            && isFinite(this.height);
    }

    isZero(): boolean {
        return this.width === 0 || this.height === 0;
    }

    static create(rect: RectLike): BoundingRect {
        return new BoundingRect(rect.x, rect.y, rect.width, rect.height);
    }

    static copy(target: RectLike, source: RectLike) {
        target.x = source.x;
        target.y = source.y;
        target.width = source.width;
        target.height = source.height;
    }

    static applyTransform(target: RectLike, source: RectLike, m: matrix.MatrixArray) {
        // In case usage like this
        // el.getBoundingRect().applyTransform(el.transform)
        // And element has no transform
        if (!m) {
            if (target !== source) {
                BoundingRect.copy(target, source);
            }
            return;
        }
        // Fast path when there is no rotation in matrix.
        if (m[1] < 1e-5 && m[1] > -1e-5 && m[2] < 1e-5 && m[2] > -1e-5) {
            const sx = m[0];
            const sy = m[3];
            const tx = m[4];
            const ty = m[5];
            target.x = source.x * sx + tx;
            target.y = source.y * sy + ty;
            target.width = source.width * sx;
            target.height = source.height * sy;
            if (target.width < 0) {
                target.x += target.width;
                target.width = -target.width;
            }
            if (target.height < 0) {
                target.y += target.height;
                target.height = -target.height;
            }
            return;
        }

        // source and target can be same instance.
        lt.x = lb.x = source.x;
        lt.y = rt.y = source.y;
        rb.x = rt.x = source.x + source.width;
        rb.y = lb.y = source.y + source.height;

        lt.transform(m);
        rt.transform(m);
        rb.transform(m);
        lb.transform(m);

        target.x = mathMin(lt.x, rb.x, lb.x, rt.x);
        target.y = mathMin(lt.y, rb.y, lb.y, rt.y);
        const maxX = mathMax(lt.x, rb.x, lb.x, rt.x);
        const maxY = mathMax(lt.y, rb.y, lb.y, rt.y);
        target.width = maxX - target.x;
        target.height = maxY - target.y;
    }
}

export type RectLike = {
    x: number
    y: number
    width: number
    height: number
}

export interface BoundingRectIntersectOpt {
    /**
     * Be a radian, representing a vector direction.
     * `direction=atan2(y, x)`, i.e., `direction=0` is vector(1,0), `direction=PI/4` is vector(1,1). If specified,
     * when overlapping, the output `mtv` is still a minimal vector that can resolve the overlap. However it is
     * not Minimum Translation Vector, but a vector follow the direction.
     */
    direction?: number
    /**
     * By default `true`. It means whether `BoundingRectIntersectOpt['direction']` is bidirectional. If `true`,
     * the returned mtv is the minimal among both `opt.direction` and `opt.direction + Math.PI`.
     */
    bidirectional?: boolean
    /**
     * Two rects that touch but are within the threshold do not be considered intersecting.
     * With this feature, elements can use the same rect instance to achieve compact layout while still passing
     * through the overlap-hiding handler.
     * A positive near-zero number is commonly used here for aggressive overlap handling, such as:
     *  - Hide one element if overlapping.
     *  - Two elements are vertically touching at top/bottom edges, but are stricted to move along
     *    the horizontal direction to resolve overlap.
     */
    touchThreshold?: number
}

export function createIntersectContext() {

    let _direction: BoundingRectIntersectOpt['direction'] = 0;
    const _dirCheckVec = new Point();
    const _dirTmp = new Point();

    const _ctx = {
        minTv: new Point(),
        maxTv: new Point(),
        useDir: false as boolean,
        dirMinTv: new Point(),
        touchThreshold: 0 as BoundingRectIntersectOpt['touchThreshold'],
        bidirectional: true as BoundingRectIntersectOpt['bidirectional'],

        reset(opt: BoundingRectIntersectOpt | null | undefined, useMTV: boolean): void {
            _ctx.touchThreshold = 0;
            if (opt && opt.touchThreshold != null) {
                _ctx.touchThreshold = Math.max(0, opt.touchThreshold);
            }

            if (!useMTV) {
                return;
            }

            _ctx.minTv.set(Infinity, Infinity);
            _ctx.maxTv.set(0, 0);
            _ctx.useDir = false;

            if (opt && opt.direction != null) {
                _ctx.useDir = true;
                _ctx.dirMinTv.copy(_ctx.minTv);
                _dirTmp.copy(_ctx.minTv);
                _direction = opt.direction;
                _ctx.bidirectional = opt.bidirectional == null || !!opt.bidirectional;
                if (!_ctx.bidirectional) {
                    _dirCheckVec.set(Math.cos(_direction), Math.sin(_direction));
                }
            }
        },

        calcDirMTV(): void {
            const minTv = _ctx.minTv;
            const dirMinTv = _ctx.dirMinTv;
            const squareMag = minTv.y * minTv.y + minTv.x * minTv.x;
            const dirSin = Math.sin(_direction);
            const dirCos = Math.cos(_direction);
            const dotProd = dirSin * minTv.y + dirCos * minTv.x;

            if (nearZero(dotProd)) {
                if (nearZero(minTv.x) && nearZero(minTv.y)) {
                    // The two OBBs touch at the edges.
                    dirMinTv.set(0, 0);
                }
                // Otherwise `minTv` is perpendicular to `this.direction`.
                return;
            }

            _dirTmp.x = squareMag * dirCos / dotProd;
            _dirTmp.y = squareMag * dirSin / dotProd;
            if (nearZero(_dirTmp.x) && nearZero(_dirTmp.y)) {
                // The result includes near-(0,0) regardless of `bidirectional`.
                dirMinTv.set(0, 0);
                return;
            }

            if ((
                    _ctx.bidirectional
                    || _dirCheckVec.dot(_dirTmp) > 0
                )
                && _dirTmp.len() < dirMinTv.len()
            ) {
                dirMinTv.copy(_dirTmp);
            }
        }
    };

    function nearZero(val: number): boolean {
        return Math.abs(val) < 1e-10; // Empirically OK for pixel-scale values.
    }

    return _ctx;
}


export default BoundingRect;
