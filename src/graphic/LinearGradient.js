define(function(require) {
    'use strict';

    var zrUtil = require('../core/util');

    var Gradient = require('./Gradient');

    /**
     * x, y, x2, y2 are all percent from 0 to 1
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [x2=1]
     * @param {number} [y2=0]
     * @param {Array.<Object>} colorStops
     */
    var LinearGradient = function (x, y, x2, y2, colorStops) {
        this.x = x == null ? 0 : x;

        this.y = y == null ? 0 : y;

        this.x2 = x2 == null ? 1 : x2;

        this.y2 = y2 == null ? 0 : y2;

        Gradient.call(this, colorStops);
    };

    LinearGradient.prototype = {

        constructor: LinearGradient,

        type: 'linear'
    };

    zrUtil.inherits(LinearGradient, Gradient);

    return LinearGradient;
});