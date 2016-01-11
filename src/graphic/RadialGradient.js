define(function(require) {
    'use strict';

    var zrUtil = require('../core/util');

    var Gradient = require('./Gradient');

    /**
     * x, y, r are all percent from 0 to 1
     * @param {number} [x=0.5]
     * @param {number} [y=0.5]
     * @param {number} [r=0.5]
     * @param {Array.<Object>} [colorStops]
     */
    var RadialGradient = function (x, y, r, colorStops) {
        this.x = x == null ? 0.5 : x;

        this.y = y == null ? 0.5 : y;

        this.r = r == null ? 0.5 : r;

        Gradient.call(this, colorStops);
    };

    RadialGradient.prototype = {

        constructor: RadialGradient,

        type: 'radial',

        updateCanvasGradient: function (shape, ctx) {
            var rect = shape.getBoundingRect();

            var width = rect.width;
            var height = rect.height;
            var min = Math.min(width, height);
            // var max = Math.max(width, height);

            var x = this.x * width + rect.x;
            var y = this.y * height + rect.y;
            var r = this.r * min;

            var canvasGradient = ctx.createRadialGradient(x, y, 0, x, y, r);

            var colorStops = this.colorStops;
            for (var i = 0; i < colorStops.length; i++) {
                canvasGradient.addColorStop(
                    colorStops[i].offset, colorStops[i].color
                );
            }

            this.canvasGradient = canvasGradient;
        }
    };

    zrUtil.inherits(RadialGradient, Gradient);

    return RadialGradient;
});