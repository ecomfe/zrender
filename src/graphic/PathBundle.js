/**
 * PathBundle 捆绑多个 shape 的 buildPath 方法，但是共用同一个样式
 * @author pissang (https://github.com/pissang)
 * @module zrender/shape/PathBundle
 * @example
 *     var poly1 = new Polygon();
 *     var poly2 = new Polygon();
 *     var poly3 = new Polygon();
 *     var shapeBundle = new PathBundle({
 *         style: {
 *             pathList: [poly1, poly2, poly3],
 *             color: 'red'
 *         }
 *     });
 *     zr.addShape(shapeBundle);
 */
define(function (require) {

    return require('./Path').extend({

        type: 'path-bundle'

    })
    var PathBundle = function (opts) {
        Displayable.call(this, opts);
    };

    PathBundle.prototype = {

        constructor: PathBundle,

        type: 'shape-bundle',

        brush: function (ctx) {
            this.beforeBrush(ctx);

            var style = this.style;

            ctx.beginPath();
            for (var i = 0; i < style.pathList.length; i++) {
                var subShape = style.pathList[i];
                var subShapeStyle = subShape.style;
                subShape.buildPath(ctx, subShapeStyle);
            }
            switch (style.brushType) {
                /* jshint ignore:start */
                case 'both':
                    ctx.fill();
                case 'stroke':
                    style.lineWidth > 0 && ctx.stroke();
                    break;
                /* jshint ignore:end */
                default:
                    ctx.fill();
            }

            this.drawText(ctx, style, this.style);

            this.afterBrush(ctx);
        },

        getBoundingRect: function () {
            if (this.__rect) {
                return this.__rect;
            }
            var style = this.style;

            var minX = Infinity;
            var maxX = -Infinity;
            var minY = Infinity;
            var maxY = -Infinity;
            for (var i = 0; i < style.pathList.length; i++) {
                var subShape = style.pathList[i];
                // TODO Highlight style ?
                var subRect = subShape.getBoundingRect(subShape.style);

                minX = Math.min(subRect.x, minX);
                minY = Math.min(subRect.y, minY);
                maxX = Math.max(subRect.x + subRect.width, maxX);
                maxY = Math.max(subRect.y + subRect.height, maxY);
            }

            style.__rect = {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };

            return style.__rect;
        },

    };

    require('../core/util').inherits(PathBundle, Base);
    return PathBundle;
});