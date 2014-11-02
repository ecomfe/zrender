// Copyright 2006 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


// Known Issues:
//
// * Patterns only support repeat.
// * Radial gradient are not implemented. The VML version of these look very
//   different from the canvas one.
// * Clipping paths are not implemented.
// * Coordsize. The width and height attribute have higher priority than the
//   width and height style values which isn't correct.
// * Painting mode isn't implemented.
// * Canvas width/height should is using content-box by default. IE in
//   Quirks mode will draw the canvas using border-box. Either change your
//   doctype to HTML5
//   (http://www.whatwg.org/specs/web-apps/current-work/#the-doctype)
//   or use Box Sizing Behavior from WebFX
//   (http://webfx.eae.net/dhtml/boxsizing/boxsizing.html)
// * Non uniform scaling does not correctly scale strokes.
// * Optimize. There is always room for speed improvements.

// AMD by kener.linfeng@gmail.com
// Optimized by https://github.com/pissang
define(function(require) {
    
// Only add this code if we do not already have a canvas implementation
if (!document.createElement('canvas').getContext) {

(function() {

  // alias some functions to make (compiled) code shorter
  var m = Math;
  var mr = m.round;
  var ms = m.sin;
  var mc = m.cos;
  var abs = m.abs;
  var sqrt = m.sqrt;

  // this is used for sub pixel precision
  var Z = 10;
  var Z2 = Z / 2;

  var IE_VERSION = +navigator.userAgent.match(/MSIE ([\d.]+)?/)[1];

  /**
   * This funtion is assigned to the <canvas> elements as element.getContext().
   * @this {HTMLElement}
   * @return {CanvasRenderingContext2D_}
   */
  function getContext() {
    return this.context_ ||
        (this.context_ = new CanvasRenderingContext2D_(this));
  }

  var slice = Array.prototype.slice;

  /**
   * Binds a function to an object. The returned function will always use the
   * passed in {@code obj} as {@code this}.
   *
   * Example:
   *
   *   g = bind(f, obj, a, b)
   *   g(c, d) // will do f.call(obj, a, b, c, d)
   *
   * @param {Function} f The function to bind the object to
   * @param {Object} obj The object that should act as this when the function
   *     is called
   * @param {*} var_args Rest arguments that will be used as the initial
   *     arguments when the function is called
   * @return {Function} A new function that has bound this
   */
  function bind(f, obj, var_args) {
    var a = slice.call(arguments, 2);
    return function() {
      return f.apply(obj, a.concat(slice.call(arguments)));
    };
  }

  function encodeHtmlAttribute(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function addNamespace(doc, prefix, urn) {
    if (!doc.namespaces[prefix]) {
      // NOTES, It will not work proply if add '#default#VML' 
      // When using appendChild to add dom
      // doc.namespaces.add(prefix, urn, '#default#VML');
      doc.namespaces.add(prefix, urn);
    }
  }

  function addNamespacesAndStylesheet(doc) {
    addNamespace(doc, 'g_vml_', 'urn:schemas-microsoft-com:vml');
    addNamespace(doc, 'g_o_', 'urn:schemas-microsoft-com:office:office');

    // Setup default CSS.  Only add one style sheet per document
    if (!doc.styleSheets['ex_canvas_']) {
      var ss = doc.createStyleSheet();
      ss.owningElement.id = 'ex_canvas_';
      ss.cssText = 'canvas{display:inline-block;overflow:hidden;' +
          // default size is 300x150 in Gecko and Opera
          'text-align:left;width:300px;height:150px} .g_vml_ {behavior:url(#default#VML);}';
    }
  }

  function createVMLElement(tagName) {
    // NOTES Why using createElement needs to add behavior:url(#default#VML) in style
    var dom = document.createElement('<g_vml_:' + tagName + ' class="g_vml_">');
    return dom;

  }

  // Add namespaces and stylesheet at startup.
  addNamespacesAndStylesheet(document);

  var G_vmlCanvasManager_ = {
    init: function(opt_doc) {
      var doc = opt_doc || document;
      // Create a dummy element so that IE will allow canvas elements to be
      // recognized.
      doc.createElement('canvas');
      doc.attachEvent('onreadystatechange', bind(this.init_, this, doc));
    },

    init_: function(doc) {
      // find all canvas elements
      var els = doc.getElementsByTagName('canvas');
      for (var i = 0; i < els.length; i++) {
        this.initElement(els[i]);
      }
    },

    /**
     * Public initializes a canvas element so that it can be used as canvas
     * element from now on. This is called automatically before the page is
     * loaded but if you are creating elements using createElement you need to
     * make sure this is called on the element.
     * @param {HTMLElement} el The canvas element to initialize.
     * @return {HTMLElement} the element that was created.
     */
    initElement: function(el) {
      if (!el.getContext) {
        el.getContext = getContext;

        // Add namespaces and stylesheet to document of the element.
        addNamespacesAndStylesheet(el.ownerDocument);

        // Remove fallback content. There is no way to hide text nodes so we
        // just remove all childNodes. We could hide all elements and remove
        // text nodes but who really cares about the fallback content.
        el.innerHTML = '';

        // do not use inline function because that will leak memory
        el.attachEvent('onpropertychange', onPropertyChange);
        el.attachEvent('onresize', onResize);

        var attrs = el.attributes;
        if (attrs.width && attrs.width.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setWidth_(attrs.width.nodeValue);
          el.style.width = attrs.width.nodeValue + 'px';
        } else {
          el.width = el.clientWidth;
        }
        if (attrs.height && attrs.height.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setHeight_(attrs.height.nodeValue);
          el.style.height = attrs.height.nodeValue + 'px';
        } else {
          el.height = el.clientHeight;
        }
        //el.getContext().setCoordsize_()
      }
      return el;
    }
  };

  function onPropertyChange(e) {
    var el = e.srcElement;

    switch (e.propertyName) {
      case 'width':
        el.getContext().clearRect();
        el.style.width = el.attributes.width.nodeValue + 'px';
        // In IE8 this does not trigger onresize.
        el.firstChild.style.width =  el.clientWidth + 'px';
        break;
      case 'height':
        el.getContext().clearRect();
        el.style.height = el.attributes.height.nodeValue + 'px';
        el.firstChild.style.height = el.clientHeight + 'px';
        break;
    }
  }

  function onResize(e) {
    var el = e.srcElement;
    if (el.firstChild) {
      el.firstChild.style.width =  el.clientWidth + 'px';
      el.firstChild.style.height = el.clientHeight + 'px';
    }
  }

  G_vmlCanvasManager_.init();

  // precompute "00" to "FF"
  var decToHex = [];
  for (var i = 0; i < 16; i++) {
    for (var j = 0; j < 16; j++) {
      decToHex[i * 16 + j] = i.toString(16) + j.toString(16);
    }
  }

  function createMatrixIdentity() {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }

  function matrixMultiply(m1, m2) {
    var result = createMatrixIdentity();

    for (var x = 0; x < 3; x++) {
      for (var y = 0; y < 3; y++) {
        var sum = 0;

        for (var z = 0; z < 3; z++) {
          sum += m1[x][z] * m2[z][y];
        }

        result[x][y] = sum;
      }
    }
    return result;
  }

  function copyState(o1, o2) {
    o2.fillStyle     = o1.fillStyle;
    o2.lineCap       = o1.lineCap;
    o2.lineJoin      = o1.lineJoin;
    o2.lineWidth     = o1.lineWidth;
    o2.miterLimit    = o1.miterLimit;
    o2.shadowBlur    = o1.shadowBlur;
    o2.shadowColor   = o1.shadowColor;
    o2.shadowOffsetX = o1.shadowOffsetX;
    o2.shadowOffsetY = o1.shadowOffsetY;
    o2.strokeStyle   = o1.strokeStyle;
    o2.globalAlpha   = o1.globalAlpha;
    o2.font          = o1.font;
    o2.textAlign     = o1.textAlign;
    o2.textBaseline  = o1.textBaseline;
    o2.scaleX_    = o1.scaleX_;
    o2.scaleY_    = o1.scaleY_;
    o2.lineScale_    = o1.lineScale_;
  }

  var colorData = {
    aliceblue: '#F0F8FF',
    antiquewhite: '#FAEBD7',
    aquamarine: '#7FFFD4',
    azure: '#F0FFFF',
    beige: '#F5F5DC',
    bisque: '#FFE4C4',
    black: '#000000',
    blanchedalmond: '#FFEBCD',
    blueviolet: '#8A2BE2',
    brown: '#A52A2A',
    burlywood: '#DEB887',
    cadetblue: '#5F9EA0',
    chartreuse: '#7FFF00',
    chocolate: '#D2691E',
    coral: '#FF7F50',
    cornflowerblue: '#6495ED',
    cornsilk: '#FFF8DC',
    crimson: '#DC143C',
    cyan: '#00FFFF',
    darkblue: '#00008B',
    darkcyan: '#008B8B',
    darkgoldenrod: '#B8860B',
    darkgray: '#A9A9A9',
    darkgreen: '#006400',
    darkgrey: '#A9A9A9',
    darkkhaki: '#BDB76B',
    darkmagenta: '#8B008B',
    darkolivegreen: '#556B2F',
    darkorange: '#FF8C00',
    darkorchid: '#9932CC',
    darkred: '#8B0000',
    darksalmon: '#E9967A',
    darkseagreen: '#8FBC8F',
    darkslateblue: '#483D8B',
    darkslategray: '#2F4F4F',
    darkslategrey: '#2F4F4F',
    darkturquoise: '#00CED1',
    darkviolet: '#9400D3',
    deeppink: '#FF1493',
    deepskyblue: '#00BFFF',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1E90FF',
    firebrick: '#B22222',
    floralwhite: '#FFFAF0',
    forestgreen: '#228B22',
    gainsboro: '#DCDCDC',
    ghostwhite: '#F8F8FF',
    gold: '#FFD700',
    goldenrod: '#DAA520',
    grey: '#808080',
    greenyellow: '#ADFF2F',
    honeydew: '#F0FFF0',
    hotpink: '#FF69B4',
    indianred: '#CD5C5C',
    indigo: '#4B0082',
    ivory: '#FFFFF0',
    khaki: '#F0E68C',
    lavender: '#E6E6FA',
    lavenderblush: '#FFF0F5',
    lawngreen: '#7CFC00',
    lemonchiffon: '#FFFACD',
    lightblue: '#ADD8E6',
    lightcoral: '#F08080',
    lightcyan: '#E0FFFF',
    lightgoldenrodyellow: '#FAFAD2',
    lightgreen: '#90EE90',
    lightgrey: '#D3D3D3',
    lightpink: '#FFB6C1',
    lightsalmon: '#FFA07A',
    lightseagreen: '#20B2AA',
    lightskyblue: '#87CEFA',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#B0C4DE',
    lightyellow: '#FFFFE0',
    limegreen: '#32CD32',
    linen: '#FAF0E6',
    magenta: '#FF00FF',
    mediumaquamarine: '#66CDAA',
    mediumblue: '#0000CD',
    mediumorchid: '#BA55D3',
    mediumpurple: '#9370DB',
    mediumseagreen: '#3CB371',
    mediumslateblue: '#7B68EE',
    mediumspringgreen: '#00FA9A',
    mediumturquoise: '#48D1CC',
    mediumvioletred: '#C71585',
    midnightblue: '#191970',
    mintcream: '#F5FFFA',
    mistyrose: '#FFE4E1',
    moccasin: '#FFE4B5',
    navajowhite: '#FFDEAD',
    oldlace: '#FDF5E6',
    olivedrab: '#6B8E23',
    orange: '#FFA500',
    orangered: '#FF4500',
    orchid: '#DA70D6',
    palegoldenrod: '#EEE8AA',
    palegreen: '#98FB98',
    paleturquoise: '#AFEEEE',
    palevioletred: '#DB7093',
    papayawhip: '#FFEFD5',
    peachpuff: '#FFDAB9',
    peru: '#CD853F',
    pink: '#FFC0CB',
    plum: '#DDA0DD',
    powderblue: '#B0E0E6',
    rosybrown: '#BC8F8F',
    royalblue: '#4169E1',
    saddlebrown: '#8B4513',
    salmon: '#FA8072',
    sandybrown: '#F4A460',
    seagreen: '#2E8B57',
    seashell: '#FFF5EE',
    sienna: '#A0522D',
    skyblue: '#87CEEB',
    slateblue: '#6A5ACD',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#FFFAFA',
    springgreen: '#00FF7F',
    steelblue: '#4682B4',
    tan: '#D2B48C',
    thistle: '#D8BFD8',
    tomato: '#FF6347',
    turquoise: '#40E0D0',
    violet: '#EE82EE',
    wheat: '#F5DEB3',
    whitesmoke: '#F5F5F5',
    yellowgreen: '#9ACD32'
  };


  function getRgbHslContent(styleString) {
    var start = styleString.indexOf('(', 3);
    var end = styleString.indexOf(')', start + 1);
    var parts = styleString.substring(start + 1, end).split(',');
    // add alpha if needed
    if (parts.length != 4 || styleString.charAt(3) != 'a') {
      parts[3] = 1;
    }
    return parts;
  }

  function percent(s) {
    return parseFloat(s) / 100;
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function hslToRgb(parts){
    var r, g, b, h, s, l;
    h = parseFloat(parts[0]) / 360 % 360;
    if (h < 0)
      h++;
    s = clamp(percent(parts[1]), 0, 1);
    l = clamp(percent(parts[2]), 0, 1);
    if (s == 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
    }

    return '#' + decToHex[Math.floor(r * 255)] +
        decToHex[Math.floor(g * 255)] +
        decToHex[Math.floor(b * 255)];
  }

  function hueToRgb(m1, m2, h) {
    if (h < 0)
      h++;
    if (h > 1)
      h--;

    if (6 * h < 1)
      return m1 + (m2 - m1) * 6 * h;
    else if (2 * h < 1)
      return m2;
    else if (3 * h < 2)
      return m1 + (m2 - m1) * (2 / 3 - h) * 6;
    else
      return m1;
  }

  var processStyleCache = {};

  function processStyle(styleString) {
    if (styleString in processStyleCache) {
      return processStyleCache[styleString];
    }

    var str, alpha = 1;

    styleString = String(styleString);
    if (styleString.charAt(0) == '#') {
      str = styleString;
    } else if (/^rgb/.test(styleString)) {
      var parts = getRgbHslContent(styleString);
      var str = '#', n;
      for (var i = 0; i < 3; i++) {
        if (parts[i].indexOf('%') != -1) {
          n = Math.floor(percent(parts[i]) * 255);
        } else {
          n = +parts[i];
        }
        str += decToHex[clamp(n, 0, 255)];
      }
      alpha = +parts[3];
    } else if (/^hsl/.test(styleString)) {
      var parts = getRgbHslContent(styleString);
      str = hslToRgb(parts);
      alpha = parts[3];
    } else {
      str = colorData[styleString] || styleString;
    }
    return processStyleCache[styleString] = {color: str, alpha: alpha};
  }

  var DEFAULT_STYLE = {
    style: 'normal',
    variant: 'normal',
    weight: 'normal',
    size: 12,           //10
    family: '微软雅黑'     //'sans-serif'
  };

  // Internal text style cache
  var fontStyleCache = {};

  function processFontStyle(styleString) {
    if (fontStyleCache[styleString]) {
      return fontStyleCache[styleString];
    }

    var el = document.createElement('div');
    var style = el.style;
    var fontFamily;
    try {
      style.font = styleString;
      fontFamily = style.fontFamily.split(',')[0];
    } catch (ex) {
      // Ignore failures to set to invalid font.
    }

    return fontStyleCache[styleString] = {
      style: style.fontStyle || DEFAULT_STYLE.style,
      variant: style.fontVariant || DEFAULT_STYLE.variant,
      weight: style.fontWeight || DEFAULT_STYLE.weight,
      size: style.fontSize || DEFAULT_STYLE.size,
      family: fontFamily || DEFAULT_STYLE.family
    };
  }

  function getComputedStyle(style, element) {
    var computedStyle = {};

    for (var p in style) {
      computedStyle[p] = style[p];
    }

    // Compute the size
    var canvasFontSize = parseFloat(element.currentStyle.fontSize),
        fontSize = parseFloat(style.size);

    if (typeof style.size == 'number') {
      computedStyle.size = style.size;
    } else if (style.size.indexOf('px') != -1) {
      computedStyle.size = fontSize;
    } else if (style.size.indexOf('em') != -1) {
      computedStyle.size = canvasFontSize * fontSize;
    } else if(style.size.indexOf('%') != -1) {
      computedStyle.size = (canvasFontSize / 100) * fontSize;
    } else if (style.size.indexOf('pt') != -1) {
      computedStyle.size = fontSize / .75;
    } else {
      computedStyle.size = canvasFontSize;
    }

    // Different scaling between normal text and VML text. This was found using
    // trial and error to get the same size as non VML text.
    //computedStyle.size *= 0.981;

    return computedStyle;
  }

  function buildStyle(style) {
    return style.style + ' ' + style.variant + ' ' + style.weight + ' ' +
        style.size + "px '" + style.family + "'";
  }

  var lineCapMap = {
    'butt': 'flat',
    'round': 'round'
  };

  function processLineCap(lineCap) {
    return lineCapMap[lineCap] || 'square';
  }

  /**
   * Virtual shape dom is created by stroke and fill operation.
   * It will be cached in Context2D object. And created only if needed when redrawing
   * @author https://github.com/pissang/
   */
  function ShapeVirtualDom_() {
    
    this.rootDom_ = null;

    this.strokeDom_ = null;

    this.fillDom_ = null;
  }

  ShapeVirtualDom_.prototype.getDom = function (path, x, y) {
    if (!this.rootDom_) {
      this.createShapeDom_(path);
    }

    this.rootDom_.style.left = x + 'px';
    this.rootDom_.style.top = y + 'px';

    if (path !== this.rootDom_.path) {
      this.rootDom_.path = path;
    }

    this.reset_();

    return this.rootDom_;
  };

  ShapeVirtualDom_.prototype.createShapeDom_ = function (path) {

    var W = 10;
    var H = 10;

    var rootDom_ = createVMLElement('shape');
    rootDom_.style.position = 'absolute';
    rootDom_.style.width = W + 'px';
    rootDom_.style.height = H + 'px';
    rootDom_.path = path;
    rootDom_.coordorigin = '0 0';
    rootDom_.coordsize = Z * W + ' ' + Z * H;

    rootDom_.stroked = 'false';
    rootDom_.filled = 'false';

    this.rootDom_ = rootDom_;
  };

  /**
   * Remove fill and stroke dom
   */
  ShapeVirtualDom_.prototype.reset_ = function () {
    if (this.fillDom_) {
      this.rootDom_.filled = "false";
      if (this.fillDom_.parentNode === this.rootDom_) {
        this.rootDom_.removeChild(this.fillDom_);
      }
    }
    if (this.strokeDom_) {
      this.rootDom_.stroked = "false";
      if (this.strokeDom_.parentNode === this.rootDom_) {
        this.rootDom_.removeChild(this.strokeDom_);
      }
    }
  }

  ShapeVirtualDom_.prototype.isFilled = function () {
    return this.rootDom_.filled === 'true';
  };

  ShapeVirtualDom_.prototype.isStroked = function () {
    return this.rootDom_.stroked === 'true';
  }

  ShapeVirtualDom_.prototype.fill = function (ctx, min, max) {
    this.rootDom_.filled = 'true';

    if (!this.fillDom_) {
      this.fillDom_ = createVMLElement('fill');
    }
    var fillDom_ = this.fillDom_;

    var fillStyle = ctx.fillStyle;
    var arcScaleX = ctx.scaleX_;
    var arcScaleY = ctx.scaleY_;
    var width = max.x - min.x;
    var height = max.y - min.y;

    if (fillStyle instanceof CanvasGradient_) {
      // TODO: Gradients transformed with the transformation matrix.
      var angle = 0;
      var focus = {x: 0, y: 0};

      // additional offset
      var shift = 0;
      // scale factor for offset
      var expansion = 1;

      if (fillStyle.type_ == 'gradient') {
        var x0 = fillStyle.x0_ / arcScaleX;
        var y0 = fillStyle.y0_ / arcScaleY;
        var x1 = fillStyle.x1_ / arcScaleX;
        var y1 = fillStyle.y1_ / arcScaleY;
        var p0 = getCoords(ctx, x0, y0);
        var p1 = getCoords(ctx, x1, y1);
        var dx = p1.x - p0.x;
        var dy = p1.y - p0.y;
        angle = Math.atan2(dx, dy) * 180 / Math.PI;

        // The angle should be a non-negative number.
        if (angle < 0) {
          angle += 360;
        }

        // Very small angles produce an unexpected result because they are
        // converted to a scientific notation string.
        if (angle < 1e-6) {
          angle = 0;
        }
      } else {
        var p0 = getCoords(ctx, fillStyle.x0_, fillStyle.y0_);
        focus = {
          x: (p0.x - min.x) / width,
          y: (p0.y - min.y) / height
        };

        width /= arcScaleX * Z;
        height /= arcScaleY * Z;
        var dimension = m.max(width, height);
        shift = 2 * fillStyle.r0_ / dimension;
        expansion = 2 * fillStyle.r1_ / dimension - shift;
      }

      // We need to sort the color stops in ascending order by offset,
      // otherwise IE won't interpret it correctly.
      var stops = fillStyle.colors_;
      stops.sort(function(cs1, cs2) {
        return cs1.offset - cs2.offset;
      });

      var length = stops.length;
      var color1 = stops[0].color;
      var color2 = stops[length - 1].color;
      var opacity1 = stops[0].alpha * ctx.globalAlpha;
      var opacity2 = stops[length - 1].alpha * ctx.globalAlpha;

      var colors = [];
      for (var i = 0; i < length; i++) {
        var stop = stops[i];
        colors.push(stop.offset * expansion + shift + ' ' + stop.color);
      }

      fillDom_.type = fillStyle.type_;
      fillDom_.method = 'none';
      fillDom_.focus = '100%';
      fillDom_.color = color1;
      fillDom_.color2 = color2;
      fillDom_.colors = colors.join(',');
      fillDom_.opacity = opacity2;
      fillDom_.setAttribute('g_o_:opacity2', opacity1);
      fillDom_.angle = angle;
      fillDom_.focusposition = focus.x + ',' + focus.y;
    }
    else if (fillStyle instanceof CanvasPattern_) {
      if (width && height) {
        var deltaLeft = -min.x;
        var deltaTop = -min.y;
        fillDom_.position = deltaLeft / width * arcScaleX * arcScaleX + ',' +
          deltaTop / height * arcScaleY * arcScaleY;
        fillDom_.type = 'tile';
        fillDom_.src = fillStyle.src_;
      }
    }
    else {
      var a = processStyle(ctx.fillStyle);
      var color = a.color;
      var opacity = a.alpha * ctx.globalAlpha;
      fillDom_.color = color;
      fillDom_.opacity = opacity;
    }
    this.rootDom_.appendChild(this.fillDom_);
  };

  ShapeVirtualDom_.prototype.stroke = function (ctx) {
    this.rootDom_.stroked = "true";
    if (!this.strokeDom_) {
      this.strokeDom_ = createVMLElement('stroke');
    }

    var a = processStyle(ctx.strokeStyle);
    var color = a.color;
    var opacity = a.alpha * ctx.globalAlpha;
    var lineWidth = ctx.lineScale_ * ctx.lineWidth;
    
    // VML cannot correctly render a line if the width is less than 1px.
    // In that case, we dilute the color to make the line look thinner.
    if (lineWidth < 1) {
      opacity *= lineWidth;
    }
    this.strokeDom_.opacity = opacity;
    this.strokeDom_.joinstyle = ctx.lineJoin;
    this.strokeDom_.miterlimit = ctx.miterLimit;
    this.strokeDom_.endcap = processLineCap(ctx.lineCap);
    this.strokeDom_.weight = lineWidth + 'px';
    this.strokeDom_.color = color;

    this.rootDom_.appendChild(this.strokeDom_);
  };


  /**
   * Virtual text dom is created by fillText and strokeText operation.
   * It will be cached in Context2D object. And created only if needed when redrawing
   * @author https://github.com/pissang/
   */
  function TextVirtualDom_() {
    this.rootDom_ = null;

    this.skewDom_ = null;
    this.textPathDom_ = null;
  }

  TextVirtualDom_.prototype.getDom = function (ctx, text, x, y, maxWidth, stroke) {
    if (!this.rootDom_) {
      this.createDom_();
    }
    var m = ctx.m_,
        delta = 1000,
        left = 0,
        right = delta,
        offset = {x: 0, y: 0};

    var fontStyle = getComputedStyle(processFontStyle(ctx.font),
                                     ctx.element_);
    var fontStyleString = buildStyle(fontStyle);
    var elementStyle = ctx.element_.currentStyle;

    var textAlign = ctx.textAlign.toLowerCase();
    switch (textAlign) {
      case 'left':
      case 'center':
      case 'right':
        break;
      case 'end':
        textAlign = elementStyle.direction == 'ltr' ? 'right' : 'left';
        break;
      case 'start':
        textAlign = elementStyle.direction == 'rtl' ? 'right' : 'left';
        break;
      default:
        textAlign = 'left';
    }

    // 1.75 is an arbitrary number, as there is no info about the text baseline
    switch (this.textBaseline) {
      case 'hanging':
      case 'top':
        offset.y = fontStyle.size / 1.75;
        break;
      case 'middle':
        break;
      default:
      case null:
      case 'alphabetic':
      case 'ideographic':
      case 'bottom':
        offset.y = -fontStyle.size / 2.25;
        break;
    }

    switch(textAlign) {
      case 'right':
        left = delta;
        right = 0.05;
        break;
      case 'center':
        left = right = delta / 2;
        break;
    }

    var d = getCoords(ctx, x + offset.x, y + offset.y);
    this.rootDom_.from = -left + ' 0';
    this.rootDom_.to = right + ' 0.05';

    if (stroke) {
      this.stroke(ctx);
      this.rootDom_.stroked = 'true';
      this.rootDom_.filled = 'false';
    } else {
      this.fill(ctx, {x: -left, y: 0}, {x: right, y: fontStyle.size});
      this.rootDom_.stroked = 'false';
      this.rootDom_.filled = 'true';
    }

    if (!this.skewDom_) {
      this.skewDom_ = createVMLElement('skew');
      this.skewDom_.on = 't';
    }
    var skewM = m[0][0].toFixed(3) + ',' + m[1][0].toFixed(3) + ',' +
              m[0][1].toFixed(3) + ',' + m[1][1].toFixed(3) + ',0,0';

    var skewOffset = mr(d.x / Z) + ',' + mr(d.y / Z);
    this.skewDom_.matrix = skewM;
    this.skewDom_.offset = skewOffset;
    this.skewDom_.origin = left + ' 0';
    if (this.skewDom_.parentNode !== this.rootDom_) {
      this.rootDom_.appendChild(this.skewDom_);
    }

    if (!this.textPathDom_) {
      this.textPathDom_ = createVMLElement('textpath');
      var pathDom_ = createVMLElement('path');
      pathDom_.textpathok = 'true';
      this.textPathDom_.on = 'true';
      this.textPathDom_.string = encodeHtmlAttribute(text);
      this.textPathDom_.style['v-text-align'] = textAlign;
      this.textPathDom_.style.font = encodeHtmlAttribute(fontStyleString);

      this.rootDom_.appendChild(pathDom_);
      this.rootDom_.appendChild(this.textPathDom_);
    }

    return this.rootDom_;
  };

  TextVirtualDom_.prototype.createDom_ = function () {
    var W = 10;
    var H = 10;
    this.rootDom_ = createVMLElement('line');
    this.rootDom_.coordsize = Z * W + ' ' + Z * H;
    this.rootDom_.coordorigin = '0 0';
    this.rootDom_.style.position = 'absolute';
    this.rootDom_.style.width = '1px';
    this.rootDom_.style.height = '1px';
  };

  TextVirtualDom_.prototype.fill = ShapeVirtualDom_.prototype.fill;
  TextVirtualDom_.prototype.stroke = ShapeVirtualDom_.prototype.stroke;
  TextVirtualDom_.prototype.reset_ = ShapeVirtualDom_.prototype.reset_;

  /**
   * Virtual image dom is created by drawImage operation.
   * It will be cached in Context2D object. And created only if needed when redrawing
   * @author https://github.com/pissang/
   *
   * TODO Image cropping testing
   */
  function ImageVirtualDom_() {
    this.rootDom_ = null;

    this.cropDom_ = null;

    this.imageDom_ = null;
  };

  ImageVirtualDom_.prototype.getDom = function (ctx, image, var_args) {

    if (!this.rootDom_) {
      this.createRootDom_();
    }
    var rootDom_ = this.rootDom_;

    var dx, dy, dw, dh, sx, sy, sw, sh;

    // to find the original width we overide the width and height
    var oldRuntimeWidth = image.runtimeStyle.width;
    var oldRuntimeHeight = image.runtimeStyle.height;
    image.runtimeStyle.width = 'auto';
    image.runtimeStyle.height = 'auto';

    // get the original size
    var w = image.width;
    var h = image.height;

    // and remove overides
    image.runtimeStyle.width = oldRuntimeWidth;
    image.runtimeStyle.height = oldRuntimeHeight;

    var args = Array.prototype.slice.call(arguments, 1);
    if (args.length == 3) {
      dx = args[1];
      dy = args[2];
      sx = sy = 0;
      sw = dw = w;
      sh = dh = h;
    } else if (args.length == 5) {
      dx = args[1];
      dy = args[2];
      dw = args[3];
      dh = args[4];
      sx = sy = 0;
      sw = w;
      sh = h;
    } else if (args.length == 9) {
      sx = args[1];
      sy = args[2];
      sw = args[3];
      sh = args[4];
      dx = args[5];
      dy = args[6];
      dw = args[7];
      dh = args[8];
    } else {
      throw Error('Invalid number of arguments');
    }

    var w2 = sw / 2;
    var h2 = sh / 2;

    var scaleX = 1, scaleY = 1;
    
    // If filters are necessary (rotation exists), create them
    // filters are bog-slow, so only create them if abbsolutely necessary
    // The following check doesn't account for skews (which don't exist
    // in the canvas spec (yet) anyway.
    if (ctx.m_[0][0] != 1 || ctx.m_[0][1] ||
        ctx.m_[1][1] != 1 || ctx.m_[1][0]) {
      var filter = [];
      var d = getCoords(ctx, dx, dy);

      scaleX = ctx.scaleX_;
      scaleY = ctx.scaleY_;
      // Note the 12/21 reversal
      filter.push('M11=', ctx.m_[0][0] / scaleX, ',',
                  'M12=', ctx.m_[1][0] / scaleY, ',',
                  'M21=', ctx.m_[0][1] / scaleX, ',',
                  'M22=', ctx.m_[1][1] / scaleY, ',',
                  'Dx=', mr(d.x / Z), ',',
                  'Dy=', mr(d.y / Z), '');

      // Bounding box calculation (need to minimize displayed area so that
      // filters don't waste time on unused pixels.
      var max = d;
      var c2 = getCoords(ctx, dx + dw, dy);
      var c3 = getCoords(ctx, dx, dy + dh);
      var c4 = getCoords(ctx, dx + dw, dy + dh);

      max.x = m.max(max.x, c2.x, c3.x, c4.x);
      max.y = m.max(max.y, c2.y, c3.y, c4.y);

      rootDom_.style.padding = [0, Math.max(mr(max.x / Z), 0) + 'px', Math.max(mr(max.y / Z), 0) + 'px', 0].join(' ');
      rootDom_.style.filter = 'progid:DXImageTransform.Microsoft.Matrix('
          + filter.join('') + ", SizingMethod='clip')";
    } else {
      rootDom_.style.left = dx + ctx.x_ + 'px';
      rootDom_.style.top = dy + ctx.y_ + 'px';
    }

    if (!this.imageDom_) {
      // NOTES
      // Matrix of rootDom will work if imageDom.style.position = 'absolute'
      this.imageDom_ = document.createElement('img');
    }
    var imageDom_ = this.imageDom_;

    // Draw a special cropping div if needed
    if (sx || sy) {
      if (!this.cropDom_) {
        this.cropDom_ = document.createElement('div');
        this.cropDom_.style.overflow = 'hidden';
        this.cropDom_.style.position = 'absolute';
      }
      this.cropDom_.style.width = Math.ceil((dw + sx * dw / sw) * scaleX) + 'px';
      this.cropDom_.style.height = Math.ceil((dh + sy * dh / sh) * scaleY) + 'px';
      this.cropDom_.style.filter = 'progid:DxImageTransform.Microsoft.Matrix(Dx='
          + -dw / sw * scaleX * sx + ',Dy=' + -dh / sh * scaleY * sy + ')';

      if (!this.cropDom_.parentNode) {
        rootDom_.appendChild(this.cropDom_); 
      }
      if (this.imageDom_.parentNode !== this.cropDom_) {
        this.cropDom_.appendChild(imageDom_);
      }
    } else {
      if (this.cropDom_ && this.cropDom_.parentNode) {
        this.cropDom_.parentNode.removeChild(this.cropDom_);
      }
      if (this.imageDom_.parentNode !== rootDom_) {
        rootDom_.appendChild(imageDom_);
      }
    }

    imageDom_.width = scaleX * dw / sw * w;
    imageDom_.height = scaleY * dh / sh * h;

    this.imageDom_.src = image.src;
    if (imageDom_.style.globalAlpha < 1) {
      imageDom_.style.filter = 'alpha(opacity=' + mr(ctx.globalAlpha * 100) +')';
    } else {
      imageDom_.style.filter = '';
    }

    return this.rootDom_;
  };

  ImageVirtualDom_.prototype.createRootDom_ = function () {
      var W = 10;
      var H = 10;

      // For some reason that I've now forgotten, using divs didn't work
      this.rootDom_ = createVMLElement('group');
      this.rootDom_.coordsize = Z * W + ' ' + Z * H;
      this.rootDom_.coordorigin = '0 0';

      this.rootDom_.style.width = W + 'px';
      this.rootDom_.style.height = H + 'px';

      this.rootDom_.style.position = 'absolute';
  }

  /**
   * This class implements CanvasRenderingContext2D interface as described by
   * the WHATWG.
   * @param {HTMLElement} canvasElement The element that the 2D context should
   * be associated with
   */
  function CanvasRenderingContext2D_(canvasElement) {
    this.m_ = createMatrixIdentity();

    this.mStack_ = [];
    this.aStack_ = [];
    this.currentPath_ = [];

    // NOTES
    // http://louisremi.com/2009/03/30/changes-in-vml-for-ie8-or-what-feature-can-the-ie-dev-team-break-for-you-today/
    // It is no longer possible to create a VML element outside of the DOM
    // this.fragment_ = document.createDocumentFragment();
    
    // Keep current drawed dom. So we can merge fill and stroke in one shape dom
    this.currentVirtualDom_ = null;

    // Cache the created dom
    this.shapeVDomList_ = [];
    this.textVDomList_ = [];
    this.imageVDomList_ = [];

    this.nShapeVDom_ = 0;
    this.nTextVDom_ = 0;
    this.nImageVDom_ = 0;

    // Canvas context properties
    this.strokeStyle = '#000';
    this.fillStyle = '#000';

    this.lineWidth = 1;
    this.lineJoin = 'miter';
    this.lineCap = 'butt';
    this.miterLimit = Z * 1;
    this.globalAlpha = 1;
    // this.font = '10px sans-serif';
    this.font = '12px 微软雅黑';        // 决定还是改这吧，影响代价最小
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.canvas = canvasElement;

    var cssText = 'width:' + canvasElement.clientWidth + 'px;height:' +
        canvasElement.clientHeight + 'px;overflow:hidden;position:absolute';
    var el = canvasElement.ownerDocument.createElement('div');
    el.style.cssText = cssText;
    canvasElement.appendChild(el);

    var overlayEl = el.cloneNode(false);
    // Use a non transparent background.
    overlayEl.style.backgroundColor = '#fff'; //red, I don't know why, it work! 
    overlayEl.style.filter = 'alpha(opacity=0)';
    canvasElement.appendChild(overlayEl);

    this.element_ = el;
    this.scaleX_ = 1;
    this.scaleY_ = 1;
    this.lineScale_ = 1;

    this.shapeDomContainer_ = document.createElement('div');
    var cssText = 'position:absolute; left:0px; right: 0px; top: 0px; bottom: 0px;';
    this.shapeDomContainer_.style.cssText = cssText;

    this.x_ = 0;
    this.y_ = 0;
  }

  var contextPrototype = CanvasRenderingContext2D_.prototype;
  contextPrototype.clearRect = function() {
    if (this.textMeasureEl_) {
      this.textMeasureEl_.removeNode(true);
      this.textMeasureEl_ = null;
    }

    if (this.shapeDomContainer_.parentNode) {
      this.shapeDomContainer_.parentNode.removeChild(this.shapeDomContainer_);
      this.shapeDomContainer_.innerHTML = '';
    }

    this.currentVirtualDom_ = null;

    this.nShapeVDom_ = 0;
    this.nTextVDom_ = 0;
    this.nImageVDom_ = 0;
  };

  contextPrototype.flush = function () {
    // TODO Why this.shapeDomContainer_ will be added to document
    if (this.shapeDomContainer_.parentNode) {
      this.shapeDomContainer_.parentNode.removeChild(this.shapeDomContainer_);
    }
    this.element_.insertBefore(this.shapeDomContainer_, this.element_.firstChild);

    this.shapeVDomList_.length = this.nShapeVDom_;
    this.imageVDomList_.length = this.nImageVDom_;
    this.textVDomList_.length = this.nTextVDom_;
  }

  contextPrototype.beginPath = function() {
    // TODO: Branch current matrix so that save/restore has no effect
    //       as per safari docs.
    this.currentPath_ = [];

    this.currentVirtualDom_ = null;
  };

  contextPrototype.moveTo = function(aX, aY) {
    var p = getSkewedCoords(this, aX, aY);
    this.currentPath_.push({type: 'moveTo', x: p.x, y: p.y});
    this.currentX_ = p.x;
    this.currentY_ = p.y;
  };

  contextPrototype.lineTo = function(aX, aY) {
    var p = getSkewedCoords(this, aX, aY);
    this.currentPath_.push({type: 'lineTo', x: p.x, y: p.y});

    this.currentX_ = p.x;
    this.currentY_ = p.y;

    this.currentVirtualDom_ = null;
  };

  contextPrototype.bezierCurveTo = function(aCP1x, aCP1y,
                                            aCP2x, aCP2y,
                                            aX, aY) {
    var p = getSkewedCoords(this, aX, aY);
    var cp1 = getSkewedCoords(this, aCP1x, aCP1y);
    var cp2 = getSkewedCoords(this, aCP2x, aCP2y);
    bezierCurveTo(this, cp1, cp2, p);

    this.currentVirtualDom_ = null;
  };

  // Helper function that takes the already fixed cordinates.
  function bezierCurveTo(self, cp1, cp2, p) {
    self.currentPath_.push({
      type: 'bezierCurveTo',
      cp1x: cp1.x,
      cp1y: cp1.y,
      cp2x: cp2.x,
      cp2y: cp2.y,
      x: p.x,
      y: p.y
    });
    self.currentX_ = p.x;
    self.currentY_ = p.y;

    this.currentVirtualDom_ = null;
  }

  contextPrototype.quadraticCurveTo = function(aCPx, aCPy, aX, aY) {
    // the following is lifted almost directly from
    // http://developer.mozilla.org/en/docs/Canvas_tutorial:Drawing_shapes

    var cp = getSkewedCoords(this, aCPx, aCPy);
    var p = getSkewedCoords(this, aX, aY);

    var cp1 = {
      x: this.currentX_ + 2.0 / 3.0 * (cp.x - this.currentX_),
      y: this.currentY_ + 2.0 / 3.0 * (cp.y - this.currentY_)
    };
    var cp2 = {
      x: cp1.x + (p.x - this.currentX_) / 3.0,
      y: cp1.y + (p.y - this.currentY_) / 3.0
    };

    bezierCurveTo(this, cp1, cp2, p);

    this.currentVirtualDom_ = null;
  };

  contextPrototype.arc = function(aX, aY, aRadius,
                                  aStartAngle, aEndAngle, aClockwise) {
    aRadius *= Z;
    var arcType = aClockwise ? 'at' : 'wa';

    var xStart = aX + mc(aStartAngle) * aRadius - Z2;
    var yStart = aY + ms(aStartAngle) * aRadius - Z2;

    var xEnd = aX + mc(aEndAngle) * aRadius - Z2;
    var yEnd = aY + ms(aEndAngle) * aRadius - Z2;

    // IE won't render arches drawn counter clockwise if xStart == xEnd.
    if (xStart == xEnd && !aClockwise) {
      xStart += 0.125; // Offset xStart by 1/80 of a pixel. Use something
                       // that can be represented in binary
    }

    var p = getSkewedCoords(this, aX, aY);
    var pStart = getSkewedCoords(this, xStart, yStart);
    var pEnd = getSkewedCoords(this, xEnd, yEnd);

    this.currentPath_.push({type: arcType,
                           x: p.x,
                           y: p.y,
                           radius: aRadius,
                           xStart: pStart.x,
                           yStart: pStart.y,
                           xEnd: pEnd.x,
                           yEnd: pEnd.y});

    this.currentVirtualDom_ = null;
  };

  contextPrototype.rect = function(aX, aY, aWidth, aHeight) {
    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();

    this.currentVirtualDom_ = null;
  };

  contextPrototype.strokeRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.stroke();

    this.currentPath_ = oldPath;
  };

  contextPrototype.fillRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.fill();

    this.currentPath_ = oldPath;
  };

  contextPrototype.createLinearGradient = function(aX0, aY0, aX1, aY1) {
    var gradient = new CanvasGradient_('gradient');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    return gradient;
  };

  contextPrototype.createRadialGradient = function(aX0, aY0, aR0,
                                                   aX1, aY1, aR1) {
    var gradient = new CanvasGradient_('gradientradial');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.r0_ = aR0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    gradient.r1_ = aR1;
    return gradient;
  };

  contextPrototype.drawImage = function(image, var_args) {

    var vDom = this.imageVDomList_[this.nImageVDom_];
    if (!vDom) {
      vDom = new ImageVirtualDom_();
      this.imageVDomList_[this.nImageVDom_] = vDom;
    }
    this.nImageVDom_++;
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this);
    var dom = vDom.getDom.apply(vDom, args);
    this.shapeDomContainer_.appendChild(dom);

    this.currentVirtualDom_ = null;
  };

  contextPrototype.stroke = function(aFill) {
    if (this.currentVirtualDom_) {
      // Simply append fill or stroke dom
      if (aFill && !this.currentVirtualDom_.isFilled()) {
        this.currentVirtualDom_.fill(this);
      } else if (!aFill && !this.currentVirtualDom_.isStroked()) {
        this.currentVirtualDom_.stroke(this);
      }

      return;
    }

    var pathStr = [];

    var min = {x: null, y: null};
    var max = {x: null, y: null};

    for (var i = 0; i < this.currentPath_.length; i++) {
      var p = this.currentPath_[i];
      var c;

      switch (p.type) {
        case 'moveTo':
          c = p;
          pathStr.push(' m ', mr(p.x), ',', mr(p.y));
          break;
        case 'lineTo':
          pathStr.push(' l ', mr(p.x), ',', mr(p.y));
          break;
        case 'close':
          pathStr.push(' x ');
          p = null;
          break;
        case 'bezierCurveTo':
          pathStr.push(' c ',
                       mr(p.cp1x), ',', mr(p.cp1y), ',',
                       mr(p.cp2x), ',', mr(p.cp2y), ',',
                       mr(p.x), ',', mr(p.y));
          break;
        case 'at':
        case 'wa':
          pathStr.push(' ', p.type, ' ',
                       mr(p.x - this.scaleX_ * p.radius), ',',
                       mr(p.y - this.scaleY_ * p.radius), ' ',
                       mr(p.x + this.scaleX_ * p.radius), ',',
                       mr(p.y + this.scaleY_ * p.radius), ' ',
                       mr(p.xStart), ',', mr(p.yStart), ' ',
                       mr(p.xEnd), ',', mr(p.yEnd));
          break;
      }

      // TODO: Following is broken for curves due to
      //       move to proper paths.

      // Figure out dimensions so we can do gradient fills
      // properly
      if (p) {
        if (min.x == null || p.x < min.x) {
          min.x = p.x;
        }
        if (max.x == null || p.x > max.x) {
          max.x = p.x;
        }
        if (min.y == null || p.y < min.y) {
          min.y = p.y;
        }
        if (max.y == null || p.y > max.y) {
          max.y = p.y;
        }
      }
    }

    pathStr = pathStr.join('');

    var vDom = this.shapeVDomList_[this.nShapeVDom_];
    if (!vDom) {
      vDom = new ShapeVirtualDom_();
      this.shapeVDomList_[this.nShapeVDom_] = vDom;
    }
    this.nShapeVDom_++;

    var shapeDom = vDom.getDom(pathStr, this.x_, this.y_);
    aFill ? vDom.fill(this, min, max) : vDom.stroke(this);

    this.shapeDomContainer_.appendChild(shapeDom);

    this.currentVirtualDom_ = vDom;
  };

  contextPrototype.fill = function() {
    this.stroke(true);
  };

  contextPrototype.closePath = function() {
    this.currentPath_.push({type: 'close'});
  };

  function getCoords(ctx, aX, aY) {
    var m = ctx.m_;
    return {
      x: Z * (aX * m[0][0] + aY * m[1][0] + m[2][0]) - Z2,
      y: Z * (aX * m[0][1] + aY * m[1][1] + m[2][1]) - Z2
    };
  };

  function getSkewedCoords(ctx, aX, aY) {var m = ctx.m_;
    return {
      x: Z * (aX * m[0][0] + aY * m[1][0]) - Z2,
      y: Z * (aX * m[0][1] + aY * m[1][1]) - Z2
    };
  }

  contextPrototype.save = function() {
    var o = {};
    copyState(this, o);
    this.aStack_.push(o);
    this.mStack_.push(this.m_);
    this.m_ = matrixMultiply(createMatrixIdentity(), this.m_);
  };

  contextPrototype.restore = function() {
    if (this.aStack_.length) {
      copyState(this.aStack_.pop(), this);
      this.m_ = this.mStack_.pop();
    }
  };

  function matrixIsFinite(m) {
    return isFinite(m[0][0]) && isFinite(m[0][1]) &&
        isFinite(m[1][0]) && isFinite(m[1][1]) &&
        isFinite(m[2][0]) && isFinite(m[2][1]);
  }

  function setM(ctx, m, updateLineScale) {
    if (!matrixIsFinite(m)) {
      return;
    }
    ctx.m_ = m;

    ctx.scaleX_ = Math.sqrt(m[0][0] * m[0][0] + m[0][1] * m[0][1]);
    ctx.scaleY_ = Math.sqrt(m[1][0] * m[1][0] + m[1][1] * m[1][1]);

    ctx.x_ = m[2][0];
    ctx.y_ = m[2][1];

    if (updateLineScale) {
      // Get the line scale.
      // Determinant of this.m_ means how much the area is enlarged by the
      // transformation. So its square root can be used as a scale factor
      // for width.
      var det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
      ctx.lineScale_ = sqrt(abs(det));
    }
  }

  contextPrototype.translate = function(aX, aY) {
    var m1 = [
      [1,  0,  0],
      [0,  1,  0],
      [aX, aY, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.rotate = function(aRot) {
    var c = mc(aRot);
    var s = ms(aRot);

    var m1 = [
      [c,  s, 0],
      [-s, c, 0],
      [0,  0, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.scale = function(aX, aY) {
    var m1 = [
      [aX, 0,  0],
      [0,  aY, 0],
      [0,  0,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);
  };

  contextPrototype.transform = function(m11, m12, m21, m22, dx, dy) {
    var m1 = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);

  };

  contextPrototype.setTransform = function(m11, m12, m21, m22, dx, dy) {
    var m = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, m, true);
  };

  /**
   * The text drawing function.
   * The maxWidth argument isn't taken in account, since no browser supports
   * it yet.
   */
  contextPrototype.drawText_ = function(text, x, y, maxWidth, stroke) {
    
    var vDom = this.textVDomList_[this.nTextVDom_];
    if (!vDom) {
      vDom = new TextVirtualDom_();
      this.textVDomList_[this.nTextVDom_] = vDom;
    }
    this.nTextVDom_++;

    var dom = vDom.getDom(this, text, x, y, maxWidth, stroke);
    this.shapeDomContainer_.appendChild(dom);

    this.currentVirtualDom_ = null;
  };

  contextPrototype.fillText = function(text, x, y, maxWidth) {
    this.drawText_(text, x, y, maxWidth, false);
  };

  contextPrototype.strokeText = function(text, x, y, maxWidth) {
    this.drawText_(text, x, y, maxWidth, true);
  };

  contextPrototype.measureText = function(text) {
    if (!this.textMeasureEl_) {
      var s = '<span style="position:absolute;' +
          'top:-20000px;left:0;padding:0;margin:0;border:none;' +
          'white-space:pre;"></span>';
      this.element_.insertAdjacentHTML('beforeEnd', s);
      this.textMeasureEl_ = this.element_.lastChild;
    }
    var doc = this.element_.ownerDocument;
    this.textMeasureEl_.innerHTML = '';
    this.textMeasureEl_.style.font = this.font;
    // Don't use innerHTML or innerText because they allow markup/whitespace.
    this.textMeasureEl_.appendChild(doc.createTextNode(text));
    return {width: this.textMeasureEl_.offsetWidth};
  };

  /******** STUBS ********/
  contextPrototype.clip = function() {
    // TODO: Implement
  };

  contextPrototype.arcTo = function() {
    // TODO: Implement
  };

  contextPrototype.createPattern = function(image, repetition) {
    return new CanvasPattern_(image, repetition);
  };

  // Gradient / Pattern Stubs
  function CanvasGradient_(aType) {
    this.type_ = aType;
    this.x0_ = 0;
    this.y0_ = 0;
    this.r0_ = 0;
    this.x1_ = 0;
    this.y1_ = 0;
    this.r1_ = 0;
    this.colors_ = [];
  }

  CanvasGradient_.prototype.addColorStop = function(aOffset, aColor) {
    aColor = processStyle(aColor);
    this.colors_.push({offset: aOffset,
                       color: aColor.color,
                       alpha: aColor.alpha});
  };

  function CanvasPattern_(image, repetition) {
    assertImageIsValid(image);
    switch (repetition) {
      case 'repeat':
      case null:
      case '':
        this.repetition_ = 'repeat';
        break
      case 'repeat-x':
      case 'repeat-y':
      case 'no-repeat':
        this.repetition_ = repetition;
        break;
      default:
        throwException('SYNTAX_ERR');
    }

    this.src_ = image.src;
    this.width_ = image.width;
    this.height_ = image.height;
  }

  function throwException(s) {
    throw new DOMException_(s);
  }

  function assertImageIsValid(img) {
    if (!img || img.nodeType != 1 || img.tagName != 'IMG') {
      throwException('TYPE_MISMATCH_ERR');
    }
    if (img.readyState != 'complete') {
      throwException('INVALID_STATE_ERR');
    }
  }

  function DOMException_(s) {
    this.code = this[s];
    this.message = s +': DOM Exception ' + this.code;
  }
  var p = DOMException_.prototype = new Error;
  p.INDEX_SIZE_ERR = 1;
  p.DOMSTRING_SIZE_ERR = 2;
  p.HIERARCHY_REQUEST_ERR = 3;
  p.WRONG_DOCUMENT_ERR = 4;
  p.INVALID_CHARACTER_ERR = 5;
  p.NO_DATA_ALLOWED_ERR = 6;
  p.NO_MODIFICATION_ALLOWED_ERR = 7;
  p.NOT_FOUND_ERR = 8;
  p.NOT_SUPPORTED_ERR = 9;
  p.INUSE_ATTRIBUTE_ERR = 10;
  p.INVALID_STATE_ERR = 11;
  p.SYNTAX_ERR = 12;
  p.INVALID_MODIFICATION_ERR = 13;
  p.NAMESPACE_ERR = 14;
  p.INVALID_ACCESS_ERR = 15;
  p.VALIDATION_ERR = 16;
  p.TYPE_MISMATCH_ERR = 17;

  // set up externs
  G_vmlCanvasManager = G_vmlCanvasManager_;
  CanvasRenderingContext2D = CanvasRenderingContext2D_;
  CanvasGradient = CanvasGradient_;
  CanvasPattern = CanvasPattern_;
  DOMException = DOMException_;
})();

} // if
else { // make the canvas test simple by kener.linfeng@gmail.com
    G_vmlCanvasManager = false;
}
return G_vmlCanvasManager;
}); // define