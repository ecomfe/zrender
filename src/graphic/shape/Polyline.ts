/**
 * @module zrender/graphic/shape/Polyline
 */

import Path, { PathOption } from '../Path';
import * as polyHelper from '../helper/poly';
import { VectorArray } from '../../core/vector';

class PolylineShape {
    points: VectorArray[] = null
    smooth?: number | 'spline' = 0
    smoothConstraint?: VectorArray[] = null
}

interface PolylineOption extends PathOption {
    shape?: Partial<PolylineShape>
}
export default class Polyline extends Path<PolylineOption> {

    type = 'ellipse'

    shape: PolylineShape

    constructor(opts?: PolylineOption) {
        super(opts, {
            stroke: '#000',
            fill: null
        }, new PolylineShape())
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: PolylineShape) {
        polyHelper.buildPath(ctx, shape, false);
    }
}