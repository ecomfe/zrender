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

        type: 'radial'
    };

    zrUtil.inherits(RadialGradient, Gradient);

    return RadialGradient;
});