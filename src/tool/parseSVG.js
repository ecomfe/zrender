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
import RadialGradient from '../graphic/RadialGradient';
import Pattern from '../graphic/Pattern';
import Style from '../graphic/Style';
import * as vector from '../core/vector';
import * as matrix from '../core/matrix';
import { createFromString } from './path';
import { extend, defaults, trim, each } from '../core/util';

// Most of the values can be separated by comma and/or white space.
var DILIMITER_REG = /[\s|,]+/;

function SVGParser() {
    this._defs = {};
    this._root = null;

    this._isDefine = false;
    this._isText = false;
}

SVGParser.prototype.parse = function (xml, opt) {
    opt = opt || {};
    var svg;

    if (typeof(xml) === 'string') {
        var parser = new DOMParser();
        var doc = parser.parseFromString(xml, 'text/xml');
        svg = doc.firstChild;
        // nodeName of <!DOCTYPE svg> is also 'svg'.
        while (svg.nodeName.toLowerCase() !== 'svg' || svg.nodeType !== 1) {
            svg = svg.nextSibling;
        }
    }
    else {
        svg = xml;
    }

    if (!svg) {
        throw new Error('Illegal svg');
    }

    var root = new Group();
    this._root = root;
    // parse view port
    var viewBox = svg.getAttribute('viewBox') || '';

    // If width/height not specified, means "100%".
    // TODO: Other percent value not supported yet.
    var width = parseFloat(svg.getAttribute('width') || opt.width || 0);
    var height = parseFloat(svg.getAttribute('height') || opt.height || 0);
    var elRoot = root;

    if (viewBox) {
        var viewBoxArr = viewBox.split(DILIMITER_REG);
        var x = parseFloat(viewBoxArr[0] || 0);
        var y = parseFloat(viewBoxArr[1] || 0);
        var vWidth = parseFloat(viewBoxArr[2]);
        var vHeight = parseFloat(viewBoxArr[3]);

        // Keep the output group no transform, avoiding trouble for outer usage.
        root.add(elRoot = new Group());
        var scaleX = width / vWidth;
        var scaleY = height / vHeight;
        var scale = Math.min(scaleX, scaleY);
        // preserveAspectRatio 'xMidYMid'
        elRoot.scale = [scale, scale];
        elRoot.position = [
            -(x + vWidth / 2) * scale + width / 2,
            -(y + vHeight / 2) * scale + height / 2
        ];
    }

    var child = svg.firstChild;
    while (child) {
        this._parseNode(child, elRoot);
        child = child.nextSibling;
    }

    // The viewport should clip contents.
    root.setClipPath(new Rect({
        shape: {x: 0, y: 0, width: width, height: height}
    }));

    // Set width/height on group just for output the viewport size.
    root.width = width;
    root.height = height;

    return root;
};

SVGParser.prototype._parseNode = function (xmlNode, parentGroup) {

    var nodeName = xmlNode.nodeName.toLowerCase();

    if (nodeName === 'defs') {
        // define flag
        this._isDefine = true;
    }
    else if (nodeName === 'text') {
        this._isText = true;
    }

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
            var el = parser.call(this, xmlNode, parentGroup);
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
    if (fontSize && fontSize < 12) {
        // PENDING
        text.style.fontSize = 12;
        text.scale = text.scale || [1, 1];
        text.scale[0] *= fontSize / 12;
        text.scale[1] *= fontSize / 12;
    }

    var rect = text.getBoundingRect();
    this._textX += rect.width;

    parentGroup.add(text);

    return text;
};

export default SVGParser;

var nodeParsers = {
    'g': function(xmlNode, parentGroup) {
        var g = new Group();
        inheritStyle(parentGroup, g);
        parseAttributes(xmlNode, g, this._defs);

        return g;
    },
    'rect': function(xmlNode, parentGroup) {
        var rect = new Rect();
        parseAttributes(xmlNode, rect, this._defs);
        inheritStyle(parentGroup, rect);

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
    'circle': function(xmlNode, parentGroup) {
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
    'line': function(xmlNode, parentGroup) {
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
    'ellipse': function(xmlNode, parentGroup) {
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
    'polygon': function(xmlNode, parentGroup) {
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
    'polyline': function(xmlNode, parentGroup) {
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
    'image': function(xmlNode, parentGroup) {
        var img = new ZImage();
        // if (parentGroup) {
        //     inheritStyle(parentGroup, img);
        // }
        // parseAttributes(xmlNode, img, this._defs);

        img.setStyle({
            image: xmlNode.getAttribute('xlink:href'),
            x: xmlNode.getAttribute('x'),
            y: xmlNode.getAttribute('y'),
            width: xmlNode.getAttribute('width'),
            height: xmlNode.getAttribute('height')
        });

        return img;
    },
    'text': function(xmlNode, parentGroup) {
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
    'path': function(xmlNode, parentGroup) {
        // TODO svg fill rule
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule
        // path.style.globalCompositeOperation = 'xor';
        var d = xmlNode.getAttribute('d') || '';

        var path = createFromString(d);

        inheritStyle(parentGroup, path);
        parseAttributes(xmlNode, path, this._defs);

        return path;
    }
};

var defineParsers = {

    'lineargradient': function(xmlNode) {
        var x1 = parseInt(xmlNode.getAttribute('x1') || 0);
        var y1 = parseInt(xmlNode.getAttribute('y1') || 0);
        var x2 = parseInt(xmlNode.getAttribute('x2') || 10);
        var y2 = parseInt(xmlNode.getAttribute('y2') || 0);

        var gradient = new LinearGradient(x1, y1, x2, y2);

        _parseGradientColorStops(xmlNode, gradient);

        return gradient;
    },

    'radialgradient': function(xmlNode) {

    }
};

function _parseGradientColorStops(xmlNode, gradient) {

    var stop = xmlNode.firstChild;

    while (stop) {
        if (stop.nodeType === 1) {
            var offset = stop.getAttribute('offset');
            if (offset.indexOf('%') > 0) {  // percentage
                offset = parseInt(offset) / 100;
            }
            else if(offset) {    // number from 0 to 1
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

    for (var i = 0; i < list.length; i+=2) {
        var x = parseFloat(list[i]);
        var y = parseFloat(list[i+1]);
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

function parseAttributes(xmlNode, el, defs) {
    var zrStyle = el.__inheritedStyle || {};
    var isTextEl = el.type === 'text';

    // TODO Shadow
    if (xmlNode.nodeType === 1) {
        parseTransformAttribute(xmlNode, el);

        extend(zrStyle, _parseStyleAttribute(xmlNode));

        for (var svgAttrName in attributesMap) {
            if (attributesMap.hasOwnProperty(svgAttrName)) {
                var attrValue = xmlNode.getAttribute(svgAttrName);
                if (attrValue != null) {
                    zrStyle[attributesMap[svgAttrName]] = attrValue;
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
    var urlMatch = urlRegex.exec(str);
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
        transform.replace(transformRegex, function(str, type, value) {
            transformOps.push(type, value);
        });
        for(var i = transformOps.length - 1; i > 0; i-=2) {
            var value = transformOps[i];
            var type = transformOps[i-1];
            m = m || matrix.create();
            switch(type) {
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
                    matrix.rotate(m, m, value[0]);
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

var styleRegex = /(\S*?):(.*?);/g;
function _parseStyleAttribute(xmlNode) {
    var style = xmlNode.getAttribute('style');

    if (style) {
        style = trim(style);
        // last property in the style list can ignore comma.
        if (!(style.lastIndexOf(';') === style.length - 1)) {
            style = style + ';';
        }
        var styleList = {};
        style = style.replace(/\s*([;:])\s*/g, '$1');
        style.replace(styleRegex, function(str, key, val) {
            styleList[key] = val;
        });

        var obj = {};
        for (var svgAttrName in attributesMap) {
            if (attributesMap.hasOwnProperty(svgAttrName) && styleList[svgAttrName] != null) {
                obj[attributesMap[svgAttrName]] = styleList[svgAttrName];
            }
        }
        return obj;
    }
    return {};
}

/**
 * @param {string|XMLElement} xml
 * @param {Object} [opt]
 * @param {number} [opt.width] Default width if svg width not specified or is a percent value.
 * @param {number} [opt.height] Default height if svg height not specified or is a percent value.
 */
export function parseSVG(xml, opt) {
    var parser = new SVGParser();
    return parser.parse(xml, opt);
}