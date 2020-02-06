/**
 * RichText is a container that manages complex text label.
 * It will parse text string and create sub displayble elements respectively.
 */
import { PatternObject } from '../graphic/Pattern';
import { LinearGradientObject } from '../graphic/LinearGradient';
import { RadialGradientObject } from '../graphic/RadialGradient';
import { TextAlign, TextVerticalAlign, ImageLike, Dictionary, AllPropTypes, PropType } from '../core/types';
import Element, { ElementOption } from '../Element';
import { parseRichText, parsePlainText } from './text/parse';
import ZText from '../graphic/Text';
import { retrieve2, isString, each, normalizeCssArray } from '../core/util';
import { DEFAULT_FONT, adjustTextX, adjustTextY, getWidth } from '../contain/text';
import { GradientObject } from '../graphic/Gradient';
import ZImage from '../graphic/Image';
import Rect from '../graphic/shape/Rect';

type RichTextContentBlock = ReturnType<typeof parseRichText>
type RichTextLine = PropType<RichTextContentBlock, 'lines'>[0]
type RichTextToken = PropType<RichTextLine, 'tokens'>[0]

// TODO Default value
interface RichTextStyleOptionPart {
    // TODO Text is assigned inside zrender
    text?: string
    // TODO Text not support PatternObject | LinearGradientObject | RadialGradientObject yet.
    textFill?: string | PatternObject | LinearGradientObject | RadialGradientObject
    textStroke?: string | PatternObject | LinearGradientObject | RadialGradientObject

    opacity: number
    fillOpacity: number
    strokeOpacity: number
    /**
     * textStroke may be set as some color as a default
     * value in upper applicaion, where the default value
     * of textStrokeWidth should be 0 to make sure that
     * user can choose to do not use text stroke.
     */
    textStrokeWidth?: number

    /**
     * If `fontSize` or `fontFamily` exists, `font` will be reset by
     * `fontSize`, `fontStyle`, `fontWeight`, `fontFamily`.
     * So do not visit it directly in upper application (like echarts),
     * but use `contain/text#makeFont` instead.
     */
    font?: string
    /**
     * The same as font. Use font please.
     * @deprecated
     */
    // textFont?: string

    /**
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontStyle?: string
    /**
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontWeight?: string
    /**
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontFamily?: string
    /**
     * It helps merging respectively, rather than parsing an entire font string.
     * Should be 12 but not '12px'.
     * @type {number}
     */
    fontSize?: number

    textAlign?: TextAlign
    textVerticalAlign?: TextVerticalAlign

    textLineHeight?: number
    textWidth?: number | string
    /**
     * Only for textBackground.
     */
    textHeight?: number
    /**
     * Reserved for special functinality, like 'hr'.
     */
    textTag?: string

    textShadowColor?: string
    textShadowBlur?: number
    textShadowOffsetX?: number
    textShadowOffsetY?: number

    textBackgroundColor?: string | {
        image: ImageLike | string
    }

    /**
     * Can be `2` or `[2, 4]` or `[2, 3, 4, 5]`
     */
    textPadding?: number | number[]

    textBorderColor?: string
    textBorderWidth?: number
    textBorderRadius?: number | number[]

    textBoxShadowColor?: string
    textBoxShadowBlur?: number
    textBoxShadowOffsetX?: number
    textBoxShadowOffsetY?: number
}
export interface RichTextStyleOption extends RichTextStyleOptionPart {
    x: number,
    y: number,
    /**
     * If wrap text
     */
    wrap: false,
    /**
     * Text styles for rich text.
     */
    rich?: Dictionary<RichTextStyleOptionPart>

    truncate?: {
        outerWidth?: number
        outerHeight?: number
        ellipsis?: string
        placeholder?: string
        minChar?: number
    }
}

interface RichTextOption extends ElementOption {
    style?: RichTextStyleOption
}

interface RichText {
    attr(key: RichTextOption): RichText
    attr(key: keyof RichTextOption, value: AllPropTypes<RichTextOption>): RichText
}
class RichText extends Element {

    private _children: Element[] = []

    private _styleChanged = true

    // TODO RichText is Group?
    readonly isGroup = true

    style?: RichTextStyleOption

    constructor(opts?: RichTextOption) {
        super();
        this.attr(opts);
    }

    update() {
        // Update children
        if (this._styleChanged) {
            // TODO Reuse
            this._children = [];

            normalizeTextStyle(this.style);
            this.style.rich
                ? this._updateRichTexts()
                : this._updatePlainTexts();
        }
        super.update();
    }


    setStyle(obj: RichTextStyleOption): void
    setStyle(obj: keyof RichTextStyleOption, value: any): void
    setStyle(obj: keyof RichTextStyleOption | RichTextStyleOption, value?: AllPropTypes<RichTextStyleOption>) {
        if (typeof obj === 'string') {
            (this.style as Dictionary<any>)[obj] = value;
        }
        else {
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    (this.style as Dictionary<any>)[key] = (obj as Dictionary<any>)[key];
                }
            }
        }
        this.dirty();
        return this;
    }

    dirtyStyle() {
        this._styleChanged = true;
        this.dirty();
    }

    children() {
        return this._children;
    }

    private _addChild(child: ZText | Rect | ZImage): void {
        this._children.push(child);
        child.parent = this;
        // PENDING addToStorage?
    }

    private _updateRichTexts() {
        const style = this.style;

        // TODO Only parse when text changed?
        const contentBlock = parseRichText(style.text || '', style);

        const contentWidth = contentBlock.width;
        const outerWidth = contentBlock.outerWidth;
        const outerHeight = contentBlock.outerHeight;
        const textPadding = style.textPadding as number[];

        const baseX = style.x || 0;
        const baseY = style.y || 0;
        const textAlign = style.textAlign;
        const textVerticalAlign = style.textVerticalAlign;

        const boxX = adjustTextX(baseX, outerWidth, textAlign);
        const boxY = adjustTextY(baseY, outerHeight, textVerticalAlign);
        let xLeft = boxX;
        let lineTop = boxY;
        if (textPadding) {
            xLeft += textPadding[3];
            lineTop += textPadding[0];
        }
        const xRight = xLeft + contentWidth;

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
                this._placeToken(token, style, lineHeight, lineTop, lineXLeft, 'left');
                usedWidth -= token.width;
                lineXLeft += token.width;
                leftIndex++;
            }

            while (
                rightIndex >= 0
                && (token = tokens[rightIndex], token.textAlign === 'right')
            ) {
                this._placeToken(token, style, lineHeight, lineTop, lineXRight, 'right');
                usedWidth -= token.width;
                lineXRight -= token.width;
                rightIndex--;
            }

            // The other tokens are placed as textAlign 'center' if there is enough space.
            lineXLeft += (contentWidth - (lineXLeft - xLeft) - (xRight - lineXRight) - usedWidth) / 2;
            while (leftIndex <= rightIndex) {
                token = tokens[leftIndex];
                // Consider width specified by user, use 'center' rather than 'left'.
                this._placeToken(token, style, lineHeight, lineTop, lineXLeft + token.width / 2, 'center');
                lineXLeft += token.width;
                leftIndex++;
            }

            lineTop += lineHeight;
        }
    }

    private _updatePlainTexts() {
        const style = this.style;
        const text= style.text || '';
        const textFont = style.font || DEFAULT_FONT;
        const textPadding = style.textPadding as number[];
        const textLineHeight = style.textLineHeight;

        const contentBlock = parsePlainText(
            text,
            textFont,
            // textPadding has been normalized
            textPadding as number[],
            textLineHeight,
            style.truncate
        );
        const needDrawBg = needDrawBackground(style);

        let outerHeight = contentBlock.outerHeight;

        const textLines = contentBlock.lines;
        const lineHeight = contentBlock.lineHeight;

        const baseX = style.x || 0;
        const baseY = style.y || 0;
        const textAlign = style.textAlign || 'left';
        const textVerticalAlign = style.textVerticalAlign;

        const boxY = adjustTextY(baseY, outerHeight, textVerticalAlign);
        let textX = baseX;
        let textY = boxY;

        if (needDrawBg || textPadding) {
            // Consider performance, do not call getTextWidth util necessary.
            const textWidth = getWidth(text, textFont);
            let outerWidth = textWidth;
            textPadding && (outerWidth += textPadding[1] + textPadding[3]);
            const boxX = adjustTextX(baseX, outerWidth, textAlign);

            needDrawBg && this._renderBackground(style, boxX, boxY, outerWidth, outerHeight);

            if (textPadding) {
                textX = getTextXForPadding(baseX, textAlign, textPadding);
                textY += textPadding[0];
            }
        }

        // `textBaseline` is set as 'middle'.
        textY += lineHeight / 2;

        const textStrokeWidth = style.textStrokeWidth;
        const textStroke = getStroke(style.textStroke, textStrokeWidth);
        const textFill = getFill(style.textFill);

        for (let i = 0; i < textLines.length; i++) {
            const el = new ZText();
            const subElStyle = el.style;
            subElStyle.text = textLines[i];
            subElStyle.x = textX;
            subElStyle.y = textY;
            // Always set textAlign and textBase line, because it is difficute to calculate
            // textAlign from prevEl, and we dont sure whether textAlign will be reset if
            // font set happened.
            subElStyle.textAlign = textAlign;
            // Force baseline to be "middle". Otherwise, if using "top", the
            // text will offset downward a little bit in font "Microsoft YaHei".
            subElStyle.textBaseline = 'middle';
            subElStyle.opacity = style.opacity;
            // Fill after stroke so the outline will not cover the main part.
            subElStyle.strokeFirst = true;

            subElStyle.shadowBlur = style.textShadowBlur || style.textShadowBlur || 0;
            subElStyle.shadowColor = style.textShadowColor || style.textShadowColor || 'transparent';
            subElStyle.shadowOffsetX = style.textShadowOffsetX || style.textShadowOffsetX || 0;
            subElStyle.shadowOffsetY = style.textShadowOffsetY || style.textShadowOffsetY || 0;

            subElStyle.lineWidth = textStrokeWidth;
            subElStyle.stroke = textStroke as string;
            subElStyle.fill = textFill as string;

            subElStyle.font = textFont;

            textY += lineHeight;

            this._addChild(el);
        }
    }

    private _placeToken(
        token: RichTextToken,
        style: RichTextStyleOption,
        lineHeight: number,
        lineTop: number,
        x: number,
        textAlign: string
    ) {
        const tokenStyle = style.rich[token.styleName] || {} as RichTextStyleOptionPart;
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

        !token.isLineHolder && needDrawBackground(tokenStyle) && this._renderBackground(
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

        const el = new ZText();
        const subElStyle = el.style;
        subElStyle.text = token.text;
        subElStyle.x = x;
        subElStyle.y = y;
        subElStyle.shadowBlur = tokenStyle.textShadowBlur || style.textShadowBlur || 0;
        subElStyle.shadowColor = tokenStyle.textShadowColor || style.textShadowColor || 'transparent';
        subElStyle.shadowOffsetX = tokenStyle.textShadowOffsetX || style.textShadowOffsetX || 0;
        subElStyle.shadowOffsetY = tokenStyle.textShadowOffsetY || style.textShadowOffsetY || 0;

        subElStyle.textAlign = textAlign as CanvasTextAlign;
        // Force baseline to be "middle". Otherwise, if using "top", the
        // text will offset downward a little bit in font "Microsoft YaHei".
        subElStyle.textBaseline = 'middle';
        subElStyle.font = token.font || DEFAULT_FONT;


        subElStyle.lineWidth = retrieve2(tokenStyle.textStrokeWidth, style.textStrokeWidth);
        subElStyle.stroke = getStroke(tokenStyle.textStroke || style.textStroke, subElStyle.lineWidth) || null;
        subElStyle.fill = getFill(tokenStyle.textFill || style.textFill) || null;

        this._addChild(el);
    }

    private _renderBackground(
        style: RichTextStyleOptionPart,
        x: number,
        y: number,
        width: number,
        height: number
    ) {
        const textBackgroundColor = style.textBackgroundColor;
        const textBorderWidth = style.textBorderWidth;
        const textBorderColor = style.textBorderColor;
        const isPlainBg = isString(textBackgroundColor);
        const textBorderRadius = style.textBorderRadius;

        let rectEl: Rect;
        let imgEl: ZImage;
        if (isPlainBg || (textBorderWidth && textBorderColor)) {
            // Background is color
            rectEl = new Rect();
            const rectShape = rectEl.shape;
            rectShape.x = x;
            rectShape.y = y;
            rectShape.width = width;
            rectShape.height = height;
            rectShape.r = textBorderRadius;

            this._addChild(rectEl);
        }

        if (isPlainBg) {
            const rectStyle = rectEl.style;
            rectStyle.fill = textBackgroundColor as string;
            rectStyle.opacity = retrieve2(style.opacity, 1);
            rectStyle.fillOpacity = retrieve2(style.fillOpacity, 1);
        }
        else if (textBackgroundColor && (textBackgroundColor as {image: ImageLike}).image) {
            imgEl = new ZImage();
            const imgStyle = imgEl.style;
            imgStyle.image =  (textBackgroundColor as {image: ImageLike}).image;
            imgStyle.x = x;
            imgStyle.y = y;
            imgStyle.width = width;
            imgStyle.height = height;
            this._addChild(imgEl);
        }

        if (textBorderWidth && textBorderColor) {
            const rectStyle = rectEl.style;
            rectStyle.lineWidth = textBorderWidth;
            rectStyle.stroke = textBorderColor;
            rectStyle.strokeOpacity = retrieve2(style.strokeOpacity, 1);
        }

        const shadowStyle = (rectEl || imgEl).style;
        shadowStyle.shadowBlur = style.textBoxShadowBlur || 0;
        shadowStyle.shadowColor = style.textBoxShadowColor || 'transparent';
        shadowStyle.shadowOffsetX = style.textBoxShadowOffsetX || 0;
        shadowStyle.shadowOffsetY = style.textBoxShadowOffsetY || 0;

    }
}


const VALID_TEXT_ALIGN = {left: true, right: 1, center: 1};
const VALID_TEXT_VERTICAL_ALIGN = {top: 1, bottom: 1, middle: 1};

export function normalizeTextStyle(style: RichTextStyleOption): RichTextStyleOption {
    normalizeStyle(style);
    each(style.rich, normalizeStyle);
    return style;
}

function normalizeStyle(style: RichTextStyleOptionPart) {
    if (style) {
        style.font = ZText.makeFont(style);
        let textAlign = style.textAlign;
        // 'middle' is invalid, convert it to 'center'
        (textAlign as string) === 'middle' && (textAlign = 'center');
        style.textAlign = (
            textAlign == null || VALID_TEXT_ALIGN[textAlign]
        ) ? textAlign : 'left';

        // Compatible with textBaseline.
        let textVerticalAlign = style.textVerticalAlign;
        (textVerticalAlign as string) === 'center' && (textVerticalAlign = 'middle');
        style.textVerticalAlign = (
            textVerticalAlign == null || VALID_TEXT_VERTICAL_ALIGN[textVerticalAlign]
        ) ? textVerticalAlign : 'top';

        // TODO Should not change the orignal value.
        const textPadding = style.textPadding;
        if (textPadding) {
            style.textPadding = normalizeCssArray(style.textPadding);
        }
    }
}

/**
 * @param stroke If specified, do not check style.textStroke.
 * @param lineWidth If specified, do not check style.textStroke.
 */
function getStroke(
    stroke?: PropType<RichTextStyleOptionPart, 'textStroke'>,
    lineWidth?: number
) {
    return (stroke == null || lineWidth <= 0 || stroke === 'transparent' || stroke === 'none')
        ? null
        : ((stroke as PatternObject).image || (stroke as GradientObject).colorStops)
        ? '#000'
        : stroke;
}

function getFill(
    fill?: PropType<RichTextStyleOptionPart, 'textFill'>
) {
    return (fill == null || fill === 'none')
        ? null
        // TODO pattern and gradient?
        : ((fill as PatternObject).image || (fill as GradientObject).colorStops)
        ? '#000'
        : fill;
}

function getTextXForPadding(x: number, textAlign: string, textPadding: number[]): number {
    return textAlign === 'right'
        ? (x - textPadding[1])
        : textAlign === 'center'
        ? (x + textPadding[3] / 2 - textPadding[1] / 2)
        : (x + textPadding[3]);
}

/**
 * If needs draw background
 * @param style Style of element
 */
function needDrawBackground(style: RichTextStyleOptionPart): boolean {
    return !!(
        style.textBackgroundColor
        || (style.textBorderWidth && style.textBorderColor)
    );
}


export default RichText;