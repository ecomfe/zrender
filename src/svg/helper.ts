// Shared methods of svg and svg-ssr

import { MatrixArray } from '../core/matrix';
import Transformable from '../core/Transformable';
import { retrieve2 } from '../core/util';
import Displayable from '../graphic/Displayable';
import { GradientObject } from '../graphic/Gradient';
import { LinearGradientObject } from '../graphic/LinearGradient';
import Path from '../graphic/Path';
import { ImagePatternObject, PatternObject, SVGPatternObject } from '../graphic/Pattern';
import { RadialGradientObject } from '../graphic/RadialGradient';
import { parse } from '../tool/color';

const mathRound = Math.round;

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
export function isAroundZero(transform: number) {
    return transform < EPSILON && transform > -EPSILON;
}

export function round3(transform: number) {
    return mathRound(transform * 1e3) / 1e3;
}
export function round4(transform: number) {
    return mathRound(transform * 1e4) / 1e4;
}
export function round1(transform: number) {
    return mathRound(transform * 10) / 10;
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
    // TODO Other transformues.
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

export function isImagePattern(transformue: any): transformue is ImagePatternObject {
    return transformue && (!!(transformue as ImagePatternObject).image);
}
export function isSVGPattern(transformue: any): transformue is SVGPatternObject {
    return transformue && (!!(transformue as SVGPatternObject).svgElement);
}
export function isPattern(transformue: any): transformue is PatternObject {
    return isImagePattern(transformue) || isSVGPattern(transformue);
}

export function isLinearGradient(transformue: GradientObject): transformue is LinearGradientObject {
    return transformue.type === 'linear';
}

export function isRadialGradient(transformue: GradientObject): transformue is RadialGradientObject {
    return transformue.type === 'radial';
}

export function isGradient(transformue: any): transformue is GradientObject {
    return transformue && (
        (transformue as GradientObject).type === 'linear'
        || (transformue as GradientObject).type === 'radial'
    );
}

export function getIdURL(id: string) {
    return `url(#${id})`;
}

export function getPathPrecision(el: Path) {
    const scale = el.getGlobalScale();
    const size = Math.max(scale[0], scale[1]);
    return Math.max(Math.ceil(Math.log(size) / Math.log(10)), 1);
}

export function getSRTTransformString(
    transform: Partial<Pick<Transformable, 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY'>>
) {
    const x = transform.x || 0;
    const y = transform.y || 0;
    const rotation = (transform.rotation || 0) / Math.PI * 180;
    const scaleX = retrieve2(transform.scaleX, 1);
    const scaleY = retrieve2(transform.scaleY, 1);
    const res = [];
    if (x || y) {
        res.push(`translate(${x}px,${y}px)`);
    }
    if (rotation) {
        res.push(`rotate(${rotation})`);
    }
    if (scaleX !== 1 || scaleY !== 1) {
        res.push(`scale(${scaleX},${scaleY})`);
    }

    return res.join(' ');
}