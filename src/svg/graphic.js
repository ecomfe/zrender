// TODO
// 1. shadow
// 2. Image: sx, sy, sw, sh

import {createElement} from './core';
import PathProxy from '../core/PathProxy';
import BoundingRect from '../core/BoundingRect';
import * as matrix from '../core/matrix';
import * as textContain from '../contain/text';
import * as textHelper from '../graphic/helper/text';
import Text from '../graphic/Text';

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

function round4(val) {
    return mathRound(val * 1e4) / 1e4;
}

function isAroundZero(val) {
    return val < EPSILON && val > -EPSILON;
}

function pathHasFill(style, isText) {
    var fill = isText ? style.textFill : style.fill;
    return fill != null && fill !== NONE;
}

function pathHasStroke(style, isText) {
    var stroke = isText ? style.textStroke : style.stroke;
    return stroke != null && stroke !== NONE;
}

function setTransform(svgEl, m) {
    if (m) {
        attr(svgEl, 'transform', 'matrix(' + arrayJoin.call(m, ',') + ')');
    }
}

function attr(el, key, val) {
    if (!val || val.type !== 'linear' && val.type !== 'radial') {
        // Don't set attribute for gradient, since it need new dom nodes
        el.setAttribute(key, val);
    }
}

function attrXLink(el, key, val) {
    el.setAttributeNS('http://www.w3.org/1999/xlink', key, val);
}

function bindStyle(svgEl, style, isText, el) {
    if (pathHasFill(style, isText)) {
        var fill = isText ? style.textFill : style.fill;
        fill = fill === 'transparent' ? NONE : fill;
        attr(svgEl, 'fill', fill);
        attr(svgEl, 'fill-opacity', style.fillOpacity != null ? style.fillOpacity * style.opacity : style.opacity);
    }
    else {
        attr(svgEl, 'fill', NONE);
    }

    if (pathHasStroke(style, isText)) {
        var stroke = isText ? style.textStroke : style.stroke;
        stroke = stroke === 'transparent' ? NONE : stroke;
        attr(svgEl, 'stroke', stroke);
        var strokeWidth = isText
            ? style.textStrokeWidth
            : style.lineWidth;
        var strokeScale = !isText && style.strokeNoScale
            ? el.getLineScale()
            : 1;
        attr(svgEl, 'stroke-width', strokeWidth / strokeScale);
        // stroke then fill for text; fill then stroke for others
        attr(svgEl, 'paint-order', isText ? 'stroke' : 'fill');
        attr(svgEl, 'stroke-opacity', style.strokeOpacity != null ? style.strokeOpacity : style.opacity);
        var lineDash = style.lineDash;
        if (lineDash) {
            attr(svgEl, 'stroke-dasharray', style.lineDash.join(','));
            attr(svgEl, 'stroke-dashoffset', mathRound(style.lineDashOffset || 0));
        }
        else {
            attr(svgEl, 'stroke-dasharray', '');
        }

        // PENDING
        style.lineCap && attr(svgEl, 'stroke-linecap', style.lineCap);
        style.lineJoin && attr(svgEl, 'stroke-linejoin', style.lineJoin);
        style.miterLimit && attr(svgEl, 'stroke-miterlimit', style.miterLimit);
    }
    else {
        attr(svgEl, 'stroke', NONE);
    }
}

/***************************************************
 * PATH
 **************************************************/
function pathDataToString(path) {
    var str = [];
    var data = path.data;
    var dataLength = path.len();
    for (var i = 0; i < dataLength;) {
        var cmd = data[i++];
        var cmdStr = '';
        var nData = 0;
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
                var cx = data[i++];
                var cy = data[i++];
                var rx = data[i++];
                var ry = data[i++];
                var theta = data[i++];
                var dTheta = data[i++];
                var psi = data[i++];
                var clockwise = data[i++];

                var dThetaPositive = Math.abs(dTheta);
                var isCircle = isAroundZero(dThetaPositive - PI2)
                    || (clockwise ? dTheta >= PI2 : -dTheta >= PI2);

                // Mapping to 0~2PI
                var unifiedTheta = dTheta > 0 ? dTheta % PI2 : (dTheta % PI2 + PI2);

                var large = false;
                if (isCircle) {
                    large = true;
                }
                else if (isAroundZero(dThetaPositive)) {
                    large = false;
                }
                else {
                    large = (unifiedTheta >= PI) === !!clockwise;
                }

                var x0 = round4(cx + rx * mathCos(theta));
                var y0 = round4(cy + ry * mathSin(theta));

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

                var x = round4(cx + rx * mathCos(theta + dTheta));
                var y = round4(cy + ry * mathSin(theta + dTheta));

                // FIXME Ellipse
                str.push('A', round4(rx), round4(ry),
                    mathRound(psi * degree), +large, +clockwise, x, y);
                break;
            case CMD.Z:
                cmdStr = 'Z';
                break;
            case CMD.R:
                var x = round4(data[i++]);
                var y = round4(data[i++]);
                var w = round4(data[i++]);
                var h = round4(data[i++]);
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
        for (var j = 0; j < nData; j++) {
            // PENDING With scale
            str.push(round4(data[i++]));
        }
    }
    return str.join(' ');
}

var svgPath = {};
export {svgPath as path};

svgPath.brush = function (el) {
    var style = el.style;

    var svgEl = el.__svgEl;
    if (!svgEl) {
        svgEl = createElement('path');
        el.__svgEl = svgEl;
    }

    if (!el.path) {
        el.createPathProxy();
    }
    var path = el.path;

    if (el.__dirtyPath) {
        path.beginPath();
        path.subPixelOptimize = false;
        el.buildPath(path, el.shape);
        el.__dirtyPath = false;

        var pathStr = pathDataToString(path);
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
};

/***************************************************
 * IMAGE
 **************************************************/
var svgImage = {};
export {svgImage as image};

svgImage.brush = function (el) {
    var style = el.style;
    var image = style.image;

    if (image instanceof HTMLImageElement) {
        var src = image.src;
        image = src;
    }
    if (!image) {
        return;
    }

    var x = style.x || 0;
    var y = style.y || 0;

    var dw = style.width;
    var dh = style.height;

    var svgEl = el.__svgEl;
    if (!svgEl) {
        svgEl = createElement('image');
        el.__svgEl = svgEl;
    }

    if (image !== el.__imageSrc) {
        attrXLink(svgEl, 'href', image);
        // Caching image src
        el.__imageSrc = image;
    }

    attr(svgEl, 'width', dw);
    attr(svgEl, 'height', dh);

    attr(svgEl, 'x', x);
    attr(svgEl, 'y', y);

    setTransform(svgEl, el.transform);

    if (style.text != null) {
        svgTextDrawRectText(el, el.getBoundingRect());
    }
};

/***************************************************
 * TEXT
 **************************************************/
var svgText = {};
export {svgText as text};
var _tmpTextHostRect = new BoundingRect();
var _tmpTextBoxPos = {};
var _tmpTextTransform = [];
var TEXT_ALIGN_TO_ANCHRO = {
    left: 'start',
    right: 'end',
    center: 'middle',
    middle: 'middle'
};

/**
 * @param {module:zrender/Element} el
 * @param {Object|boolean} [hostRect] {x, y, width, height}
 *        If set false, rect text is not used.
 */
var svgTextDrawRectText = function (el, hostRect) {
    var style = el.style;
    var elTransform = el.transform;
    var needTransformTextByHostEl = el instanceof Text || style.transformText;

    el.__dirty && textHelper.normalizeTextStyle(style, true);

    var text = style.text;
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

    var textSvgEl = el.__textSvgEl;
    if (!textSvgEl) {
        textSvgEl = createElement('text');
        el.__textSvgEl = textSvgEl;
    }

    // style.font has been normalized by `normalizeTextStyle`.
    var textSvgElStyle = textSvgEl.style;
    var font = style.font || textContain.DEFAULT_FONT;
    var computedFont = textSvgEl.__computedFont;
    if (font !== textSvgEl.__styleFont) {
        textSvgElStyle.font = textSvgEl.__styleFont = font;
        // The computedFont might not be the orginal font if it is illegal font.
        computedFont = textSvgEl.__computedFont = textSvgElStyle.font;
    }

    var textPadding = style.textPadding;
    var textLineHeight = style.textLineHeight;

    var contentBlock = el.__textCotentBlock;
    if (!contentBlock || el.__dirtyText) {
        contentBlock = el.__textCotentBlock = textContain.parsePlainText(
            text, computedFont, textPadding, textLineHeight, style.truncate
        );
    }

    var outerHeight = contentBlock.outerHeight;
    var lineHeight = contentBlock.lineHeight;

    textHelper.getBoxPosition(_tmpTextBoxPos, el, style, hostRect);
    var baseX = _tmpTextBoxPos.baseX;
    var baseY = _tmpTextBoxPos.baseY;
    var textAlign = _tmpTextBoxPos.textAlign || 'left';
    var textVerticalAlign = _tmpTextBoxPos.textVerticalAlign;

    setTextTransform(
        textSvgEl, needTransformTextByHostEl, elTransform, style, hostRect, baseX, baseY
    );

    var boxY = textContain.adjustTextY(baseY, outerHeight, textVerticalAlign);
    var textX = baseX;
    var textY = boxY;

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
    var canCacheByTextString = contentBlock.canCacheByTextString;
    var tspanList = el.__tspanList || (el.__tspanList = []);
    var tspanOriginLen = tspanList.length;

    // Optimize for most cases, just compare text string to determine change.
    if (canCacheByTextString && el.__canCacheByTextString && el.__text === text) {
        if (el.__dirtyText && tspanOriginLen) {
            for (var idx = 0; idx < tspanOriginLen; ++idx) {
                updateTextLocation(tspanList[idx], textAlign, textX, textY + idx * lineHeight);
            }
        }
    }
    else {
        el.__text = text;
        el.__canCacheByTextString = canCacheByTextString;
        var textLines = contentBlock.lines;
        var nTextLines = textLines.length;

        var idx = 0;
        for (; idx < nTextLines; idx++) {
            // Using cached tspan elements
            var tspan = tspanList[idx];
            var singleLineText = textLines[idx];

            if (!tspan) {
                tspan = tspanList[idx] = createElement('tspan');
                textSvgEl.appendChild(tspan);
                tspan.appendChild(document.createTextNode(singleLineText));
            }
            else if (tspan.__zrText !== singleLineText) {
                tspan.innerHTML = '';
                tspan.appendChild(document.createTextNode(singleLineText));
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

function setTextTransform(textSvgEl, needTransformTextByHostEl, elTransform, style, hostRect, baseX, baseY) {
    matrix.identity(_tmpTextTransform);

    if (needTransformTextByHostEl && elTransform) {
        matrix.copy(_tmpTextTransform, elTransform);
    }

    // textRotation only apply in RectText.
    var textRotation = style.textRotation;
    if (hostRect && textRotation) {
        var origin = style.textOrigin;
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
function getTextXForPadding(x, textAlign, textPadding) {
    return textAlign === 'right'
        ? (x - textPadding[1])
        : textAlign === 'center'
        ? (x + textPadding[3] / 2 - textPadding[1] / 2)
        : (x + textPadding[3]);
}

function updateTextLocation(tspan, textAlign, x, y) {
    // Consider different font display differently in vertial align, we always
    // set vertialAlign as 'middle', and use 'y' to locate text vertically.
    attr(tspan, 'dominant-baseline', 'middle');
    attr(tspan, 'text-anchor', TEXT_ALIGN_TO_ANCHRO[textAlign]);
    attr(tspan, 'x', x);
    attr(tspan, 'y', y);
}

svgText.drawRectText = svgTextDrawRectText;

svgText.brush = function (el) {
    var style = el.style;
    if (style.text != null) {
        svgTextDrawRectText(el, false);
    }
};
