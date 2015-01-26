// http://www.w3.org/TR/SVG/
define(function(require) {
    
    'use strict';

    var http = require('zrender/tool/http');

    var Circle = require('zrender/shape/Circle');
    var Ellipse = require('zrender/shape/Ellipse');
    var Rectangle = require('zrender/shape/Rectangle');
    var Line = require('zrender/shape/Line');
    var Path = require('zrender/shape/Path');
    var Polygon = require('zrender/shape/Polygon');
    var Text = require('zrender/shape/Text');
    var ImageShape = require('zrender/shape/Image');
    var Polyline = require('zrender/shape/Polyline');
    var mat2d = require('zrender/tool/matrix');
    var vec2 = require('zrender/tool/vector');
    var log = require('zrender/tool/log');
    var guid = require('zrender/tool/guid');

    var Group = require('zrender/Group');

    var util = require('zrender/tool/util');

    function trim(str) {
        return str.replace(/^\s+/, '').replace(/\s+$/, '');
    }

    /**
     * 加载并解析返回svg文件
     * @param {string|module:zrender/core/http~IHTTPGetOption} url
     * @param {Function} onsuccess
     * @param {Function} [onerror]
     * @param {Object} [opts] 额外参数
     */
    function load(url, onsuccess, onerror, opts) {
        if (typeof(url) === 'object') {
            var obj = url;
            url = obj.url;
            onsuccess = obj.onsuccess;
            onerror = obj.onerror;
            opts = obj;
        } else {
            if (typeof(onerror) === 'object') {
                opts = onerror;
            }
        }
        http.get(url, function(xml) {
            onsuccess(parse(xml, opts));
        }, onerror);
    }

    // Cross browser XMLParser
    function parseXML(str) {
        try {
            var doc;
            if (window.DOMParser) {
                var parser = new DOMParser();
                doc = parser.parseFromString(str, 'text/xml');
            } else { // IE
                doc = new ActiveXObject('Microsoft.XMLDOM');
                doc.async = 'false';
                // Remove DOCTYPE ?
                doc.loadXML(str);
            }
            if (
                !doc || !doc.documentElement
                || doc.getElementsByTagName('parsererror').length
            ) {
                log('Invalid XML: ' + str);
            } else {
                return doc;
            }
        } catch (e) {
            return null;
        }
    }

    /**
     * 解析SVG, 返回Group
     * @param {string|HTMLSVGElement} xml
     * @param {Object} opts 配置参数
     * @param {string} [opts.namespace] svg里所有节点的id都会带上`namespace/` 的前缀防止冲突。
     *                                  如果不指定则自动生成一个guid作为namespace
     * @param {boolean} [opts.hoverable=true]
     * @param {boolean} [opts.clickable=false]
     * @param {boolean} [opts.draggable=false]
     * @return {module:zrender/Group}
     */
    function parse(xml, opts) {
        opts = opts || {};
        if (typeof(opts.hoverable) == 'undefined') {
            opts.hoverable = true;
        }
        var namespace = opts.namespace || guid();

        var inDefine = false;
        var defs = {};
        // 解析每个svg节点转换到zr节点
        var parseNode = function(xmlNode, parent, parentStyle) {
            var nodeName = xmlNode.nodeName.toLowerCase();
            if (nodeName === 'defs') {
                inDefine = true;
            }
            var styleMap;
            var el;
            if (inDefine) {
                var parser = defineParsers[nodeName];
                if (parser) {
                    var def = parser(xmlNode);
                    var id = xmlNode.getAttribute('id');
                    if (id) {
                        defs[id] = def;
                    }
                }
            } else {
                var parser = nodeParsers[nodeName];
                if (parser) {
                    el = parser(xmlNode, parentStyle, defs);
                    if (!el) {
                        log("Unsupported svg node " + nodeName);
                        return;
                    }
                    // 解析通用样式
                    styleMap = parseAttributes(xmlNode);
                    // PENDING
                    for (var name in parentStyle) {
                        if (!styleMap[name]) {
                            styleMap[name] = parentStyle[name];
                        }
                    }
                    // 解析坐标变换
                    var m = parseTransformAttribute(xmlNode);
                    if (m) {
                        el.transform = m;
                        el.decomposeTransform();
                    }
                    var id = xmlNode.getAttribute('id');
                    if (id) {
                        el.id = namespace + '/' + id;
                    }
                    // Is a shape
                    if (el.type !== 'group') {
                        extendShapeCommonStyle(el, styleMap, defs);
                    }
                    parent.addChild(el);
                }
            }

            if (inDefine || nodeName === 'g') {
                var child = xmlNode.firstChild;
                while (child) {
                    if (child.nodeType === 1){
                        parseNode(child, el, styleMap);
                    }
                    child = child.nextSibling;
                }
            }

            // Quit define
            if (nodeName === 'defs') {
                inDefine = false;
            }
        }

        var svg;
        if (typeof(xml) === 'string') {
            var doc = parseXML(xml);
            if (!doc) {
                return;
            }
            var svg = doc.firstChild;
            while (svg && !(svg.nodeName.toLowerCase() === 'svg' && svg.nodeType === 1)) {
                svg = svg.nextSibling;
            }
        } else {
            var svg = xml;
        }
        if (!svg) {
            return;
        }
        var root = new Group();

        var child = svg.firstChild;
        while (child) {
            parseNode(child, root, {});
            child = child.nextSibling;
        }

        root.traverse(function(el) {
            if (el.type !== 'group') {
                el.hoverable = opts.hoverable;
                el.clickable = opts.clickable;
                el.draggable = opts.draggable;
            }
        });

        return root;
    }

    var transformRegex = /(translate|scale|rotate|skewX|skewY|matrix)\(([\-\s0-9\.,]*)\)/g;

    function parseTransformAttribute(xmlNode) {
        var transform = xmlNode.getAttribute('transform');
        if (transform) {
            var m = mat2d.create();
            var transformOps = [];
            transform.replace(transformRegex, function(str, type, value){
                transformOps.push(type, value);
            });
            for (var i = transformOps.length - 1; i > 0; i-=2) {
                var value = transformOps[i];
                value = trim(value).replace(/,/g, ' ').split(/\s+/);
                var type = transformOps[i-1];
                switch (type) {
                    case 'translate':
                        mat2d.translate(m, m, [+value[0], +(value[1] || value[0])]);
                        break;
                    case 'scale':
                        mat2d.scale(m, m, [+value[0], +(value[1] || value[0])]);
                        break;
                    case 'rotate':
                        mat2d.rotate(m, m, +value[0]);
                        break;
                    case 'skew':
                        // console.warn('Skew transform is not supported yet');
                        break;
                    case 'matrix':
                        m[0] = +value[0];
                        m[1] = +value[1];
                        m[2] = +value[2];
                        m[3] = +value[3];
                        m[4] = +value[4];
                        m[5] = +value[5];
                        break;
                }
            }

            return m;
        }
    }

    var styleList = [
        'fill', 'stroke', 'stroke-width', 'opacity', 'stroke-dasharray',
        'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
        'font-style', 'font-weight', 'font-size', 'font-family'
    ];
    var styleRegex = /(\S*?):(.*?);/g;
    function parseStyleAttribute(xmlNode) {
        var style = xmlNode.getAttribute('style');

        if (style) {
            var styleMap = {};
            style = style.replace(/\s*([;:])\s*/g, '$1');
            style.replace(styleRegex, function(str, key, val){
                styleMap[key] = val;
            });
            return styleMap;
        }
        return {};
    }

    function parseAttributes(xmlNode) {
        var styleMap = {}

        for (var i = 0; i < styleList.length; i++) {
            var styleName = styleList[i];
            var attrVal = xmlNode.getAttribute(styleName);
            if (attrVal) {
                styleMap[styleName] = attrVal;
            }
        }
        // style属性里的样式拥有更高优先级
        var styleMap2 = parseStyleAttribute(xmlNode);
        for (var name in styleMap2) {
            styleMap[name] = styleMap2[name];
        }

        return styleMap;
    }

    function extendShapeCommonStyle(shape, styleMap, defs) {
        var brushType = 'fill';
        var fillStyle = getPaint(styleMap['fill'], defs);
        var strokeStyle = getPaint(styleMap['stroke'], defs);
        if (fillStyle) {
            shape.style.color = fillStyle;
            brushType = 'fill';
        }
        if (strokeStyle) {
            shape.style.strokeColor = strokeStyle;
            if (fillStyle) {
                brushType = 'both';
            } else {
                brushType = 'stroke';
            }
            shape.style.lineWidth = +(styleMap['stroke-width'] || 1);
        }

        styleMap['opacity']
            && (shape.style.opacity = +styleMap['opacity']);
        styleMap['stroke-linecap']
            && (shape.style.lineCap = +styleMap['stroke-linecap']);
        styleMap['stroke-linejoin']
            && (shape.style.lineJoin = +styleMap['stroke-linejoin']);
        styleMap['stroke-miterlimit']
            && (shape.style.miterLimit = +styleMap['stroke-miterlimit']);

        shape.style.brushType = brushType;
        // TODO lineDash
    }

    var urlRegex = /url\(\s*#(.*?)\)/;
    function getPaint(str, defs) {
        if (str === 'none') {
            return;
        }
        var urlMatch = urlRegex.exec(str);
        if (urlMatch) {
            var url = urlMatch[1].trim();
            var def = defs[url];
            return def;
        }
        return str;
    }

    function parsePoints(pointsString) {
        var list = trim(pointsString).replace(/,/g, ' ').split(/\s+/);
        var points = [];

        for (var i = 0; i < list.length;) {
            var x = +list[i++];
            var y = +list[i++];
            points.push([x, y]);
        }
        return points;
    }

    function parseGradientColorStops(xmlNode, gradient){

        var stop = xmlNode.firstChild;

        while (stop) {
            if (stop.nodeType === 1) {
                var offset = stop.getAttribute('offset');
                if (offset.indexOf('%') > 0) {  // percentage
                    offset = parseInt(offset) / 100;
                } else if(offset) {    // number from 0 to 1
                    offset = parseFloat(offset);
                } else {
                    offset = 0;
                }

                var stopColor = stop.getAttribute('stop-color') || '#000000';

                gradient.addColorStop(offset, stopColor);
            }
            stop = stop.nextSibling;
        }
    }

    var defineParsers = {

        'lineargradient' : function(xmlNode) {
            var x1 = +(xmlNode.getAttribute('x1') || 0);
            var y1 = +(xmlNode.getAttribute('y1') || 0);
            var x2 = +(xmlNode.getAttribute('x2') || 10);
            var y2 = +(xmlNode.getAttribute('y2') || 0);

            var gradient = util.getContext().createLinearGradient(x1, y1, x2, y2);

            parseGradientColorStops(xmlNode, gradient);

            return gradient;
        },

        'radialgradient' : function(xmlNode) {
            // TODO
        }
    }

    function haveTSpanChildNode(xmlNode) {
        var child = xmlNode.firstChild;
        while (child && child.nodeName.toLowerCase() !== 'tspan') {
            child = child.nextSibling;
        }
        return !!child;
    }

    // http://www.w3.org/TR/SVG/text.html
    function parseTextNode(xmlNode, parentStyle, defs) {
        return parseTSpanNode(xmlNode, 0, 0, parentStyle);
    }

    // TODO dom id
    function parseTSpanNode(xmlNode, cx, cy, parentStyle, defs) {
        var x = xmlNode.getAttribute('x');
        var y = xmlNode.getAttribute('y');
        var dx = (+xmlNode.getAttribute('dx') || 0);
        var dy = (+xmlNode.getAttribute('dy') || 0);
        if (!x) {
            x = cx + dx;
        } else {
            x = +(x || 0);
        }
        if (!y) {
            y = cy + dy;
        } else {
            y = +(y || 0);
        }
        var styleMap = parseAttributes(xmlNode);
        for (var name in parentStyle) {
            if (!styleMap[name]) {
                styleMap[name] = parentStyle[name];
            }
        }
        if (haveTSpanChildNode(xmlNode)) {
            var node = new Group();
            node.rect = {};
            var child = xmlNode.firstChild;
            node.rect.width = dx;
            node.rect.x = x;
            node.rect.y = y;
            while (child) {
                if (child.nodeType === 3) { // text node
                    var textContent = filterText(child.textContent || child.nodeValue);
                    if (textContent) {
                        var textShape = new Text({
                            style: {
                                x: x,
                                y: y,
                                text: textContent,
                                textFont: getTextFont(styleMap)
                            }
                        });
                        extendShapeCommonStyle(textShape, styleMap, defs);

                        var width = textShape.getRect(textShape.style).width;
                        x += width;
                        node.rect.width += width;
                        node.addChild(textShape);
                    }
                } else if (
                    child.nodeType === 1
                    && child.nodeName.toLowerCase() == 'tspan'
                ) {
                    var childNode = parseTSpanNode(child, x, y, styleMap);
                    y = childNode.rect.y;
                    x += childNode.rect.width;
                    node.rect.width += childNode.rect.width;
                    node.addChild(childNode);
                }
                child = child.nextSibling;
            }
            return node;
        } else {
            var text = '';
            var child = xmlNode.firstChild;
            while (child) {
                if (child.nodeType === 3) { // text node
                    text += child.textContent || child.nodeValue;
                }
                child = child.nextSibling;
            }
            var textShape = new Text({
                style: {
                    x: x,
                    y: y,
                    text: filterText(text),
                    textFont: getTextFont(styleMap)
                }
            });
            extendShapeCommonStyle(textShape, styleMap, defs);

            textShape.rect = {
                width: dx + textShape.getRect(textShape.style).width,
                x: x,
                y: y
            }
            x += textShape.getRect(textShape.style).width;

            return textShape;
        }
    }

    function filterText(str) {
        return trim(str.replace(/\n/g, ' ').replace(/\s+/g, ' '));
    }

    function getTextFont(style) {
        var font = [];
        if (style['font-style']) {
            font.push(style['font-style']);
        }
        if (style['font-weight']) {
            font.push(style['font-weight']);
        }
        if (style['font-size']) {
            font.push(+style['font-size'] + 'px');
        }
        if (style['font-family']) {
            font.push(style['font-family']);
        }
        return font.join(' ');
    }

    var nodeParsers = {
        g: function (xmlNode) {
            var g = new Group();
            return g;
        },
        rect: function (xmlNode) {
            var x = +(xmlNode.getAttribute('x') || 0);
            var y = +(xmlNode.getAttribute('y') || 0);
            var width = +(xmlNode.getAttribute('width') || 0);
            var height = +(xmlNode.getAttribute('height') || 0);

            return new Rectangle({
                style: {
                    x: x,
                    y: y,
                    width: width,
                    height: height
                }
            });
        },
        circle: function (xmlNode) {
            var cx = +(xmlNode.getAttribute('cx') || 0);
            var cy = +(xmlNode.getAttribute('cy') || 0);
            var r = +(xmlNode.getAttribute('r') || 0);

            return new Circle({
                style: {
                    x: cx,
                    y: cy,
                    r: r
                }
            });
        },
        line: function (xmlNode) {
            var x1 = +(xmlNode.getAttribute('x1') || 0);
            var y1 = +(xmlNode.getAttribute('y1') || 0);
            var x2 = +(xmlNode.getAttribute('x2') || 0);
            var y2 = +(xmlNode.getAttribute('y2') || 0);

            return new Line({
                style: {
                    xStart: x1,
                    yStart: y1,
                    xEnd: x2,
                    yEnd: y2
                }
            });
        },
        ellipse: function (xmlNode) {
            var cx = +(xmlNode.getAttribute('cx') || 0);
            var cy = +(xmlNode.getAttribute('cy') || 0);
            var rx = +(xmlNode.getAttribute('rx') || 0);
            var ry = +(xmlNode.getAttribute('ry') || 0);

            return new Ellipse({
                style: {
                    x: cx,
                    y: cy,
                    a: rx,
                    b: ry
                }
            });
        },
        polygon: function (xmlNode) {
            var pointsStr = xmlNode.getAttribute('points');
            if (pointsStr) {
                var points = parsePoints(pointsStr);
                return new Polygon({
                    style: {
                        pointList: points
                    }
                });
            }
        },
        polyline: function (xmlNode) {
            var pointsStr = xmlNode.getAttribute('points');
            if (pointsStr) {
                var points = parsePoints(pointsStr);
                return new Polyline({
                    style: {
                        pointList: points
                    }
                });
            }
        },
        path: function (xmlNode) {
            var d = xmlNode.getAttribute('d');
            if (d) {
                return new Path({
                    style: {
                        path: d
                    }
                });
            }
        },
        text: function (xmlNode, parentStyle, defs) {
            return parseTextNode(xmlNode, parentStyle, defs);
        },
        image: function (xmlNode) {
            var x = +(xmlNode.getAttribute('x') || 0);
            var y = +(xmlNode.getAttribute('y') || 0);
            var width = +(xmlNode.getAttribute('width') || 0);
            var height = +(xmlNode.getAttribute('height') || 0);
            var href = xmlNode.getAttribute('xlink:href');

            if (href) {
                return new ImageShape({
                    style: {
                        image: href,
                        x: x,
                        y: y,
                        width: width,
                        height: height
                    }
                });
            }
        }
    }

    return {
        parse: parse,
        load: load
    };
});