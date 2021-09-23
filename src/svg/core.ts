import { MatrixArray } from '../core/matrix';
import { parse } from '../tool/color';

const mathRound = Math.round;

export const SVGNS = 'http://www.w3.org/2000/svg';
export const XLINKNS = 'http://www.w3.org/1999/xlink';
export const XMLNS = 'http://www.w3.org/2000/xmlns/';

export function createElement(name: string) {
    return document.createElementNS(SVGNS, name);
}

export function normalizeColor(color: string): { color: string, opacity: number } {
    let opacity;
    if (!color || color === 'transparent') {
        color = 'none';
    }
    else if (typeof color === 'string' && color.indexOf('rgba') > -1) {
        const arr = parse(color);
        if (arr) {
            color = 'rgb(' + arr[0] + ',' + arr[1] + ',' + arr[2] + ')';
            opacity = arr[3];
        }
    }
    return {
        color,
        opacity: opacity == null ? 1 : opacity
    };
}

const EPSILON = 1e-4;
export function isAroundZero(val: number) {
    return val < EPSILON && val > -EPSILON;
}

export function round3(val: number) {
    return mathRound(val * 1e3) / 1e3;
}
export function round4(val: number) {
    return mathRound(val * 1e4) / 1e4;
}

export function getMatrixStr(m: MatrixArray) {
    return 'matrix('
        // Avoid large string of matrix
        // PENDING If have precision issue when scaled
        + round3(m[0]) + ','
        + round3(m[1]) + ','
        + round3(m[2]) + ','
        + round3(m[3]) + ','
        + round4(m[4]) + ','
        + round4(m[5])
    + ')';
}