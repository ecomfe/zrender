import * as imageHelper from '../helper/image';
import {
    extend,
    retrieve2,
    retrieve3,
    reduce
} from '../../core/util';
import { TextAlign, TextVerticalAlign, ImageLike, Dictionary, PropType } from '../../core/types';
import { RichTextStyleOption } from '../RichText';
import { getLineHeight, getWidth, DEFAULT_FONT } from '../../contain/text';

const STYLE_REG = /\{([a-zA-Z0-9_]+)\|([^}]*)\}/g;

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

export interface PlainTextContentBlock {
    lineHeight: number
    height: number
    outerHeight: number

    width: number

    lines: string[]
}

export function parsePlainText(
    text: string,
    style?: RichTextStyleOption
): PlainTextContentBlock {
    text != null && (text += '');

    // textPadding has been normalized
    const padding = style.textPadding as number[];
    const font = style.font;
    const truncate = style.overflow === 'truncate';
    const lineHeight = retrieve2(style.textLineHeight, getLineHeight(font));

    let width = style.textWidth;
    let lines: string[];

    if (width != null && style.overflow === 'wrap') {
        lines = wrapText(text, style.font, width, 0).lines;
    }
    else {
        lines = text ? text.split('\n') : [];
    }

    const height = retrieve2(style.textHeight, lines.length * lineHeight);

    let outerHeight = height;
    let outerWidth = width;
    if (padding) {
        outerHeight += padding[0] + padding[2];
        if (outerWidth != null) {
            outerWidth += padding[1] + padding[3];
        }
    }

    if (text && truncate) {
        if (outerHeight != null && outerHeight > outerHeight) {
            text = '';
            lines = [];
        }
        else if (outerWidth != null) {
            const options = prepareTruncateOptions(
                width,
                font,
                style.ellipsis,
                {
                    minChar: style.truncateMinChar,
                    placeholder: style.placeholder
                }
            );

            // FIXME
            // It is not appropriate that every line has '...' when truncate multiple lines.
            for (let i = 0; i < lines.length; i++) {
                lines[i] = truncateSingleLine(lines[i], options);
            }
        }
    }

    if (width == null) {
        let maxWidth = 0;
        // Calculate width
        for (let i = 0; i < lines.length; i++) {
            maxWidth = Math.max(getWidth(lines[i], font), maxWidth);
        }
        width = maxWidth
    }

    return {
        lines: lines,
        height: height,
        outerHeight: outerHeight,
        lineHeight: lineHeight,
        width: width
    };
}

class RichTextToken {
    styleName: string
    text: string
    width: number
    height: number
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

type WrapInfo = {
    width: number,
    accumWidth: number
}
/**
 * For example: 'some text {a|some text}other text{b|some text}xxx{c|}xxx'
 * Also consider 'bbbb{a|xxx\nzzz}xxxx\naaaa'.
 * If styleName is undefined, it is plain text.
 */
export function parseRichText(text: string, style: RichTextStyleOption) {
    const contentBlock = new RichTextContentBlock();

    text != null && (text += '');
    if (!text) {
        return contentBlock;
    }

    const topWidth = style.textWidth;
    const topHeight = style.textHeight;
    let wrapInfo: WrapInfo = style.overflow === 'wrap' && topWidth != null
        ? {width: topWidth, accumWidth: 0}
        : null;

    let lastIndex = STYLE_REG.lastIndex = 0;
    let result;
    while ((result = STYLE_REG.exec(text)) != null) {
        const matchedIndex = result.index;
        if (matchedIndex > lastIndex) {
            pushTokens(contentBlock, text.substring(lastIndex, matchedIndex), style, wrapInfo);
        }
        pushTokens(contentBlock, result[2], style, wrapInfo, result[1]);
        lastIndex = STYLE_REG.lastIndex;
    }

    if (lastIndex < text.length) {
        pushTokens(contentBlock, text.substring(lastIndex, text.length), style, wrapInfo);
    }

    let contentHeight = topHeight == null ? 0 : topHeight;
    let contentWidth = topWidth == null ? 0 : topWidth;
    // For `textWidth: xx%`
    let pendingList = [];

    const stlPadding = style.textPadding as number[];

    const truncate = style.overflow === 'truncate';
    const truncateLine = style.lineOverflow === 'truncate';

    // Calculate layout info of tokens.
    for (let i = 0; i < contentBlock.lines.length; i++) {
        const line = contentBlock.lines[i];
        let lineHeight = 0;
        let lineWidth = 0;

        for (let j = 0; j < line.tokens.length; j++) {
            const token = line.tokens[j];
            const tokenStyle = token.styleName && style.rich[token.styleName] || {};
            // textPadding should not inherit from style.
            const textPadding = token.textPadding = tokenStyle.textPadding as number[];
            const paddingH = textPadding ? textPadding[1] + textPadding[3] : 0;

            const font = token.font = tokenStyle.font || style.font;

            // textHeight can be used when textVerticalAlign is specified in token.
            let tokenHeight = retrieve2(
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

            if (truncateLine && topHeight != null && contentHeight + token.lineHeight > topHeight) {
                // TODO Add ellipsis
                return contentBlock;
            }

            let styleTokenWidth = tokenStyle.textWidth;
            let tokenWidthNotSpecified = styleTokenWidth == null || styleTokenWidth === 'auto';

            // Percent width, can be `100%`, can be used in drawing separate
            // line when box width is needed to be auto.
            if (typeof styleTokenWidth === 'string' && styleTokenWidth.charAt(styleTokenWidth.length - 1) === '%') {
                token.percentWidth = styleTokenWidth;
                pendingList.push(token);

                // Do not truncate in this case, because there is no user case
                // and it is too complicated.
            }
            else {
                if (tokenWidthNotSpecified) {
                    // FIXME: If image is not loaded and textWidth is not specified, calling
                    // `getBoundingRect()` will not get correct result.
                    const textBackgroundColor = tokenStyle.textBackgroundColor;
                    let bgImg = textBackgroundColor && (textBackgroundColor as { image: ImageLike }).image;

                    if (bgImg) {
                        bgImg = imageHelper.findExistImage(bgImg);
                        if (imageHelper.isImageReady(bgImg)) {
                            // Update token width from image size.
                            token.width = Math.max(token.width, bgImg.width * tokenHeight / bgImg.height);
                        }
                    }
                }

                const remainTruncWidth = truncate && topWidth != null
                    ? topWidth - lineWidth : null;

                if (remainTruncWidth != null && remainTruncWidth < token.width) {
                    if (!tokenWidthNotSpecified || remainTruncWidth < paddingH) {
                        token.text = '';
                        token.width = 0;
                    }
                    else {
                        token.text = truncateText(
                            token.text, remainTruncWidth - paddingH, font, style.ellipsis,
                            {minChar: style.truncateMinChar}
                        );
                        token.width = getWidth(token.text, font);
                    }
                }
            }

            lineWidth += token.width + paddingH;
            tokenStyle && (lineHeight = Math.max(lineHeight, token.lineHeight));
        }

        line.width = lineWidth;
        line.lineHeight = lineHeight;
        if (topHeight == null) {
            contentHeight += lineHeight;
        }
        if (topWidth == null) {
            // Calculate contentWidth automatically
            contentWidth = Math.max(contentWidth, lineWidth);
        }
    }

    contentBlock.outerWidth = contentBlock.width = retrieve2(topWidth, contentWidth);
    contentBlock.outerHeight = contentBlock.height = retrieve2(topHeight, contentHeight);

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

type TokenStyle = PropType<RichTextStyleOption, 'rich'>[string];

function pushTokens(
    block: RichTextContentBlock,
    str: string,
    style: RichTextStyleOption,
    wrapInfo: WrapInfo,
    styleName?: string
) {
    const isEmptyStr = str === '';
    const tokenStyle: TokenStyle = styleName && style.rich[styleName] || {};
    const lines = block.lines;
    const font = tokenStyle.font || style.font;
    let newLine = false;
    let strLines;
    let linesWidths;

    if (wrapInfo) {
        const tokenPadding = tokenStyle.textPadding as number[];
        let tokenPaddingH = tokenPadding ? tokenPadding[1] + tokenPadding[3] : 0;
        if (tokenStyle.textWidth != null && tokenStyle.textWidth != 'auto') {
            // Wrap the whole token if tokenWidth if fixed.
            const outerWidth = parsePercent(tokenStyle.textWidth, wrapInfo.width) + tokenPaddingH;
            if (lines.length > 0) { // Not first line
                if (outerWidth + wrapInfo.accumWidth > wrapInfo.width) {
                    // TODO Support wrap text in token.
                    strLines = str.split('\n');
                    newLine = true;
                }
            }

            wrapInfo.accumWidth = outerWidth;
        }
        else {
            const res = wrapText(str, font, wrapInfo.width, wrapInfo.accumWidth);
            wrapInfo.accumWidth = res.accumWidth + tokenPaddingH;
            linesWidths = res.linesWidths;
            strLines = res.lines;
        }
    }
    else {
        strLines = str.split('\n');
    }

    for (let i = 0; i < strLines.length; i++) {
        const text = strLines[i];
        const token = new RichTextToken();
        token.styleName = styleName;
        token.text = text;
        token.isLineHolder = !text && !isEmptyStr;

        if (typeof tokenStyle.textWidth === 'number') {
            token.width = tokenStyle.textWidth;
        }
        else {
            token.width = linesWidths
                ? linesWidths[i] // Caculated width in the wrap
                : getWidth(text, font);
        }

        // The first token should be appended to the last line if not new line.
        if (!i && !newLine) {
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


function isLatin(ch: string) {
    let code = ch.charCodeAt(0);
    return code >= 0x30 && code <= 0x39 // number
        || code >= 0x41 && code <= 0x5A // A-Z
        || code >= 0x61 && code <= 0x7A // a-z
        || code >= 0xA1 && code <= 0xFF // Other latins
}

const wordBreakCharsMap = reduce(',&?/;]'.split(''), function (obj, ch) {
    obj[ch] = true;
    return obj;
}, {} as Dictionary<boolean>);
/**
 * If break by word. For latin languages.
 */
function isWordBreakChar(ch: string) {
    if (wordBreakCharsMap[ch]) {
        return true;
    }
    else {
        return isLatin(ch);
    }
}

function wrapText(
    text: string,
    font: string,
    lineWidth: number,
    lastAccumWidth: number
) {
    const characters = text.split('');
    let lines: string[] = [];
    let linesWidths: number[] = [];
    let line = '';
    let lastWord = '';
    let lastWordWidth = 0;
    let accumWidth = 0;

    for (let i = 0; i < characters.length; i++) {

        const ch = characters[i];
        if (ch === '\n') {
            if (lastWord) {
                line += lastWord;
                accumWidth += lastWordWidth;
            }
            lines.push(line);
            linesWidths.push(accumWidth);
            // Reset
            line = '';
            lastWord = '';
            lastWordWidth = 0;
            accumWidth = 0;
            continue;
        }

        const chWidth = getWidth(ch, font);
        const inWord = isWordBreakChar(ch);

        if (!lines.length
            ? lastAccumWidth + accumWidth + chWidth > lineWidth
            : accumWidth + chWidth > lineWidth
        ) {
            if (!accumWidth) {  // If nothing appended yet.
                if (inWord) {
                    // The word length is too long for lineWidth
                    // Force break the word
                    lines.push(lastWord);
                    linesWidths.push(lastWordWidth);

                    lastWord = ch;
                    lastWordWidth = chWidth;
                }
                else {
                    // lineWidth is too small for ch
                    lines.push(ch);
                    linesWidths.push(chWidth);
                }
            }
            else if (line) {
                if (inWord) {
                    lines.push(line);
                    linesWidths.push(accumWidth - lastWordWidth);

                    // Break the whole word
                    lastWord += ch;
                    lastWordWidth += chWidth;
                    line = '';
                    accumWidth = lastWordWidth;
                }
                else {
                    if (lastWord) {
                        line += lastWord;
                        accumWidth += lastWordWidth;
                        lastWord = '';
                        lastWordWidth = 0;
                    }
                    lines.push(line);

                    linesWidths.push(accumWidth);

                    line = ch;
                    accumWidth = chWidth;
                }
            }

            continue;
        }

        accumWidth += chWidth;

        if (inWord) {
            lastWord += ch;
            lastWordWidth += chWidth;
        }
        else {
            // Append whole word
            if (lastWord) {
                line += lastWord;
                // Reset
                lastWord = '';
                lastWordWidth = 0;
            }

            // Append character
            line += ch;
        }
    }

    return {
        // Accum width of last line
        accumWidth,
        lines: lines,
        linesWidths
    }
}

function parsePercent(value: string | number, maxValue: number) {
    if (typeof value === 'string') {
        if (value.lastIndexOf('%') >= 0) {
            return parseFloat(value) / 100 * maxValue;
        }
        return parseFloat(value);
    }
    return value;
}