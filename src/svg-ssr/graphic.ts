// TODO
// 1. shadow
// 2. Image: sx, sy, sw, sh

import {
    adjustTextY,
    getMatrixStr,
    getShadowKey,
    hasShadow,
    isAroundZero,
    round4,
    TEXT_ALIGN_TO_ANCHOR
} from '../svg/shared';
import Path, { PathStyleProps } from '../graphic/Path';
import ZRImage, { ImageStyleProps } from '../graphic/Image';
import { DEFAULT_FONT, getLineHeight } from '../contain/text';
import TSpan, { TSpanStyleProps } from '../graphic/TSpan';
import SVGPathRebuilder from '../svg/SVGPathRebuilder';
import mapStyleToAttrs from '../svg/mapStyleToAttrs';
import { createElementClose, createElementOpen } from './helper';
import { MatrixArray } from '../core/matrix';
import Displayable from '../graphic/Displayable';
import { LinearGradientObject } from '../graphic/LinearGradient';
import { RadialGradientObject } from '../graphic/RadialGradient';
import { PatternObject } from '../graphic/Pattern';
import Rect from '../graphic/shape/Rect';
import { isArray, map } from '../core/util';
import Polyline from '../graphic/shape/Polyline';
import Polygon from '../graphic/shape/Polygon';

type Attrs = [string, string][]

export interface SVGProxy<T> {
    brush(el: T): string
}


type AllStyleOption = PathStyleProps | TSpanStyleProps | ImageStyleProps;

function setStyleAttrs(attrs: Attrs, style: AllStyleOption, el: Path | TSpan | ZRImage) {
    mapStyleToAttrs((key, val) => {
        // TODO gradient
        if (!val || (val as any).type !== 'linear' && (val as any).type !== 'radial') {
            attrs.push([key, val]);
        }
    }, style, el, false);
}

function noRotateScale(m: MatrixArray) {
    return isAroundZero(m[0] - 1)
        && isAroundZero(m[1])
        && isAroundZero(m[2])
        && isAroundZero(m[3] - 1);
}

function noTranslate(m: MatrixArray) {
    return isAroundZero(m[4]) && isAroundZero(m[5]);
}

function setTransform(attrs: Attrs, m: MatrixArray) {
    if (m && !(noTranslate(m) && noRotateScale(m))) {
        attrs.push([
            'transform',
            // Use translate possible to reduce the size a bit.
            noRotateScale(m) ? `translate(${round4(m[4])} ${round4(m[5])})` : getMatrixStr(m)
        ]);
    }
}

type ShapeMapDesc = (string | [string, string] | [string, string[]])[];
type ConvertShapeToAttr = (shape: any, attrs: Attrs) => void;
type ShapeValidator = (shape: any) => boolean;

function converPolyShape(shape: Polygon['shape'], attrs: Attrs) {
    const points = shape.points;
    const strArr = [];
    for (let i = 0; i < points.length; i++) {
        strArr.push(round4(points[i][0]));
        strArr.push(round4(points[i][1]));
    }
    attrs.push(['points', strArr.join(' ')]);
}

function validatePolyShape(shape: Polyline['shape']) {
    return !shape.smooth;
}

function createAttrsConvert(desc: ShapeMapDesc): ConvertShapeToAttr {
    const normalizedDesc: [string, string[]][] = map(desc, (item) =>
        (typeof item === 'string'
            ? [item, [item]]
            : typeof item[1] === 'string'
                ? [item[0], [item[1]]] : item as [string, string[]])
    );

    return function (shape, attrs) {
        for (let i = 0; i < normalizedDesc.length; i++) {
            const item = normalizedDesc[i];
            const val = shape[item[0]];
            if (val != null) {
                for (let k = 0; k < item[1].length; k++) {
                    attrs.push([item[1][k], round4(val) + '']);
                }
            }
        }
    };
}

const buitinShapesDef: Record<string, [ConvertShapeToAttr, ShapeValidator?]> = {
    rect: [createAttrsConvert(
        ['x', 'y', 'width', 'height', ['r', ['rx', 'ry']]]
    ), (shape: Rect['shape']) => {
        const r = shape.r;
        // TODO all r same.
        return !isArray(r);
    }],
    circle: [createAttrsConvert(['cx', 'cy', 'r'])],
    polyline: [converPolyShape, validatePolyShape],
    polygon: [converPolyShape, validatePolyShape]
};


export function brushSVGPath(el: Path) {
    const style = el.style;
    const shape = el.shape;
    const builtinShpDef = buitinShapesDef[el.type];
    const attrs: Attrs = [];
    let svgElType = 'path';
    // Using SVG builtin shapes if possible
    if (builtinShpDef && !(builtinShpDef[1] && !builtinShpDef[1](shape))) {
        svgElType = el.type;
        builtinShpDef[0](shape, attrs);
    }
    else {
        if (!el.path) {
            el.createPathProxy();
        }
        const path = el.path;

        if (el.shapeChanged()) {
            path.beginPath();
            el.buildPath(path, el.shape);
            el.pathUpdated();
        }
        // Because SSR renderer only render once. So always create new to simplify the case.
        const svgPathBuilder = new SVGPathRebuilder();
        svgPathBuilder.reset();
        path.rebuildPath(svgPathBuilder, 1);
        svgPathBuilder.generateStr();

        attrs.push(['d', svgPathBuilder.getStr()]);
    }
    setTransform(attrs, el.transform);
    setStyleAttrs(attrs, style, el);

    return [
        createElementOpen(svgElType, attrs),
        createElementClose(svgElType)
    ].join('\n');
}

export function brushSVGImage(el: ZRImage) {
    const style = el.style;
    let image = style.image;

    if (!image) {
        return '';
    }
    // Only support string image in ssr renderer.

    const x = style.x || 0;
    const y = style.y || 0;

    const dw = style.width;
    const dh = style.height;

    const attrs: Attrs = [
        ['href', image as string],
        ['width', dw + ''],
        ['height', dh + '']
    ];
    if (x) {
        attrs.push(['x', x + '']);
    }
    if (y) {
        attrs.push(['y', y + '']);
    }

    setTransform(attrs, el.transform);
    setStyleAttrs(attrs, style, el);

    return [
        createElementOpen('image', attrs),
        createElementClose('image')
    ].join('\n');
};

export function brushSVGTSpan(el: TSpan) {
    const style = el.style;

    let text = style.text;
    // Convert to string
    text != null && (text += '');
    if (!text || isNaN(style.x) || isNaN(style.y)) {
        return '';
    }

    // style.font has been normalized by `normalizeTextStyle`.
    const font = style.font || DEFAULT_FONT;

    // Consider different font display differently in vertial align, we always
    // set vertialAlign as 'middle', and use 'y' to locate text vertically.
    const x = style.x || 0;
    const y = adjustTextY(style.y || 0, getLineHeight(font), style.textBaseline);
    const textAlign = TEXT_ALIGN_TO_ANCHOR[style.textAlign as keyof typeof TEXT_ALIGN_TO_ANCHOR]
        || style.textAlign;

    const attrs: Attrs = [
        ['style', `font:${font}`],
        ['dominant-baseline', 'central'],
        ['text-anchor', textAlign]
    ];
    if (text.match(/\s\s/)) {
        attrs.push(['xml:space', 'preserve']);
    }
    if (x) {
        attrs.push(['x', x + '']);
    }
    if (y) {
        attrs.push(['y', y + '']);
    }
    setTransform(attrs, el.transform);
    setStyleAttrs(attrs, style, el);

    return [
        createElementOpen('image', attrs),
        text,
        createElementClose('image')
    ].join('\n');
}

export function brush(el: Displayable) {
    if (el instanceof Path) {
        return brushSVGPath(el);
    }
    else if (el instanceof ZRImage) {
        return brushSVGImage(el);
    }
    else if (el instanceof TSpan) {
        return brushSVGTSpan(el);
    }
}

let shadowId = 0;
let gradientId = 0;
let patternId = 0;
let clipPathId = 0;
export function createShadow(
    el: Displayable,
    defs: Record<string, string>,
    shadowCache: Record<string, string>
) {
    const style = el.style;
    if (hasShadow(style)) {
        const shadowKey = getShadowKey(el);
        if (shadowCache[shadowKey]) {
            return shadowCache[shadowKey];
        }
        // const shadowStr =
    }
}

export function createGradient(
    gradient: LinearGradientObject | RadialGradientObject,
    defs: Record<string, string>,
    gradientCache: Record<string, string>
) {

}

export function createPattern(
    pattern: PatternObject,
    defs: Record<string, string>,
    patternCache: Record<string, string>
) {

}

export function createAnimation() {

}

export function createClipPath(
    el: Displayable,
    defs: Record<string, string>
) {

}