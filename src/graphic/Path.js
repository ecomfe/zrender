/**
 * Path element
 * @module zrender/graphic/Path
 *
 * TODO adjustRect for resize and centering
 */

define(function (require) {

    var Displayable = require('./Displayable');
    var zrUtil = require('../core/util');
    var PathProxy = require('../core/PathProxy');
    var pathContain = require('../contain/path');
    var rectContain = require('../contain/rect');

    function pathHasFill(style) {
        return style.fill != null;
    }

    function pathHasStroke(style) {
        return style.stroke != null;
    }
    /**
     * @alias module:zrender/graphic/Path
     * @extends module:zrender/graphic/Displayable
     * @constructor
     * @param {Object} opts
     */
    var Path = function (opts) {
        Displayable.call(this, opts);

        this._path = new PathProxy();
    };

    Path.prototype = {

        constructor: Path,

        type: 'path',

        brush: function (ctx) {
            this.beforeBrush(ctx);

            var style = this.style;

            var path = this._path;
            var hasStroke = pathHasStroke(style);
            var hasFill = pathHasFill(style);

            var lineDash = style.lineDash;
            var lineDashOffset = style.lineDashOffset;

            var ctxLineDash = !!ctx.setLineDash;
            // Proxy context
            // Rebuild path in following 2 cases
            // 1. Path is dirty
            // 2. Path needs javascript implemented lineDash stroking.
            //    In this case, lineDash information will not be saved in PathProxy
            if (this.__dirty || (
                lineDash && !ctxLineDash && hasStroke
            )) {
                path = this._path.beginPath(ctx);

                // Setting line dash before build path
                if (lineDash && !ctxLineDash) {
                    path.setLineDash(lineDash);
                    path.setLineDashOffset(lineDashOffset);
                }

                this.buildPath(path, style);
            }
            else {
                // Replay path building
                ctx.beginPath();
                this._path.rebuildPath(ctx);
            }

            hasFill && path.fill();

            if (lineDash && ctxLineDash) {
                ctx.setLineDash(lineDash);
                ctx.lineDashOffset = lineDashOffset;
            }

            hasStroke && path.stroke();

            // Draw rect text
            if (style.text) {
                this.drawRectText(ctx, this.getRect());
            }

            this.afterBrush(ctx);
        },

        buildPath: function (ctx, style) {},

        getRect: function () {
            if (! this._rect) {
                this._rect = this._path.fastBoundingRect();
            }
            if (pathHasStroke(this.style)) {
                var rect = this._rect;
                var w = this.style.lineWidth;
                // Consider line width
                rect.width += w;
                rect.height += w;
                rect.x -= w / 2;
                rect.y -= w / 2;
            }
            return this._rect;
        },

        contain: function (x, y) {
            var localPos = this.transformCoordToLocal(x, y);
            var rect = this.getRect();
            var style = this.style;
            x = localPos[0];
            y = localPos[1];

            if (rectContain.contain(rect, x, y)) {
                var pathData = this._path.data;
                if (pathHasStroke(style)) {
                    if (pathContain.containStroke(
                        pathData, this.style.lineWidth, x, y
                    )) {
                        return true;
                    }
                }
                if (pathHasFill(style)) {
                    return pathContain.contain(pathData, x, y);
                }
            }
            return false;
        }
    };

    /**
     * 扩展一个 Path element, 比如星形，圆等。
     * Extending a path element
     * @param {Object} props
     * @param {string} props.type Path type
     * @param {Function} props.init Initialize
     * @param {Function} props.buildPath Overwrite buildPath method
     * @param {Object} [props.style] Extended default style
     */
    Path.extend = function (props) {
        var Sub = function (opts) {
            Path.call(this, opts);

            if (props.style) {
                // Extend default style
                this.style.extendFrom(props.style, false);
            }

            props.init && props.init.call(this, opts);
        };

        zrUtil.inherits(Sub, Path);

        for (var name in props) {
            // Extending buildPath method and custom properties
            if (props.hasOwnProperty(name) && name !== 'style') {
                Sub.prototype[name] = props[name];
            }
        }

        return Sub;
    };

    zrUtil.inherits(Path, Displayable);

    return Path;
});