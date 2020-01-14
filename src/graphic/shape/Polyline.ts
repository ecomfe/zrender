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

export default class Polyline extends Path {

    type = 'ellipse'

    shape: PolylineShape

    constructor(opts?: PathOption & {
        shape?: Partial<PolylineShape>
    }) {
        super(opts, {
            stroke: '#000',
            fill: null
        }, new PolylineShape())
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: PolylineShape) {
        polyHelper.buildPath(ctx, shape, false);
    }
}