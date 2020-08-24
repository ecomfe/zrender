// TODO
// 1. shadow
// 2. Image: sx, sy, sw, sh

import {createElement} from './core';
import PathProxy from '../core/PathProxy';
import * as matrix from '../core/matrix';
import { Path } from '../export';
import { PathStyleProps } from '../graphic/Path';
import ZRImage, { ImageStyleProps } from '../graphic/Image';
import { DEFAULT_FONT, getLineHeight } from '../contain/text';
import TSpan, { TSpanStyleProps } from '../graphic/TSpan';
import { map } from '../core/util';
import { normalizeLineDash } from '../graphic/helper/dashStyle';

export interface SVGProxy<T> {
    brush(el: T): void
}

const CMD = PathProxy.CMD;

const NONE = 'none';
const mathRound = Math.round;
const mathSin = Math.sin;
const mathCos = Math.cos;
const PI = Math.PI;
const PI2 = Math.PI * 2;
const degree = 180 / PI;

const EPSILON = 1e-4;

type AllStyleOption = PathStyleProps | TSpanStyleProps | ImageStyleProps;

function round4(val: number) {
    return mathRound(val * 1e4) / 1e4;
}

function isAroundZero(val: number) {
    return val < EPSILON && val > -EPSILON;
}

function pathHasFill(style: AllStyleOption): style is PathStyleProps {
    const fill = (style as PathStyleProps).fill;
    return fill != null && fill !== NONE;
}

function pathHasStroke(style: AllStyleOption): style is PathStyleProps {
    const stroke = (style as PathStyleProps).stroke;
    return stroke != null && stroke !== NONE;
}

function reduceNumberString(n: number, precision: number) {
    // Avoid large string of matrix
    // PENDING If have precision issue when scaled
    return n > 1 ? +n.toFixed(precision) : +n.toPrecision(precision);
}
function setTransform(svgEl: SVGElement, m: matrix.MatrixArray) {
    if (m) {
        attr(svgEl, 'transform', 'matrix('
            + reduceNumberString(m[0], 3) + ','
            + reduceNumberString(m[1], 3) + ','
            + reduceNumberString(m[2], 3) + ','
            + reduceNumberString(m[3], 3) + ','
            + reduceNumberString(m[4], 4) + ','
            + reduceNumberString(m[5], 4)
         + ')');
    }
}

function attr(el: SVGElement, key: string, val: string) {
    if (!val || (val as any).type !== 'linear' && (val as any).type !== 'radial') {
        // Don't set attribute for gradient, since it need new dom nodes
        el.setAttribute(key, val);
    }
}

function attrXLink(el: SVGElement, key: string, val: string) {
    el.setAttributeNS('http://www.w3.org/1999/xlink', key, val);
}

function bindStyle(svgEl: SVGElement, style: PathStyleProps, el?: Path): void
function bindStyle(svgEl: SVGElement, style: TSpanStyleProps, el?: TSpan): void
function bindStyle(svgEl: SVGElement, style: ImageStyleProps, el?: ZRImage): void
function bindStyle(svgEl: SVGElement, style: AllStyleOption, el?: Path | TSpan | ZRImage) {
    const opacity = style.opacity == null ? 1 : style.opacity;
    if (pathHasFill(style)) {
        let fill = style.fill;
        fill = fill === 'transparent' ? NONE : fill;
        attr(svgEl, 'fill', fill as string);
        attr(svgEl,
            'fill-opacity',
            (style.fillOpacity != null ? style.fillOpacity * opacity : opacity) + ''
        );
    }
    else {
        attr(svgEl, 'fill', NONE);
    }

    if (pathHasStroke(style)) {
        let stroke = style.stroke;
        stroke = stroke === 'transparent' ? NONE : stroke;
        attr(svgEl, 'stroke', stroke as string);
        const strokeWidth = style.lineWidth;
        const strokeScale = style.strokeNoScale
            ? (el as Path).getLineScale()
            : 1;
        attr(svgEl, 'stroke-width', (strokeScale ? strokeWidth / strokeScale : 0) + '');
        // stroke then fill for text; fill then stroke for others
        attr(svgEl, 'paint-order', style.strokeFirst ? 'stroke' : 'fill');
        attr(svgEl, 'stroke-opacity', (style.strokeOpacity != null ? style.strokeOpacity * opacity : opacity) + '');
        let lineDash = style.lineDash && strokeWidth > 0 && normalizeLineDash(style.lineDash, strokeWidth);
        if (lineDash) {
            let lineDashOffset = style.lineDashOffset;
            if (strokeScale && strokeScale !== 1) {
                lineDash = map(lineDash, function (rawVal) {
                    return rawVal / strokeScale;
                });
                if (lineDashOffset) {
                    lineDashOffset /= strokeScale;
                    lineDashOffset = mathRound(lineDashOffset);
                }
            }
            attr(svgEl, 'stroke-dasharray', lineDash.join(','));
            attr(svgEl, 'stroke-dashoffset', (lineDashOffset || 0) + '');
        }
        else {
            attr(svgEl, 'stroke-dasharray', '');
        }

        // PENDING
        style.lineCap && attr(svgEl, 'stroke-linecap', style.lineCap);
        style.lineJoin && attr(svgEl, 'stroke-linejoin', style.lineJoin);
        style.miterLimit && attr(svgEl, 'stroke-miterlimit', style.miterLimit + '');
    }
    else {
        attr(svgEl, 'stroke', NONE);
    }
}

/***************************************************
 * PATH
 **************************************************/
function pathDataToString(path: PathProxy) {
    if (!path) {
        return '';
    }

    const str = [];
    const data = path.data;
    const dataLength = path.len();
    let x;
    let y;
    for (let i = 0; i < dataLength;) {
        let cmd = data[i++];
        let cmdStr = '';
        let nData = 0;
        switch (cmd) {
            case CMD.M:
                cmdStr = 'M';
                nData = 2;
                break;
            case CMD.L:
                cmdStr = 'L';
                nData = 2;
                break;
            case CMD.Q:
                cmdStr = 'Q';
                nData = 4;
                break;
            case CMD.C:
                cmdStr = 'C';
                nData = 6;
                break;
            case CMD.A:
                const cx = data[i++];
                const cy = data[i++];
                const rx = data[i++];
                const ry = data[i++];
                const theta = data[i++];
                let dTheta = data[i++];
                const psi = data[i++];
                const clockwise = data[i++];

                const dThetaPositive = Math.abs(dTheta);
                const isCircle = isAroundZero(dThetaPositive - PI2)
                    || (clockwise ? dTheta >= PI2 : -dTheta >= PI2);

                // Mapping to 0~2PI
                const unifiedTheta = dTheta > 0 ? dTheta % PI2 : (dTheta % PI2 + PI2);

                let large = false;
                if (isCircle) {
                    large = true;
                }
                else if (isAroundZero(dThetaPositive)) {
                    large = false;
                }
                else {
                    large = (unifiedTheta >= PI) === !!clockwise;
                }

                const x0 = round4(cx + rx * mathCos(theta));
                const y0 = round4(cy + ry * mathSin(theta));

                // It will not draw if start point and end point are exactly the same
                // We need to shift the end point with a small value
                // FIXME A better way to draw circle ?
                if (isCircle) {
                    if (clockwise) {
                        dTheta = PI2 - 1e-4;
                    }
                    else {
                        dTheta = -PI2 + 1e-4;
                    }

                    large = true;

                    if (i === 9) {
                        // Move to (x0, y0) only when CMD.A comes at the
                        // first position of a shape.
                        // For instance, when drawing a ring, CMD.A comes
                        // after CMD.M, so it's unnecessary to move to
                        // (x0, y0).
                        str.push('M', x0, y0);
                    }
                }

                x = round4(cx + rx * mathCos(theta + dTheta));
                y = round4(cy + ry * mathSin(theta + dTheta));

                if (isNaN(x0) || isNaN(y0) || isNaN(rx) || isNaN(ry) || isNaN(psi) || isNaN(degree) || isNaN(x)  || isNaN(y)) {
                    return '';
                }

                // FIXME Ellipse
                str.push('A', round4(rx), round4(ry),
                    mathRound(psi * degree), +large, +clockwise, x, y);
                break;
            case CMD.Z:
                cmdStr = 'Z';
                break;
            case CMD.R:
                x = round4(data[i++]);
                y = round4(data[i++]);
                const w = round4(data[i++]);
                const h = round4(data[i++]);

                if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) {
                    return '';
                }

                str.push(
                    'M', x, y,
                    'L', x + w, y,
                    'L', x + w, y + h,
                    'L', x, y + h,
                    'L', x, y
                );
                break;
        }
        cmdStr && str.push(cmdStr);
        for (let j = 0; j < nData; j++) {
            const val = round4(data[i++]);
            if (isNaN(val)) {
                return '';
            }
            // PENDING With scale
            str.push(val);
        }
    }
    return str.join(' ');
}

interface PathWithSVGBuildPath extends Path {
    __svgBuildPath: Path['buildPath']
    __svgPathStr: string
}

function wrapSVGBuildPath(el: PathWithSVGBuildPath) {
    if (!el.__svgBuildPath) {
        const oldBuildPath = el.buildPath;
        el.__svgBuildPath = el.buildPath = function (path, shape, inBundle) {
            oldBuildPath.call(this, el.path, shape, inBundle);
            el.__svgPathStr = pathDataToString(el.path);
        }
        if (!el.shapeChanged()) {   // If path is updated. Get string manually.
            el.__svgPathStr = pathDataToString(el.path);
        }
    }
}

const svgPath: SVGProxy<Path> = {
    brush(el: Path) {
        const style = el.style;

        let svgEl = el.__svgEl;
        if (!svgEl) {
            svgEl = createElement('path');
            el.__svgEl = svgEl;
        }

        if (!el.path) {
            el.createPathProxy();
        }
        const path = el.path;

        wrapSVGBuildPath(el as PathWithSVGBuildPath);

        if (el.shapeChanged()) {
            path.beginPath();
            el.buildPath(path, el.shape);
            el.pathUpdated();
        }

        // TODO Optimize
        attr(svgEl, 'd', (el as PathWithSVGBuildPath).__svgPathStr);

        bindStyle(svgEl, style, el);
        setTransform(svgEl, el.transform);
    }
};

export {svgPath as path};

/***************************************************
 * IMAGE
 **************************************************/
const svgImage: SVGProxy<ZRImage> = {
    brush(el: ZRImage) {
        const style = el.style;
        let image = style.image;

        if (image instanceof HTMLImageElement) {
            const src = image.src;
            image = src;
        }
        if (!image) {
            return;
        }

        const x = style.x || 0;
        const y = style.y || 0;

        const dw = style.width;
        const dh = style.height;

        let svgEl = el.__svgEl;
        if (!svgEl) {
            svgEl = createElement('image');
            el.__svgEl = svgEl;
        }

        if (image !== el.__imageSrc) {
            attrXLink(svgEl, 'href', image as string);
            // Caching image src
            el.__imageSrc = image as string;
        }

        attr(svgEl, 'width', dw + '');
        attr(svgEl, 'height', dh + '');

        attr(svgEl, 'x', x + '');
        attr(svgEl, 'y', y + '');

        setTransform(svgEl, el.transform);
    }
};
export {svgImage as image};

/***************************************************
 * TEXT
 **************************************************/
const TEXT_ALIGN_TO_ANCHOR = {
    left: 'start',
    right: 'end',
    center: 'middle',
    middle: 'middle'
};

function adjustTextY(y: number, lineHeight: number, textBaseline: CanvasTextBaseline): number {
    // TODO Other values.
    if (textBaseline === 'top') {
        y += lineHeight / 2;
    }
    else if (textBaseline === 'bottom') {
        y -= lineHeight / 2;
    }
    return y;
}

const svgText: SVGProxy<TSpan> = {
    brush(el: TSpan) {
        const style = el.style;

        let text = style.text;
        // Convert to string
        text != null && (text += '');
        if (!text) {
            return;
        }

        let textSvgEl = el.__svgEl as SVGTextElement;
        if (!textSvgEl) {
            textSvgEl = createElement('text') as SVGTextElement;
            el.__svgEl = textSvgEl;
        }

        const font = style.font || DEFAULT_FONT;

        // style.font has been normalized by `normalizeTextStyle`.
        const textSvgElStyle = textSvgEl.style;
        textSvgElStyle.font = font;

        textSvgEl.textContent = text;

        bindStyle(textSvgEl, style, el);
        setTransform(textSvgEl, el.transform);

        // Consider different font display differently in vertial align, we always
        // set vertialAlign as 'middle', and use 'y' to locate text vertically.
        const x = style.x || 0;
        const y = adjustTextY(style.y || 0, getLineHeight(font), style.textBaseline);
        const textAlign = TEXT_ALIGN_TO_ANCHOR[style.textAlign as keyof typeof TEXT_ALIGN_TO_ANCHOR]
            || style.textAlign;
        attr(textSvgEl, 'dominant-baseline', 'middle');
        attr(textSvgEl, 'text-anchor', textAlign);
        attr(textSvgEl, 'x', x + '');
        attr(textSvgEl, 'y', y + '');
    }
};
export {svgText as text};
