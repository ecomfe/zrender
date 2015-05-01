// http://www.w3.org/TR/NOTE-VML
define(function (require) {

    if (require('../core/env').canvasSupported) {
        return;
    }

    var vec2 = require('../core/vector');
    var CMD = require('../core/PathProxy').CMD;
    var colorTool = require('../tool/color');
    var textContain = require('../contain/text');
    var RectText = require('../graphic/mixin/RectText');
    var Displayable = require('../graphic/Displayable');
    var ZImage = require('../graphic/Image');
    var Text = require('../graphic/Text');
    var Path = require('../graphic/Path');

    var vmlCore = require('./core');

    var round = Math.round;
    var sqrt = Math.sqrt;
    var abs = Math.abs;
    var cos = Math.cos;
    var sin = Math.sin;
    var mathMax = Math.max;

    var applyTransform = vec2.applyTransform;

    var comma = ',';
    var imageTransformPrefix = 'progid:DXImageTransform.Microsoft';

    var Z = 21600;
    var Z2 = Z / 2;

    var ZLEVEL_BASE = 10000;

    function initRootElStyle(el) {
        el.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;';
        el.coordsize = Z + ','  + Z;
        el.coordorigin = '0,0';
    }

    function encodeHtmlAttribute(s) {
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    function rgb2Str(r, g, b) {
        return 'rgb(' + [r, g, b].join(',') + ')';
    }

    function append(parent, child) {
        if (child && parent && child.parentNode !== parent) {
            parent.appendChild(child);
        }
    }

    function remove(parent, child) {
        if (child && parent && child.parentNode === parent) {
            parent.removeChild(child);
        }
    }

    function getZIndex(zlevel, z) {
        // z 的取值范围为 [0, 1000]
        return (parseInt(zlevel) || 0) * ZLEVEL_BASE + parseInt(z) || 0;
    }

    /***************************************************
     * PATH
     **************************************************/

    function setColorAndOpacity (el, color, opacity) {
        color = colorTool.toArray(color);
        el.color = rgb2Str(color[0], color[1], color[2]);
        el.opacity = opacity * color[3];
    }

    function updateFillNode(el, style) {
        // TODO Gradient and pattern
        if (style.fill != null) {
            setColorAndOpacity(el, style.fill, style.opacity);
        }
    }

    function updateStrokeNode(el, style) {
        if (style.lineJoin != null) {
            el.joinstyle = style.lineJoin;
        }
        if (style.miterLimit != null) {
            el.miterlimit = style.miterLimit * Z;
        }
        if (style.lineCap != null) {
            el.endcap = style.lineCap;
        }
        if (style.lineDash != null) {
            el.dashstyle = style.lineDash.join(' ');
        }
        if (style.stroke != null) {
            setColorAndOpacity(el, style.stroke, style.opacity);
        }
    }

    function updateFillAndStroke(vmlEl, type, style) {
        var isFill = type == 'fill';
        var el = vmlEl.getElementsByTagName(type)[0];
        if (style[type] != null && style[type] !== 'none') {
            vmlEl[isFill ? 'filled' : 'stroked'] = 'true';
            if (! el) {
                el = vmlCore.createNode(type);
                vmlEl.appendChild(el);
            }
            isFill ? updateFillNode(el, style) : updateStrokeNode(el, style);
        }
        else {
            vmlEl[isFill ? 'filled' : 'stroked'] = 'false';
            if (el) {
                vmlEl.removeChild(el);
            }
        }
    }

    var points = [[], [], []];
    function pathDataToString(data, m) {
        var M = CMD.M;
        var C = CMD.C;
        var L = CMD.L;
        var A = CMD.A;
        var Q = CMD.Q;

        var str = [];
        var nPoint;
        var cmdStr;
        var cmd;
        var i;
        var xi;
        var yi;
        for (i = 0; i < data.length;) {
            cmd = data[i++];
            cmdStr = '';
            nPoint = 0;
            switch (cmd) {
                case M:
                    cmdStr = ' m ';
                    nPoint = 1;
                    xi = data[i++];
                    yi = data[i++];
                    points[0][0] = xi;
                    points[0][1] = yi;
                    break;
                case L:
                    cmdStr = ' l ';
                    nPoint = 1;
                    xi = data[i++];
                    yi = data[i++];
                    points[0][0] = xi;
                    points[0][1] = yi;
                    break;
                case Q:
                case C:
                    cmdStr = ' c ';
                    nPoint = 3;
                    var x1 = data[i++];
                    var y1 = data[i++];
                    var x2 = data[i++];
                    var y2 = data[i++];
                    var x3;
                    var y3;
                    if (cmd === Q) {
                        // Convert quadratic to cubic using degree elevation
                        x3 = x2;
                        y3 = y2;
                        x2 = (x2 + 2 * x1) / 3;
                        y2 = (y2 + 2 * y1) / 3;
                        x1 = (xi + 2 * x1) / 3;
                        y1 = (yi + 2 * y1) / 3;
                    }
                    else {
                        x3 = data[i++];
                        y3 = data[i++];
                    }
                    points[0][0] = x1;
                    points[0][1] = y1;
                    points[1][0] = x2;
                    points[1][1] = y2;
                    points[2][0] = x3;
                    points[2][1] = y3;

                    xi = x3;
                    yi = y3;
                    break;
                case A:
                    var x = 0;
                    var y = 0;
                    var sx = 1;
                    var sy = 1;
                    var angle = 0;
                    if (m) {
                        // Extract SRT from matrix
                        x = m[4];
                        y = m[5];
                        sx = sqrt(m[0] * m[0] + m[1] * m[1]);
                        sy = sqrt(m[2] * m[2] + m[3] * m[3]);
                        angle = Math.atan2(-m[1] / sy, m[0] / sx);
                    }

                    var cx = data[i++] + x;
                    var cy = data[i++] + y;
                    var rx = data[i++] * sx;
                    var ry = data[i++] * sy;
                    var startAngle = data[i++] + angle;
                    var endAngle = data[i++] + startAngle + angle;
                    // FIXME
                    var psi = data[i++];
                    var clockwise = data[i++];

                    var x0 = cx + cos(startAngle) * rx;
                    var y0 = cy + sin(startAngle) * ry;

                    var x1 = cx + cos(endAngle) * rx;
                    var y1 = cy + sin(endAngle) * ry;

                    var type = clockwise ? ' wa ' : ' at ';

                    str.push(
                        type, 
                        round((cx - rx) * Z - Z2), comma,
                        round((cy - ry) * Z - Z2), comma,
                        round((cx + rx) * Z - Z2), comma,
                        round((cy + ry) * Z - Z2), comma,
                        round(x0 * Z - Z2), comma,
                        round(y0 * Z - Z2), comma,
                        round(x1 * Z - Z2), comma,
                        round(y1 * Z - Z2), comma
                    );

                    xi = x1;
                    yi = y1;
                    break;
                case CMD.Z:
                    // FIXME Update xi, yi
                    str.push(' x ');
            }

            if (nPoint > 0) {
                str.push(cmdStr);
                for (var k = 0; k < nPoint; k++) {
                    var p = points[k];
                    if (m) {
                        vec2.applyTransform(p, p, m);
                    }
                    // 不 round 会非常慢
                    str.push(
                        round(p[0] * Z - Z2), comma, round(p[1] * Z - Z2),
                        k < nPoint - 1 ? comma : ''
                    );
                }
            }
        }
        return str.join('');
    }

    // Rewrite the original path method
    Path.prototype.brush = function (vmlRoot) {
        var style = this.style;

        var vmlEl = this._vmlEl;
        if (! vmlEl) {
            vmlEl = vmlCore.createNode('shape');
            initRootElStyle(vmlEl);

            this._vmlEl = vmlEl;
        }

        updateFillAndStroke(vmlEl, 'fill', style);
        updateFillAndStroke(vmlEl, 'stroke', style);

        var needTransform = this.needTransform;
        var strokeEl = vmlEl.getElementsByTagName('stroke')[0];
        if (strokeEl) {
            var lineWidth = style.lineWidth;
            // Get the line scale.
            // Determinant of this.m_ means how much the area is enlarged by the
            // transformation. So its square root can be used as a scale factor
            // for width.
            if (needTransform) {
                var m = this.transform;
                var det = m[0] * m[3] - m[1] * m[2];   
                lineWidth *= sqrt(abs(det));
            }
            strokeEl.weight = lineWidth + 'px';
        }

        var path = this._path;
        if (this.__dirtyPath) {
            path.beginPath();
            this.buildPath(path, this.shape);
            this.__dirtyPath = false;
        }

        vmlEl.path = pathDataToString(path.data, this.transform);

        vmlEl.style.zIndex = getZIndex(this.zlevel, this.z);

        // Append to root
        append(vmlRoot, vmlEl);

        // Text
        if (style.text) {
            this.drawRectText(vmlRoot, this.getBoundingRect());
        }
    };

    Path.prototype.onRemoveFromStorage = function (vmlRoot) {
        remove(vmlRoot, this._vmlEl);
        this.removeRectText(vmlRoot);
    };
    
    
    Path.prototype.onAddToStorage = function (vmlRoot) {
        append(vmlRoot, this._vmlEl);
        this.appendRectText(vmlRoot);
    };

    /***************************************************
     * IMAGE
     **************************************************/
    function isImage(img) {
        // FIXME img instanceof Image 如果 img 是一个字符串的时候，IE8 下会报错
        return (typeof img === 'object') && img.tagName && img.tagName.toUpperCase() === 'IMG';
        // return img instanceof Image;
    }

    // Rewrite the original path method
    ZImage.prototype.brush = function (vmlRoot) {
        var style = this.style;
        var image = style.image;

        // Image original width, height
        var ow;
        var oh;

        if (isImage(image)) {
            var src = image.src;
            if (src === this._imageSrc) {
                ow = this._imageWidth;
                oh = this._imageHeight;
            }
            else {
                var imageRuntimeStyle = image.runtimeStyle;
                var oldRuntimeWidth = imageRuntimeStyle.width;
                var oldRuntimeHeight = imageRuntimeStyle.height;
                imageRuntimeStyle.width = 'auto';
                imageRuntimeStyle.height = 'auto';

                // get the original size
                ow = image.width;
                oh = image.height;

                // and remove overides
                imageRuntimeStyle.width = oldRuntimeWidth;
                imageRuntimeStyle.height = oldRuntimeHeight;

                // Caching image original width, height and src
                this._imageSrc = src;
                this._imageWidth = ow;
                this._imageHeight = oh;
            }
            image = src;
        }
        else {
            if (image === this._imageSrc) {
                ow = this._imageWidth;
                oh = this._imageHeight;
            }
        }
        if (! image) {
            return;
        }

        var x = style.x || 0;
        var y = style.y || 0;

        var dw = style.width;
        var dh = style.height;

        var sw = style.sWidth;
        var sh = style.sHeight;
        var sx = style.sx || 0;
        var sy = style.sy || 0;

        var hasCrop = sw && sh;

        var vmlEl = this._vmlEl;
        if (! vmlEl) {
            // FIXME 使用 group 在 left, top 都不是 0 的时候就无法显示了。
            // vmlEl = vmlCore.createNode('group');
            vmlEl = vmlCore.doc.createElement('div');
            initRootElStyle(vmlEl);

            this._vmlEl = vmlEl;
        }

        var vmlElStyle = vmlEl.style;
        var hasRotation = false;
        var m;
        var scaleX = 1;
        var scaleY = 1;
        if (this.needTransform) {
            m = this.transform;
            scaleX = sqrt(m[0] * m[0] + m[1] * m[1]);
            scaleY = sqrt(m[2] * m[2] + m[3] * m[3]);

            hasRotation = m[1] || m[2];
        }
        if (hasRotation) {
            // If filters are necessary (rotation exists), create them
            // filters are bog-slow, so only create them if abbsolutely necessary
            // The following check doesn't account for skews (which don't exist
            // in the canvas spec (yet) anyway.
            // From excanvas
            var p0 = [x, y];
            var p1 = [x + dw, y];
            var p2 = [x, y + dh];
            var p3 = [x + dw, y + dh];
            applyTransform(p0, p0, m);
            applyTransform(p1, p1, m);
            applyTransform(p2, p2, m);
            applyTransform(p3, p3, m);

            var maxX = mathMax(p0[0], p1[0], p2[0], p3[0]);
            var maxY = mathMax(p0[1], p1[1], p2[1], p3[1]);

            var transformFilter = [];
            transformFilter.push('M11=', m[0] / scaleX, comma,
                        'M12=', m[2] / scaleY, comma,
                        'M21=', m[1] / scaleX, comma,
                        'M22=', m[3] / scaleY, comma,
                        'Dx=', round(x * scaleX + m[4]), comma,
                        'Dy=', round(y * scaleY + m[5]));

            vmlElStyle.padding = '0 ' + round(maxX) + 'px ' + round(maxY) + 'px 0';
            // FIXME DXImageTransform 在 IE11 的兼容模式下不起作用
            vmlElStyle.filter = imageTransformPrefix + '.Matrix('
                + transformFilter.join('') + ', SizingMethod=clip)';
            
        }
        else {
            if (m) {
                x = x * scaleX + m[4];
                y = y * scaleY + m[5];
            }
            vmlElStyle.filter = '';
            vmlElStyle.left = round(x) + 'px';
            vmlElStyle.top = round(y) + 'px';
        }

        var imageEl = this._imageEl;
        var cropEl = this._cropEl;

        if (! imageEl) {
            imageEl = vmlCore.doc.createElement('div');
            this._imageEl = imageEl;
        }
        var imageELStyle = imageEl.style;
        if (hasCrop) {
            // Needs know image original width and height
            if (! (ow && oh)) {
                var tmpImage = new Image();
                var self = this;
                tmpImage.onload = function () {
                    tmpImage.onload = null;
                    ow = tmpImage.width;
                    oh = tmpImage.height;
                    // Adjust image width and height to fit the ratio destinationSize / sourceSize
                    imageELStyle.width = round(scaleX * ow * dw / sw) + 'px';
                    imageELStyle.height = round(scaleY * oh * dh / sh) + 'px';

                    // Caching image original width, height and src
                    self._imageWidth = ow;
                    self._imageHeight = oh;
                    self._imageSrc = image;
                }
                tmpImage.src = image;
            }
            else {
                imageELStyle.width = round(scaleX * ow * dw / sw) + 'px';
                imageELStyle.height = round(scaleY * oh * dh / sh) + 'px';
            }

            if (! cropEl) {
                cropEl = vmlCore.doc.createElement('div');
                cropEl.style.overflow = 'hidden';
                this._cropEl = cropEl;
            }
            var cropElStyle = cropEl.style;
            cropElStyle.width = round((dw + sx * dw / sw) * scaleX);
            cropElStyle.height = round((dh + sy * dh / sh) * scaleY);
            cropElStyle.filter = imageTransformPrefix + '.Matrix(Dx='
                    + (-sx * dw / sw * scaleX) + ',Dy=' + (-sy * dh / sh * scaleY) + ')';

            if (! cropEl.parentNode) {
                vmlEl.appendChild(cropEl);
            }
            if (imageEl.parentNode != cropEl) {
                cropEl.appendChild(imageEl);
            }
        }
        else {
            imageELStyle.width = round(scaleX * dw) + 'px';
            imageELStyle.height = round(scaleY * dh) + 'px';

            vmlEl.appendChild(imageEl);

            if (cropEl && cropEl.parentNode) {
                vmlEl.removeChild(cropEl);
                this._cropEl = null;
            }
        }

        var filterStr = '';
        var alpha = style.opacity;
        if (alpha < 1) {
            filterStr += '.Alpha(opacity=' + round(alpha * 100) + ') ';
        }
        filterStr += imageTransformPrefix + '.AlphaImageLoader(src=' + image + ', SizingMethod=scale)';

        imageELStyle.filter = filterStr;

        vmlEl.style.zIndex = getZIndex(this.zlevel, this.z);

        // Append to root
        append(vmlRoot, vmlEl);

        // Text
        if (style.text) {
            this.drawRectText(vmlRoot, this.getBoundingRect());
        }
    };

    ZImage.prototype.onRemoveFromStorage = function (vmlRoot) {
        remove(vmlRoot, this._vmlEl);

        this._vmlEl = null;
        this._cropEl = null;
        this._imageEl = null;

        this.removeRectText(vmlRoot);
    };
    
    ZImage.prototype.onAddToStorage = function (vmlRoot) {
        append(vmlRoot, this._vmlEl);
        this.appendRectText(vmlRoot);
    };


    /***************************************************
     * TEXT
     **************************************************/

    var DEFAULT_STYLE_NORMAL = 'normal';

    var fontStyleCache = {};
    var fontStyleCacheCount = 0;
    var MAX_FONT_CACHE_SIZE = 100;
    var fontEl = document.createElement('div');
    function processFont(fontString) {
        var fontStyle = fontStyleCache[fontString];
        if (! fontStyle) {
            // Clear cache
            if (fontStyleCacheCount > MAX_FONT_CACHE_SIZE) {
                fontStyleCacheCount = 0;
                fontStyleCache = {};
            }

            var style = fontEl.style;
            var fontFamily;
            try {
                style.font = fontString;
                fontFamily = style.fontFamily.split(',')[0];
            }
            catch (e) {
            }

            fontStyle = {
                style: style.fontStyle || DEFAULT_STYLE_NORMAL,
                variant: style.fontVariant || DEFAULT_STYLE_NORMAL,
                weight: style.fontWeight || DEFAULT_STYLE_NORMAL,
                size: style.fontSize || 12,
                family: fontFamily || 'Microsoft YaHei'
            };

            fontStyleCache[fontString] = fontStyle;
            fontStyleCacheCount++;
        }

        return fontStyle.style + ' ' + fontStyle.variant + ' ' + fontStyle.weight + ' ' +
        fontStyle.size + "px '" + fontStyle.family + "'";
    }

    var textMeasureEl;
    // Overwrite measure text method
    textContain.measureText = function (text, textFont) {
        var doc = vmlCore.doc;
        if (! textMeasureEl) {
            textMeasureEl = doc.createElement('div');
            textMeasureEl.style.cssText = 'position:absolute;top:-20000px;left:0;\
                padding:0;margin:0;border:none;white-space:pre;';

            vmlCore.doc.body.appendChild(textMeasureEl);
        }

        try {
            textMeasureEl.style.font = textFont;
        } catch (ex) {
            // Ignore failures to set to invalid font.
        }
        textMeasureEl.innerHTML = '';
        // Don't use innerHTML or innerText because they allow markup/whitespace.
        textMeasureEl.appendChild(doc.createTextNode(text));
        return {
            width: textMeasureEl.offsetWidth
        };
    };

    var drawRectText = function (vmlRoot, rect, textRect) {

        var style = this.style;
        var text = this.style.text;
        if (! text) {
            return;
        }

        var x = rect.x;
        var y = rect.y;
        var textPosition = style.textPosition;
        var distance = style.textDistance;
        var align = style.textAlign;
        var font = encodeHtmlAttribute(
            processFont(style.textFont || '')
        );
        var baseline = style.textBaseline;

        textRect = textRect || textContain.getBoundingRect(text, font, align, baseline);

        var height = rect.height;
        var width = rect.width;

        var textWidth = textRect.width;
        var textHeight = textRect.height;

        var halfWidth = width / 2 - textWidth / 2;
        var halfHeight = height / 2 - textHeight / 2;
        // Text position represented by coord
        // TODO
        if (textPosition instanceof Array) {
            x = textPosition[0];
            y = textPosition[1];
        }
        else {
            switch (style.textPosition) {
                case 'left':
                    x -= distance + textWidth;
                    y += halfHeight;
                    break;
                case 'right':
                    x += width + distance;
                    y += halfHeight;
                    break;
                case 'top':
                    x += halfWidth;
                    y -= distance - textHeight;
                    break;
                case 'bottom':
                    x += halfWidth;
                    y += height + distance;
                    break;
                case 'inside':
                    x += halfWidth;
                    y += halfHeight;
                    break;
            }
        }

        var createNode = vmlCore.createNode;

        var textVmlEl = this._textVmlEl;
        var pathEl;
        var textPathEl;
        var skewEl;
        if (! textVmlEl) {
            textVmlEl = createNode('line');
            pathEl = createNode('path');
            textPathEl = createNode('textpath');
            skewEl = createNode('skew');

            initRootElStyle(textVmlEl);

            pathEl.textpathok = true;
            textPathEl.on = true;
            // FIXME Why here is not cammel case
            textPathEl.style['v-text-align'] = 'left';

            // x, y 已经在前面调整过，textAlign 统一为 left, textBaseline 统一为 top
            textVmlEl.from = '0 0';
            textVmlEl.to = '1000 0.05';

            append(textVmlEl, skewEl);
            append(textVmlEl, pathEl);
            append(textVmlEl, textPathEl);

            this._textVmlEl = textVmlEl;
        }
        else {
            // 这里是在前面 appendChild 保证顺序的前提下
            skewEl = textVmlEl.firstChild;
            pathEl = skewEl.nextSibling;
            textPathEl = pathEl.nextSibling;
        }

        // VML 默认垂直居中（类似 textBaseline 为 middle
        y += textRect.height / 2;
        var coords = [x, y];
        var m;
        var textVmlElStyle = textVmlEl.style;
        if (this.needTransform) {
            m = this.transform;
            vec2.applyTransform(coords, coords, m);

            skewEl.on = true;

            skewEl.matrix = m[0].toFixed(3) + comma + m[2].toFixed(3) + comma +
            m[1].toFixed(3) + comma + m[3].toFixed(3) + ',0,0';

            // Text position
            skewEl.offset = round(coords[0]) + ',' + round(coords[1]);
            // Left top point as origin
            skewEl.origin = '0 0';

            textVmlElStyle.left = '0px';
            textVmlElStyle.top = '0px';
        }
        else {
            skewEl.on = false;
            textVmlElStyle.left = round(x) + 'px';
            textVmlElStyle.top = round(y) + 'px';
        }

        textPathEl.string = encodeHtmlAttribute(text);
        // TODO
        try {
            textPathEl.style.font = font;
        }
        // Error font format
        catch (e) {}

        updateFillAndStroke(textVmlEl, 'fill', {
            fill: style.textFill || style.fill,
            opacity: style.opacity
        });
        updateFillAndStroke(textVmlEl, 'stroke', {
            stroke: style.textStroke || style.stroke,
            opacity: style.opacity,
            lineDash: style.lineDash
        });

        textVmlEl.style.zIndex = getZIndex(this.zlevel, this.z);

        // Attached to root
        append(vmlRoot, textVmlEl);
    };

    function removeRectText(vmlRoot) {
        remove(vmlRoot, this._textVmlEl);
        this._textVmlEl = null;
    }
    
    function appendRectText(vmlRoot) {
        append(vmlRoot, this._textVmlEl);
    }

    var list = [RectText, Displayable, ZImage, Path, Text];

    // In case Displayable has been mixed in RectText
    for (var i = 0; i < list.length; i++) {
        var proto = list[i].prototype;
        proto.drawRectText = drawRectText;
        proto.removeRectText = removeRectText;
        proto.appendRectText = appendRectText;
    }

    Text.prototype.brush = function (root) {
        var style = this.style;
        if (style.text) {
            this.drawRectText(root, {
                x: style.x || 0, y: style.y || 0,
                width: 0, height: 0
            }, this.getBoundingRect());
        }
    };

    Text.prototype.onRemoveFromStorage = function (vmlRoot) {
        this.removeRectText(vmlRoot);
    };

    Text.prototype.onAddToStorage = function (vmlRoot) {
        this.appendRectText(vmlRoot);
    };
});