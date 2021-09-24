
export const mathRound = Math.round;

export const SVGNS = 'http://www.w3.org/2000/svg';
export const XLINKNS = 'http://www.w3.org/1999/xlink';
export const XMLNS = 'http://www.w3.org/2000/xmlns/';

export function createElement(name: string) {
    return document.createElementNS(SVGNS, name);
}

