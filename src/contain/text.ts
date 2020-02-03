import BoundingRect, { RectLike } from '../core/BoundingRect';
import * as imageHelper from '../graphic/helper/image';
import {
    getContext,
    extend,
    retrieve2,
    retrieve3,
    trim
} from '../core/util';
import { Dictionary, PropType, TextAlign, TextVerticalAlign, ImageLike } from '../core/types';

let textWidthCache: Dictionary<number> = {};
let textWidthCacheCounter = 0;


export const DEFAULT_FONT = '12px sans-serif';

const TEXT_CACHE_MAX = 5000;
const STYLE_REG = /\{([a-zA-Z0-9_]+)\|([^}]*)\}/g;


let methods: {
    measureText: (text: string, font?: string) => { width: number }
} = {
    measureText: function (text: string, font?: string): { width: number } {
        const ctx = getContext();
        ctx.font = font || DEFAULT_FONT;
        return ctx.measureText(text);
    }
};

interface TextBoundingRect extends BoundingRect {
    lineHeight: number
}

export function $override(
    name: keyof typeof methods,
    fn: PropType<typeof methods, keyof typeof methods>
) {
    methods[name] = fn;
}

export function getWidth(text: string, font: string): number {
    font = font || DEFAULT_FONT;
    const key = text + ':' + font;
    if (textWidthCache[key]) {
        return textWidthCache[key];
    }

    const textLines = (text + '').split('\n');
    let width = 0;

    for (let i = 0, l = textLines.length; i < l; i++) {
        // textContain.measureText may be overrided in SVG or VML
        width = Math.max(measureText(textLines[i], font).width, width);
    }

    if (textWidthCacheCounter > TEXT_CACHE_MAX) {
        textWidthCacheCounter = 0;
        textWidthCache = {};
    }
    textWidthCacheCounter++;
    textWidthCache[key] = width;

    return width;
}

export function getBoundingRect(
    text: string,
    font: string,
    textAlign: CanvasTextAlign,
    textBaseline: CanvasTextBaseline
): BoundingRect {
    const width = getWidth(text, font);
    const height = getLineHeight(font);

    const x = adjustTextX(0, width, textAlign);
    const y = adjustTextY(0, height, textBaseline);

    const rect = new BoundingRect(x, y, outerWidth, outerHeight);

    return rect;
}

export function adjustTextX(x: number, width: number, textAlign: CanvasTextAlign): number {
    // FIXME Right to left language
    if (textAlign === 'right') {
        x -= width;
    }
    else if (textAlign === 'center') {
        x -= width / 2;
    }
    return x;
}

export function adjustTextY(y: number, height: number, textVerticalAlign: CanvasTextBaseline): number {
    if (textVerticalAlign === 'middle') {
        y -= height / 2;
    }
    else if (textVerticalAlign === 'bottom') {
        y -= height;
    }
    return y;
}


export function getLineHeight(font?: string): number {
    // FIXME A rough approach.
    return getWidth('国', font);
}

export function measureText(text: string, font?: string): {
    width: number
} {
    return methods.measureText(text, font);
}
