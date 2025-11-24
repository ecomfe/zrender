
import {normalizeRadian} from './util';
import { PI2, EPSILON4, mathAbs, mathSqrt, mathATan2 } from '../core/math';

/**
 * 圆弧描边包含判断
 */
export function containStroke(
    cx: number, cy: number, r: number, startAngle: number, endAngle: number,
    anticlockwise: boolean,
    lineWidth: number, x: number, y: number
): boolean {

    if (lineWidth === 0) {
        return false;
    }
    const _l = lineWidth;

    x -= cx;
    y -= cy;
    const d = mathSqrt(x * x + y * y);

    if ((d - _l > r) || (d + _l < r)) {
        return false;
    }
    // TODO
    if (mathAbs(startAngle - endAngle) % PI2 < EPSILON4) {
        // Is a circle
        return true;
    }
    if (anticlockwise) {
        const tmp = startAngle;
        startAngle = normalizeRadian(endAngle);
        endAngle = normalizeRadian(tmp);
    }
    else {
        startAngle = normalizeRadian(startAngle);
        endAngle = normalizeRadian(endAngle);
    }
    if (startAngle > endAngle) {
        endAngle += PI2;
    }

    let angle = mathATan2(y, x);
    if (angle < 0) {
        angle += PI2;
    }
    return (angle >= startAngle && angle <= endAngle)
        || (angle + PI2 >= startAngle && angle + PI2 <= endAngle);
}