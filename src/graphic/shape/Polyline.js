/**
 * @module zrender/graphic/shape/Polyline
 */
define(function (require) {

    var polyHelper = require('../helper/poly');

    return require('../Path').extend({
        
        type: 'polyline',

        style: {
            brushType: 'stroke',

            points: null,

            smooth: false,

            smoothConstraint: null
        },

        buildPath: function (ctx, style) {
            polyHelper.buildPath(ctx, style, false);
        }
    });
});