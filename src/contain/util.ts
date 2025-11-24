import { PI2 } from '../core/math';

export function normalizeRadian(angle: number): number {
    angle %= PI2;
    if (angle < 0) {
        angle += PI2;
    }
    return angle;
}