import Group from '../graphic/Group';
import ZRImage from '../graphic/Image';
import Circle from '../graphic/shape/Circle';
import Rect from '../graphic/shape/Rect';
import Ellipse from '../graphic/shape/Ellipse';
import Line from '../graphic/shape/Line';
import Polygon from '../graphic/shape/Polygon';
import Polyline from '../graphic/shape/Polyline';
import * as matrix from '../core/matrix';
import { createFromString } from './path';
import { defaults, trim, each, map, keys } from '../core/util';
import Displayable from '../graphic/Displayable';
import Element from '../Element';
import { RectLike } from '../core/BoundingRect';
import { Dictionary } from '../core/types';
import { PatternObject } from '../graphic/Pattern';
import LinearGradient, { LinearGradientObject } from '../graphic/LinearGradient';
import { RadialGradientObject } from '../graphic/RadialGradient';
import { GradientObject } from '../graphic/Gradient';
import TSpan, { TSpanStyleProps } from '../graphic/TSpan';
import { parseXML } from './parseXML';

// Most of the values can be separated by comma and/or white space.
const DILIMITER_REG = /[\s,]+/;

interface SVGParserOption {
    // Default width if svg width not specified or is a percent value.
    width?: number;
    // Default height if svg height not specified or is a percent value.
    height?: number;
    ignoreViewBox?: boolean;
    ignoreRootClip?: boolean;
}

export interface SVGParserResult {
    // Group, The root of the the result tree of zrender shapes
    root: Group;
    // number, the viewport width of the SVG
    width: number;
    // number, the viewport height of the SVG
    height: number;
    //  {x, y, width, height}, the declared viewBox rect of the SVG, if exists
    viewBoxRect: RectLike;
    // the {scale, position} calculated by viewBox and viewport, is exists
    viewBoxTransform: {
        x: number;
        y: number;
        scale: number;
    };
    named: {
        name: string;
        svgNodeTagLower: SVGNodeTagLower;
        el: Element;
    }[];
}

export type SVGNodeTagLower =
    'g' | 'rect' | 'circle' | 'line' | 'ellipse' | 'polygon'
    | 'polyline' | 'image' | 'text' | 'tspan' | 'path' | 'defs';


type DefsMap = Dictionary<LinearGradientObject | RadialGradientObject | PatternObject>;

type ElementExtended = Element & {
    __inheritedStyle: Dictionary<string>;
}
type DisplayableExtended = Displayable & {
    __inheritedStyle: Dictionary<string>;
}

type TextStyleOptionExtended = TSpanStyleProps & {
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    fontStyle: string;
}
let nodeParsers: {[name in SVGNodeTagLower]?: (
    this: SVGParser, xmlNode: SVGElement, parentGroup: Group
) => Element};


class SVGParser {

    private _defs: DefsMap = {};
    private _root: Group = null;

    private _isDefine = false;
    private _isText = false;

    private _textX: number;
    private _textY: number;

    parse(xml: string | Document | SVGElement, opt: SVGParserOption): SVGParserResult {
        opt = opt || {};

        const svg = parseXML(xml);

        if (!svg) {
            throw new Error('Illegal svg');
        }

        let root = new Group();
        this._root = root;
        const named: SVGParserResult['named'] = [];
        // parse view port
        const viewBox = svg.getAttribute('viewBox') || '';

        // If width/height not specified, means "100%" of `opt.width/height`.
        // TODO: Other percent value not supported yet.
        let width = parseFloat((svg.getAttribute('width') || opt.width) as string);
        let height = parseFloat((svg.getAttribute('height') || opt.height) as string);
        // If width/height not specified, set as null for output.
        isNaN(width) && (width = null);
        isNaN(height) && (height = null);

        // Apply inline style on svg element.
        parseAttributes(svg, root, null, true);

        let child = svg.firstChild as SVGElement;
        while (child) {
            this._parseNode(child, root, named);
            child = child.nextSibling as SVGElement;
        }

        let viewBoxRect;
        let viewBoxTransform;

        if (viewBox) {
            const viewBoxArr = trim(viewBox).split(DILIMITER_REG);
            // Some invalid case like viewBox: 'none'.
            if (viewBoxArr.length >= 4) {
                viewBoxRect = {
                    x: parseFloat((viewBoxArr[0] || 0) as string),
                    y: parseFloat((viewBoxArr[1] || 0) as string),
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
                const elRoot = root;
                root = new Group();
                root.add(elRoot);
                elRoot.scaleX = elRoot.scaleY = viewBoxTransform.scale;
                elRoot.x = viewBoxTransform.x;
                elRoot.y = viewBoxTransform.y;
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
            viewBoxTransform: viewBoxTransform,
            named: named
        };
    }

    private _parseNode(xmlNode: SVGElement, parentGroup: Group, named: SVGParserResult['named']): void {

        const nodeName = xmlNode.nodeName.toLowerCase() as SVGNodeTagLower;

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

        let el;
        if (this._isDefine) {
            let child = xmlNode.firstChild as SVGElement;
            while (child) {
                if (child.nodeType === 1) {
                    const parser = defineParsers[child.nodeName.toLowerCase()];
                    if (parser) {
                        const def = parser.call(this, child);
                        const id = child.getAttribute('id');
                        if (id) {
                            this._defs[id] = def;
                        }
                    }
                }
                child = child.nextSibling as SVGElement;
            }
            // TODO:
            // other graphic elements can also be in <defs> and referenced by
            // <use x="5" y="5" xlink:href="#myCircle" />
            // multiple times
        }
        else {
            const parser = nodeParsers[nodeName];
            if (parser) {
                el = parser.call(this, xmlNode, parentGroup);
                setName(nodeName, xmlNode, el, named);
            }
            parentGroup.add(el);
        }

        if (el) {   // No parsers available
            let child = xmlNode.firstChild as SVGElement;
            while (child) {
                if (child.nodeType === 1) {
                    // el should be a group if it has child.
                    this._parseNode(child, el as Group, named);
                }
                // Is text
                if (child.nodeType === 3 && this._isText) {
                    this._parseText(child, el as Group);
                }
                child = child.nextSibling as SVGElement;
            }
        }
        // Quit define
        if (nodeName === 'defs') {
            this._isDefine = false;
        }
        else if (nodeName === 'text') {
            this._isText = false;
        }
    }

    private _parseText(xmlNode: SVGElement, parentGroup: Group): TSpan {
        const text = new TSpan({
            style: {
                text: xmlNode.textContent
            },
            silent: true,
            x: this._textX || 0,
            y: this._textY || 0
        });

        inheritStyle(parentGroup, text);
        parseAttributes(xmlNode, text, this._defs, false);

        const textStyle = text.style as TextStyleOptionExtended;
        const fontSize = textStyle.fontSize;
        if (fontSize && fontSize < 9) {
            // PENDING
            textStyle.fontSize = 9;
            text.scaleX *= fontSize / 9;
            text.scaleY *= fontSize / 9;
        }

        const font = (textStyle.fontSize || textStyle.fontFamily) && [
            textStyle.fontStyle,
            textStyle.fontWeight,
            (textStyle.fontSize || 12) + 'px',
            // If font properties are defined, `fontFamily` should not be ignored.
            textStyle.fontFamily || 'sans-serif'
        ].join(' ');
        // Make font
        textStyle.font = font;

        const rect = text.getBoundingRect();
        this._textX += rect.width;

        parentGroup.add(text);

        return text;
    }

    static internalField = (function () {

        nodeParsers = {
            'g': function (xmlNode, parentGroup) {
                const g = new Group();
                inheritStyle(parentGroup, g);
                parseAttributes(xmlNode, g, this._defs, false);

                return g;
            },
            'rect': function (xmlNode, parentGroup) {
                const rect = new Rect();
                inheritStyle(parentGroup, rect);
                parseAttributes(xmlNode, rect, this._defs, false);

                rect.setShape({
                    x: parseFloat(xmlNode.getAttribute('x') || '0'),
                    y: parseFloat(xmlNode.getAttribute('y') || '0'),
                    width: parseFloat(xmlNode.getAttribute('width') || '0'),
                    height: parseFloat(xmlNode.getAttribute('height') || '0')
                });

                rect.silent = true;

                return rect;
            },
            'circle': function (xmlNode, parentGroup) {
                const circle = new Circle();
                inheritStyle(parentGroup, circle);
                parseAttributes(xmlNode, circle, this._defs, false);

                circle.setShape({
                    cx: parseFloat(xmlNode.getAttribute('cx') || '0'),
                    cy: parseFloat(xmlNode.getAttribute('cy') || '0'),
                    r: parseFloat(xmlNode.getAttribute('r') || '0')
                });

                circle.silent = true;

                return circle;
            },
            'line': function (xmlNode, parentGroup) {
                const line = new Line();
                inheritStyle(parentGroup, line);
                parseAttributes(xmlNode, line, this._defs, false);

                line.setShape({
                    x1: parseFloat(xmlNode.getAttribute('x1') || '0'),
                    y1: parseFloat(xmlNode.getAttribute('y1') || '0'),
                    x2: parseFloat(xmlNode.getAttribute('x2') || '0'),
                    y2: parseFloat(xmlNode.getAttribute('y2') || '0')
                });

                line.silent = true;

                return line;
            },
            'ellipse': function (xmlNode, parentGroup) {
                const ellipse = new Ellipse();
                inheritStyle(parentGroup, ellipse);
                parseAttributes(xmlNode, ellipse, this._defs, false);

                ellipse.setShape({
                    cx: parseFloat(xmlNode.getAttribute('cx') || '0'),
                    cy: parseFloat(xmlNode.getAttribute('cy') || '0'),
                    rx: parseFloat(xmlNode.getAttribute('rx') || '0'),
                    ry: parseFloat(xmlNode.getAttribute('ry') || '0')
                });

                ellipse.silent = true;

                return ellipse;
            },
            'polygon': function (xmlNode, parentGroup) {
                const pointsStr = xmlNode.getAttribute('points');
                let pointsArr;
                if (pointsStr) {
                    pointsArr = parsePoints(pointsStr);
                }
                const polygon = new Polygon({
                    shape: {
                        points: pointsArr || []
                    },
                    silent: true
                });

                inheritStyle(parentGroup, polygon);
                parseAttributes(xmlNode, polygon, this._defs, false);

                return polygon;
            },
            'polyline': function (xmlNode, parentGroup) {
                const pointsStr = xmlNode.getAttribute('points');
                let pointsArr;
                if (pointsStr) {
                    pointsArr = parsePoints(pointsStr);
                }
                const polyline = new Polyline({
                    shape: {
                        points: pointsArr || []
                    },
                    silent: true
                });

                inheritStyle(parentGroup, polyline);
                parseAttributes(xmlNode, polyline, this._defs, false);

                return polyline;
            },
            'image': function (xmlNode, parentGroup) {
                const img = new ZRImage();
                inheritStyle(parentGroup, img);
                parseAttributes(xmlNode, img, this._defs, false);

                img.setStyle({
                    image: xmlNode.getAttribute('xlink:href'),
                    x: +xmlNode.getAttribute('x'),
                    y: +xmlNode.getAttribute('y'),
                    width: +xmlNode.getAttribute('width'),
                    height: +xmlNode.getAttribute('height')
                });
                img.silent = true;

                return img;
            },
            'text': function (xmlNode, parentGroup) {
                const x = xmlNode.getAttribute('x') || '0';
                const y = xmlNode.getAttribute('y') || '0';
                const dx = xmlNode.getAttribute('dx') || '0';
                const dy = xmlNode.getAttribute('dy') || '0';

                this._textX = parseFloat(x) + parseFloat(dx);
                this._textY = parseFloat(y) + parseFloat(dy);

                const g = new Group();
                inheritStyle(parentGroup, g);
                parseAttributes(xmlNode, g, this._defs, false);

                return g;
            },
            'tspan': function (xmlNode, parentGroup) {
                const x = xmlNode.getAttribute('x');
                const y = xmlNode.getAttribute('y');
                if (x != null) {
                    // new offset x
                    this._textX = parseFloat(x);
                }
                if (y != null) {
                    // new offset y
                    this._textY = parseFloat(y);
                }
                const dx = xmlNode.getAttribute('dx') || '0';
                const dy = xmlNode.getAttribute('dy') || '0';

                const g = new Group();

                inheritStyle(parentGroup, g);
                parseAttributes(xmlNode, g, this._defs, false);

                this._textX += parseFloat(dx);
                this._textY += parseFloat(dy);

                return g;
            },
            'path': function (xmlNode, parentGroup) {
                // TODO svg fill rule
                // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule
                // path.style.globalCompositeOperation = 'xor';
                const d = xmlNode.getAttribute('d') || '';

                // Performance sensitive.

                const path = createFromString(d);

                inheritStyle(parentGroup, path);
                parseAttributes(xmlNode, path, this._defs, false);

                path.silent = true;

                return path;
            }
        };


    })();
}

function setName(
    svgNodeTagLower: SVGNodeTagLower,
    xmlNode: SVGElement,
    el: Element,
    named: SVGParserResult['named']
): void {
    if (el) {
        const name = xmlNode.getAttribute('name');
        // Do not support empty string;
        if (name) {
            named.push({ name, svgNodeTagLower, el });
        }
    }
}

const defineParsers: Dictionary<(xmlNode: SVGElement) => any> = {

    'lineargradient': function (xmlNode: SVGElement) {
        const x1 = parseInt(xmlNode.getAttribute('x1') || '0', 10);
        const y1 = parseInt(xmlNode.getAttribute('y1') || '0', 10);
        const x2 = parseInt(xmlNode.getAttribute('x2') || '10', 10);
        const y2 = parseInt(xmlNode.getAttribute('y2') || '0', 10);

        const gradient = new LinearGradient(x1, y1, x2, y2);
        gradient.global = true;

        parseGradientColorStops(xmlNode, gradient);

        return gradient as LinearGradientObject;
    }

    // TODO
    // 'pattern': function (xmlNode: SVGElement) {
    // }

    // TODO
    // 'radialgradient': function (xmlNode) {
    // }
};

function parseGradientColorStops(xmlNode: SVGElement, gradient: GradientObject): void {

    let stop = xmlNode.firstChild as SVGStopElement;

    while (stop) {
        if (stop.nodeType === 1) {
            const offsetStr = stop.getAttribute('offset');
            let offset: number;
            if (offsetStr && offsetStr.indexOf('%') > 0) {  // percentage
                offset = parseInt(offsetStr, 10) / 100;
            }
            else if (offsetStr) { // number from 0 to 1
                offset = parseFloat(offsetStr);
            }
            else {
                offset = 0;
            }

            // <stop style="stop-color:red"/> has higher priority than
            // <stop stop-color="red"/>
            const styleVals = {} as Dictionary<string>;
            parseStyleAttribute(stop, styleVals);
            const stopColor = styleVals.stopColor
                || stop.getAttribute('stop-color')
                || '#000000';

            gradient.colorStops.push({
                offset: offset,
                color: stopColor
            });
        }
        stop = stop.nextSibling as SVGStopElement;
    }
}

function inheritStyle(parent: Element, child: Element): void {
    if (parent && (parent as ElementExtended).__inheritedStyle) {
        if (!(child as ElementExtended).__inheritedStyle) {
            (child as ElementExtended).__inheritedStyle = {};
        }
        defaults((child as ElementExtended).__inheritedStyle, (parent as ElementExtended).__inheritedStyle);
    }
}

function parsePoints(pointsString: string): number[][] {
    const list = trim(pointsString).split(DILIMITER_REG);
    const points = [];

    for (let i = 0; i < list.length; i += 2) {
        const x = parseFloat(list[i]);
        const y = parseFloat(list[i + 1]);
        points.push([x, y]);
    }
    return points;
}

const STYLE_ATTRIBUTES_MAP = {
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
    'alignment-baseline': 'textBaseline',
    'visibility': 'visibility',
    'display': 'display',
    'stop-color': 'stopColor'
} as const;
const STYLE_ATTRIBUTES_MAP_KEYS = keys(STYLE_ATTRIBUTES_MAP);


function parseAttributes(
    xmlNode: SVGElement,
    el: Element,
    defs: DefsMap,
    onlyInlineStyle: boolean
): void {
    const disp = el as DisplayableExtended;
    const zrStyle = disp.__inheritedStyle || {};

    // TODO Shadow
    if (xmlNode.nodeType === 1) {
        parseTransformAttribute(xmlNode, el);

        parseStyleAttribute(xmlNode, zrStyle);

        if (!onlyInlineStyle) {
            for (let i = 0; i < STYLE_ATTRIBUTES_MAP_KEYS.length; i++) {
                const svgAttrName = STYLE_ATTRIBUTES_MAP_KEYS[i];
                const attrValue = xmlNode.getAttribute(svgAttrName);
                if (attrValue != null) {
                    zrStyle[STYLE_ATTRIBUTES_MAP[svgAttrName]] = attrValue;
                }
            }
        }
    }

    disp.style = disp.style || {};

    if (zrStyle.fill != null) {
        disp.style.fill = getPaint(zrStyle.fill, defs);
    }
    if (zrStyle.stroke != null) {
        disp.style.stroke = getPaint(zrStyle.stroke, defs);
    }

    each([
        'lineWidth', 'opacity', 'fillOpacity', 'strokeOpacity', 'miterLimit', 'fontSize'
    ], function (propName) {
        zrStyle[propName] != null && (disp.style[propName] = parseFloat(zrStyle[propName]));
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
        zrStyle[propName] != null && (disp.style[propName] = zrStyle[propName]);
    });

    if (zrStyle.lineDash) {
        disp.style.lineDash = map(trim(zrStyle.lineDash).split(DILIMITER_REG), function (str) {
            return parseFloat(str);
        });
    }

    if (zrStyle.visibility === 'hidden' || zrStyle.visibility === 'collapse') {
        disp.invisible = true;
    }

    if (zrStyle.display === 'none') {
        disp.ignore = true;
    }

    disp.__inheritedStyle = zrStyle;
}

// Support `fill:url(#someId)`.
const urlRegex = /^url\(\s*#(.*?)\)/;
function getPaint(str: string, defs: DefsMap): string | DefsMap[keyof DefsMap] {
    // if (str === 'none') {
    //     return;
    // }
    const urlMatch = defs && str && str.match(urlRegex);
    if (urlMatch) {
        const url = trim(urlMatch[1]);
        const def = defs[url];
        return def;
    }
    return str;
}

const transformRegex = /(translate|scale|rotate|skewX|skewY|matrix)\(([\-\s0-9\.e,]*)\)/g;

function parseTransformAttribute(xmlNode: SVGElement, node: Element): void {
    let transform = xmlNode.getAttribute('transform');
    if (transform) {
        transform = transform.replace(/,/g, ' ');
        const transformOps: string[] = [];
        let m = null;
        transform.replace(transformRegex, function (str: string, type: string, value: string) {
            transformOps.push(type, value);
            return '';
        });
        for (let i = transformOps.length - 1; i > 0; i -= 2) {
            let value = transformOps[i];
            let type = transformOps[i - 1];
            let valueArr: string[];
            m = m || matrix.create();
            switch (type) {
                case 'translate':
                    valueArr = trim(value).split(DILIMITER_REG);
                    matrix.translate(m, m, [parseFloat(valueArr[0]), parseFloat(valueArr[1] || '0')]);
                    break;
                case 'scale':
                    valueArr = trim(value).split(DILIMITER_REG);
                    matrix.scale(m, m, [parseFloat(valueArr[0]), parseFloat(valueArr[1] || valueArr[0])]);
                    break;
                case 'rotate':
                    valueArr = trim(value).split(DILIMITER_REG);
                    matrix.rotate(m, m, parseFloat(valueArr[0]));
                    break;
                case 'skew':
                    valueArr = trim(value).split(DILIMITER_REG);
                    console.warn('Skew transform is not supported yet');
                    break;
                case 'matrix':
                    valueArr = trim(value).split(DILIMITER_REG);
                    m[0] = parseFloat(valueArr[0]);
                    m[1] = parseFloat(valueArr[1]);
                    m[2] = parseFloat(valueArr[2]);
                    m[3] = parseFloat(valueArr[3]);
                    m[4] = parseFloat(valueArr[4]);
                    m[5] = parseFloat(valueArr[5]);
                    break;
            }
        }
        node.setLocalTransform(m);
    }
}

// Value may contain space.
const styleRegex = /([^\s:;]+)\s*:\s*([^:;]+)/g;
function parseStyleAttribute(xmlNode: SVGElement, result: Dictionary<string>): void {
    const style = xmlNode.getAttribute('style');

    if (!style) {
        return;
    }

    styleRegex.lastIndex = 0;
    let styleRegResult;
    while ((styleRegResult = styleRegex.exec(style)) != null) {
        const svgStlAttr = styleRegResult[1];
        const zrStlAttr = STYLE_ATTRIBUTES_MAP.hasOwnProperty(svgStlAttr)
            ? STYLE_ATTRIBUTES_MAP[svgStlAttr as keyof typeof STYLE_ATTRIBUTES_MAP]
            : null;

        if (zrStlAttr) {
            result[zrStlAttr] = styleRegResult[2];
        }
    }
}

export function makeViewBoxTransform(viewBoxRect: RectLike, width: number, height: number): {
    scale: number;
    x: number;
    y: number;
} {
    const scaleX = width / viewBoxRect.width;
    const scaleY = height / viewBoxRect.height;
    const scale = Math.min(scaleX, scaleY);
    // preserveAspectRatio 'xMidYMid'

    return {
        scale,
        x: -(viewBoxRect.x + viewBoxRect.width / 2) * scale + width / 2,
        y: -(viewBoxRect.y + viewBoxRect.height / 2) * scale + height / 2
    };
}

export function parseSVG(xml: string | Document | SVGElement, opt: SVGParserOption): SVGParserResult {
    const parser = new SVGParser();
    return parser.parse(xml, opt);
}


// Also export parseXML to avoid breaking change.
export {parseXML};
