/**
 * @module zrender/graphic/Style
 */

define(function (require) {

    var STYLE_LIST_COMMON = [
        'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'shadowColor',
        'lineCap', 'lineJoin', 'miterLimit'
    ];

    var SHADOW_PROPS = STYLE_LIST_COMMON.slice(0, 4);
    var LINE_PROPS = STYLE_LIST_COMMON.slice(4);

    var Style = function (opts) {
        this.extendFrom(opts);
    };

    Style.prototype = {

        constructor: Style,

        /**
         * @type {string}
         */
        fill: '#000000',

        /**
         * @type {string}
         */
        stroke: null,

        /**
         * @type {number}
         */
        opacity: 1,

        /**
         * @type {Array.<number>}
         */
        lineDash: null,

        /**
         * @type {number}
         */
        lineDashOffset: 0,

        /**
         * @type {number}
         */
        shadowBlur: 0,

        /**
         * @type {number}
         */
        shadowOffsetX: 0,

        /**
         * @type {number}
         */
        shadowOffsetY: 0,

        /**
         * @type {number}
         */
        lineWidth: 1,

        /**
         * If stroke ignore scale
         * @type {Boolean}
         */
        strokeNoScale: false,

        // Bounding rect text configuration
        // Not affected by element transform
        /**
         * @type {string}
         */
        text: null,

        /**
         * @type {string}
         */
        textFill: '#000',

        /**
         * @type {string}
         */
        textStroke: null,

        /**
         * 'inside', 'left', 'right', 'top', 'bottom'
         * [x, y]
         * @type {string|Array.<number>}
         * @default 'inside'
         */
        textPosition: 'inside',

        /**
         * @type {string}
         */
        textBaseline: null,

        /**
         * @type {string}
         */
        textAlign: null,

        /**
         * @type {string}
         */
        textVerticalAlign: null,

        /**
         * @type {number}
         */
        textDistance: 5,

        /**
         * @type {number}
         */
        textShadowBlur: 0,

        /**
         * @type {number}
         */
        textShadowOffsetX: 0,

        /**
         * @type {number}
         */
        textShadowOffsetY: 0,

        _bindProps: function (ctx, propNames) {
            for (var i = 0; i < propNames.length; i++) {
                var styleName = propNames[i];
                if (this[styleName] != null) {
                    ctx[styleName] = this[styleName];
                }
            }
        },

        /**
         * @param {CanvasRenderingContext2D} ctx
         */
        bind: function (ctx, el) {
            var fill = this.fill;
            var stroke = this.stroke;
            var hasFill = fill != null && fill !== 'none';
            var hasStroke = stroke != null && stroke !== 'none';
            if (hasStroke) {
                this._bindProps(ctx, LINE_PROPS);

                var lineWidth = this.lineWidth;
                ctx.lineWidth = lineWidth / (
                    (this.strokeNoScale && el && el.getLineScale) ? el.getLineScale() : 1
                );

                ctx.strokeStyle = stroke;
            }
            if (hasFill) {
                ctx.fillStyle = fill;
            }

            if (this.shadowBlur) {
                this._bindProps(ctx, SHADOW_PROPS);
            }
            ctx.globalAlpha = this.opacity;
        },

        /**
         * Extend from other style
         * @param {zrender/graphic/Style} otherStyle
         * @param {boolean} overwrite
         */
        extendFrom: function (otherStyle, overwrite) {
            if (otherStyle) {
                var target = this;
                for (var name in otherStyle) {
                    if (otherStyle.hasOwnProperty(name)
                        && (overwrite || ! target.hasOwnProperty(name))
                    ) {
                        target[name] = otherStyle[name];
                    }
                }
            }
        },

        /**
         * Batch setting style with a given object
         * @param {Object|string} obj
         * @param {*} [obj]
         */
        set: function (obj, value) {
            if (typeof obj === 'string') {
                this[obj] = value;
            }
            else {
                this.extendFrom(obj, true);
            }
        },

        /**
         * Clone
         * @return {zrender/graphic/Style} [description]
         */
        clone: function () {
            var newStyle = new this.constructor();
            newStyle.extendFrom(this, true);
            return newStyle;
        },

        createLinearGradient: function (ctx, obj, rect) {
            // var size =
            var x = obj.x * rect.width + rect.x;
            var x2 = obj.x2 * rect.width + rect.x;
            var y = obj.y * rect.height + rect.y;
            var y2 = obj.y2 * rect.height + rect.y;

            var canvasGradient = ctx.createLinearGradient(x, y, x2, y2);

            return canvasGradient;
        },

        createRadialGradient: function (ctx, obj, rect) {
            var width = rect.width;
            var height = rect.height;
            var min = Math.min(width, height);

            var x = obj.x * width + rect.x;
            var y = obj.y * height + rect.y;
            var r = obj.r * min;

            var canvasGradient = ctx.createRadialGradient(x, y, 0, x, y, r);

            return canvasGradient;
        },

        getGradient: function (ctx, obj, rect) {
            var method = obj.type === 'radial' ? 'createRadialGradient' : 'createLinearGradient';
            var canvasGradient = this[method](ctx, obj, rect);
            var colorStops = obj.colorStops;
            for (var i = 0; i < colorStops.length; i++) {
                canvasGradient.addColorStop(
                    colorStops[i].offset, colorStops[i].color
                );
            }
            return canvasGradient;
        }
    };

    var styleProto = Style.prototype;
    var name;
    var i;
    for (i = 0; i < STYLE_LIST_COMMON.length; i++) {
        name = STYLE_LIST_COMMON[i];
        if (!(name in styleProto)) {
            styleProto[name] = null;
        }
    }

    return Style;
});