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

        /**
         * FIXME:
         * This is a temporary fix for Chrome's clipping bug
         * that happens when a clip-path is referring another one.
         * This fix should be used before Chrome's bug is fixed.
         * For an element that has clip-path, and fill is none,
         * set it to be "rgba(0, 0, 0, 0.002)" will hide the element.
         * Otherwise, it will show black fill color.
         * 0.002 is used because this won't work for alpha values smaller
         * than 0.002.
         *
         * See
         * https://bugs.chromium.org/p/chromium/issues/detail?id=659790
         * for more information.
         */
        if (svgEl.getAttribute('clip-path') !== 'none' && fill === NONE) {
            fill = 'rgba(0, 0, 0, 0.002)';
        }

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
                    && !isAroundZero(dThetaPositive);

                var large = false;
                if (dThetaPositive >= PI2) {
                    large = true;
                }
                else if (isAroundZero(dThetaPositive)) {
                    large = false;
                }
                else {
                    large = (dTheta > -PI && dTheta < 0 || dTheta > PI)
                        === !!clockwise;
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
var tmpRect = new BoundingRect();

var svgTextDrawRectText = function (el, rect, textRect) {
    var style = el.style;

    el.__dirty && textHelper.normalizeTextStyle(style, true);

    var text = style.text;
    // Convert to string
    if (text == null) {
        // Draw no text only when text is set to null, but not ''
        return;
    }
    else {
        text += '';
    }

    var textSvgEl = el.__textSvgEl;
    if (!textSvgEl) {
        textSvgEl = createElement('text');
        el.__textSvgEl = textSvgEl;
    }

    var x;
    var y;
    var textPosition = style.textPosition;
    var distance = style.textDistance;
    var align = style.textAlign || 'left';

    if (typeof style.fontSize === 'number') {
        style.fontSize += 'px';
    }
    var font = style.font
        || [
            style.fontStyle || '',
            style.fontWeight || '',
            style.fontSize || '',
            style.fontFamily || ''
        ].join(' ')
        || textContain.DEFAULT_FONT;

    var verticalAlign = getVerticalAlignForSvg(style.textVerticalAlign);

    textRect = textContain.getBoundingRect(
        text, font, align,
        verticalAlign, style.textPadding, style.textLineHeight
    );

    var lineHeight = textRect.lineHeight;
    // Text position represented by coord
    if (textPosition instanceof Array) {
        x = rect.x + textPosition[0];
        y = rect.y + textPosition[1];
    }
    else {
        var newPos = textContain.adjustTextPositionOnRect(
            textPosition, rect, distance
        );
        x = newPos.x;
        y = newPos.y;
        verticalAlign = getVerticalAlignForSvg(newPos.textVerticalAlign);
        align = newPos.textAlign;
    }

    attr(textSvgEl, 'alignment-baseline', verticalAlign);

    if (font) {
        textSvgEl.style.font = font;
    }

    var textPadding = style.textPadding;

    // Make baseline top
    attr(textSvgEl, 'x', x);
    attr(textSvgEl, 'y', y);

    bindStyle(textSvgEl, style, true, el);
    if (el instanceof Text || el.style.transformText) {
        // Transform text with element
        setTransform(textSvgEl, el.transform);
    }
    else {
        if (el.transform) {
            tmpRect.copy(rect);
            tmpRect.applyTransform(el.transform);
            rect = tmpRect;
        }
        else {
            var pos = el.transformCoordToGlobal(rect.x, rect.y);
            rect.x = pos[0];
            rect.y = pos[1];
            el.transform = matrix.identity(matrix.create());
        }

        // Text rotation, but no element transform
        var origin = style.textOrigin;
        if (origin === 'center') {
            x = textRect.width / 2 + x;
            y = textRect.height / 2 + y;
        }
        else if (origin) {
            x = origin[0] + x;
            y = origin[1] + y;
        }
        var rotate = -style.textRotation || 0;
        var transform = matrix.create();
        // Apply textRotate to element matrix
        matrix.rotate(transform, transform, rotate);

        var pos = [el.transform[4], el.transform[5]];
        matrix.translate(transform, transform, pos);
        setTransform(textSvgEl, transform);
    }

    var textLines = text.split('\n');
    var nTextLines = textLines.length;
    var textAnchor = align;
    // PENDING
    if (textAnchor === 'left') {
        textAnchor = 'start';
        textPadding && (x += textPadding[3]);
    }
    else if (textAnchor === 'right') {
        textAnchor = 'end';
        textPadding && (x -= textPadding[1]);
    }
    else if (textAnchor === 'center') {
        textAnchor = 'middle';
        textPadding && (x += (textPadding[3] - textPadding[1]) / 2);
    }

    var dy = 0;
    if (verticalAlign === 'after-edge') {
        dy = -textRect.height + lineHeight;
        textPadding && (dy -= textPadding[2]);
    }
    else if (verticalAlign === 'middle') {
        dy = (-textRect.height + lineHeight) / 2;
        textPadding && (y += (textPadding[0] - textPadding[2]) / 2);
    }
    else {
        textPadding && (dy += textPadding[0]);
    }

    // Font may affect position of each tspan elements
    if (el.__text !== text || el.__textFont !== font) {
        var tspanList = el.__tspanList || [];
        el.__tspanList = tspanList;
        for (var i = 0; i < nTextLines; i++) {
            // Using cached tspan elements
            var tspan = tspanList[i];
            if (!tspan) {
                tspan = tspanList[i] = createElement('tspan');
                textSvgEl.appendChild(tspan);
                attr(tspan, 'alignment-baseline', verticalAlign);
                attr(tspan, 'text-anchor', textAnchor);
            }
            else {
                tspan.innerHTML = '';
            }
            attr(tspan, 'x', x);
            attr(tspan, 'y', y + i * lineHeight + dy);
            tspan.appendChild(document.createTextNode(textLines[i]));
        }
        // Remove unsed tspan elements
        for (; i < tspanList.length; i++) {
            textSvgEl.removeChild(tspanList[i]);
        }
        tspanList.length = nTextLines;

        el.__text = text;
        el.__textFont = font;
    }
    else if (el.__tspanList.length) {
        // Update span x and y
        var len = el.__tspanList.length;
        for (var i = 0; i < len; ++i) {
            var tspan = el.__tspanList[i];
            if (tspan) {
                attr(tspan, 'x', x);
                attr(tspan, 'y', y + i * lineHeight + dy);
            }
        }
    }
};

function getVerticalAlignForSvg(verticalAlign) {
    if (verticalAlign === 'middle') {
        return 'middle';
    }
    else if (verticalAlign === 'bottom') {
        return 'after-edge';
    }
    else {
        return 'hanging';
    }
}

svgText.drawRectText = svgTextDrawRectText;

svgText.brush = function (el) {
    var style = el.style;
    if (style.text != null) {
        // 强制设置 textPosition
        style.textPosition = [0, 0];
        svgTextDrawRectText(el, {
            x: style.x || 0, y: style.y || 0,
            width: 0, height: 0
        }, el.getBoundingRect());
    }
};
