import BoundingRect, { RectLike } from '../core/BoundingRect';
import { Dictionary, TextAlign, TextVerticalAlign, BuiltinTextPosition } from '../core/types';
import LRU from '../core/LRU';
import { DEFAULT_FONT, DEFAULT_FONT_SIZE, platformApi, resolveFontSize } from '../core/platform';

/**
 * @deprecated But keep for possible outside usage.
 *  Use `ensureFontMeasureInfo` + `measureWidth` instead.
 */
export function getWidth(text: string, font: string): number {
    return measureWidth(ensureFontMeasureInfo(font), text);
}

export interface FontMeasureInfo {
    font: string;
    strWidthCache: LRU<number>;
    // Key: char code, index: 0~127 (include 127). Filled when a char is first used.
    asciiWidthMap: number[] | null | undefined;
    // Always `true`.
    asciiWidthMapTried: boolean;
    // Key: `charCode >> BMP_BLOCK_BITS`, then `charCode & BMP_BLOCK_MASK`, for chars up to U+FFFF.
    // Faster than a dictionary.
    bmpWidthMap: number[][];
    // Key: code point, for chars above U+FFFF.
    nonBMPWidthMap: Dictionary<number>;
    // 1em, i.e., the font size. The default line height.
    stWideCharWidth: number;
    // @deprecated Always `null`. Use `measureCharWidth(fontMeasureInfo, 'a'.charCodeAt(0))`.
    asciiCharWidth: number;
}

export function ensureFontMeasureInfo(font: string): FontMeasureInfo {
    if (!_fontMeasureInfoCache) {
        _fontMeasureInfoCache = new LRU(100);
    }
    font = font || DEFAULT_FONT;
    let measureInfo = _fontMeasureInfoCache.get(font);
    if (!measureInfo) {
        measureInfo = {
            font: font,
            strWidthCache: new LRU(500),
            asciiWidthMap: [],
            asciiWidthMapTried: true,
            bmpWidthMap: [],
            nonBMPWidthMap: {},
            stWideCharWidth: resolveEm(font),
            asciiCharWidth: null
        };
        _fontMeasureInfoCache.put(font, measureInfo);
    }
    return measureInfo;
}
let _fontMeasureInfoCache: LRU<FontMeasureInfo>;

// 1in is 96px in CSS.
const PX_PER_INCH = 96;
// The number of each CSS absolute length unit in 1in.
const UNITS_PER_INCH: Dictionary<number> = {
    pt: 72,
    pc: 6,
    'in': 1,
    cm: 2.54,
    mm: 25.4,
    q: 101.6
};
// In a CSS font shorthand, the first number with a unit is the font size, unless it is the angle of `oblique`.
const FONT_SIZE_REG = /(?:^|\s)(\d*\.?\d+(?:e[+-]?\d+)?)(?!deg|grad|rad|turn)([a-z]+|%)(?=[\s/]|$)/i;

/**
 * The font size in px, i.e., 1em. A relative size or a keyword is resolved by the platform.
 */
function resolveEm(font: string) {
    const match = FONT_SIZE_REG.exec(font);
    if (match !== null) {
        const size = +match[1];
        const unit = match[2].toLowerCase();
        if (size === 0 || unit === 'px') {
            return size;
        }
        if (UNITS_PER_INCH.hasOwnProperty(unit)) {
            return size * PX_PER_INCH / UNITS_PER_INCH[unit];
        }
    }
    const size = resolveFontSize(font);
    return size != null ? size : DEFAULT_FONT_SIZE;
}

const MAX_ASCII_CODE = 127;
const MAX_BMP_CODE = 0xFFFF;
// A char above U+FFFF is a high and a low surrogate in UTF-16, which take 10 bits of it each.
const HIGH_SURROGATE_START = 0xD800;
const LOW_SURROGATE_START = 0xDC00;
const SURROGATE_BITS = 10;
const SURROGATE_MASK = (1 << SURROGATE_BITS) - 1;
// The chars up to U+FFFF are cached in blocks of 64.
const BMP_BLOCK_BITS = 6;
const BMP_BLOCK_MASK = 63;

/**
 * Hot path, performance sensitive.
 * The width of a char measured alone, cached per font.
 * NOTICE: It is not text shaping, so the sum of the widths can differ from the width of the text.
 * @param charCode A code point. A surrogate pair is one char.
 */
export function measureCharWidth(fontMeasureInfo: FontMeasureInfo, charCode: number): number {
    // A width of 0 is cached as well, so compare with null.
    if (charCode <= MAX_ASCII_CODE) {
        const width = fontMeasureInfo.asciiWidthMap[charCode];
        return width != null ? width : measureNewCharWidth(fontMeasureInfo, charCode);
    }
    if (charCode <= MAX_BMP_CODE) {
        const block = fontMeasureInfo.bmpWidthMap[charCode >> BMP_BLOCK_BITS];
        const width = block && block[charCode & BMP_BLOCK_MASK];
        return width != null ? width : measureNewCharWidth(fontMeasureInfo, charCode);
    }
    const width = fontMeasureInfo.nonBMPWidthMap[charCode];
    return width != null ? width : measureNewCharWidth(fontMeasureInfo, charCode);
}

function measureNewCharWidth(fontMeasureInfo: FontMeasureInfo, charCode: number) {
    const width = platformApi.measureText(charFromCode(charCode), fontMeasureInfo.font).width;
    if (charCode <= MAX_ASCII_CODE) {
        fontMeasureInfo.asciiWidthMap[charCode] = width;
        return width;
    }
    if (charCode <= MAX_BMP_CODE) {
        const blocks = fontMeasureInfo.bmpWidthMap;
        const blockIndex = charCode >> BMP_BLOCK_BITS;
        (blocks[blockIndex] || (blocks[blockIndex] = []))[charCode & BMP_BLOCK_MASK] = width;
        return width;
    }
    fontMeasureInfo.nonBMPWidthMap[charCode] = width;
    return width;
}

// `String.fromCodePoint` is not in ES5.
function charFromCode(charCode: number) {
    if (charCode <= MAX_BMP_CODE) {
        return String.fromCharCode(charCode);
    }
    const offset = charCode - MAX_BMP_CODE - 1;
    return String.fromCharCode(
        HIGH_SURROGATE_START + (offset >> SURROGATE_BITS),
        LOW_SURROGATE_START + (offset & SURROGATE_MASK)
    );
}

export function measureWidth(fontMeasureInfo: FontMeasureInfo, text: string): number {
    const strWidthCache = fontMeasureInfo.strWidthCache;
    let width = strWidthCache.get(text);
    if (width == null) {
        width = platformApi.measureText(text, fontMeasureInfo.font).width;
        strWidthCache.put(text, width);
    }
    return width;
}


/**
 * @deprecated See `getBoundingRect`.
 * Get bounding rect for inner usage(TSpan)
 * Which not include text newline.
 */
export function innerGetBoundingRect(
    text: string,
    font: string,
    textAlign?: TextAlign,
    textBaseline?: TextVerticalAlign
): BoundingRect {
    const width = measureWidth(ensureFontMeasureInfo(font), text);
    const height = getLineHeight(font);

    const x = adjustTextX(0, width, textAlign);
    const y = adjustTextY(0, height, textBaseline);

    const rect = new BoundingRect(x, y, width, height);

    return rect;
}

/**
 * @deprecated Use `(new Text(...)).getBoundingRect()` or `(new TSpan(...)).getBoundingRect()` instead.
 *  This method behaves differently from `Text#getBoundingRect()` - e.g., it does not support the overflow
 *  strategy, and only has single line height even if multiple lines.
 *
 * Get bounding rect for outer usage. Compatitable with old implementation
 * Which includes text newline.
 */
export function getBoundingRect(
    text: string,
    font: string,
    textAlign?: TextAlign,
    textBaseline?: TextVerticalAlign
) {
    const textLines = ((text || '') + '').split('\n');
    const len = textLines.length;
    if (len === 1) {
        return innerGetBoundingRect(textLines[0], font, textAlign, textBaseline);
    }
    else {
        const uniondRect = new BoundingRect(0, 0, 0, 0);
        for (let i = 0; i < textLines.length; i++) {
            const rect = innerGetBoundingRect(textLines[i], font, textAlign, textBaseline);
            i === 0 ? uniondRect.copy(rect) : uniondRect.union(rect);
        }
        return uniondRect;
    }
}

export function adjustTextX(x: number, width: number, textAlign: TextAlign, inverse?: boolean): number {
    // TODO Right to left language
    if (textAlign === 'right') {
        !inverse ? (x -= width) : (x += width);
    }
    else if (textAlign === 'center') {
        !inverse ? (x -= width / 2) : (x += width / 2);
    }
    return x;
}

export function adjustTextY(y: number, height: number, verticalAlign: TextVerticalAlign, inverse?: boolean): number {
    if (verticalAlign === 'middle') {
        !inverse ? (y -= height / 2) : (y += height / 2);
    }
    else if (verticalAlign === 'bottom') {
        !inverse ? (y -= height) : (y += height);
    }
    return y;
}

export function getLineHeight(font?: string): number {
    // FIXME A rough approach.
    return ensureFontMeasureInfo(font).stWideCharWidth;
}

export function measureText(text: string, font?: string): {
    width: number
} {
    return platformApi.measureText(text, font);
}


export function parsePercent(value: number | string, maxValue: number): number {
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
    align: TextAlign
    verticalAlign: TextVerticalAlign
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
        position?: BuiltinTextPosition | (number | string)[]
        distance?: number   // Default 5
        global?: boolean
    },
    rect: RectLike
): TextPositionCalculationResult {
    const textPosition = opts.position || 'inside';
    const distance = opts.distance != null ? opts.distance : 5;

    const height = rect.height;
    const width = rect.width;
    const halfHeight = height / 2;

    let x = rect.x;
    let y = rect.y;

    let textAlign: TextAlign = 'left';
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
    out.align = textAlign;
    out.verticalAlign = textVerticalAlign;

    return out;
}
