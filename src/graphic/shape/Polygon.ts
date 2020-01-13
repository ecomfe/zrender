/**
 * 多边形
 * @module zrender/shape/Polygon
 */

import Path from '../Path';
import * as polyHelper from '../helper/poly';
import { VectorArray } from '../../core/vector';
import { Dictionary } from '../../core/types';

interface PolygonShape {
    points: VectorArray[]
    smooth?: number | 'spline'
    smoothConstraint?: VectorArray[]
}

export default Path.extend<PolygonShape, {}>({

    type: 'polygon',

    shape: {
        points: null,

        smooth: 0,

        smoothConstraint: null
    },

    buildPath: function (ctx, shape) {
        polyHelper.buildPath(ctx, shape, true);
    }
});