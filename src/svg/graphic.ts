// TODO
// 1. shadow
// 2. Image: sx, sy, sw, sh

import {createElement} from './core';
import PathProxy from '../core/PathProxy';
import BoundingRect, { RectLike } from '../core/BoundingRect';
import * as matrix from '../core/matrix';
import * as textHelper from '../graphic/helper/text';
import Text from '../graphic/Text';
import { StyleOption } from '../graphic/Style';
import Displayable from '../graphic/Displayable';
import { Path } from '../export';
import { PathOption } from '../graphic/Path';
import { DEFAULT_FONT, parsePlainText, PlainTextContentBlock, adjustTextY } from '../contain/text';
import { TextAlign } from '../core/types';
import ZImage from '../graphic/Image';

type SVGProxy = {
    brush: (el: Displayable) => void
}

type SVGTextElementExtended = SVGTextElement & {
    __computedFont: string
    __styleFont: string
}
type SVGTSpanElementExtended = SVGTSpanElement & {
    __zrText: string
}

var CMD = PathProxy.CMD;
var arrayJoin = Array.prototype.join;

var NONE = 'none';
var mathRound = Math.round;
var mathSin = Math.sin;
var mathCos = Math.cos;
var PI = Math.PI;
var PI2 = Math.PI * 2;
var degree = 180 / PI;

var EPSILON = 1e-4;

function round4(val: number) {
    return mathRound(val * 1e4) / 1e4;
}

function isAroundZero(val: number) {
    return val < EPSILON && val > -EPSILON;
}

function pathHasFill(style: StyleOption, isText?: boolean) {
    const fill = isText ? style.textFill : style.fill;
    return fill != null && fill !== NONE;
}

function pathHasStroke(style: StyleOption, isText?: boolean) {
    const stroke = isText ? style.textStroke : style.stroke;
    return stroke != null && stroke !== NONE;
}

function setTransform(svgEl: SVGElement, m: matrix.MatrixArray) {
    if (m) {
        attr(svgEl, 'transform', 'matrix(' + arrayJoin.call(m, ',') + ')');
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

function bindStyle(svgEl: SVGElement, style: StyleOption, isText?: boolean, el?: Displayable) {
    if (pathHasFill(style, isText)) {
        let fill = isText ? style.textFill : style.fill;
        fill = fill === 'transparent' ? NONE : fill;
        attr(svgEl, 'fill', fill as string);
        attr(svgEl,
            'fill-opacity',
            (style.fillOpacity != null ? style.fillOpacity * style.opacity : style.opacity) + ''
        );
    }
    else {
        attr(svgEl, 'fill', NONE);
    }

    if (pathHasStroke(style, isText)) {
        let stroke = isText ? style.textStroke : style.stroke;
        stroke = stroke === 'transparent' ? NONE : stroke;
        attr(svgEl, 'stroke', stroke as string);
        const strokeWidth = isText
            ? style.textStrokeWidth
            : style.lineWidth;
        const strokeScale = !isText && style.strokeNoScale
            ? (el as Path).getLineScale()
            : 1;
        attr(svgEl, 'stroke-width', strokeWidth / strokeScale + '');
        // stroke then fill for text; fill then stroke for others
        attr(svgEl, 'paint-order', isText ? 'stroke' : 'fill');
        attr(svgEl, 'stroke-opacity', (style.strokeOpacity != null ? style.strokeOpacity : style.opacity) + '');
        const lineDash = style.lineDash;
        if (lineDash) {
            attr(svgEl, 'stroke-dasharray', (style.lineDash as number[]).join(','));
            attr(svgEl, 'stroke-dashoffset', mathRound(style.lineDashOffset || 0) + '');
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
            // PENDING With scale
            str.push(round4(data[i++]));
        }
    }
    return str.join(' ');
}

var svgPath: SVGProxy = {
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

        if (el.__dirtyPath) {
            path.beginPath();
            el.buildPath(path, el.shape);
            el.__dirtyPath = false;

            const pathStr = pathDataToString(path);
            if (pathStr.indexOf('NaN') < 0) {
                // Ignore illegal path, which may happen such in out-of-range
                // data in Calendar series.
                attr(svgEl, 'd', pathStr);
            }
        }

        bindStyle(svgEl, style, false, el);
        setTransform(svgEl, el.transform);

        if (style.text != null) {
            svgTextDrawRectText(el, el.getBoundingRect());
        }
        else {
            removeOldTextNode(el);
        }
    }
};

export {svgPath as path};

/***************************************************
 * IMAGE
 **************************************************/
var svgImage: SVGProxy = {
    brush(el: ZImage) {
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

        if (style.text != null) {
            svgTextDrawRectText(el, el.getBoundingRect());
        }
        else {
            removeOldTextNode(el);
        }
    }
};
export {svgImage as image};

/***************************************************
 * TEXT
 **************************************************/
var _tmpTextHostRect = new BoundingRect();
var _tmpTextBoxPos: Partial<ReturnType<typeof textHelper.getBoxPosition>> = {};
var _tmpTextTransform: matrix.MatrixArray = [];
var TEXT_ALIGN_TO_ANCHRO = {
    left: 'start',
    right: 'end',
    center: 'middle',
    middle: 'middle'
};

/**
 * @param  el
 * @param {Object|boolean} [hostRect] {x, y, width, height}
 *        If set false, rect text is not used.
 */
var svgTextDrawRectText = function (el: Displayable, hostRect: RectLike) {
    const style = el.style;
    const elTransform = el.transform;
    const needTransformTextByHostEl = el instanceof Text || style.transformText;

    el.__dirty && textHelper.normalizeTextStyle(style);

    let text = style.text;
    // Convert to string
    text != null && (text += '');
    if (!textHelper.needDrawText(text, style)) {
        return;
    }
    // render empty text for svg if no text but need draw text.
    text == null && (text = '');

    // Follow the setting in the canvas renderer, if not transform the
    // text, transform the hostRect, by which the text is located.
    if (!needTransformTextByHostEl && elTransform) {
        _tmpTextHostRect.copy(hostRect);
        _tmpTextHostRect.applyTransform(elTransform);
        hostRect = _tmpTextHostRect;
    }

    let textSvgEl = el.__textSvgEl;
    if (!textSvgEl) {
        textSvgEl = createElement('text');
        el.__textSvgEl = textSvgEl;
    }

    // style.font has been normalized by `normalizeTextStyle`.
    const textSvgElStyle = textSvgEl.style;
    const font = style.font || DEFAULT_FONT;
    let computedFont = (textSvgEl as SVGTextElementExtended).__computedFont;
    if (font !== (textSvgEl as SVGTextElementExtended).__styleFont) {
        textSvgElStyle.font = (textSvgEl as SVGTextElementExtended).__styleFont = font;
        // The computedFont might not be the orginal font if it is illegal font.
        computedFont = (textSvgEl as SVGTextElementExtended).__computedFont = textSvgElStyle.font;
    }

    const textPadding = style.textPadding as number[];
    const textLineHeight = style.textLineHeight;

    let contentBlock = el.__textCotentBlock;
    if (!contentBlock || el.__dirtyText) {
        contentBlock = el.__textCotentBlock = parsePlainText(
            text, computedFont, textPadding, textLineHeight, style.truncate
        );
    }

    const outerHeight = contentBlock.outerHeight;
    const lineHeight = (contentBlock as PlainTextContentBlock).lineHeight;

    textHelper.getBoxPosition(_tmpTextBoxPos, el, style, hostRect);
    const baseX = _tmpTextBoxPos.baseX;
    const baseY = _tmpTextBoxPos.baseY;
    const textAlign = _tmpTextBoxPos.textAlign || 'left';
    const textVerticalAlign = _tmpTextBoxPos.textVerticalAlign;

    setTextTransform(
        textSvgEl, needTransformTextByHostEl, elTransform, style, hostRect, baseX, baseY
    );

    const boxY = adjustTextY(baseY, outerHeight, textVerticalAlign);
    let textX = baseX;
    let textY = boxY;

    // TODO needDrawBg
    if (textPadding) {
        textX = getTextXForPadding(baseX, textAlign, textPadding);
        textY += textPadding[0];
    }

    // `textBaseline` is set as 'middle'.
    textY += lineHeight / 2;

    bindStyle(textSvgEl, style, true, el);

    // FIXME
    // Add a <style> to reset all of the text font as inherit?
    // otherwise the outer <style> may set the unexpected style.

    // Font may affect position of each tspan elements
    const canCacheByTextString = (contentBlock as PlainTextContentBlock).canCacheByTextString;
    const tspanList = el.__tspanList || (el.__tspanList = []);
    const tspanOriginLen = tspanList.length;

    // Optimize for most cases, just compare text string to determine change.
    if (canCacheByTextString && el.__canCacheByTextString && el.__text === text) {
        if (el.__dirtyText && tspanOriginLen) {
            for (let idx = 0; idx < tspanOriginLen; ++idx) {
                updateTextLocation(tspanList[idx], textAlign, textX, textY + idx * lineHeight);
            }
        }
    }
    else {
        el.__text = text;
        el.__canCacheByTextString = canCacheByTextString;
        const textLines = contentBlock.lines;
        const nTextLines = textLines.length;

        let idx = 0;
        for (; idx < nTextLines; idx++) {
            // Using cached tspan elements
            const singleLineText = textLines[idx];
            let tspan = tspanList[idx];

            if (!tspan) {
                tspan = tspanList[idx] = createElement('tspan') as SVGTSpanElement;
                textSvgEl.appendChild(tspan);
                tspan.appendChild(document.createTextNode(singleLineText as string));
            }
            else if ((tspan as SVGTSpanElementExtended).__zrText !== singleLineText) {
                tspan.innerHTML = '';
                tspan.appendChild(document.createTextNode(singleLineText as string));
            }
            updateTextLocation(tspan, textAlign, textX, textY + idx * lineHeight);
        }
        // Remove unused tspan elements
        if (tspanOriginLen > nTextLines) {
            for (; idx < tspanOriginLen; idx++) {
                textSvgEl.removeChild(tspanList[idx]);
            }
            tspanList.length = nTextLines;
        }
    }
};

function setTextTransform(
    textSvgEl: SVGElement,
    needTransformTextByHostEl: boolean,
    elTransform: matrix.MatrixArray,
    style: StyleOption,
    hostRect: RectLike,
    baseX: number,
    baseY: number
) {
    matrix.identity(_tmpTextTransform);

    if (needTransformTextByHostEl && elTransform) {
        matrix.copy(_tmpTextTransform, elTransform);
    }

    // textRotation only apply in RectText.
    const textRotation = style.textRotation;
    if (hostRect && textRotation) {
        const origin = style.textOrigin;
        if (origin === 'center') {
            baseX = hostRect.width / 2 + hostRect.x;
            baseY = hostRect.height / 2 + hostRect.y;
        }
        else if (origin) {
            baseX = origin[0] + hostRect.x;
            baseY = origin[1] + hostRect.y;
        }

        _tmpTextTransform[4] -= baseX;
        _tmpTextTransform[5] -= baseY;
        // Positive: anticlockwise
        matrix.rotate(_tmpTextTransform, _tmpTextTransform, textRotation);
        _tmpTextTransform[4] += baseX;
        _tmpTextTransform[5] += baseY;
    }
    // See the definition in `Style.js#textOrigin`, the default
    // origin is from the result of `getBoxPosition`.

    setTransform(textSvgEl, _tmpTextTransform);
}

// FIXME merge the same code with `helper/text.js#getTextXForPadding`;
function getTextXForPadding(
    x: number,
    textAlign: TextAlign,
    textPadding: number[]
): number {
    return textAlign === 'right'
        ? (x - textPadding[1])
        : textAlign === 'center'
        ? (x + textPadding[3] / 2 - textPadding[1] / 2)
        : (x + textPadding[3]);
}

function updateTextLocation(
    tspan: SVGTSpanElement,
    textAlign: TextAlign,
    x: number,
    y: number
) {
    // Consider different font display differently in vertial align, we always
    // set vertialAlign as 'middle', and use 'y' to locate text vertically.
    attr(tspan, 'dominant-baseline', 'middle');
    attr(tspan, 'text-anchor', TEXT_ALIGN_TO_ANCHRO[textAlign]);
    attr(tspan, 'x', x + '');
    attr(tspan, 'y', y + '');
}

function removeOldTextNode(el: Displayable) {
    if (el && el.__textSvgEl) {
        // textSvgEl may has no parentNode if el has been removed temporary.
        if (el.__textSvgEl.parentNode) {
            el.__textSvgEl.parentNode.removeChild(el.__textSvgEl);
        }
        el.__textSvgEl = null;
        el.__tspanList = [];
        el.__text = null;
    }
}

svgTextDrawRectText;

var svgText: SVGProxy = {
    brush(el: Displayable) {
        const style = el.style;
        if (style.text != null) {
            svgTextDrawRectText(el, null);
        }
        else {
            removeOldTextNode(el);
        }
    }
};
export {svgText as text};
