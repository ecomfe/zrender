/**
 * @module zrender/graphic/shape/Polyline
 */

import Path from '../Path';
import * as polyHelper from '../helper/poly';

export default Path.extend({

    type: 'polyline',

    shape: {
        points: null,

        smooth: false,

        smoothConstraint: null
    },

    style: {
        stroke: '#000',

        fill: null
    },

    buildPath: function (ctx, shape) {
        polyHelper.buildPath(ctx, shape, false);
    }
});