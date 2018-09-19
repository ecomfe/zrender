import Group from '../container/Group';
import ZImage from '../graphic/Image';
import Text from '../graphic/Text';
import Circle from '../graphic/shape/Circle';
import Rect from '../graphic/shape/Rect';
import Ellipse from '../graphic/shape/Ellipse';
import Line from '../graphic/shape/Line';
import Path from '../graphic/Path';
import Polygon from '../graphic/shape/Polygon';
import Polyline from '../graphic/shape/Polyline';
import LinearGradient from '../graphic/LinearGradient';
// import RadialGradient from '../graphic/RadialGradient';
// import Pattern from '../graphic/Pattern';
import Style from '../graphic/Style';
// import * as vector from '../core/vector';
import * as matrix from '../core/matrix';
import { createFromString } from './path';
import { isString, extend, defaults, trim, each } from '../core/util';

// Most of the values can be separated by comma and/or white space.
var DILIMITER_REG = /[\s,]+/;

/**
 * For big svg string, this method might be time consuming.
 *
 * @param {string} svg xml string
 * @return {Object} xml root.
 */
export function parseXML(svg) {
    if (isString(svg)) {
        var parser = new DOMParser();
        svg = parser.parseFromString(svg, 'text/xml');
    }

    // Document node. If using $.get, doc node may be input.
    if (svg.nodeType === 9) {
        svg = svg.firstChild;
    }
    // nodeName of <!DOCTYPE svg> is also 'svg'.
    while (svg.nodeName.toLowerCase() !== 'svg' || svg.nodeType !== 1) {
        svg = svg.nextSibling;
    }

    return svg;
}

function SVGParser() {
    this._defs = {};
    this._root = null;

    this._isDefine = false;
    this._isText = false;
}

SVGParser.prototype.parse = function (xml, opt) {
    opt = opt || {};

    var svg = parseXML(xml);

    if (!svg) {
        throw new Error('Illegal svg');
    }

    var root = new Group();
    this._root = root;
    // parse view port
    var viewBox = svg.getAttribute('viewBox') || '';

    // If width/height not specified, means "100%" of `opt.width/height`.
    // TODO: Other percent value not supported yet.
    var width = parseFloat(svg.getAttribute('width') || opt.width);
    var height = parseFloat(svg.getAttribute('height') || opt.height);
    // If width/height not specified, set as null for output.
    isNaN(width) && (width = null);
    isNaN(height) && (height = null);

    // Apply inline style on svg element.
    parseAttributes(svg, root, null, true);

    var child = svg.firstChild;
    while (child) {
        this._parseNode(child, root);
        child = child.nextSibling;
    }

    var viewBoxRect;
    var viewBoxTransform;

    if (viewBox) {
        var viewBoxArr = trim(viewBox).split(DILIMITER_REG);
        // Some invalid case like viewBox: 'none'.
        if (viewBoxArr.length >= 4) {
            viewBoxRect = {
                x: parseFloat(viewBoxArr[0] || 0),
                y: parseFloat(viewBoxArr[1] || 0),
                width: parseFloat(viewBoxArr[2]),
                height: parseFloat(viewBoxArr[3])
            };
        }
    }

    if (viewBoxRect && width != null && height != null) {
        viewBoxTransform = makeViewBoxTransform(viewBoxRect, width, height);

        if (!opt.ignoreViewBox) {
            // If set transform on the output group, it probably bring trouble when
            // some users only intend to show the clipped content inside the viewBox,
            // but not intend to transform the output group. So we keep the output
            // group no transform. If the user intend to use the viewBox as a
            // camera, just set `opt.ignoreViewBox` as `true` and set transfrom
            // manually according to the viewBox info in the output of this method.
            var elRoot = root;
            root = new Group();
            root.add(elRoot);
            elRoot.scale = viewBoxTransform.scale.slice();
            elRoot.position = viewBoxTransform.position.slice();
        }
    }

    // Some shapes might be overflow the viewport, which should be
    // clipped despite whether the viewBox is used, as the SVG does.
    if (!opt.ignoreRootClip && width != null && height != null) {
        root.setClipPath(new Rect({
            shape: {x: 0, y: 0, width: width, height: height}
        }));
    }

    // Set width/height on group just for output the viewport size.
    return {
        root: root,
        width: width,
        height: height,
        viewBoxRect: viewBoxRect,
        viewBoxTransform: viewBoxTransform
    };
};

SVGParser.prototype._parseNode = function (xmlNode, parentGroup) {

    var nodeName = xmlNode.nodeName.toLowerCase();

    // TODO
    // support <style>...</style> in svg, where nodeName is 'style',
    // CSS classes is defined globally wherever the style tags are declared.

    if (nodeName === 'defs') {
        // define flag
        this._isDefine = true;
    }
    else if (nodeName === 'text') {
        this._isText = true;
    }

    var el;
    if (this._isDefine) {
        var parser = defineParsers[nodeName];
        if (parser) {
            var def = parser.call(this, xmlNode);
            var id = xmlNode.getAttribute('id');
            if (id) {
                this._defs[id] = def;
            }
        }
    }
    else {
        var parser = nodeParsers[nodeName];
        if (parser) {
            el = parser.call(this, xmlNode, parentGroup);
            parentGroup.add(el);
        }
    }

    var child = xmlNode.firstChild;
    while (child) {
        if (child.nodeType === 1) {
            this._parseNode(child, el);
        }
        // Is text
        if (child.nodeType === 3 && this._isText) {
            this._parseText(child, el);
        }
        child = child.nextSibling;
    }

    // Quit define
    if (nodeName === 'defs') {
        this._isDefine = false;
    }
    else if (nodeName === 'text') {
        this._isText = false;
    }
};

SVGParser.prototype._parseText = function (xmlNode, parentGroup) {
    if (xmlNode.nodeType === 1) {
        var dx = xmlNode.getAttribute('dx') || 0;
        var dy = xmlNode.getAttribute('dy') || 0;
        this._textX += parseFloat(dx);
        this._textY += parseFloat(dy);
    }

    var text = new Text({
        style: {
            text: xmlNode.textContent,
            transformText: true
        },
        position: [this._textX || 0, this._textY || 0]
    });

    inheritStyle(parentGroup, text);
    parseAttributes(xmlNode, text, this._defs);

    var fontSize = text.style.fontSize;
    if (fontSize && fontSize < 9) {
        // PENDING
        text.style.fontSize = 9;
        text.scale = text.scale || [1, 1];
        text.scale[0] *= fontSize / 9;
        text.scale[1] *= fontSize / 9;
    }

    var rect = text.getBoundingRect();
    this._textX += rect.width;

    parentGroup.add(text);

    return text;
};

var nodeParsers = {
    'g': function (xmlNode, parentGroup) {
        var g = new Group();
        inheritStyle(parentGroup, g);
        parseAttributes(xmlNode, g, this._defs);

        return g;
    },
    'rect': function (xmlNode, parentGroup) {
        var rect = new Rect();
        inheritStyle(parentGroup, rect);
        parseAttributes(xmlNode, rect, this._defs);

        rect.setShape({
            x: parseFloat(xmlNode.getAttribute('x') || 0),
            y: parseFloat(xmlNode.getAttribute('y') || 0),
            width: parseFloat(xmlNode.getAttribute('width') || 0),
            height: parseFloat(xmlNode.getAttribute('height') || 0)
        });

        // console.log(xmlNode.getAttribute('transform'));
        // console.log(rect.transform);

        return rect;
    },
    'circle': function (xmlNode, parentGroup) {
        var circle = new Circle();
        inheritStyle(parentGroup, circle);
        parseAttributes(xmlNode, circle, this._defs);

        circle.setShape({
            cx: parseFloat(xmlNode.getAttribute('cx') || 0),
            cy: parseFloat(xmlNode.getAttribute('cy') || 0),
            r: parseFloat(xmlNode.getAttribute('r') || 0)
        });

        return circle;
    },
    'line': function (xmlNode, parentGroup) {
        var line = new Line();
        inheritStyle(parentGroup, line);
        parseAttributes(xmlNode, line, this._defs);

        line.setShape({
            x1: parseFloat(xmlNode.getAttribute('x1') || 0),
            y1: parseFloat(xmlNode.getAttribute('y1') || 0),
            x2: parseFloat(xmlNode.getAttribute('x2') || 0),
            y2: parseFloat(xmlNode.getAttribute('y2') || 0)
        });

        return line;
    },
    'ellipse': function (xmlNode, parentGroup) {
        var ellipse = new Ellipse();
        inheritStyle(parentGroup, ellipse);
        parseAttributes(xmlNode, ellipse, this._defs);

        ellipse.setShape({
            cx: parseFloat(xmlNode.getAttribute('cx') || 0),
            cy: parseFloat(xmlNode.getAttribute('cy') || 0),
            rx: parseFloat(xmlNode.getAttribute('rx') || 0),
            ry: parseFloat(xmlNode.getAttribute('ry') || 0)
        });
        return ellipse;
    },
    'polygon': function (xmlNode, parentGroup) {
        var points = xmlNode.getAttribute('points');
        if (points) {
            points = parsePoints(points);
        }
        var polygon = new Polygon({
            shape: {
                points: points || []
            }
        });

        inheritStyle(parentGroup, polygon);
        parseAttributes(xmlNode, polygon, this._defs);

        return polygon;
    },
    'polyline': function (xmlNode, parentGroup) {
        var path = new Path();
        inheritStyle(parentGroup, path);
        parseAttributes(xmlNode, path, this._defs);

        var points = xmlNode.getAttribute('points');
        if (points) {
            points = parsePoints(points);
        }
        var polyline = new Polyline({
            shape: {
                points: points || []
            }
        });

        return polyline;
    },
    'image': function (xmlNode, parentGroup) {
        var img = new ZImage();
        inheritStyle(parentGroup, img);
        parseAttributes(xmlNode, img, this._defs);

        img.setStyle({
            image: xmlNode.getAttribute('xlink:href'),
            x: xmlNode.getAttribute('x'),
            y: xmlNode.getAttribute('y'),
            width: xmlNode.getAttribute('width'),
            height: xmlNode.getAttribute('height')
        });

        return img;
    },
    'text': function (xmlNode, parentGroup) {
        var x = xmlNode.getAttribute('x') || 0;
        var y = xmlNode.getAttribute('y') || 0;
        var dx = xmlNode.getAttribute('dx') || 0;
        var dy = xmlNode.getAttribute('dy') || 0;

        this._textX = parseFloat(x) + parseFloat(dx);
        this._textY = parseFloat(y) + parseFloat(dy);

        var g = new Group();
        inheritStyle(parentGroup, g);
        parseAttributes(xmlNode, g, this._defs);

        return g;
    },
    'tspan': function (xmlNode, parentGroup) {
        var x = xmlNode.getAttribute('x');
        var y = xmlNode.getAttribute('y');
        if (x != null) {
            // new offset x
            this._textX = parseFloat(x);
        }
        if (y != null) {
            // new offset y
            this._textY = parseFloat(y);
        }
        var dx = xmlNode.getAttribute('dx') || 0;
        var dy = xmlNode.getAttribute('dy') || 0;

        var g = new Group();

        inheritStyle(parentGroup, g);
        parseAttributes(xmlNode, g, this._defs);


        this._textX += dx;
        this._textY += dy;

        return g;
    },
    'path': function (xmlNode, parentGroup) {
        // TODO svg fill rule
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule
        // path.style.globalCompositeOperation = 'xor';
        var d = xmlNode.getAttribute('d') || '';

        // Performance sensitive.

        var path = createFromString(d);

        inheritStyle(parentGroup, path);
        parseAttributes(xmlNode, path, this._defs);

        return path;
    }
};

var defineParsers = {

    'lineargradient': function (xmlNode) {
        var x1 = parseInt(xmlNode.getAttribute('x1') || 0, 10);
        var y1 = parseInt(xmlNode.getAttribute('y1') || 0, 10);
        var x2 = parseInt(xmlNode.getAttribute('x2') || 10, 10);
        var y2 = parseInt(xmlNode.getAttribute('y2') || 0, 10);

        var gradient = new LinearGradient(x1, y1, x2, y2);

        _parseGradientColorStops(xmlNode, gradient);

        return gradient;
    },

    'radialgradient': function (xmlNode) {

    }
};

function _parseGradientColorStops(xmlNode, gradient) {

    var stop = xmlNode.firstChild;

    while (stop) {
        if (stop.nodeType === 1) {
            var offset = stop.getAttribute('offset');
            if (offset.indexOf('%') > 0) {  // percentage
                offset = parseInt(offset, 10) / 100;
            }
            else if (offset) {    // number from 0 to 1
                offset = parseFloat(offset);
            }
            else {
                offset = 0;
            }

            var stopColor = stop.getAttribute('stop-color') || '#000000';

            gradient.addColorStop(offset, stopColor);
        }
        stop = stop.nextSibling;
    }
}

function inheritStyle(parent, child) {
    if (parent && parent.__inheritedStyle) {
        if (!child.__inheritedStyle) {
            child.__inheritedStyle = {};
        }
        defaults(child.__inheritedStyle, parent.__inheritedStyle);
    }
}

function parsePoints(pointsString) {
    var list = trim(pointsString).split(DILIMITER_REG);
    var points = [];

    for (var i = 0; i < list.length; i += 2) {
        var x = parseFloat(list[i]);
        var y = parseFloat(list[i + 1]);
        points.push([x, y]);
    }
    return points;
}

var attributesMap = {
    'fill': 'fill',
    'stroke': 'stroke',
    'stroke-width': 'lineWidth',
    'opacity': 'opacity',
    'fill-opacity': 'fillOpacity',
    'stroke-opacity': 'strokeOpacity',
    'stroke-dasharray': 'lineDash',
    'stroke-dashoffset': 'lineDashOffset',
    'stroke-linecap': 'lineCap',
    'stroke-linejoin': 'lineJoin',
    'stroke-miterlimit': 'miterLimit',
    'font-family': 'fontFamily',
    'font-size': 'fontSize',
    'font-style': 'fontStyle',
    'font-weight': 'fontWeight',

    'text-align': 'textAlign',
    'alignment-baseline': 'textBaseline'
};

function parseAttributes(xmlNode, el, defs, onlyInlineStyle) {
    var zrStyle = el.__inheritedStyle || {};
    var isTextEl = el.type === 'text';

    // TODO Shadow
    if (xmlNode.nodeType === 1) {
        parseTransformAttribute(xmlNode, el);

        extend(zrStyle, parseStyleAttribute(xmlNode));

        if (!onlyInlineStyle) {
            for (var svgAttrName in attributesMap) {
                if (attributesMap.hasOwnProperty(svgAttrName)) {
                    var attrValue = xmlNode.getAttribute(svgAttrName);
                    if (attrValue != null) {
                        zrStyle[attributesMap[svgAttrName]] = attrValue;
                    }
                }
            }
        }
    }

    var elFillProp = isTextEl ? 'textFill' : 'fill';
    var elStrokeProp = isTextEl ? 'textStroke' : 'stroke';

    el.style = el.style || new Style();
    var elStyle = el.style;

    zrStyle.fill != null && elStyle.set(elFillProp, getPaint(zrStyle.fill, defs));
    zrStyle.stroke != null && elStyle.set(elStrokeProp, getPaint(zrStyle.stroke, defs));

    each([
        'lineWidth', 'opacity', 'fillOpacity', 'strokeOpacity', 'miterLimit', 'fontSize'
    ], function (propName) {
        var elPropName = (propName === 'lineWidth' && isTextEl) ? 'textStrokeWidth' : propName;
        zrStyle[propName] != null && elStyle.set(elPropName, parseFloat(zrStyle[propName]));
    });

    if (!zrStyle.textBaseline || zrStyle.textBaseline === 'auto') {
        zrStyle.textBaseline = 'alphabetic';
    }
    if (zrStyle.textBaseline === 'alphabetic') {
        zrStyle.textBaseline = 'bottom';
    }
    if (zrStyle.textAlign === 'start') {
        zrStyle.textAlign = 'left';
    }
    if (zrStyle.textAlign === 'end') {
        zrStyle.textAlign = 'right';
    }

    each(['lineDashOffset', 'lineCap', 'lineJoin',
        'fontWeight', 'fontFamily', 'fontStyle', 'textAlign', 'textBaseline'
    ], function (propName) {
        zrStyle[propName] != null && elStyle.set(propName, zrStyle[propName]);
    });

    if (zrStyle.lineDash) {
        el.style.lineDash = trim(zrStyle.lineDash).split(DILIMITER_REG);
    }

    if (elStyle[elStrokeProp] && elStyle[elStrokeProp] !== 'none') {
        // enable stroke
        el[elStrokeProp] = true;
    }

    el.__inheritedStyle = zrStyle;
}


var urlRegex = /url\(\s*#(.*?)\)/;
function getPaint(str, defs) {
    // if (str === 'none') {
    //     return;
    // }
    var urlMatch = defs && str && str.match(urlRegex);
    if (urlMatch) {
        var url = trim(urlMatch[1]);
        var def = defs[url];
        return def;
    }
    return str;
}

var transformRegex = /(translate|scale|rotate|skewX|skewY|matrix)\(([\-\s0-9\.e,]*)\)/g;

function parseTransformAttribute(xmlNode, node) {
    var transform = xmlNode.getAttribute('transform');
    if (transform) {
        transform = transform.replace(/,/g, ' ');
        var m = null;
        var transformOps = [];
        transform.replace(transformRegex, function (str, type, value) {
            transformOps.push(type, value);
        });
        for (var i = transformOps.length - 1; i > 0; i -= 2) {
            var value = transformOps[i];
            var type = transformOps[i - 1];
            m = m || matrix.create();
            switch (type) {
                case 'translate':
                    value = trim(value).split(DILIMITER_REG);
                    matrix.translate(m, m, [parseFloat(value[0]), parseFloat(value[1] || 0)]);
                    break;
                case 'scale':
                    value = trim(value).split(DILIMITER_REG);
                    matrix.scale(m, m, [parseFloat(value[0]), parseFloat(value[1] || value[0])]);
                    break;
                case 'rotate':
                    value = trim(value).split(DILIMITER_REG);
                    matrix.rotate(m, m, parseFloat(value[0]));
                    break;
                case 'skew':
                    value = trim(value).split(DILIMITER_REG);
                    console.warn('Skew transform is not supported yet');
                    break;
                case 'matrix':
                    var value = trim(value).split(DILIMITER_REG);
                    m[0] = parseFloat(value[0]);
                    m[1] = parseFloat(value[1]);
                    m[2] = parseFloat(value[2]);
                    m[3] = parseFloat(value[3]);
                    m[4] = parseFloat(value[4]);
                    m[5] = parseFloat(value[5]);
                    break;
            }
        }
    }
    node.setLocalTransform(m);

}

// Value may contain space.
var styleRegex = /([^\s:;]+)\s*:\s*([^:;]+)/g;
function parseStyleAttribute(xmlNode) {
    var style = xmlNode.getAttribute('style');
    var result = {};

    if (!style) {
        return result;
    }

    var styleList = {};
    styleRegex.lastIndex = 0;
    var styleRegResult;
    while ((styleRegResult = styleRegex.exec(style)) != null) {
        styleList[styleRegResult[1]] = styleRegResult[2];
    }

    for (var svgAttrName in attributesMap) {
        if (attributesMap.hasOwnProperty(svgAttrName) && styleList[svgAttrName] != null) {
            result[attributesMap[svgAttrName]] = styleList[svgAttrName];
        }
    }

    return result;
}

/**
 * @param {Array.<number>} viewBoxRect
 * @param {number} width
 * @param {number} height
 * @return {Object} {scale, position}
 */
export function makeViewBoxTransform(viewBoxRect, width, height) {
    var scaleX = width / viewBoxRect.width;
    var scaleY = height / viewBoxRect.height;
    var scale = Math.min(scaleX, scaleY);
    // preserveAspectRatio 'xMidYMid'
    var viewBoxScale = [scale, scale];
    var viewBoxPosition = [
        -(viewBoxRect.x + viewBoxRect.width / 2) * scale + width / 2,
        -(viewBoxRect.y + viewBoxRect.height / 2) * scale + height / 2
    ];

    return {
        scale: viewBoxScale,
        position: viewBoxPosition
    };
}

/**
 * @param {string|XMLElement} xml
 * @param {Object} [opt]
 * @param {number} [opt.width] Default width if svg width not specified or is a percent value.
 * @param {number} [opt.height] Default height if svg height not specified or is a percent value.
 * @param {boolean} [opt.ignoreViewBox]
 * @param {boolean} [opt.ignoreRootClip]
 * @return {Object} result:
 * {
 *     root: Group, The root of the the result tree of zrender shapes,
 *     width: number, the viewport width of the SVG,
 *     height: number, the viewport height of the SVG,
 *     viewBoxRect: {x, y, width, height}, the declared viewBox rect of the SVG, if exists,
 *     viewBoxTransform: the {scale, position} calculated by viewBox and viewport, is exists.
 * }
 */
export function parseSVG(xml, opt) {
    var parser = new SVGParser();
    return parser.parse(xml, opt);
}