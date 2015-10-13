/**
 * @module echarts/core/BoundingRect
 */
define(function(require) {
    'use strict';

    var vec2 = require('zrender/core/vector');
    var matrix = require('zrender/core/matrix');

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
            var x = Math.min(boundingRect.x, this.x);
            var y = Math.min(boundingRect.y, this.y);

            this.width = Math.max(
                    boundingRect.x + boundingRect.width,
                    this.x + this.width
                ) - x;
            this.height = Math.max(
                    boundingRect.y + boundingRect.height,
                    this.y + this.height
                ) - y;
            this.x = x;
            this.y = y;
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

                this.x = Math.min(min[0], max[0]);
                this.y = Math.min(min[1], max[1]);
                this.width = Math.abs(max[0] - min[0]);
                this.height = Math.abs(max[1] - min[1]);
            }
        })(),

        calculateTransform: function (b) {
            var a = this;
            var sx = b.width / a.width;
            var sy = b.height / a.height;

            var m = matrix.create();

            // 矩阵右乘
            matrix.translate(m, m, [-a.x, -a.y]);
            matrix.scale(m, m, [sx, sy]);
            matrix.translate(m, m, [b.x, b.y]);

            return m;
        },

        /**
         * @param {module:echarts/core/BoundingRect} b
         * @return {boolean}
         */
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