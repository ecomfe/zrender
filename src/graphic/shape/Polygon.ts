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

interface PolygonOption extends PathOption {
    shape?: Partial<PolygonShape>
}
export default class Polygon extends Path<PolygonOption> {

    type = 'ellipse'

    shape: PolygonShape

    constructor(opts?: PolygonOption) {
        super(opts, null, new PolygonShape())
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: PolygonShape) {
        polyHelper.buildPath(ctx, shape, true);
    }
};