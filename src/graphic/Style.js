/**
 * @module zrender/graphic/Style
 */

define(function (require) {
    
    var STYLE_LIST_COMMON = [
        'lineCap', 'lineJoin', 'miterLimit', 'lineWidth',
        'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'shadowColor'
    ];

    var Style = function (opts) {
        this.extendFrom(opts);
    };

    Style.prototype = {

        constructor: Style,

        /**
         * @type {number}
         */
        x: 0,

        /**
         * @type {number}
         */
        y: 0,

        /**
         * @type {string}
         */
        brushType: 'fill',

        /**
         * @type {string}
         */
        color: null,

        /**
         * @type {string}
         */
        strokeColor: null,

        /**
         * @type {number}
         */
        opacity: null,

        /**
         * @type {Array.<number>}
         */
        lineDash: null,

        /**
         * @type {number}
         */
        lineDashOffset: 0,

        // Bounding rect text configuration
        /**
         * @type {string}
         */
        text: null,

        /**
         * @type {string}
         */
        textColor: null,

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
         * @type {number}
         */
        textDistance: 5,

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
        lineWidth: 0,

        /**
         * @param {CanvasRenderingContext2D} ctx
         */
        bind: function (ctx) {
            for (var i = 0; i < STYLE_LIST_COMMON.length; i++) {
                var styleName = STYLE_LIST_COMMON[i];

                if (this[styleName] != null) {
                    ctx[styleName] = this[styleName];
                }
            }

            this.color != null && (ctx.fillStyle = this.color);
            this.strokeColor != null && (ctx.strokeStyle = this.strokeColor);
            this.opacity != null && (ctx.globalAlpha = this.opacity);            
        },

        /**
         * Extend from other style
         * @param {zrender/graphic/Style} otherStyle
         * @param {boolean} overwrite
         */
        extendFrom: function (otherStyle, overwrite) {
            if (otherStyle) {
                for (var name in otherStyle) {
                    if (otherStyle.hasOwnProperty(name)) {
                        if (overwrite || ! this.hasOwnProperty(name)) {
                            this[name] = otherStyle[name];
                        }
                    }
                }
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
        }
    };

    var styleProto = Style.prototype;
    var name;
    var i;
    for (i = 0; i < STYLE_LIST_COMMON.length; i++) {
        name = STYLE_LIST_COMMON[i];
        if (! (name in styleProto)) {
            styleProto[name] = null;
        }
    }

    return Style;
});