/**
 * 多边形
 * @module zrender/shape/Polygon
 */

var polyHelper = require('../helper/poly');

return require('../Path').extend({

    type: 'polygon',

    shape: {
        points: null,

        smooth: false,

        smoothConstraint: null
    },

    buildPath: function (ctx, shape) {
        polyHelper.buildPath(ctx, shape, true);
    }
});