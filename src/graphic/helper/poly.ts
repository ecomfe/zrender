
import smoothBezier from './smoothBezier';
import { VectorArray } from '../../core/vector';
import PathProxy from '../../core/PathProxy';

export function buildPath(
    ctx: CanvasRenderingContext2D | PathProxy,
    shape: {
        points: VectorArray[],
        smooth?: number
        smoothConstraint?: VectorArray[],
        drawMode?: 'lineStrip' | 'lines'
    },
    closePath: boolean
) {
    const smooth = shape.smooth;
    const drawMode = shape.drawMode || 'lineStrip';
    let points = shape.points;
    if (points && points.length >= 2) {
        if (smooth) {
            if (drawMode === 'lineStrip') {
                buildBezierCurve(
                    points,
                    smooth,
                    closePath,
                    shape.smoothConstraint,
                    ctx
                );
            }
            else {
                let startIndex = 0;
                while (startIndex < points.length - 1) {
                    // Find the position where the line start point is
                    // different from the end point
                    let endIndex = startIndex + 2;
                    const stripPoints = [points[startIndex], points[startIndex + 1]];
                    while (endIndex < points.length) {
                        if (points[endIndex - 1][0] !== points[endIndex][0]
                            || points[endIndex - 1][1] !== points[endIndex][1]
                        ) {
                            break;
                        }
                        endIndex += 2;
                        stripPoints.push(points[endIndex - 1]);
                    }
                    buildBezierCurve(
                        stripPoints,
                        smooth,
                        closePath,
                        shape.smoothConstraint,
                        ctx
                    );
                    startIndex = endIndex;
                }
            }
        }
        else {
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1, l = points.length; i < l; i++) {
                if (drawMode === 'lineStrip' || i % 2 === 1) {
                    ctx.lineTo(points[i][0], points[i][1]);
                }
                // If the new point is the same as the previous point, it can be ignored
                else if (points[i][0] !== points[i - 1][0]
                    || points[i][1] !== points[i - 1][1]
                ) {
                    ctx.moveTo(points[i][0], points[i][1]);
                }
            }
        }

        closePath && ctx.closePath();
    }
}

function buildBezierCurve(
    points: VectorArray[],
    smooth: number,
    closePath: boolean,
    smoothConstraint: VectorArray[],
    ctx: CanvasRenderingContext2D | PathProxy
) {
    const controlPoints = smoothBezier(
        points, smooth, closePath, smoothConstraint
    );

    ctx.moveTo(points[0][0], points[0][1]);
    const len = points.length;
    for (let i = 0; i < (closePath ? len : len - 1); i++) {
        const cp1 = controlPoints[i * 2];
        const cp2 = controlPoints[i * 2 + 1];
        const p = points[(i + 1) % len];
        ctx.bezierCurveTo(
            cp1[0], cp1[1], cp2[0], cp2[1], p[0], p[1]
        );
    }
}
