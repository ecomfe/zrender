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
import Style, { StyleOption } from '../graphic/Style';

let textWidthCache: Dictionary<number> = {};
let textWidthCacheCounter = 0;

const TEXT_CACHE_MAX = 5000;
const STYLE_REG = /\{([a-zA-Z0-9_]+)\|([^}]*)\}/g;

export const DEFAULT_FONT = '12px sans-serif';

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
    textAlign: TextAlign,
    textVerticalAlign: TextVerticalAlign,
    textPadding: number[],
    textLineHeight: number,
    rich: PropType<Style, 'rich'>,
    truncate: PropType<Style, 'truncate'>
) {
    return rich
        ? getRichTextRect(text, font, textAlign, textVerticalAlign, textPadding, textLineHeight, rich, truncate)
        : getPlainTextRect(text, font, textAlign, textVerticalAlign, textPadding, textLineHeight, truncate);
}

function getPlainTextRect(
    text: string,
    font: string,
    textAlign: TextAlign,
    textVerticalAlign: TextVerticalAlign,
    // TODO textPadding should be number | number[] ?
    textPadding: number[],
    textLineHeight: number,
    truncate: PropType<Style, 'truncate'>
): TextBoundingRect {
    const contentBlock = parsePlainText(text, font, textPadding, textLineHeight, truncate);
    let outerWidth = getWidth(text, font);
    if (textPadding) {
        outerWidth += textPadding[1] + textPadding[3];
    }
    const outerHeight = contentBlock.outerHeight;

    const x = adjustTextX(0, outerWidth, textAlign);
    const y = adjustTextY(0, outerHeight, textVerticalAlign);

    const rect = new BoundingRect(x, y, outerWidth, outerHeight) as TextBoundingRect;
    rect.lineHeight = contentBlock.lineHeight;

    return rect;
}

function getRichTextRect(
    text: string,
    font: string,
    textAlign: TextAlign,
    textVerticalAlign: TextVerticalAlign,
    textPadding: number[],
    textLineHeight: number,
    rich: PropType<Style, 'rich'>,
    truncate: PropType<Style, 'truncate'>
) {
    const contentBlock = parseRichText(text, {
        rich: rich,
        truncate: truncate,
        font: font,
        textAlign: textAlign,
        textPadding: textPadding,
        textLineHeight: textLineHeight
    });
    const outerWidth = contentBlock.outerWidth;
    const outerHeight = contentBlock.outerHeight;

    const x = adjustTextX(0, outerWidth, textAlign);
    const y = adjustTextY(0, outerHeight, textVerticalAlign);

    return new BoundingRect(x, y, outerWidth, outerHeight);
}

export function adjustTextX(x: number, width: number, textAlign: TextAlign): number {
    // FIXME Right to left language
    if (textAlign === 'right') {
        x -= width;
    }
    else if (textAlign === 'center') {
        x -= width / 2;
    }
    return x;
}

export function adjustTextY(y: number, height: number, textVerticalAlign: TextVerticalAlign): number {
    if (textVerticalAlign === 'middle') {
        y -= height / 2;
    }
    else if (textVerticalAlign === 'bottom') {
        y -= height;
    }
    return y;
}

class TextPositionCalculationResult {
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
    style: StyleOption,
    rect: RectLike
): TextPositionCalculationResult {
    const textPosition = style.textPosition;
    let distance = style.textDistance;

    const height = rect.height;
    const width = rect.width;
    const halfHeight = height / 2;

    let x = rect.x;
    let y = rect.y;
    distance = distance || 0;

    let textAlign: TextAlign= 'left';
    let textVerticalAlign: TextVerticalAlign = 'top';

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

    out = out || {} as TextPositionCalculationResult;
    out.x = x;
    out.y = y;
    out.textAlign = textAlign;
    out.textVerticalAlign = textVerticalAlign;

    return out;
}

/**
 * To be removed. But still do not remove in case that some one has imported it.
 * @deprecated
 */
export function adjustTextPositionOnRect(
    textPosition: string | number[],
    rect: RectLike,
    distance: number
): TextPositionCalculationResult {
    const dummyStyle = {textPosition: textPosition, textDistance: distance};
    return calculateTextPosition(
        new TextPositionCalculationResult(),
        dummyStyle,
        rect
    );
}

interface InnerTruncateOption {
    maxIteration?: number
    // If truncate result are less than minChar, ellipsis will not show
    // which is better for user hint in some cases
    minChar?: number
    // When all truncated, use the placeholder
    placeholder?: string

    maxIterations?: number

}

interface InnerPreparedTruncateOption extends Required<InnerTruncateOption> {
    font: string

    ellipsis: string
    ellipsisWidth: number
    contentWidth: number

    containerWidth: number
    cnCharWidth: number
    ascCharWidth: number
}

/**
 * Show ellipsis if overflow.
 */
export function truncateText(
    text: string,
    containerWidth: number,
    font: string,
    ellipsis: string,
    options: InnerTruncateOption
): string {
    if (!containerWidth) {
        return '';
    }

    const textLines = (text + '').split('\n');
    options = prepareTruncateOptions(containerWidth, font, ellipsis, options);

    // FIXME
    // It is not appropriate that every line has '...' when truncate multiple lines.
    for (let i = 0, len = textLines.length; i < len; i++) {
        textLines[i] = truncateSingleLine(textLines[i], options as InnerPreparedTruncateOption);
    }

    return textLines.join('\n');
}

function prepareTruncateOptions(
    containerWidth: number,
    font: string,
    ellipsis: string,
    options: InnerTruncateOption
): InnerPreparedTruncateOption {
    options = options || {};
    let preparedOpts = extend({}, options) as InnerPreparedTruncateOption;

    preparedOpts.font = font;
    ellipsis = retrieve2(ellipsis, '...');
    preparedOpts.maxIterations = retrieve2(options.maxIterations, 2);
    const minChar = preparedOpts.minChar = retrieve2(options.minChar, 0);
    // FIXME
    // Other languages?
    preparedOpts.cnCharWidth = getWidth('国', font);
    // FIXME
    // Consider proportional font?
    const ascCharWidth = preparedOpts.ascCharWidth = getWidth('a', font);
    preparedOpts.placeholder = retrieve2(options.placeholder, '');

    // Example 1: minChar: 3, text: 'asdfzxcv', truncate result: 'asdf', but not: 'a...'.
    // Example 2: minChar: 3, text: '维度', truncate result: '维', but not: '...'.
    let contentWidth = containerWidth = Math.max(0, containerWidth - 1); // Reserve some gap.
    for (let i = 0; i < minChar && contentWidth >= ascCharWidth; i++) {
        contentWidth -= ascCharWidth;
    }

    let ellipsisWidth = getWidth(ellipsis, font);
    if (ellipsisWidth > contentWidth) {
        ellipsis = '';
        ellipsisWidth = 0;
    }

    contentWidth = containerWidth - ellipsisWidth;

    preparedOpts.ellipsis = ellipsis;
    preparedOpts.ellipsisWidth = ellipsisWidth;
    preparedOpts.contentWidth = contentWidth;
    preparedOpts.containerWidth = containerWidth;

    return preparedOpts;
}

function truncateSingleLine(textLine: string, options: InnerPreparedTruncateOption): string {
    const containerWidth = options.containerWidth;
    const font = options.font;
    const contentWidth = options.contentWidth;

    if (!containerWidth) {
        return '';
    }

    let lineWidth = getWidth(textLine, font);

    if (lineWidth <= containerWidth) {
        return textLine;
    }

    for (let j = 0; ; j++) {
        if (lineWidth <= contentWidth || j >= options.maxIterations) {
            textLine += options.ellipsis;
            break;
        }

        const subLength = j === 0
            ? estimateLength(textLine, contentWidth, options.ascCharWidth, options.cnCharWidth)
            : lineWidth > 0
            ? Math.floor(textLine.length * contentWidth / lineWidth)
            : 0;

        textLine = textLine.substr(0, subLength);
        lineWidth = getWidth(textLine, font);
    }

    if (textLine === '') {
        textLine = options.placeholder;
    }

    return textLine;
}

function estimateLength(
    text: string, contentWidth: number, ascCharWidth: number, cnCharWidth: number
): number {
    let width = 0;
    let i = 0;
    for (let len = text.length; i < len && width < contentWidth; i++) {
        const charCode = text.charCodeAt(i);
        width += (0 <= charCode && charCode <= 127) ? ascCharWidth : cnCharWidth;
    }
    return i;
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

/**
 * Notice: for performance, do not calculate outerWidth util needed.
 *  `canCacheByTextString` means the result `lines` is only determined by the input `text`.
 *  Thus we can simply comparing the `input` text to determin whether the result changed,
 *  without travel the result `lines`.
 */
export interface PlainTextContentBlock {
    lineHeight: number
    height: number
    outerHeight: number
    canCacheByTextString: boolean

    lines: string[]
}

export function parsePlainText(
    text: string,
    font: string,
    padding: number[],
    textLineHeight: number,
    truncate: PropType<Style, 'truncate'>
): PlainTextContentBlock {
    text != null && (text += '');

    const lineHeight = retrieve2(textLineHeight, getLineHeight(font));
    let lines = text ? text.split('\n') : [];
    let height = lines.length * lineHeight;
    let outerHeight = height;
    let canCacheByTextString = true;

    if (padding) {
        outerHeight += padding[0] + padding[2];
    }

    if (text && truncate) {
        canCacheByTextString = false;
        const truncOuterHeight = truncate.outerHeight;
        const truncOuterWidth = truncate.outerWidth;
        if (truncOuterHeight != null && outerHeight > truncOuterHeight) {
            text = '';
            lines = [];
        }
        else if (truncOuterWidth != null) {
            const options = prepareTruncateOptions(
                truncOuterWidth - (padding ? padding[1] + padding[3] : 0),
                font,
                truncate.ellipsis,
                {
                    minChar: truncate.minChar,
                    placeholder: truncate.placeholder
                }
            );

            // FIXME
            // It is not appropriate that every line has '...' when truncate multiple lines.
            for (let i = 0, len = lines.length; i < len; i++) {
                lines[i] = truncateSingleLine(lines[i], options);
            }
        }
    }

    return {
        lines: lines,
        height: height,
        outerHeight: outerHeight,
        lineHeight: lineHeight,
        canCacheByTextString: canCacheByTextString
    };
}

class RichTextToken {
    styleName: string
    text: string
    width: number
    height: number
    textWidth: number | string
    textHeight: number
    lineHeight: number
    font: string
    textAlign: TextAlign
    textVerticalAlign: TextVerticalAlign

    textPadding: number[]
    percentWidth?: string

    isLineHolder: boolean
}
class RichTextLine {
    lineHeight: number
    width: number
    tokens: RichTextToken[] = []

    constructor(tokens?: RichTextToken[]) {
        if (tokens) {
            this.tokens = tokens;
        }
    }
}
export class RichTextContentBlock {
    // width/height of content
    width: number = 0
    height: number = 0
    // outerWidth/outerHeight with padding
    outerWidth: number = 0
    outerHeight: number = 0
    lines: RichTextLine[] = []
}
/**
 * For example: 'some text {a|some text}other text{b|some text}xxx{c|}xxx'
 * Also consider 'bbbb{a|xxx\nzzz}xxxx\naaaa'.
 * If styleName is undefined, it is plain text.
 */
export function parseRichText(text: string, style: StyleOption) {
    const contentBlock = new RichTextContentBlock();

    text != null && (text += '');
    if (!text) {
        return contentBlock;
    }

    let lastIndex = STYLE_REG.lastIndex = 0;
    let result;
    while ((result = STYLE_REG.exec(text)) != null) {
        const matchedIndex = result.index;
        if (matchedIndex > lastIndex) {
            pushTokens(contentBlock, text.substring(lastIndex, matchedIndex));
        }
        pushTokens(contentBlock, result[2], result[1]);
        lastIndex = STYLE_REG.lastIndex;
    }

    if (lastIndex < text.length) {
        pushTokens(contentBlock, text.substring(lastIndex, text.length));
    }

    const lines = contentBlock.lines;
    let contentHeight = 0;
    let contentWidth = 0;
    // For `textWidth: 100%`
    let pendingList = [];

    const stlPadding = style.textPadding as number[];

    const truncate = style.truncate;
    let truncateWidth = truncate && truncate.outerWidth;
    let truncateHeight = truncate && truncate.outerHeight;
    if (stlPadding) {
        truncateWidth != null && (truncateWidth -= stlPadding[1] + stlPadding[3]);
        truncateHeight != null && (truncateHeight -= stlPadding[0] + stlPadding[2]);
    }

    // Calculate layout info of tokens.
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let lineHeight = 0;
        let lineWidth = 0;

        for (let j = 0; j < line.tokens.length; j++) {
            const token = line.tokens[j];
            const tokenStyle = token.styleName && style.rich[token.styleName] || {};
            // textPadding should not inherit from style.
            const textPadding = token.textPadding = tokenStyle.textPadding as number[];

            // textFont has been asigned to font by `normalizeStyle`.
            const font = token.font = tokenStyle.font || style.font;

            // textHeight can be used when textVerticalAlign is specified in token.
            let tokenHeight = token.textHeight = retrieve2(
                // textHeight should not be inherited, consider it can be specified
                // as box height of the block.
                tokenStyle.textHeight, getLineHeight(font)
            ) ;
            textPadding && (tokenHeight += textPadding[0] + textPadding[2]);
            token.height = tokenHeight;
            token.lineHeight = retrieve3(
                tokenStyle.textLineHeight, style.textLineHeight, tokenHeight
            );

            token.textAlign = tokenStyle && tokenStyle.textAlign || style.textAlign;
            token.textVerticalAlign = tokenStyle && tokenStyle.textVerticalAlign || 'middle';

            if (truncateHeight != null && contentHeight + token.lineHeight > truncateHeight) {
                return new RichTextContentBlock();
            }

            token.textWidth = getWidth(token.text, font);
            let tokenWidth = tokenStyle.textWidth;
            let tokenWidthNotSpecified = tokenWidth == null || tokenWidth === 'auto';

            // Percent width, can be `100%`, can be used in drawing separate
            // line when box width is needed to be auto.
            if (typeof tokenWidth === 'string' && tokenWidth.charAt(tokenWidth.length - 1) === '%') {
                token.percentWidth = tokenWidth;
                pendingList.push(token);
                tokenWidth = 0;
                // Do not truncate in this case, because there is no user case
                // and it is too complicated.
            }
            else {
                if (tokenWidthNotSpecified) {
                    tokenWidth = token.textWidth;

                    // FIXME: If image is not loaded and textWidth is not specified, calling
                    // `getBoundingRect()` will not get correct result.
                    const textBackgroundColor = tokenStyle.textBackgroundColor;
                    let bgImg = textBackgroundColor && (textBackgroundColor as { image: ImageLike }).image;

                    // Use cases:
                    // (1) If image is not loaded, it will be loaded at render phase and call
                    // `dirty()` and `textBackgroundColor.image` will be replaced with the loaded
                    // image, and then the right size will be calculated here at the next tick.
                    // See `graphic/helper/text.js`.
                    // (2) If image loaded, and `textBackgroundColor.image` is image src string,
                    // use `imageHelper.findExistImage` to find cached image.
                    // `imageHelper.findExistImage` will always be called here before
                    // `imageHelper.createOrUpdateImage` in `graphic/helper/text.js#renderRichText`
                    // which ensures that image will not be rendered before correct size calcualted.
                    if (bgImg) {
                        bgImg = imageHelper.findExistImage(bgImg);
                        if (imageHelper.isImageReady(bgImg)) {
                            tokenWidth = Math.max(tokenWidth, bgImg.width * tokenHeight / bgImg.height);
                        }
                    }
                }

                const paddingW = textPadding ? textPadding[1] + textPadding[3] : 0;
                (tokenWidth as number) += paddingW;

                const remianTruncWidth = truncateWidth != null ? truncateWidth - lineWidth : null;

                if (remianTruncWidth != null && remianTruncWidth < tokenWidth) {
                    if (!tokenWidthNotSpecified || remianTruncWidth < paddingW) {
                        token.text = '';
                        token.textWidth = tokenWidth = 0;
                    }
                    else {
                        token.text = truncateText(
                            token.text, remianTruncWidth - paddingW, font, truncate.ellipsis,
                            {minChar: truncate.minChar}
                        );
                        token.textWidth = getWidth(token.text, font);
                        tokenWidth = token.textWidth + paddingW;
                    }
                }
            }

            lineWidth += (token.width = tokenWidth as number);
            tokenStyle && (lineHeight = Math.max(lineHeight, token.lineHeight));
        }

        line.width = lineWidth;
        line.lineHeight = lineHeight;
        contentHeight += lineHeight;
        contentWidth = Math.max(contentWidth, lineWidth);
    }

    contentBlock.outerWidth = contentBlock.width = retrieve2(style.textWidth as number, contentWidth);
    contentBlock.outerHeight = contentBlock.height = retrieve2(style.textHeight as number, contentHeight);

    if (stlPadding) {
        contentBlock.outerWidth += stlPadding[1] + stlPadding[3];
        contentBlock.outerHeight += stlPadding[0] + stlPadding[2];
    }

    for (let i = 0; i < pendingList.length; i++) {
        const token = pendingList[i];
        const percentWidth = token.percentWidth;
        // Should not base on outerWidth, because token can not be placed out of padding.
        token.width = parseInt(percentWidth, 10) / 100 * contentWidth;
    }

    return contentBlock;
}

function pushTokens(block: RichTextContentBlock, str: string, styleName?: string) {
    const isEmptyStr = str === '';
    const strs = str.split('\n');
    const lines = block.lines;

    for (let i = 0; i < strs.length; i++) {
        const text = strs[i];
        const token = new RichTextToken()
        token.styleName = styleName;
        token.text = text;
        token.isLineHolder = !text && !isEmptyStr

        // The first token should be appended to the last line.
        if (!i) {
            const tokens = (lines[lines.length - 1] || (lines[0] = new RichTextLine())).tokens;

            // Consider cases:
            // (1) ''.split('\n') => ['', '\n', ''], the '' at the first item
            // (which is a placeholder) should be replaced by new token.
            // (2) A image backage, where token likes {a|}.
            // (3) A redundant '' will affect textAlign in line.
            // (4) tokens with the same tplName should not be merged, because
            // they should be displayed in different box (with border and padding).
            const tokensLen = tokens.length;
            (tokensLen === 1 && tokens[0].isLineHolder)
                ? (tokens[0] = token)
                // Consider text is '', only insert when it is the "lineHolder" or
                // "emptyStr". Otherwise a redundant '' will affect textAlign in line.
                : ((text || !tokensLen || isEmptyStr) && tokens.push(token));
        }
        // Other tokens always start a new line.
        else {
            // If there is '', insert it as a placeholder.
            lines.push(new RichTextLine([token]))
        }
    }
}

export function makeFont(style: StyleOption): string {
    // FIXME in node-canvas fontWeight is before fontStyle
    // Use `fontSize` `fontFamily` to check whether font properties are defined.
    const font = (style.fontSize || style.fontFamily) && [
        style.fontStyle,
        style.fontWeight,
        (style.fontSize || 12) + 'px',
        // If font properties are defined, `fontFamily` should not be ignored.
        style.fontFamily || 'sans-serif'
    ].join(' ');
    return font && trim(font) || style.textFont || style.font;
}
