define(function (require) {

    if (require('../core/env').canvasSupported) {
        return;
    }

    var Path = require('../graphic/Path');
    var CMD = require('../core/PathProxy').CMD;
    var transformPath = require('../tool/transformPath');
    var colorTool = require('../tool/color');
    var vmlCore = require('./core');

    var sqrt = Math.sqrt;
    var abs = Math.abs;
    var round = Math.round;
    var cos = Math.cos;
    var sin = Math.sin;

    var Z = 10;
    var W = 10;
    var H = 10;
    var Z2 = Z / 2;

    function rgb2Str(r, g, b) {
        return 'rgb(' + [r, g, b].join(',') + ')';
    }

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
            var lineDash = style.lineDash;
            el.dashstyle = lineDash.join(' ');
        }
        if (style.stroke != null) {
            setColorAndOpacity(el, style.stroke, style.opacity);
        }
    }

    function pathDataToString(data) {
        var M = CMD.M;
        var C = CMD.C;
        var L = CMD.L;
        var Z = CMD.Z;
        var A = CMD.A;
        var Q = CMD.Q;

        var str = [];
        var comma = ',';
        for (var i = 0; i < data.length;) {
            var cmd = data[i++];
            var cmdStr = '';
            switch (cmd) {
                case M:
                    str.push(' m ', round(data[i++] * Z - Z2),  comma, round(data[i++] * Z - Z2));
                    break;
                case L:
                    str.push(' l ', round(data[i++] * Z - Z2),  comma, round(data[i++] * Z - Z2));
                    break;
                case Q:
                case C:
                    var x1 = round(data[i++] * Z - Z2);
                    var y1 = round(data[i++] * Z - Z2);
                    var x2 = round(data[i++] * Z - Z2);
                    var y2 = round(data[i++] * Z - Z2);
                    var x3;
                    var y3;
                    if (cmd === Q) {
                        // Convert quadratic to cubic using degree elevation
                        x3 = x2;
                        y3 = y2;
                        x2 = (x2 + 2 * x1) / 3;
                        y2 = (y2 + 2 * y1) / 3;
                        x1 = (this._xi + 2 * x1) / 3;
                        y1 = (this._yi + 2 * y1) / 3;
                    }
                    else {
                        x3 = round(data[i++] * Z - Z2);
                        y3 = round(data[i++] * Z - Z2);
                    }
                    str.push(' c ', x1, comma, y1, comma, x2, comma, y2, comma, x3, comma, y3);
                    break;
                case A:
                    var cx = data[i++];
                    var cy = data[i++];
                    var rx = data[i++];
                    var ry = data[i++];
                    var startAngle = d[i++];
                    var endAngle = d[i++] + startAngle;
                    // FIXME
                    var psi = d[i++];
                    var clockwise = d[i++];

                    var x0 = cx + cos(startAngle) * rx;
                    var y0 = cy + sin(startAngle) * ry;

                    var x1 = cx + cos(endAngle) * rx;
                    var y1 = cy + cos(endAngle) * ry;

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
                    break;
                case Z:
                    str.push(' x ');
            }
        }

        return str.join('');
    }

    // Replace the original path method
    Path.prototype.brush = function (vmlRoot) {
        var style = this.style;

        var vmlEl = this.__vmlEl;
        if (! vmlEl) {
            vmlEl = vmlCore.createNode('shape');
            vmlEl.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;';
            // FIXME Why Z2 ?
            vmlEl.coordsize = Z2 * W + ' '  + Z2 * H;
            vmlEl.coordorigin = '0 0';

            if (vmlRoot) {
                vmlRoot.appendChild(vmlEl);
            }
            this.__vmlEl = vmlEl;
        }

        this._updateFillStroke('fill', style);
        this._updateFillStroke('stroke', style);

        var needTransform = this.needTransform;
        var strokeEl = this._vmlStrokeEl;
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
        path.beginPath();
        this.buildPath(path, style);

        if (needTransform) {
            transformPath(path, this.transform);
        }

        vmlEl.path = pathDataToString(path.data);
    };

    Path.prototype._updateFillStroke = function(type, style) {
        var vmlEl = this.__vmlEl;
        var isFill = type == 'fill';
        var key = isFill ? '_vmlFillEl' : '_vmlStrokeEl';
        var el = this[key];
        if (style[type] != null) {
            vmlEl[isFill ? 'filled' : 'stroked'] = 'true';
            if (! el) {
                el = vmlCore.createNode(type);
                vmlEl.appendChild(el);

                this[key] = el;
            }
            isFill ? updateFillNode(el, style) : updateStrokeNode(el, style);
        }
        else {
            vmlEl[isFill ? 'filled' : 'stroked'] = 'false';
            if (el) {
                vmlEl.removeChild(el);
                this[key] = null;
            }
        }
    };

    Path.prototype.dispose = function () {
        this._vmlFillEl = null;
        this._vmlStrokeEl = null;
    }
});