// TODO
// 1. shadow
// 2. Image: sx, sy, sw, sh

import {createElement} from './core';
import { PathRebuilder } from '../core/PathProxy';
import * as matrix from '../core/matrix';
import Path, { PathStyleProps } from '../graphic/Path';
import ZRImage, { ImageStyleProps } from '../graphic/Image';
import { DEFAULT_FONT, getLineHeight } from '../contain/text';
import TSpan, { TSpanStyleProps } from '../graphic/TSpan';
import { map } from '../core/util';
import { normalizeLineDash } from '../graphic/helper/dashStyle';

export interface SVGProxy<T> {
    brush(el: T): void
}

const NONE = 'none';
const mathRound = Math.round;
const mathSin = Math.sin;
const mathCos = Math.cos;
const PI = Math.PI;
const PI2 = Math.PI * 2;
const degree = 180 / PI;

const EPSILON = 1e-4;

type AllStyleOption = PathStyleProps | TSpanStyleProps | ImageStyleProps;

function round3(val: number) {
    return mathRound(val * 1e3) / 1e3;
}
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

function setTransform(svgEl: SVGElement, m: matrix.MatrixArray) {
    if (m) {
        attr(svgEl, 'transform', 'matrix('
            // Avoid large string of matrix
            // PENDING If have precision issue when scaled
            + round3(m[0]) + ','
            + round3(m[1]) + ','
            + round3(m[2]) + ','
            + round3(m[3]) + ','
            + round4(m[4]) + ','
            + round4(m[5])
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

function attrXML(el: SVGElement, key: string, val: string) {
    el.setAttributeNS('http://www.w3.org/XML/1998/namespace', key, val);
}

function bindStyle(svgEl: SVGElement, style: PathStyleProps, el?: Path): void
function bindStyle(svgEl: SVGElement, style: TSpanStyleProps, el?: TSpan): void
function bindStyle(svgEl: SVGElement, style: ImageStyleProps, el?: ZRImage): void
function bindStyle(svgEl: SVGElement, style: AllStyleOption, el?: Path | TSpan | ZRImage) {
    const opacity = style.opacity == null ? 1 : style.opacity;

    // only set opacity. stroke and fill cannot be applied to svg image
    if (el instanceof ZRImage) {
        svgEl.style.opacity = opacity + '';
        return;
    }

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

class SVGPathRebuilder implements PathRebuilder {
    _d: (string | number)[]
    _str: string
    _invalid: boolean

    reset() {
        this._d = [];
        this._str = '';
    }
    moveTo(x: number, y: number) {
        this._add('M', x, y);
    }
    lineTo(x: number, y: number) {
        this._add('L', x, y);
    }
    bezierCurveTo(x: number, y: number, x2: number, y2: number, x3: number, y3: number) {
        this._add('C', x, y, x2, y2, x3, y3);
    }
    quadraticCurveTo(x: number, y: number, x2: number, y2: number) {
        this._add('Q', x, y, x2, y2);
    }
    arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, anticlockwise: boolean) {
        this.ellipse(cx, cy, r, r, 0, startAngle, endAngle, anticlockwise);
    }
    ellipse(cx: number, cy: number, rx: number, ry: number, psi: number, startAngle: number, endAngle: number, anticlockwise: boolean) {

        const firstCmd = this._d.length === 0;

        let dTheta = endAngle - startAngle;
        const clockwise = !anticlockwise;

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

        const x0 = round4(cx + rx * mathCos(startAngle));
        const y0 = round4(cy + ry * mathSin(startAngle));

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

            if (firstCmd) {
                // Move to (x0, y0) only when CMD.A comes at the
                // first position of a shape.
                // For instance, when drawing a ring, CMD.A comes
                // after CMD.M, so it's unnecessary to move to
                // (x0, y0).
                this._d.push('M', x0, y0);
            }
        }

        const x = round4(cx + rx * mathCos(startAngle + dTheta));
        const y = round4(cy + ry * mathSin(startAngle + dTheta));

        if (isNaN(x0) || isNaN(y0) || isNaN(rx) || isNaN(ry) || isNaN(psi) || isNaN(degree) || isNaN(x) || isNaN(y)) {
            return '';
        }

        // FIXME Ellipse
        this._d.push('A', round4(rx), round4(ry),
            mathRound(psi * degree), +large, +clockwise, x, y);
    }
    rect(x: number, y: number, w: number, h: number) {
        this._add('M', x, y);
        this._add('L', x + w, y);
        this._add('L', x + w, y + h);
        this._add('L', x, y + h);
        this._add('L', x, y);
    }
    closePath() {
        // Not use Z as first command
        if (this._d.length > 0) {
            this._add('Z');
        }
    }

    _add(cmd: string, a?: number, b?: number, c?: number, d?: number, e?: number, f?: number, g?: number, h?: number) {
        this._d.push(cmd);
        for (let i = 1; i < arguments.length; i++) {
            const val = arguments[i];
            if (isNaN(val)) {
                this._invalid = true;
                return;
            }
            this._d.push(round4(val));
        }
    }

    generateStr() {
        this._str = this._invalid ? '' : this._d.join(' ');
        this._d = [];
    }
    getStr() {
        return this._str;
    }
}

interface PathWithSVGBuildPath extends Path {
    __svgPathVersion: number
    __svgPathBuilder: SVGPathRebuilder
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

        if (el.shapeChanged()) {
            path.beginPath();
            el.buildPath(path, el.shape);
            el.pathUpdated();
        }

        const pathVersion = path.getVersion();
        const elExt = el as PathWithSVGBuildPath;
        let svgPathBuilder = elExt.__svgPathBuilder;
        if (elExt.__svgPathVersion !== pathVersion || !svgPathBuilder || el.style.strokePercent < 1) {
            if (!svgPathBuilder) {
                svgPathBuilder = elExt.__svgPathBuilder = new SVGPathRebuilder();
            }
            svgPathBuilder.reset();
            path.rebuildPath(svgPathBuilder, el.style.strokePercent);
            svgPathBuilder.generateStr();
            elExt.__svgPathVersion = pathVersion;
        }

        attr(svgEl, 'd', svgPathBuilder.getStr());

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
            image = image.src;
        }
        // heatmap layer in geo may be a canvas
        else if (image instanceof HTMLCanvasElement) {
            image = image.toDataURL();
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

        bindStyle(svgEl, style, el);
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
        if (!text || isNaN(style.x) || isNaN(style.y)) {
            return;
        }

        let textSvgEl = el.__svgEl as SVGTextElement;
        if (!textSvgEl) {
            textSvgEl = createElement('text') as SVGTextElement;
            attrXML(textSvgEl, 'xml:space', 'preserve');
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

        attr(textSvgEl, 'dominant-baseline', 'central');
        attr(textSvgEl, 'text-anchor', textAlign);
        attr(textSvgEl, 'x', x + '');
        attr(textSvgEl, 'y', y + '');
    }
};
export {svgText as text};
