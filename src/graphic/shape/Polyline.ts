/**
 * @module zrender/graphic/shape/Polyline
 */

import Path from '../Path';
import * as polyHelper from '../helper/poly';
import { VectorArray } from '../../core/vector';

interface PolylineShape {
    points: VectorArray[]
    smooth?: number | 'spline'
    smoothConstraint?: VectorArray[]
}

export default Path.extend<PolylineShape, {}>({

    type: 'polyline',

    shape: {
        points: null,

        smooth: 0,

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