/**
 * @module echarts/core/BoundingRect
 */
define(function(require) {
    'use strict';

    var vec2 = require('zrender/core/vector');

    /**
     * @alias module:echarts/core/BoundingRect
     */
    function BoundingRect(x, y, width, height) {
        /**
         * @type {number}
         */
        this.x = x;
        /**
         * @type {number}
         */
        this.y = y;
        /**
         * @type {number}
         */
        this.width = width;
        /**
         * @type {number}
         */
        this.height = height;
    }

    BoundingRect.prototype = {

        constructor: BoundingRect,

        /**
         * @param {module:echarts/core/BoundingRect} boundingRect
         */
        union: function (boundingRect) {
            this.x = Math.min(boundingRect.x, this.x);
            this.y = Math.min(boundingRect.y, this.y);

            this.width = Math.max(
                    boundingRect.x + boundingRect.width,
                    this.x + this.width
                ) - this.x;
            this.height = Math.max(
                    boundingRect.y + boundingRect.height,
                    this.y + this.height
                ) - this.y;
        },

        /**
         * @param {Array.<number>} m
         * @methods
         */
        applyTransform: (function () {
            var min = [];
            var max = [];
            return function (m) {
                min[0] = this.x;
                min[1] = this.y;
                max[0] = this.x + this.width;
                max[1] = this.y + this.height;

                vec2.applyTransform(min, min, m);
                vec2.applyTransform(max, max, m);

                this.x = min[0];
                this.y = min[1];
                this.width = max[0] - min[0];
                this.height = max[1] - min[1];
            }
        })(),

        intersect: function (b) {
            var a = this;
            var ax0 = a.x;
            var ax1 = a.x + a.width;
            var ay0 = a.y;
            var ay1 = a.y + a.height;

            var bx0 = b.x;
            var bx1 = b.x + b.width;
            var by0 = b.y;
            var by1 = b.y + b.height;

            return ! (ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0);
        },

        contain: function (x, y) {
            var rect = this;
            return x >= rect.x
                && x <= (rect.x + rect.width)
                && y >= rect.y
                && y <= (rect.y + rect.height);
        },

        /**
         * @return {module:echarts/core/BoundingRect}
         */
        clone: function () {
            return new BoundingRect(this.x, this.y, this.width, this.height);
        },

        /**
         * Copy from another rect
         */
        copy: function (rect) {
            this.x = rect.x;
            this.y = rect.y;
            this.width = rect.width;
            this.height = rect.height;
        }
    };

    return BoundingRect;
});