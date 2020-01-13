
import {
    retrieve2,
    retrieve3,
    each,
    normalizeCssArray,
    isString
} from '../../core/util';
import * as textContain from '../../contain/text';
import * as roundRectHelper from './roundRect';
import * as imageHelper from './image';
import fixShadow from './fixShadow';
import {ContextCachedBy, WILL_BE_RESTORED} from '../constant';
import { StyleOption } from '../Style';
import Displayable from '../Displayable';
import { RectLike } from '../../core/BoundingRect';
import { PropType, ImageLike, Dictionary, AllPropTypes, ZRCanvasRenderingContext } from '../../core/types';
import { PatternObject } from '../Pattern';
import { GradientObject } from '../Gradient';

type CalculateTextPositionResult = ReturnType<typeof textContain.calculateTextPosition>

type TextBoxPosition = CalculateTextPositionResult & {
    baseX: number
    baseY: number
}

const DEFAULT_FONT = textContain.DEFAULT_FONT;

// TODO: Have not support 'start', 'end' yet.
const VALID_TEXT_ALIGN = {left: true, right: 1, center: 1};
const VALID_TEXT_VERTICAL_ALIGN = {top: 1, bottom: 1, middle: 1};
// Different from `STYLE_COMMON_PROPS` of `graphic/Style`,
// the default value of shadowColor is `'transparent'`.
const SHADOW_STYLE_COMMON_PROPS = [
    ['textShadowBlur', 'shadowBlur', 0],
    ['textShadowOffsetX', 'shadowOffsetX', 0],
    ['textShadowOffsetY', 'shadowOffsetY', 0],
    ['textShadowColor', 'shadowColor', 'transparent']
];
const _tmpTextPositionResult = {} as TextBoxPosition;
const _tmpBoxPositionResult = {} as TextBoxPosition;

export function normalizeTextStyle(style: StyleOption): StyleOption {
    normalizeStyle(style);
    each(style.rich, normalizeStyle);
    return style;
}

function normalizeStyle(style: StyleOption) {
    if (style) {

        style.font = textContain.makeFont(style);

        let textAlign = style.textAlign;
        // 'middle' is invalid, convert it to 'center'
        textAlign === 'middle' && (textAlign = 'center');
        style.textAlign = (
            textAlign == null || VALID_TEXT_ALIGN[textAlign]
        ) ? textAlign : 'left';

        // Compatible with textBaseline.
        let textVerticalAlign = style.textVerticalAlign || style.textBaseline;
        textVerticalAlign === 'center' && (textVerticalAlign = 'middle');
        style.textVerticalAlign = (
            textVerticalAlign == null || VALID_TEXT_VERTICAL_ALIGN[textVerticalAlign]
        ) ? textVerticalAlign : 'top';

        const textPadding = style.textPadding;
        if (textPadding) {
            style.textPadding = normalizeCssArray(style.textPadding);
        }
    }
}

export function renderText(
    hostEl: Displayable,
    ctx: CanvasRenderingContext2D,
    text: string,
    style: StyleOption,
    rect: RectLike,
    prevEl?: Displayable | typeof WILL_BE_RESTORED
) {
    style.rich
        ? renderRichText(hostEl, ctx, text, style, rect, prevEl)
        : renderPlainText(hostEl, ctx, text, style, rect, prevEl);
}

// Avoid setting to ctx according to prevEl if possible for
// performance in scenarios of large amount text.
function renderPlainText(
    hostEl: Displayable,
    ctx: CanvasRenderingContext2D,
    text: string,
    style: StyleOption,
    rect: RectLike,
    prevEl?: Displayable | typeof WILL_BE_RESTORED
) {
    'use strict';

    const needDrawBg = needDrawBackground(style);

    const cachedByMe = (ctx as ZRCanvasRenderingContext).__attrCachedBy === ContextCachedBy.PLAIN_TEXT;
    let prevStyle;
    let checkCache = false;

    // Only take and check cache for `Text` el, but not RectText.
    if (prevEl !== WILL_BE_RESTORED) {
        if (prevEl) {
            prevStyle = prevEl.style;
            checkCache = !needDrawBg && cachedByMe && !!prevStyle;
        }

        // Prevent from using cache in `Style::bind`, because of the case:
        // ctx property is modified by other properties than `Style::bind`
        // used, and Style::bind is called next.
        (ctx as ZRCanvasRenderingContext).__attrCachedBy = needDrawBg ? ContextCachedBy.NONE : ContextCachedBy.PLAIN_TEXT;
    }
    // Since this will be restored, prevent from using these props to check cache in the next
    // entering of this method. But do not need to clear other cache like `Style::bind`.
    else if (cachedByMe) {
        (ctx as ZRCanvasRenderingContext).__attrCachedBy = ContextCachedBy.NONE;
    }

    const styleFont = style.font || DEFAULT_FONT;
    // PENDING
    // Only `Text` el set `font` and keep it (`RectText` will restore). So theoretically
    // we can make font cache on ctx, which can cache for text el that are discontinuous.
    // But layer save/restore needed to be considered.
    // if (styleFont !== ctx.__fontCache) {
    //     ctx.font = styleFont;
    //     if (prevEl !== WILL_BE_RESTORED) {
    //         ctx.__fontCache = styleFont;
    //     }
    // }
    if (!checkCache || styleFont !== (prevStyle.font || DEFAULT_FONT)) {
        ctx.font = styleFont;
    }

    // Use the final font from context-2d, because the final
    // font might not be the style.font when it is illegal.
    // But get `ctx.font` might be time consuming.
    let computedFont: string = hostEl.__computedFont;
    if (hostEl.__styleFont !== styleFont) {
        hostEl.__styleFont = styleFont;
        computedFont = hostEl.__computedFont = ctx.font;
    }

    const textPadding = style.textPadding as number[];
    const textLineHeight = style.textLineHeight;

    let contentBlock = hostEl.__textCotentBlock as textContain.PlainTextContentBlock;
    if (!contentBlock || hostEl.__dirtyText) {
        contentBlock = hostEl.__textCotentBlock = textContain.parsePlainText(
            text, computedFont, textPadding, textLineHeight, style.truncate
        );
    }

    let outerHeight = contentBlock.outerHeight;

    const textLines = contentBlock.lines;
    const lineHeight = contentBlock.lineHeight;

    const boxPos = getBoxPosition(_tmpBoxPositionResult, hostEl, style, rect);
    const baseX = boxPos.baseX;
    const baseY = boxPos.baseY;
    const textAlign = boxPos.textAlign || 'left';
    const textVerticalAlign = boxPos.textVerticalAlign;

    // Origin of textRotation should be the base point of text drawing.
    applyTextRotation(ctx, style, rect, baseX, baseY);

    const boxY = textContain.adjustTextY(baseY, outerHeight, textVerticalAlign);
    let textX = baseX;
    let textY = boxY;

    if (needDrawBg || textPadding) {
        // Consider performance, do not call getTextWidth util necessary.
        const textWidth = textContain.getWidth(text, computedFont);
        let outerWidth = textWidth;
        textPadding && (outerWidth += textPadding[1] + textPadding[3]);
        const boxX = textContain.adjustTextX(baseX, outerWidth, textAlign);

        needDrawBg && drawBackground(hostEl, ctx, style, boxX, boxY, outerWidth, outerHeight);

        if (textPadding) {
            textX = getTextXForPadding(baseX, textAlign, textPadding);
            textY += textPadding[0];
        }
    }

    // Always set textAlign and textBase line, because it is difficute to calculate
    // textAlign from prevEl, and we dont sure whether textAlign will be reset if
    // font set happened.
    ctx.textAlign = textAlign as CanvasTextAlign;
    // Force baseline to be "middle". Otherwise, if using "top", the
    // text will offset downward a little bit in font "Microsoft YaHei".
    ctx.textBaseline = 'middle';
    // Set text opacity
    ctx.globalAlpha = style.opacity || 1;

    // Always set shadowBlur and shadowOffset to avoid leak from displayable.
    for (let i = 0; i < SHADOW_STYLE_COMMON_PROPS.length; i++) {
        const propItem = SHADOW_STYLE_COMMON_PROPS[i];
        const styleProp = propItem[0] as keyof StyleOption;
        const ctxProp = propItem[1];
        const val = style[styleProp];
        if (!checkCache || val !== prevStyle[styleProp]) {
            (ctx as any)[ctxProp] = fixShadow(ctx, ctxProp as string, (val || propItem[2]) as number);
        }
    }

    // `textBaseline` is set as 'middle'.
    textY += lineHeight / 2;

    const textStrokeWidth = style.textStrokeWidth;
    const textStrokeWidthPrev = checkCache ? prevStyle.textStrokeWidth : null;
    const strokeWidthChanged = !checkCache || textStrokeWidth !== textStrokeWidthPrev;
    const strokeChanged = !checkCache || strokeWidthChanged || style.textStroke !== prevStyle.textStroke;
    const textStroke = getStroke(style.textStroke, textStrokeWidth);
    const textFill = getFill(style.textFill);

    if (textStroke) {
        if (strokeWidthChanged) {
            ctx.lineWidth = textStrokeWidth;
        }
        if (strokeChanged) {
            ctx.strokeStyle = textStroke as string;
        }
    }
    if (textFill) {
        if (!checkCache || style.textFill !== prevStyle.textFill) {
            ctx.fillStyle = textFill as string;
        }
    }

    // Optimize simply, in most cases only one line exists.
    if (textLines.length === 1) {
        // Fill after stroke so the outline will not cover the main part.
        textStroke && ctx.strokeText(textLines[0], textX, textY);
        textFill && ctx.fillText(textLines[0], textX, textY);
    }
    else {
        for (let i = 0; i < textLines.length; i++) {
            // Fill after stroke so the outline will not cover the main part.
            textStroke && ctx.strokeText(textLines[i], textX, textY);
            textFill && ctx.fillText(textLines[i], textX, textY);
            textY += lineHeight;
        }
    }
}

type RichTextContentBlockType = ReturnType<typeof textContain.parseRichText>
type RichTextLineType = PropType<RichTextContentBlockType, 'lines'>[0]
type RichTextTokenType = PropType<RichTextLineType, 'tokens'>[0]

function renderRichText(
    hostEl: Displayable,
    ctx: CanvasRenderingContext2D,
    text: string,
    style: StyleOption,
    rect: RectLike,
    prevEl?: Displayable | typeof WILL_BE_RESTORED
) {
    // Do not do cache for rich text because of the complexity.
    // But `RectText` this will be restored, do not need to clear other cache like `Style::bind`.
    if (prevEl !== WILL_BE_RESTORED) {
        (ctx as ZRCanvasRenderingContext).__attrCachedBy = ContextCachedBy.NONE;
    }
    // TODO
    let contentBlock = hostEl.__textCotentBlock as RichTextContentBlockType;

    if (!contentBlock || hostEl.__dirtyText) {
        contentBlock = hostEl.__textCotentBlock = textContain.parseRichText(text, style);
    }

    drawRichText(hostEl, ctx, contentBlock, style, rect);
}

function drawRichText(
    hostEl: Displayable,
    ctx: CanvasRenderingContext2D,
    contentBlock: RichTextContentBlockType,
    style: StyleOption,
    rect: RectLike
) {
    const contentWidth = contentBlock.width;
    const outerWidth = contentBlock.outerWidth;
    const outerHeight = contentBlock.outerHeight;
    const textPadding = style.textPadding as number[];

    const boxPos = getBoxPosition(_tmpBoxPositionResult, hostEl, style, rect);
    const baseX = boxPos.baseX;
    const baseY = boxPos.baseY;
    const textAlign = boxPos.textAlign;
    const textVerticalAlign = boxPos.textVerticalAlign;

    // Origin of textRotation should be the base point of text drawing.
    applyTextRotation(ctx, style, rect, baseX, baseY);

    const boxX = textContain.adjustTextX(baseX, outerWidth, textAlign);
    const boxY = textContain.adjustTextY(baseY, outerHeight, textVerticalAlign);
    let xLeft = boxX;
    let lineTop = boxY;
    if (textPadding) {
        xLeft += textPadding[3];
        lineTop += textPadding[0];
    }
    const xRight = xLeft + contentWidth;

    needDrawBackground(style) && drawBackground(
        hostEl, ctx, style, boxX, boxY, outerWidth, outerHeight
    );

    for (let i = 0; i < contentBlock.lines.length; i++) {
        const line = contentBlock.lines[i];
        const tokens = line.tokens;
        const tokenCount = tokens.length;
        const lineHeight = line.lineHeight;

        let usedWidth = line.width;
        let leftIndex = 0;
        let lineXLeft = xLeft;
        let lineXRight = xRight;
        let rightIndex = tokenCount - 1;
        let token;

        while (
            leftIndex < tokenCount
            && (token = tokens[leftIndex], !token.textAlign || token.textAlign === 'left')
        ) {
            placeToken(hostEl, ctx, token, style, lineHeight, lineTop, lineXLeft, 'left');
            usedWidth -= token.width;
            lineXLeft += token.width;
            leftIndex++;
        }

        while (
            rightIndex >= 0
            && (token = tokens[rightIndex], token.textAlign === 'right')
        ) {
            placeToken(hostEl, ctx, token, style, lineHeight, lineTop, lineXRight, 'right');
            usedWidth -= token.width;
            lineXRight -= token.width;
            rightIndex--;
        }

        // The other tokens are placed as textAlign 'center' if there is enough space.
        lineXLeft += (contentWidth - (lineXLeft - xLeft) - (xRight - lineXRight) - usedWidth) / 2;
        while (leftIndex <= rightIndex) {
            token = tokens[leftIndex];
            // Consider width specified by user, use 'center' rather than 'left'.
            placeToken(hostEl, ctx, token, style, lineHeight, lineTop, lineXLeft + token.width / 2, 'center');
            lineXLeft += token.width;
            leftIndex++;
        }

        lineTop += lineHeight;
    }
}

function applyTextRotation(
    ctx: CanvasRenderingContext2D,
    style: StyleOption,
    rect: RectLike,
    x: number,
    y: number
) {
    // textRotation only apply in RectText.
    if (rect && style.textRotation) {
        const origin = style.textOrigin;
        if (origin === 'center') {
            x = rect.width / 2 + rect.x;
            y = rect.height / 2 + rect.y;
        }
        else if (origin) {
            x = origin[0] + rect.x;
            y = origin[1] + rect.y;
        }

        ctx.translate(x, y);
        // Positive: anticlockwise
        ctx.rotate(-style.textRotation);
        ctx.translate(-x, -y);
    }
}

function placeToken(
    hostEl: Displayable,
    ctx: CanvasRenderingContext2D,
    token: RichTextTokenType,
    style: StyleOption,
    lineHeight: number,
    lineTop: number,
    x: number,
    textAlign: string
) {
    const tokenStyle = style.rich[token.styleName] || {};
    tokenStyle.text = token.text;

    // 'ctx.textBaseline' is always set as 'middle', for sake of
    // the bias of "Microsoft YaHei".
    const textVerticalAlign = token.textVerticalAlign;
    let y = lineTop + lineHeight / 2;
    if (textVerticalAlign === 'top') {
        y = lineTop + token.height / 2;
    }
    else if (textVerticalAlign === 'bottom') {
        y = lineTop + lineHeight - token.height / 2;
    }

    !token.isLineHolder && needDrawBackground(tokenStyle) && drawBackground(
        hostEl,
        ctx,
        tokenStyle,
        textAlign === 'right'
            ? x - token.width
            : textAlign === 'center'
            ? x - token.width / 2
            : x,
        y - token.height / 2,
        token.width,
        token.height
    );

    const textPadding = token.textPadding;
    if (textPadding) {
        x = getTextXForPadding(x, textAlign, textPadding);
        y -= token.height / 2 - textPadding[2] - token.textHeight / 2;
    }

    setCtx(ctx, 'shadowBlur', retrieve3(tokenStyle.textShadowBlur, style.textShadowBlur, 0));
    setCtx(ctx, 'shadowColor', tokenStyle.textShadowColor || style.textShadowColor || 'transparent');
    setCtx(ctx, 'shadowOffsetX', retrieve3(tokenStyle.textShadowOffsetX, style.textShadowOffsetX, 0));
    setCtx(ctx, 'shadowOffsetY', retrieve3(tokenStyle.textShadowOffsetY, style.textShadowOffsetY, 0));

    setCtx(ctx, 'textAlign', textAlign);
    // Force baseline to be "middle". Otherwise, if using "top", the
    // text will offset downward a little bit in font "Microsoft YaHei".
    setCtx(ctx, 'textBaseline', 'middle');

    setCtx(ctx, 'font', token.font || DEFAULT_FONT);

    const textStrokeWidth = retrieve2(tokenStyle.textStrokeWidth, style.textStrokeWidth);
    const textStroke = getStroke(tokenStyle.textStroke || style.textStroke, textStrokeWidth);
    const textFill = getFill(tokenStyle.textFill || style.textFill);

    // Fill after stroke so the outline will not cover the main part.
    if (textStroke) {
        setCtx(ctx, 'lineWidth', textStrokeWidth);
        setCtx(ctx, 'strokeStyle', textStroke as string);
        ctx.strokeText(token.text, x, y);
    }
    if (textFill) {
        setCtx(ctx, 'fillStyle', textFill as string);
        ctx.fillText(token.text, x, y);
    }
}

function needDrawBackground(style: StyleOption): boolean {
    return !!(
        style.textBackgroundColor
        || (style.textBorderWidth && style.textBorderColor)
    );
}

// style: {textBackgroundColor, textBorderWidth, textBorderColor, textBorderRadius, text}
// shape: {x, y, width, height}
function drawBackground(
    hostEl: Displayable,
    ctx: CanvasRenderingContext2D,
    style: StyleOption,
    x: number,
    y: number,
    width: number,
    height: number
) {
    const textBackgroundColor = style.textBackgroundColor;
    const textBorderWidth = style.textBorderWidth;
    const textBorderColor = style.textBorderColor;
    const isPlainBg = isString(textBackgroundColor);

    setCtx(ctx, 'shadowBlur', style.textBoxShadowBlur || 0);
    setCtx(ctx, 'shadowColor', style.textBoxShadowColor || 'transparent');
    setCtx(ctx, 'shadowOffsetX', style.textBoxShadowOffsetX || 0);
    setCtx(ctx, 'shadowOffsetY', style.textBoxShadowOffsetY || 0);

    if (isPlainBg || (textBorderWidth && textBorderColor)) {
        ctx.beginPath();
        const textBorderRadius = style.textBorderRadius;
        if (!textBorderRadius) {
            ctx.rect(x, y, width, height);
        }
        else {
            roundRectHelper.buildPath(ctx, {
                x: x, y: y, width: width, height: height, r: textBorderRadius
            });
        }
        ctx.closePath();
    }

    if (isPlainBg) {
        setCtx(ctx, 'fillStyle', textBackgroundColor as string);

        if (style.fillOpacity != null) {
            const originalGlobalAlpha = ctx.globalAlpha;
            ctx.globalAlpha = style.fillOpacity * style.opacity;
            ctx.fill();
            ctx.globalAlpha = originalGlobalAlpha;
        }
        else {
            ctx.fill();
        }
    }
    else if (textBackgroundColor && (textBackgroundColor as {image: ImageLike}).image) {
        let image = (textBackgroundColor as {image: ImageLike}).image;

        image = imageHelper.createOrUpdateImage(
            image, null, hostEl, onBgImageLoaded, textBackgroundColor
        );
        if (image && imageHelper.isImageReady(image)) {
            ctx.drawImage(image, x, y, width, height);
        }
    }

    if (textBorderWidth && textBorderColor) {
        setCtx(ctx, 'lineWidth', textBorderWidth);
        setCtx(ctx, 'strokeStyle', textBorderColor);

        if (style.strokeOpacity != null) {
            const originalGlobalAlpha = ctx.globalAlpha;
            ctx.globalAlpha = style.strokeOpacity * style.opacity;
            ctx.stroke();
            ctx.globalAlpha = originalGlobalAlpha;
        }
        else {
            ctx.stroke();
        }
    }
}

function onBgImageLoaded(image: ImageLike, textBackgroundColor: {
    image: ImageLike
}) {
    // Replace image, so that `contain/text.js#parseRichText`
    // will get correct result in next tick.
    textBackgroundColor.image = image;
}

export function getBoxPosition(
    out: Partial<TextBoxPosition>,
    hostEl: Displayable,
    style: StyleOption,
    rect: RectLike
) {
    let baseX = style.x || 0;
    let baseY = style.y || 0;
    let textAlign = style.textAlign;
    let textVerticalAlign = style.textVerticalAlign;

    // Text position represented by coord
    if (rect) {
        const textPosition = style.textPosition;
        if (textPosition instanceof Array) {
            // Percent
            baseX = rect.x + parsePercent(textPosition[0], rect.width);
            baseY = rect.y + parsePercent(textPosition[1], rect.height);
        }
        else {
            const res = (hostEl && hostEl.calculateTextPosition)
                ? hostEl.calculateTextPosition(_tmpTextPositionResult, style, rect)
                : textContain.calculateTextPosition(_tmpTextPositionResult, style, rect);
            baseX = res.x;
            baseY = res.y;
            // Default align and baseline when has textPosition
            textAlign = textAlign || res.textAlign;
            textVerticalAlign = textVerticalAlign || res.textVerticalAlign;
        }

        // textOffset is only support in RectText, otherwise
        // we have to adjust boundingRect for textOffset.
        const textOffset = style.textOffset;
        if (textOffset) {
            baseX += textOffset[0];
            baseY += textOffset[1];
        }
    }

    out = out || {} as TextBoxPosition;
    out.baseX = baseX;
    out.baseY = baseY;
    out.textAlign = textAlign;
    out.textVerticalAlign = textVerticalAlign;

    return out;
}


function setCtx(
    ctx: CanvasRenderingContext2D,
    prop: keyof CanvasRenderingContext2D,
    value: AllPropTypes<CanvasRenderingContext2D>
) {
    (ctx as any)[prop] = fixShadow(ctx, prop, value as number);
    return ctx[prop];
}

/**
 * @param stroke If specified, do not check style.textStroke.
 * @param lineWidth If specified, do not check style.textStroke.
 */
export function getStroke(
    stroke?: PropType<StyleOption, 'textStroke'>,
    lineWidth?: number
) {
    return (stroke == null || lineWidth <= 0 || stroke === 'transparent' || stroke === 'none')
        ? null
        : ((stroke as PatternObject).image || (stroke as GradientObject).colorStops)
        ? '#000'
        : stroke;
}

export function getFill(
    fill?: PropType<StyleOption, 'textStroke'>
) {
    return (fill == null || fill === 'none')
        ? null
        // TODO pattern and gradient?
        : ((fill as PatternObject).image || (fill as GradientObject).colorStops)
        ? '#000'
        : fill;
}

export function parsePercent(value: number | string, maxValue: number): number{
    if (typeof value === 'string') {
        if (value.lastIndexOf('%') >= 0) {
            return parseFloat(value) / 100 * maxValue;
        }
        return parseFloat(value);
    }
    return value;
}

function getTextXForPadding(x: number, textAlign: string, textPadding: number[]): number {
    return textAlign === 'right'
        ? (x - textPadding[1])
        : textAlign === 'center'
        ? (x + textPadding[3] / 2 - textPadding[1] / 2)
        : (x + textPadding[3]);
}

export function needDrawText(text: string, style: StyleOption): boolean {
    return text != null
        && !!(text
            || style.textBackgroundColor
            || (style.textBorderWidth && style.textBorderColor)
            || style.textPadding
        );
}
