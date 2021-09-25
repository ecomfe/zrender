// Shared methods of svg and svg-ssr

import { MatrixArray } from '../core/matrix';
import Displayable from '../graphic/Displayable';
import { GradientObject } from '../graphic/Gradient';
import { LinearGradientObject } from '../graphic/LinearGradient';
import Path from '../graphic/Path';
import { ImagePatternObject, PatternObject, SVGPatternObject } from '../graphic/Pattern';
import { RadialGradientObject } from '../graphic/RadialGradient';
import { parse } from '../tool/color';
import { mathRound } from './core';

export function normalizeColor(color: string): { color: string; opacity: number; } {
    let opacity;
    if (!color || color === 'transparent') {
        color = 'none';
    }
    else if (typeof color === 'string' && color.indexOf('rgba') > -1) {
        const arr = parse(color);
        if (arr) {
            // TODO use hex?
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

export const TEXT_ALIGN_TO_ANCHOR = {
    left: 'start',
    right: 'end',
    center: 'middle',
    middle: 'middle'
};

export function adjustTextY(y: number, lineHeight: number, textBaseline: CanvasTextBaseline): number {
    // TODO Other values.
    if (textBaseline === 'top') {
        y += lineHeight / 2;
    }
    else if (textBaseline === 'bottom') {
        y -= lineHeight / 2;
    }
    return y;
}


export function hasShadow(style: Displayable['style']) {
    // TODO: textBoxShadowBlur is not supported yet
    return style
        && (style.shadowBlur || style.shadowOffsetX || style.shadowOffsetY);
}

export function getShadowKey(displayable: Displayable) {
    const style = displayable.style;
    const globalScale = displayable.getGlobalScale();
    return [
        style.shadowColor,
        (style.shadowBlur || 0).toFixed(2), // Reduce the precision
        (style.shadowOffsetX || 0).toFixed(2),
        (style.shadowOffsetY || 0).toFixed(2),
        globalScale[0],
        globalScale[1]
    ].join(',');
}

export function getClipPathsKey(clipPaths: Path[]) {
    let key: number[] = [];
    if (clipPaths) {
        for (let i = 0; i < clipPaths.length; i++) {
            const clipPath = clipPaths[i];
            key.push(clipPath.id);
        }
    }
    return key.join(',');
}

export function isPattern(value: PatternObject | string): value is PatternObject {
    return value && (!!(value as ImagePatternObject).image || !!(value as SVGPatternObject).svgElement);
}

export function isLinearGradient(value: GradientObject): value is LinearGradientObject {
    return value.type === 'linear';
}

export function isRadialGradient(value: GradientObject): value is RadialGradientObject {
    return value.type === 'radial';
}

export function isGradient(value: any): value is GradientObject {
    return value && (
        (value as GradientObject).type === 'linear'
        || (value as GradientObject).type === 'radial'
    );
}

export function getIdURL(id: string) {
    return `url(#${id})`;
}