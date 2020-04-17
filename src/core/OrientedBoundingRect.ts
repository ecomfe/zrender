/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import Point from './Point';
import BoundingRect from './BoundingRect';
import { MatrixArray } from './matrix';

const minMax = [0, 0];
const minMax2 = [0, 0];

class OrientedBoundingRect {

    // lt, rt, rb, lb
    private _corners: Point[] = [];

    private _axes: Point[] = [];

    private _origin: number[] = [0, 0];

    constructor(rect?: BoundingRect, transform?: MatrixArray) {
        for (let i = 0; i < 4; i++) {
            this._corners[i] = new Point(0, 0);
        }
        for (let i = 0; i < 2; i++) {
            this._axes[i] = new Point(0, 0);
        }

        if (rect) {
            this.fromBoundingRect(rect, transform);
        }
    }

    fromBoundingRect(rect: BoundingRect, transform?: MatrixArray) {
        const corners = this._corners;
        const axes = this._axes;
        const x = rect.x;
        const y = rect.y;
        const x2 = x + rect.width;
        const y2 = y + rect.height;
        corners[0].set(x, y);
        corners[1].set(x2, y);
        corners[2].set(x2, y2);
        corners[3].set(x, y2);

        if (transform) {
            for (let i = 0; i < 4; i++) {
                corners[i].transform(transform);
            }
        }

        // Calculate axes
        axes[0].copy(corners[1]).sub(corners[0]).normalize();
        axes[1].copy(corners[3]).sub(corners[0]).normalize();

        // Calculate projected origin
        for (let i = 0; i < 2; i++) {
            this._origin[i] = axes[i].dot(corners[0]);
        }
    }

    /**
     * Calculate minimal distance to another OBB
     */
    // TODO Change to point to edge length.
    distanceTo(other: OrientedBoundingRect): number {
        let minDist = Infinity;
        for (let i = 0; i < this._corners.length; i++) {
            for (let j = 0; j < other._corners.length; j++) {
                const cornerA = this._corners[i];
                const cornerB = other._corners[j];

                minDist = Math.min(cornerA.distance(cornerB), minDist);
            }
        }
        return minDist;
    }

    /**
     * If intersect with another OBB
     */
    intersect(other: OrientedBoundingRect): boolean {
        // OBB collision with SAT method

        // Check two axes for both two obb.
        if (!this._checkOneSide(this, other)) {
            return false;
        }
        if (!this._checkOneSide(other, this)) {
            return false;
        }

        return true;
    }


    private _checkOneSide(self: OrientedBoundingRect, other: OrientedBoundingRect): boolean {
        for (let i = 0; i < 2; i++) {
            this._getProjMinMaxOnAxis(i, self._corners, minMax);
            this._getProjMinMaxOnAxis(i, other._corners, minMax2);

            // Not overlap on the axis.
            if (minMax[1] < minMax2[0] || minMax[0] > minMax2[1]) {
                return false;
            }
        }
        return true;
    }

    private _getProjMinMaxOnAxis(dim: number, points: Point[], out: number[]) {
        const axis = this._axes[dim];
        const origin = this._origin;
        const proj = points[0].dot(axis) + origin[dim];
        let min = proj;
        let max = proj;

        for (let i = 1; i < points.length; i++) {
            const proj = points[i].dot(axis) + origin[dim];
            min = Math.min(proj, min);
            max = Math.max(proj, max);
        }

        out[0] = min;
        out[1] = max;
    }
}

export default OrientedBoundingRect;