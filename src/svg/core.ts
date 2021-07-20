import { parse } from '../tool/color';

export function createElement(name: string) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
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
