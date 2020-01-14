/**
 * Path 代理，可以在`buildPath`中用于替代`ctx`, 会保存每个path操作的命令到pathCommands属性中
 * 可以用于 isInsidePath 判断以及获取boundingRect
 */

// TODO getTotalLength, getPointAtLength, arcTo

/* global Float32Array */

import * as curve from './curve';
import * as vec2 from './vector';
import * as bbox from './bbox';
import BoundingRect from './BoundingRect';
import {devicePixelRatio as dpr} from '../config';

const CMD = {
    M: 1,
    L: 2,
    C: 3,
    Q: 4,
    A: 5,
    Z: 6,
    // Rect
    R: 7
};

// const CMD_MEM_SIZE = {
//     M: 3,
//     L: 3,
//     C: 7,
//     Q: 5,
//     A: 9,
//     R: 5,
//     Z: 1
// };

interface ExtendedCanvasRenderingContext2D extends CanvasRenderingContext2D {
    dpr?: number
}

const min: number[] = [];
const max: number[] = [];
const min2: number[] = [];
const max2: number[] = [];
const mathMin = Math.min;
const mathMax = Math.max;
const mathCos = Math.cos;
const mathSin = Math.sin;
const mathSqrt = Math.sqrt;
const mathAbs = Math.abs;

const hasTypedArray = typeof Float32Array !== 'undefined';

export default class PathProxy {

    dpr = 1

    data: number[] | Float32Array

    private _saveData = false

    private _ctx: ExtendedCanvasRenderingContext2D

    private _xi = 0
    private _yi = 0

    private _x0 = 0
    private _y0 = 0
    // Unit x, Unit y. Provide for avoiding drawing that too short line segment
    private _ux = 0
    private _uy = 0

    private _len = 0

    private _lineDash: number[] = null

    private _needsDash: boolean = false

    private _dashOffset = 0

    private _dashIdx = 0

    private _dashSum = 0

    static CMD = CMD

    constructor(notSaveData?: boolean) {
        this._saveData = !(notSaveData || false);

        if (this._saveData) {
            this.data = [];
        }

        this._ctx = null;
    }

    /**
     * @readOnly
     */
    setScale(sx: number, sy: number, segmentIgnoreThreshold?: number) {
        // Compat. Previously there is no segmentIgnoreThreshold.
        segmentIgnoreThreshold = segmentIgnoreThreshold || 0;
        this._ux = mathAbs(segmentIgnoreThreshold / dpr / sx) || 0;
        this._uy = mathAbs(segmentIgnoreThreshold / dpr / sy) || 0;
    }

    getContext(): ExtendedCanvasRenderingContext2D {
        return this._ctx;
    }

    beginPath(ctx?: ExtendedCanvasRenderingContext2D) {

        this._ctx = ctx;

        ctx && ctx.beginPath();

        ctx && (this.dpr = ctx.dpr);

        // Reset
        if (this._saveData) {
            this._len = 0;
        }

        if (this._lineDash) {
            this._lineDash = null;

            this._dashOffset = 0;
        }

        return this;
    }

    /**
     * @param  {number} x
     * @param  {number} y
     * @return {module:zrender/core/PathProxy}
     */
    moveTo(x: number, y: number) {
        this.addData(CMD.M, x, y);
        this._ctx && this._ctx.moveTo(x, y);

        // x0, y0, xi, yi 是记录在 _dashedXXXXTo 方法中使用
        // xi, yi 记录当前点, x0, y0 在 closePath 的时候回到起始点。
        // 有可能在 beginPath 之后直接调用 lineTo，这时候 x0, y0 需要
        // 在 lineTo 方法中记录，这里先不考虑这种情况，dashed line 也只在 IE10- 中不支持
        this._x0 = x;
        this._y0 = y;

        this._xi = x;
        this._yi = y;

        return this;
    }

    lineTo(x: number, y: number) {
        const exceedUnit = mathAbs(x - this._xi) > this._ux
            || mathAbs(y - this._yi) > this._uy
            // Force draw the first segment
            || this._len < 5;

        this.addData(CMD.L, x, y);

        if (this._ctx && exceedUnit) {
            this._needsDash ? this._dashedLineTo(x, y)
                : this._ctx.lineTo(x, y);
        }
        if (exceedUnit) {
            this._xi = x;
            this._yi = y;
        }

        return this;
    }

    bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
        this.addData(CMD.C, x1, y1, x2, y2, x3, y3);
        if (this._ctx) {
            this._needsDash ? this._dashedBezierTo(x1, y1, x2, y2, x3, y3)
                : this._ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        }
        this._xi = x3;
        this._yi = y3;
        return this;
    }

    quadraticCurveTo(x1: number, y1: number, x2: number, y2: number) {
        this.addData(CMD.Q, x1, y1, x2, y2);
        if (this._ctx) {
            this._needsDash ? this._dashedQuadraticTo(x1, y1, x2, y2)
                : this._ctx.quadraticCurveTo(x1, y1, x2, y2);
        }
        this._xi = x2;
        this._yi = y2;
        return this;
    }

    arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, anticlockwise?: boolean) {
        this.addData(
            CMD.A, cx, cy, r, r, startAngle, endAngle - startAngle, 0, anticlockwise ? 0 : 1
        );
        this._ctx && this._ctx.arc(cx, cy, r, startAngle, endAngle, anticlockwise);

        this._xi = mathCos(endAngle) * r + cx;
        this._yi = mathSin(endAngle) * r + cy;
        return this;
    }

    // TODO
    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number) {
        if (this._ctx) {
            this._ctx.arcTo(x1, y1, x2, y2, radius);
        }
        return this;
    }

    // TODO
    rect(x: number, y: number, w: number, h: number) {
        this._ctx && this._ctx.rect(x, y, w, h);
        this.addData(CMD.R, x, y, w, h);
        return this;
    }

    /**
     * @return {module:zrender/core/PathProxy}
     */
    closePath() {
        this.addData(CMD.Z);

        const ctx = this._ctx;
        const x0 = this._x0;
        const y0 = this._y0;
        if (ctx) {
            this._needsDash && this._dashedLineTo(x0, y0);
            ctx.closePath();
        }

        this._xi = x0;
        this._yi = y0;
        return this;
    }

    fill(ctx: CanvasRenderingContext2D) {
        ctx && ctx.fill();
        this.toStatic();
    }

    stroke(ctx: CanvasRenderingContext2D) {
        ctx && ctx.stroke();
        this.toStatic();
    }

    /**
     * 必须在其它绘制命令前调用
     * Must be invoked before all other path drawing methods
     */
    setLineDash(lineDash: number[] | false) {
        if (lineDash instanceof Array) {
            this._lineDash = lineDash;

            this._dashIdx = 0;

            let lineDashSum = 0;
            for (let i = 0; i < lineDash.length; i++) {
                lineDashSum += lineDash[i];
            }
            this._dashSum = lineDashSum;

            this._needsDash = true;
        }
        else {
            // Clear
            this._lineDash = null;
            this._needsDash = false;
        }
        return this;
    }

    /**
     * 必须在其它绘制命令前调用
     * Must be invoked before all other path drawing methods
     */
    setLineDashOffset(offset: number) {
        this._dashOffset = offset;
        return this;
    }

    len() {
        return this._len;
    }

    setData(data: Float32Array | number[]) {

        const len = data.length;

        if (!(this.data && this.data.length === len) && hasTypedArray) {
            this.data = new Float32Array(len);
        }

        for (let i = 0; i < len; i++) {
            this.data[i] = data[i];
        }

        this._len = len;
    }

    appendPath(path: PathProxy | PathProxy[]) {
        if (!(path instanceof Array)) {
            path = [path];
        }
        const len = path.length;
        let appendSize = 0;
        let offset = this._len;
        for (let i = 0; i < len; i++) {
            appendSize += path[i].len();
        }
        if (hasTypedArray && (this.data instanceof Float32Array)) {
            this.data = new Float32Array(offset + appendSize);
        }
        for (let i = 0; i < len; i++) {
            const appendPathData = path[i].data;
            for (let k = 0; k < appendPathData.length; k++) {
                this.data[offset++] = appendPathData[k];
            }
        }
        this._len = offset;
    }

    /**
     * 填充 Path 数据。
     * 尽量复用而不申明新的数组。大部分图形重绘的指令数据长度都是不变的。
     */
    addData(cmd: number, a?: number, b?: number, c?: number, d?: number, e?: number, f?: number, g?: number, h?: number) {
        if (!this._saveData) {
            return;
        }

        let data = this.data;
        if (this._len + arguments.length > data.length) {
            // 因为之前的数组已经转换成静态的 Float32Array
            // 所以不够用时需要扩展一个新的动态数组
            this._expandData();
            data = this.data;
        }
        for (let i = 0; i < arguments.length; i++) {
            data[this._len++] = arguments[i];
        }
    }

    _expandData() {
        // Only if data is Float32Array
        if (!(this.data instanceof Array)) {
            const newData = [];
            for (let i = 0; i < this._len; i++) {
                newData[i] = this.data[i];
            }
            this.data = newData;
        }
    }

    _dashedLineTo(x1: number, y1: number) {
        const dashSum = this._dashSum;
        const lineDash = this._lineDash;
        const ctx = this._ctx;
        let offset = this._dashOffset;

        let x0 = this._xi;
        let y0 = this._yi;
        let dx = x1 - x0;
        let dy = y1 - y0;
        let dist = mathSqrt(dx * dx + dy * dy);
        let x = x0;
        let y = y0;
        let nDash = lineDash.length;
        let dash;
        let idx;
        dx /= dist;
        dy /= dist;

        if (offset < 0) {
            // Convert to positive offset
            offset = dashSum + offset;
        }
        offset %= dashSum;
        x -= offset * dx;
        y -= offset * dy;

        while ((dx > 0 && x <= x1) || (dx < 0 && x >= x1)
        || (dx === 0 && ((dy > 0 && y <= y1) || (dy < 0 && y >= y1)))) {
            idx = this._dashIdx;
            dash = lineDash[idx];
            x += dx * dash;
            y += dy * dash;
            this._dashIdx = (idx + 1) % nDash;
            // Skip positive offset
            if ((dx > 0 && x < x0) || (dx < 0 && x > x0) || (dy > 0 && y < y0) || (dy < 0 && y > y0)) {
                continue;
            }
            ctx[idx % 2 ? 'moveTo' : 'lineTo'](
                dx >= 0 ? mathMin(x, x1) : mathMax(x, x1),
                dy >= 0 ? mathMin(y, y1) : mathMax(y, y1)
            );
        }
        // Offset for next lineTo
        dx = x - x1;
        dy = y - y1;
        this._dashOffset = -mathSqrt(dx * dx + dy * dy);
    }

    // Not accurate dashed line to
    _dashedBezierTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
        const cubicAt = curve.cubicAt;
        const ctx = this._ctx;

        let dashSum = this._dashSum;
        let offset = this._dashOffset;
        let lineDash = this._lineDash;

        let x0 = this._xi;
        let y0 = this._yi;
        let bezierLen = 0;
        let idx = this._dashIdx;
        let nDash = lineDash.length;

        let t;
        let dx;
        let dy;

        let x;
        let y;

        let tmpLen = 0;

        if (offset < 0) {
            // Convert to positive offset
            offset = dashSum + offset;
        }
        offset %= dashSum;
        // Bezier approx length
        for (t = 0; t < 1; t += 0.1) {
            dx = cubicAt(x0, x1, x2, x3, t + 0.1)
                - cubicAt(x0, x1, x2, x3, t);
            dy = cubicAt(y0, y1, y2, y3, t + 0.1)
                - cubicAt(y0, y1, y2, y3, t);
            bezierLen += mathSqrt(dx * dx + dy * dy);
        }

        // Find idx after add offset
        for (; idx < nDash; idx++) {
            tmpLen += lineDash[idx];
            if (tmpLen > offset) {
                break;
            }
        }
        t = (tmpLen - offset) / bezierLen;

        while (t <= 1) {

            x = cubicAt(x0, x1, x2, x3, t);
            y = cubicAt(y0, y1, y2, y3, t);

            // Use line to approximate dashed bezier
            // Bad result if dash is long
            idx % 2 ? ctx.moveTo(x, y)
                : ctx.lineTo(x, y);

            t += lineDash[idx] / bezierLen;

            idx = (idx + 1) % nDash;
        }

        // Finish the last segment and calculate the new offset
        (idx % 2 !== 0) && ctx.lineTo(x3, y3);
        dx = x3 - x;
        dy = y3 - y;
        this._dashOffset = -mathSqrt(dx * dx + dy * dy);
    }

    _dashedQuadraticTo(x1: number, y1: number, x2: number, y2: number) {
        // Convert quadratic to cubic using degree elevation
        const x3 = x2;
        const y3 = y2;
        x2 = (x2 + 2 * x1) / 3;
        y2 = (y2 + 2 * y1) / 3;
        x1 = (this._xi + 2 * x1) / 3;
        y1 = (this._yi + 2 * y1) / 3;

        this._dashedBezierTo(x1, y1, x2, y2, x3, y3);
    }

    /**
     * 转成静态的 Float32Array 减少堆内存占用
     * Convert dynamic array to static Float32Array
     */
    toStatic() {
        const data = this.data;
        if (data instanceof Array) {
            data.length = this._len;
            if (hasTypedArray) {
                this.data = new Float32Array(data);
            }
        }
    }

    /**
     * @return {module:zrender/core/BoundingRect}
     */
    getBoundingRect() {
        min[0] = min[1] = min2[0] = min2[1] = Number.MAX_VALUE;
        max[0] = max[1] = max2[0] = max2[1] = -Number.MAX_VALUE;

        const data = this.data;
        let xi = 0;
        let yi = 0;
        let x0 = 0;
        let y0 = 0;

        let i;
        for (i = 0; i < data.length;) {
            const cmd = data[i++] as number;

            if (i === 1) {
                // 如果第一个命令是 L, C, Q
                // 则 previous point 同绘制命令的第一个 point
                //
                // 第一个命令为 Arc 的情况下会在后面特殊处理
                xi = data[i];
                yi = data[i + 1];

                x0 = xi;
                y0 = yi;
            }

            switch (cmd) {
                case CMD.M:
                    // moveTo 命令重新创建一个新的 subpath, 并且更新新的起点
                    // 在 closePath 的时候使用
                    x0 = data[i++];
                    y0 = data[i++];
                    xi = x0;
                    yi = y0;
                    min2[0] = x0;
                    min2[1] = y0;
                    max2[0] = x0;
                    max2[1] = y0;
                    break;
                case CMD.L:
                    bbox.fromLine(xi, yi, data[i], data[i + 1], min2, max2);
                    xi = data[i++];
                    yi = data[i++];
                    break;
                case CMD.C:
                    bbox.fromCubic(
                        xi, yi, data[i++], data[i++], data[i++], data[i++], data[i], data[i + 1],
                        min2, max2
                    );
                    xi = data[i++];
                    yi = data[i++];
                    break;
                case CMD.Q:
                    bbox.fromQuadratic(
                        xi, yi, data[i++], data[i++], data[i], data[i + 1],
                        min2, max2
                    );
                    xi = data[i++];
                    yi = data[i++];
                    break;
                case CMD.A:
                    // TODO Arc 判断的开销比较大
                    const cx = data[i++];
                    const cy = data[i++];
                    const rx = data[i++];
                    const ry = data[i++];
                    const startAngle = data[i++];
                    const endAngle = data[i++] + startAngle;
                    // TODO Arc 旋转
                    i += 1;
                    const anticlockwise = 1 - data[i++];

                    if (i === 1) {
                        // 直接使用 arc 命令
                        // 第一个命令起点还未定义
                        x0 = mathCos(startAngle) * rx + cx;
                        y0 = mathSin(startAngle) * ry + cy;
                    }

                    bbox.fromArc(
                        cx, cy, rx, ry, startAngle, endAngle,
                        !!anticlockwise, min2, max2
                    );

                    xi = mathCos(endAngle) * rx + cx;
                    yi = mathSin(endAngle) * ry + cy;
                    break;
                case CMD.R:
                    x0 = xi = data[i++];
                    y0 = yi = data[i++];
                    const width = data[i++];
                    const height = data[i++];
                    // Use fromLine
                    bbox.fromLine(x0, y0, x0 + width, y0 + height, min2, max2);
                    break;
                case CMD.Z:
                    xi = x0;
                    yi = y0;
                    break;
            }

            // Union
            vec2.min(min, min, min2);
            vec2.max(max, max, max2);
        }

        // No data
        if (i === 0) {
            min[0] = min[1] = max[0] = max[1] = 0;
        }

        return new BoundingRect(
            min[0], min[1], max[0] - min[0], max[1] - min[1]
        );
    }

    /**
     * Rebuild path from current data
     * Rebuild path will not consider javascript implemented line dash.
     * @param {CanvasRenderingContext2D} ctx
     */
    rebuildPath(ctx: CanvasRenderingContext2D) {
        const d = this.data;
        let x0;
        let y0;
        let xi;
        let yi;
        let x;
        let y;
        let ux = this._ux;
        let uy = this._uy;
        let len = this._len;
        for (let i = 0; i < len;) {
            const cmd = d[i++];

            if (i === 1) {
                // 如果第一个命令是 L, C, Q
                // 则 previous point 同绘制命令的第一个 point
                //
                // 第一个命令为 Arc 的情况下会在后面特殊处理
                xi = d[i];
                yi = d[i + 1];

                x0 = xi;
                y0 = yi;
            }
            switch (cmd) {
                case CMD.M:
                    x0 = xi = d[i++];
                    y0 = yi = d[i++];
                    ctx.moveTo(xi, yi);
                    break;
                case CMD.L:
                    x = d[i++];
                    y = d[i++];
                    // Not draw too small seg between
                    if (mathAbs(x - xi) > ux || mathAbs(y - yi) > uy || i === len - 1) {
                        ctx.lineTo(x, y);
                        xi = x;
                        yi = y;
                    }
                    break;
                case CMD.C:
                    ctx.bezierCurveTo(
                        d[i++], d[i++], d[i++], d[i++], d[i++], d[i++]
                    );
                    xi = d[i - 2];
                    yi = d[i - 1];
                    break;
                case CMD.Q:
                    ctx.quadraticCurveTo(d[i++], d[i++], d[i++], d[i++]);
                    xi = d[i - 2];
                    yi = d[i - 1];
                    break;
                case CMD.A:
                    const cx = d[i++];
                    const cy = d[i++];
                    const rx = d[i++];
                    const ry = d[i++];
                    const theta = d[i++];
                    const dTheta = d[i++];
                    const psi = d[i++];
                    const fs = d[i++];
                    const r = (rx > ry) ? rx : ry;
                    const scaleX = (rx > ry) ? 1 : rx / ry;
                    const scaleY = (rx > ry) ? ry / rx : 1;
                    const isEllipse = Math.abs(rx - ry) > 1e-3;
                    const endAngle = theta + dTheta;
                    if (isEllipse) {
                        ctx.translate(cx, cy);
                        ctx.rotate(psi);
                        ctx.scale(scaleX, scaleY);
                        ctx.arc(0, 0, r, theta, endAngle, !!(1 - fs));
                        ctx.scale(1 / scaleX, 1 / scaleY);
                        ctx.rotate(-psi);
                        ctx.translate(-cx, -cy);
                    }
                    else {
                        ctx.arc(cx, cy, r, theta, endAngle, !!(1 - fs));
                    }

                    if (i === 1) {
                        // 直接使用 arc 命令
                        // 第一个命令起点还未定义
                        x0 = mathCos(theta) * rx + cx;
                        y0 = mathSin(theta) * ry + cy;
                    }
                    xi = mathCos(endAngle) * rx + cx;
                    yi = mathSin(endAngle) * ry + cy;
                    break;
                case CMD.R:
                    x0 = xi = d[i];
                    y0 = yi = d[i + 1];
                    ctx.rect(d[i++], d[i++], d[i++], d[i++]);
                    break;
                case CMD.Z:
                    ctx.closePath();
                    xi = x0;
                    yi = y0;
            }
        }
    }
}