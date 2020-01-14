/**
 * 多边形
 * @module zrender/shape/Polygon
 */

import Path, { PathOption } from '../Path';
import * as polyHelper from '../helper/poly';
import { VectorArray } from '../../core/vector';

class PolygonShape {
    points: VectorArray[] = null
    smooth?: number | 'spline' = 0
    smoothConstraint?: VectorArray[] = null
}

export default class Polygon extends Path {

    type = 'ellipse'

    shape: PolygonShape

    constructor(opts?: PathOption & {
        shape?: Partial<PolygonShape>
    }) {
        super(opts, null, new PolygonShape())
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: PolygonShape) {
        polyHelper.buildPath(ctx, shape, true);
    }
};