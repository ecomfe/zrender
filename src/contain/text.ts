import BoundingRect, { RectLike } from '../core/BoundingRect';
import { createCanvas } from '../core/util';
import { Dictionary, PropType, TextAlign, TextVerticalAlign, BuiltinTextPosition } from '../core/types';

let textWidthCache: Dictionary<number> = {};
let textWidthCacheCounter = 0;

export const DEFAULT_FONT = '12px sans-serif';

const TEXT_CACHE_MAX = 5000;

let _ctx: CanvasRenderingContext2D;
let _cachedFont: string

function defaultMeasureText(text: string, font?: string): { width: number } {
    if (!_ctx) {
        _ctx = createCanvas().getContext('2d');
    }
    if (_cachedFont !== font) {
        _cachedFont = _ctx.font = font || DEFAULT_FONT;
    }
    return _ctx.measureText(text);
}

let methods: {
    measureText: (text: string, font?: string) => { width: number }
} = {
    measureText: defaultMeasureText
};

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
    // TODO Right to left language
    if (textAlign === 'right') {
        x -= width;
    }
    else if (textAlign === 'center') {
        x -= width / 2;
    }
    return x;
}

export function adjustTextY(y: number, height: number, textBaseline: CanvasTextBaseline): number {
    if (textBaseline === 'middle') {
        y -= height / 2;
    }
    else if (textBaseline === 'bottom') {
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


function parsePercent(value: number | string, maxValue: number): number{
    if (typeof value === 'string') {
        if (value.lastIndexOf('%') >= 0) {
            return parseFloat(value) / 100 * maxValue;
        }
        return parseFloat(value);
    }
    return value;
}

export interface TextPositionCalculationResult {
    x: number
    y: number
    textAlign: TextAlign
    textVerticalAlign: TextVerticalAlign
}
/**
 * Follow same interface to `Displayable.prototype.calculateTextPosition`.
 * @public
 * @param out Prepared out object. If not input, auto created in the method.
 * @param style where `textPosition` and `textDistance` are visited.
 * @param rect {x, y, width, height} Rect of the host elment, according to which the text positioned.
 * @return The input `out`. Set: {x, y, textAlign, textVerticalAlign}
 */
export function calculateTextPosition(
    out: TextPositionCalculationResult,
    opts: {
        position?: BuiltinTextPosition | number[] | string[]
        distance?: number
        global?: boolean
    },
    rect: RectLike
): TextPositionCalculationResult {
    const textPosition = opts.position || 'inside';
    const distance = opts.distance || 0;

    const height = rect.height;
    const width = rect.width;
    const halfHeight = height / 2;

    let x = rect.x;
    let y = rect.y;

    let textAlign: TextAlign= 'left';
    let textVerticalAlign: TextVerticalAlign = 'top';

    if (textPosition instanceof Array) {
        x += parsePercent(textPosition[0], rect.width);
        y += parsePercent(textPosition[1], rect.height);
        // Not use textAlign / textVerticalAlign
        textAlign = null;
        textVerticalAlign = null;
    }
    else {
        switch (textPosition) {
            case 'left':
                x -= distance;
                y += halfHeight;
                textAlign = 'right';
                textVerticalAlign = 'middle';
                break;
            case 'right':
                x += distance + width;
                y += halfHeight;
                textVerticalAlign = 'middle';
                break;
            case 'top':
                x += width / 2;
                y -= distance;
                textAlign = 'center';
                textVerticalAlign = 'bottom';
                break;
            case 'bottom':
                x += width / 2;
                y += height + distance;
                textAlign = 'center';
                break;
            case 'inside':
                x += width / 2;
                y += halfHeight;
                textAlign = 'center';
                textVerticalAlign = 'middle';
                break;
            case 'insideLeft':
                x += distance;
                y += halfHeight;
                textVerticalAlign = 'middle';
                break;
            case 'insideRight':
                x += width - distance;
                y += halfHeight;
                textAlign = 'right';
                textVerticalAlign = 'middle';
                break;
            case 'insideTop':
                x += width / 2;
                y += distance;
                textAlign = 'center';
                break;
            case 'insideBottom':
                x += width / 2;
                y += height - distance;
                textAlign = 'center';
                textVerticalAlign = 'bottom';
                break;
            case 'insideTopLeft':
                x += distance;
                y += distance;
                break;
            case 'insideTopRight':
                x += width - distance;
                y += distance;
                textAlign = 'right';
                break;
            case 'insideBottomLeft':
                x += distance;
                y += height - distance;
                textVerticalAlign = 'bottom';
                break;
            case 'insideBottomRight':
                x += width - distance;
                y += height - distance;
                textAlign = 'right';
                textVerticalAlign = 'bottom';
                break;
        }
    }

    out = out || {} as TextPositionCalculationResult;
    out.x = x;
    out.y = y;
    out.textAlign = textAlign;
    out.textVerticalAlign = textVerticalAlign;

    return out;
}