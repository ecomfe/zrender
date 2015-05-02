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
        var fill = style.fill;
        return fill != null && fill !== 'none';
    }

    function pathHasStroke(style) {
        var stroke = style.stroke;
        return stroke != null && stroke !== 'none';
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

        __dirtyPath: true,

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
            if (this.__dirtyPath || (
                lineDash && !ctxLineDash && hasStroke
            )) {
                path = this._path.beginPath(ctx);

                // Setting line dash before build path
                if (lineDash && !ctxLineDash) {
                    path.setLineDash(lineDash);
                    path.setLineDashOffset(lineDashOffset);
                }

                this.buildPath(path, this.shape);

                // Clear path dirty flag
                this.__dirtyPath = false;
            }
            else {
                // Replay path building
                ctx.beginPath();
                this._path.rebuildPath(ctx);
            }

            hasFill && path.fill(ctx);

            if (lineDash && ctxLineDash) {
                ctx.setLineDash(lineDash);
                ctx.lineDashOffset = lineDashOffset;
            }

            hasStroke && path.stroke(ctx);

            // Draw rect text
            if (style.text) {
                this.drawRectText(ctx, this.getBoundingRect());
            }

            this.afterBrush(ctx);
        },

        buildPath: function (ctx, shapeCfg) {},

        getBoundingRect: function () {
            if (! this._rect) {
                this._rect = this._path.getBoundingRect();
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
            var rect = this.getBoundingRect();
            var style = this.style;
            x = localPos[0];
            y = localPos[1];

            if (rectContain.contain(rect, x, y)) {
                var pathData = this._path.data;
                if (pathHasStroke(style)) {
                    if (pathContain.containStroke(
                        pathData, style.lineWidth, x, y
                    )) {
                        return true;
                    }
                }
                if (pathHasFill(style)) {
                    return pathContain.contain(pathData, x, y);
                }
            }
            return false;
        },

        /**
         * @param  {boolean} dirtyPath
         */
        dirty: function (dirtyPath) {
            if (arguments.length ===0) {
                dirtyPath = true;
            }
            // Only mark dirty, not mark clean
            if (dirtyPath) {
                this.__dirtyPath = dirtyPath;

                this._rect = null;
            }

            this.__dirty = true;

            if (this.__zr) {
                this.__zr.refreshNextFrame();
            }
        }
    };

    /**
     * 扩展一个 Path element, 比如星形，圆等。
     * Extending a path element
     * @param {Object} props
     * @param {string} props.type Path type
     * @param {Function} props.init Initialize
     * @param {Function} props.buildPath Overwrite buildPath method
     * @param {Object} [props.style] Extended default style config
     * @param {Object} [props.shape] Extended default shape config
     */
    Path.extend = function (defaults) {
        var Sub = function (opts) {
            Path.call(this, opts);

            if (defaults.style) {
                // Extend default style
                this.style.extendFrom(defaults.style, false);
            }

            // Extend default shape
            var defaultShape = defaults.shape;
            if (defaultShape) {
                this.shape = this.shape || {};
                var thisShape = this.shape;
                for (var name in defaultShape) {
                    if (
                        ! thisShape.hasOwnProperty(name)
                        && defaultShape.hasOwnProperty(name)
                    ) {
                        thisShape[name] = defaultShape[name];
                    }
                }
            }

            defaults.init && defaults.init.call(this, opts);
        };

        zrUtil.inherits(Sub, Path);

        // FIXME 不能 extend position, rotation 等引用对象
        for (var name in defaults) {
            // Extending prototype values and methods
            if (name !== 'style' && name !== 'shape') {
                Sub.prototype[name] = defaults[name];
            }
        }

        return Sub;
    };

    zrUtil.inherits(Path, Displayable);

    return Path;
});