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
    var BrokenLine = require('zrender/shape/BrokenLine');
    var mat2d = require('zrender/tool/matrix');
    var vec2 = require('zrender/tool/vector');
    var log = require('zrender/tool/log');

    var Group = require('zrender/Group');

    var util = require('zrender/tool/util');

    function trim(str) {
        return str.replace(/^\s+/, '').replace(/\s+$/, '');
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
                    el = parser(xmlNode);
                    // 解析通用样式
                    styleMap = parseAttributes(xmlNode);
                    // PENDING
                    for (var name in parentStyle) {
                        if (!styleMap[name]) {
                            styleMap[name] = parentStyle[name];
                        }
                    }
                    // 解析变换
                    var m = parseTransformAttribute(xmlNode);
                    if (m) {
                        el.transform = m;
                        el.decomposeTransform();
                    }
                    // id
                    // 多个svg解决命名空间的问题？
                    var id = xmlNode.getAttribute('id');
                    if (id) {
                        el.id = id;
                    }
                    // Is a shape
                    if (nodeName !== 'g') {
                        extendShapeStyle(el, styleMap);
                        el.hoverable = opts.hoverable;
                        el.clickable = opts.clickable;
                        el.draggable = opts.draggable;
                    }
                    parent.addChild(el);
                }
            }

            var child = xmlNode.firstChild;
            while (child) {
                if (child.nodeType === 1){
                    parseNode(child, el, styleMap);
                }
                child = child.nextSibling;
            }

            // Quit define
            if (nodeName === 'defs') {
                this._isDefine = false;
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

        return root;
    }

    /**
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
                var type = transformOps[i-1];
                switch (type) {
                    case 'translate':
                        value = trim(value).split(/\s+/);
                        mat2d.translate(m, m, [+value[0], +(value[1] || value[0])]);
                        break;
                    case 'scale':
                        value = trim(value).split(/\s+/);
                        mat2d.scale(m, m, [+value[0], +(value[1] || value[0])]);
                        break;
                    case 'rotate':
                        value = trim(value).split(/\s*/);
                        mat2d.rotate(m, m, +value[0]);
                        break;
                    case 'skew':
                        value = trim(value).split(/\s*/);
                        // console.warn('Skew transform is not supported yet');
                        break;
                    case 'matrix':
                        var value = trim(value).replace(/,/g, ' ').split(/\s+/);
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

    var styleRegex = /(\S*?):(.*?);/g;
    function parseStyleAttribute(xmlNode) {
        var style = xmlNode.getAttribute('style');

        if (style) {
            var styleMap = {};
            style = style.replace(/\s*([;:])\s*/g, '$1');
            style.replace(styleRegex, function(str, key, val){
                styleMap[key] = val;
            });

            return {
                fill: styleMap['fill'],
                stroke: styleMap['stroke'],
                lineWidth: styleMap['stroke-width'],
                opacity: styleMap['opacity'],
                lineDash: styleMap['stroke-dasharray'],
                lineCap: styleMap['stroke-linecap'],
                lineJoin: styleMap['stroke-linjoin'],
                miterLimit: styleMap['stroke-miterlimit']
            }
        }
        return {};
    }

    function parseAttributes(xmlNode) {
        var styleMap = {
            fill: xmlNode.getAttribute('fill'),
            stroke: xmlNode.getAttribute('stroke'),
            lineWidth: xmlNode.getAttribute('stroke-width'),
            opacity: xmlNode.getAttribute('opacity'),
            lineDash: xmlNode.getAttribute('stroke-dasharray'),
            lineCap: xmlNode.getAttribute('stroke-linecap'),
            lineJoin: xmlNode.getAttribute('stroke-linjoin'),
            miterLimit: xmlNode.getAttribute('stroke-miterlimit')
        }

        var styleMap2 = parseStyleAttribute(xmlNode);
        for (var name in styleMap2) {
            styleMap[name] = styleMap2[name];
        }

        return styleMap
    }

    function extendShapeStyle(shape, styleMap, defs) {
        var brushType = 'fill';
        var fillStyle = getPaint(styleMap.fill, defs);
        var strokeStyle = getPaint(styleMap.stroke, defs);
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
            shape.style.lineWidth = +(styleMap.lineWidth || 1);
        }

        styleMap.opacity
            && (shape.style.opacity = +styleMap.opacity);
        styleMap.lineCap
            && (shape.style.lineCap = +styleMap.lineCap);
        styleMap.lineJoin
            && (shape.style.lineJoin = +styleMap.lineJoin);
        styleMap.miterLimit
            && (shape.style.miterLimit = +styleMap.miterLimit);

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

    var nodeParsers = {
        g: function(xmlNode) {
            var g = new Group();
            return g;
        },
        rect: function(xmlNode) {
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
        circle: function(xmlNode) {
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
        line: function(xmlNode) {
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
        ellipse: function(xmlNode) {
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
        polygon: function(xmlNode) {
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
        polyline: function(xmlNode) {
            var pointsStr = xmlNode.getAttribute('points');
            if (pointsStr) {
                var points = parsePoints(pointsStr);
                return new BrokenLine({
                    style: {
                        pointList: points
                    }
                });
            }
        },
        path: function(xmlNode) {
            var d = xmlNode.getAttribute('d');
            if (d) {
                return new Path({
                    style: {
                        path: d
                    }
                });
            }
        },
        text: function(xmlNode) {

        }
    }

    return {
        parse: parse,
        load: load
    };
});