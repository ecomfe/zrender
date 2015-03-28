/**
 * 多边形
 * @module zrender/shape/Polygon
 */
define(function (require) {

    var polyHelper = require('../helper/poly');

    return require('../Path').extend({
        
        type: 'polygon',

        style: {
            points: null,

            smooth: false,

            smoothConstraint: null
        },

        buildPath: function (ctx, style) {
            polyHelper.buildPath(ctx, style, true);
        }
    });
});