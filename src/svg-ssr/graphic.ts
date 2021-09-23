// TODO
// 1. shadow
// 2. Image: sx, sy, sw, sh

import {getMatrixStr} from '../svg/core';
import Path, { PathStyleProps } from '../graphic/Path';
import ZRImage, { ImageStyleProps } from '../graphic/Image';
import { DEFAULT_FONT, getLineHeight } from '../contain/text';
import TSpan, { TSpanStyleProps } from '../graphic/TSpan';
import SVGPathRebuilder from '../svg/SVGPathRebuilder';
import mapStyleToAttrs from '../svg/mapStyleToAttrs';
import { createElementClose, createElementOpen } from './helper';
import { MatrixArray } from '../core/matrix';

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
    }, style, el);
}

function setTransform(attrs: Attrs, m: MatrixArray) {
    if (m) {
        attrs.push(['transform', getMatrixStr(m)]);
    }
}


const svgPath: SVGProxy<Path> = {
    brush(el: Path) {
        const style = el.style;
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

        const attrs: Attrs = [['d', svgPathBuilder.getStr()]];
        setTransform(attrs, el.transform);
        setStyleAttrs(attrs, style, el);

        return [
            createElementOpen('path', attrs),
            createElementClose('path')
        ].join('\n');
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
            ['height', dh + ''],
            ['x', x + ''],
            ['y', y + '']
        ];

        setTransform(attrs, el.transform);
        setStyleAttrs(attrs, style, el);

        return [
            createElementOpen('image', attrs),
            createElementClose('image')
        ].join('\n');
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
            ['xml:space', 'preserve'],
            ['style', `font: ${font}`],
            ['dominant-baseline', 'central'],
            ['text-anchor', textAlign],
            ['x', x + ''],
            ['y', y + '']
        ];
        setTransform(attrs, el.transform);
        setStyleAttrs(attrs, style, el);

        return [
            createElementOpen('image', attrs),
            text,
            createElementClose('image')
        ].join('\n');
    }
};
export {svgText as text};
