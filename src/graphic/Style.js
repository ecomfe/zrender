/**
 * @module zrender/graphic/Style
 */
define(function (require) {

    var STYLE_COMMON_PROPS = [
        ['shadowBlur', 0], ['shadowOffsetX', 0], ['shadowOffsetY', 0], ['shadowColor', '#000'],
        ['lineCap', 'butt'], ['lineJoin', 'miter'], ['miterLimit', 10]
    ];

    // var SHADOW_PROPS = STYLE_COMMON_PROPS.slice(0, 4);
    // var LINE_PROPS = STYLE_COMMON_PROPS.slice(4);

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

        /**
         * @param {CanvasRenderingContext2D} ctx
         */
        bind: function (ctx, el, prevEl) {
            var style = this;
            var prevStyle = prevEl && prevEl.style;
            var firstDraw = !prevStyle;

            for (var i = 0; i < STYLE_COMMON_PROPS.length; i++) {
                var prop = STYLE_COMMON_PROPS[i];
                var styleName = prop[0];

                if (firstDraw || style[styleName] !== prevStyle[styleName]) {
                    // FIXME Invalid property value will cause style leak from previous element.
                    ctx[styleName] = style[styleName] || prop[1];
                }
            }

            if ((firstDraw || style.fill !== prevStyle.fill)) {
                ctx.fillStyle = style.fill;
            }
            if ((firstDraw || style.stroke !== prevStyle.stroke)) {
                ctx.strokeStyle = style.stroke;
            }
            if ((firstDraw || style.opacity !== prevStyle.opacity)) {
                ctx.globalAlpha = style.opacity == null ? 1 : style.opacity;
            }
            if (this.hasStroke()) {
                var lineWidth = style.lineWidth;
                ctx.lineWidth = lineWidth / (
                    (this.strokeNoScale && el && el.getLineScale) ? el.getLineScale() : 1
                );
            }
        },

        hasFill: function () {
            var fill = this.fill;
            return fill != null && fill !== 'none';
        },

        hasStroke: function () {
            var stroke = this.stroke;
            return stroke != null && stroke !== 'none' && this.lineWidth > 0;
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
    for (var i = 0; i < STYLE_COMMON_PROPS.length; i++) {
        var prop = STYLE_COMMON_PROPS[i];
        if (!(prop[0] in styleProto)) {
            styleProto[prop[0]] = prop[1];
        }
    }

    return Style;
});