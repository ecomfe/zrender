import PathProxy from '../../core/PathProxy';
import { normalizeRadian } from '../../contain/util';

const PI = Math.PI;
const PI2 = PI * 2;
const mathSin = Math.sin;
const mathCos = Math.cos;
const mathATan = Math.atan;
const mathAbs = Math.abs;
const e = 1e-4;

export function buildPath(ctx: CanvasRenderingContext2D | PathProxy, shape: {
    cx: number
    cy: number
    startAngle: number
    endAngle: number
    clockwise?: boolean,
    r?: number,
    r0?: number,
    cornerRadius?: number,
    innerCornerRadius?: number
}) {
    let radius = Math.max(shape.r, 0);
    let innerRadius = Math.max(shape.r0 || 0, 0);
    const hasRadius = radius > 0;
    const hasInnerRadius = innerRadius > 0;

    if (!hasRadius && !hasInnerRadius) {
        return;
    }

    if (!hasRadius) {
        // use innerRadius
        radius = innerRadius;
        innerRadius = 0;
    }

    if (innerRadius > radius) {
        // swap
        const tmp = radius;
        radius = innerRadius;
        innerRadius = tmp;
    }

    const x = shape.cx;
    const y = shape.cy;
    const clockwise = shape.clockwise;
    const startAngle = normalizeRadian(shape.startAngle);
    const endAngle = normalizeRadian(shape.endAngle);

    let cornerRadius = shape.cornerRadius || 0;
    let innerCornerRadius = shape.innerCornerRadius || 0;

    const arc = Math.abs(endAngle - startAngle);

    const needDrawCorner = (cornerRadius > e || innerCornerRadius > e) 
        && radius !== innerRadius
        && arc > e && arc < PI2 - e;

    if (!needDrawCorner) {
        const unitX = mathCos(startAngle);
        const unitY = mathSin(startAngle);

        ctx.moveTo(unitX * innerRadius + x, unitY * innerRadius + y);

        ctx.lineTo(unitX * radius + x, unitY * radius + y);

        ctx.arc(x, y, radius, startAngle, endAngle, !clockwise);

        ctx.lineTo(
            mathCos(endAngle) * innerRadius + x,
            mathSin(endAngle) * innerRadius + y
        );

        if (innerRadius > 0) {
            ctx.arc(x, y, innerRadius, endAngle, startAngle, clockwise);
        }

        ctx.closePath();

        return;
    }

    let crMax = (radius - innerRadius) / 2;

    if (cornerRadius > crMax) {
        cornerRadius = crMax;
    }

    if (innerCornerRadius > crMax) {
        innerCornerRadius = crMax;
    }

    const crSin = mathSin(Math.min(arc, 45 * PI / 180) / 4);

    crMax = radius * crSin;
    if (cornerRadius > crMax) {
        cornerRadius = crMax;
    }

    crMax = innerRadius * crSin;
    if (innerCornerRadius > crMax) {
        innerCornerRadius = crMax;
    }

    // calculate some key points of the corner circle
    const cornerKeyPoints = calcCornerKeyPoints(
        x, y, radius, cornerRadius, 
        startAngle, endAngle, clockwise
    );

    // calculate some key points of the inner corner circle
    const innerCornerKeyPoints = calcCornerKeyPoints(
        x, y, innerRadius, innerCornerRadius, 
        startAngle, endAngle, clockwise, true
    );

    if (innerRadius) {
        if (innerCornerRadius) {
            const tprStart = innerCornerKeyPoints.tprStart;
            ctx.moveTo(tprStart.x, tprStart.y);
        }
        else {
            ctx.moveTo(
               mathCos(startAngle) * innerRadius + x, 
               mathSin(startAngle) * innerRadius + y
            );
        }
    }
    else {
        ctx.moveTo(x, y);
    }

    if (radius) {
        if (cornerRadius) {
            const crAngle = cornerKeyPoints.crAngle;
            const tprStart = cornerKeyPoints.tprStart;
            const tpCenterStart = cornerKeyPoints.tpCenterStart;
            const tpCenterEnd = cornerKeyPoints.tpCenterEnd;

            // calculate startAngle and endAngle of two corner circles
            const circleAngles = calcCornerCircleAngles(cornerKeyPoints, startAngle, endAngle, clockwise);

            ctx.lineTo(tprStart.x, tprStart.y);

            ctx.arc(tpCenterStart.x, tpCenterStart.y, cornerRadius, circleAngles.start0, circleAngles.end0, !clockwise);

            ctx.arc(x, y, radius, startAngle + crAngle, endAngle - crAngle, !clockwise);

            ctx.arc(tpCenterEnd.x, tpCenterEnd.y, cornerRadius, circleAngles.start1, circleAngles.end1, !clockwise);
        }
        else {
            ctx.lineTo(
                mathCos(startAngle) * radius + x, 
                mathSin(startAngle) * radius + y
            );

            ctx.arc(x, y, radius, startAngle, endAngle, !clockwise);

            ctx.moveTo(
                mathCos(endAngle) * radius + x, 
                mathSin(endAngle) * radius + y
            );
        }
    }
    
    if (innerRadius) {
        if (innerCornerRadius) {
            const crAngle = innerCornerKeyPoints.crAngle;
            const tprStart = innerCornerKeyPoints.tprStart;
            const tprEnd = innerCornerKeyPoints.tprEnd;
            const tpCenterStart = innerCornerKeyPoints.tpCenterStart;
            const tpCenterEnd = innerCornerKeyPoints.tpCenterEnd;

            // calculate startAngle and endAngle of two inner corner circles
            const innerCircleAngles = calcInnerCornerCircleAngles(innerCornerKeyPoints, startAngle, endAngle, clockwise);

            ctx.lineTo(tprEnd.x, tprEnd.y);

            ctx.arc(tpCenterEnd.x, tpCenterEnd.y, innerCornerRadius, innerCircleAngles.start1, innerCircleAngles.end1, !clockwise);

            ctx.arc(x, y, innerRadius, endAngle - crAngle, startAngle + crAngle, !!clockwise);

            ctx.arc(tpCenterStart.x, tpCenterStart.y, innerCornerRadius, innerCircleAngles.start0, innerCircleAngles.end0, !clockwise);

            ctx.moveTo(tprStart.x, tprStart.y);
        }
        else {
            ctx.lineTo(
                mathCos(endAngle) * innerRadius + x, 
                mathSin(endAngle) * innerRadius + y
            );

            ctx.arc(x, y, innerRadius, endAngle, startAngle, !!clockwise);
        }
    }
    else {
        ctx.lineTo(x, y);
    }

    ctx.closePath();
}

type Point = {
    x: number
    y: number
}

type KeyPoints = {
    tpStart: Point
    tpEnd: Point
    tprStart: Point
    tprEnd: Point
    tpCenterStart: Point
    tpCenterEnd: Point,
    crAngle: number
}

type CornerCircleAngles = {
    start0: number,
    end0: number,
    start1: number,
    end1: number
}

function calcCornerKeyPoints(
    x: number, 
    y: number,
    radius: number, 
    cornerRadius: number, 
    startAngle: number, 
    endAngle: number, 
    clockwise?: boolean,
    inner?: boolean
): KeyPoints {

    const radiusDiff = inner ? radius + cornerRadius : radius - cornerRadius;
    const tangentLen = Math.sqrt(radiusDiff * radiusDiff - cornerRadius * cornerRadius);

    const sign = clockwise ? 1 : -1;
    const crAngle = Math.asin(cornerRadius / radiusDiff) * sign;
    const sAngle = startAngle + crAngle;
    const eAngle = endAngle - crAngle;

    const sAngleSin = mathSin(sAngle);
    const sAngleCos = mathCos(sAngle);
    const eAngleSin = mathSin(eAngle);
    const eAngleCos = mathCos(eAngle);

    // tangent point with radius
    const tprStart = {
        x: x + mathCos(startAngle) * tangentLen,
        y: y + mathSin(startAngle) * tangentLen
    };

    // tangent point with radius
    const tprEnd = {
        x: x + mathCos(endAngle) * tangentLen,
        y: y + mathSin(endAngle) * tangentLen
    };

    // the center of inner tangent circle
    const tpCenterStart = {
        x: x + sAngleCos * radiusDiff,
        y: y + sAngleSin * radiusDiff
    };

    // the center of inner tangent circle
    const tpCenterEnd = {
        x: x + eAngleCos * radiusDiff,
        y: y + eAngleSin * radiusDiff
    };

    // tangent point with arc
    const tpStart = {
        x: x + sAngleCos * radius,
        y: y + sAngleSin * radius
    };

    // tangent point with arc
    const tpEnd = {
        x: x + eAngleCos * radius,
        y: y + eAngleSin * radius
    };

    return {
        tprStart,
        tprEnd,
        tpCenterStart,
        tpCenterEnd,
        tpStart,
        tpEnd,
        crAngle
    };
}

function calcCornerCircleAngles(
    keyPoints: KeyPoints, 
    startAngle: number, 
    endAngle: number, 
    clockwise?: boolean
): CornerCircleAngles {

    const tprStart = keyPoints.tprStart;
    const tpCenterStart = keyPoints.tpCenterStart;
    const tpStart = keyPoints.tpStart;

    let crAngleStart0 = mathATan(mathAbs(tprStart.y - tpCenterStart.y) / mathAbs(tprStart.x - tpCenterStart.x));
    let crAngleEnd0 = mathATan(mathAbs(tpStart.y - tpCenterStart.y) / mathAbs(tpStart.x - tpCenterStart.x));

    if (clockwise) {
        // fourth quadrant
        if (startAngle >= 0 && startAngle < PI / 2) {
            crAngleStart0 = -crAngleStart0;
        }
        // third quadrant
        else if (startAngle > 0 && startAngle < PI) {
            crAngleEnd0 = PI - crAngleEnd0;
        }
        // second quadrant
        else if (startAngle > 0 && startAngle < PI * 1.5) {
            crAngleStart0 = PI - crAngleStart0;
            crAngleEnd0 = PI + crAngleEnd0;
        }
        // first quadrant
        else {
            crAngleStart0 = PI + crAngleStart0;
            crAngleEnd0 = -crAngleEnd0;
        }
    }
    else {
        // fourth quadrant
        if (startAngle > 0 && startAngle <= PI / 2) {
            crAngleStart0 = PI - crAngleStart0;
        }
        // third quadrant
        else if (startAngle > 0 && startAngle <= PI) {
            crAngleStart0 = PI + crAngleStart0;
            crAngleEnd0 = PI - crAngleEnd0;
        }
        // second quadrant
        else if (startAngle > 0 && startAngle <= PI * 1.5) {
            crAngleStart0 = -crAngleStart0;
            crAngleEnd0 = PI + crAngleEnd0;
        }
        // first quadrant
        else {
            crAngleEnd0 = -crAngleEnd0;
        }
    }

    const tprEnd = keyPoints.tprEnd;
    const tpCenterEnd = keyPoints.tpCenterEnd;
    const tpEnd = keyPoints.tpEnd;

    let crAngleStart1 = mathATan(mathAbs(tprEnd.y - tpCenterEnd.y) / mathAbs(tprEnd.x - tpCenterEnd.x));
    let crAngleEnd1 = mathATan(mathAbs(tpEnd.y - tpCenterEnd.y) / mathAbs(tpEnd.x - tpCenterEnd.x));

    if (clockwise) {
        // fourth quadrant
        if (endAngle > 0 && endAngle <= PI / 2) {
            const tmp = crAngleStart1;
            crAngleStart1 = crAngleEnd1;
            crAngleEnd1 = PI - tmp;
        }
        // third quadrant
        else if (endAngle > 0 && endAngle <= PI) {
            const tmp = crAngleStart1;
            crAngleStart1 = PI - crAngleEnd1;
            crAngleEnd1 = PI + tmp;
        }
        // second quadrant
        else if (endAngle > 0 && endAngle <= PI * 1.5) {
            const tmp = crAngleStart1;
            crAngleStart1 = PI + crAngleEnd1;
            crAngleEnd1 = -tmp;
        }
        // first quadrant
        else {
            const tmp = crAngleStart1;
            crAngleStart1 = -crAngleEnd1;
            crAngleEnd1 = tmp;
        }
    }
    else {
        // fourth quadrant
        if (endAngle >= 0 && endAngle < PI / 2) {
            const tmp = crAngleStart1;
            crAngleStart1 = crAngleEnd1;
            crAngleEnd1 = -tmp;
        }
        // third quadrant
        else if (endAngle > 0 && endAngle < PI) {
            const tmp = crAngleStart1;
            crAngleStart1 = PI - crAngleEnd1;
            crAngleEnd1 = tmp;
        }
        // second quadrant
        else if (endAngle > 0 && endAngle < PI * 1.5) {
            const tmp = crAngleStart1;
            crAngleStart1 = PI + crAngleEnd1;
            crAngleEnd1 = PI - tmp;
        }
        // first quadrant
        else {
            const tmp = crAngleStart1;
            crAngleStart1 = -crAngleEnd1;
            crAngleEnd1 = PI + tmp;
        }
    }

    return {
        start0: crAngleStart0,
        end0: crAngleEnd0,
        start1: crAngleStart1,
        end1: crAngleEnd1
    };
}

function calcInnerCornerCircleAngles(
    keyPoints: KeyPoints, 
    startAngle: number, 
    endAngle: number, 
    clockwise?: boolean
): CornerCircleAngles {

    const tprStart = keyPoints.tprStart;
    const tpCenterStart = keyPoints.tpCenterStart;
    const tpStart = keyPoints.tpStart;

    let crAngleStart0 = mathATan(mathAbs(tprStart.y - tpCenterStart.y) / mathAbs(tprStart.x - tpCenterStart.x));
    let crAngleEnd0 = mathATan(mathAbs(tpStart.y - tpCenterStart.y) / mathAbs(tpStart.x - tpCenterStart.x));

    if (clockwise) {
        // fourth quadrant
        if (startAngle >= 0 && startAngle < PI / 2) {
            const tmp = crAngleStart0;
            crAngleStart0 = PI + crAngleEnd0;
            crAngleEnd0 = -tmp;
        }
        // third quadrant
        else if (startAngle > 0 && startAngle < PI) {
           const tmp = crAngleStart0;
           crAngleStart0 = -crAngleEnd0;
           crAngleEnd0 = tmp;
        }
        // second quadrant
        else if (startAngle > 0 && startAngle < PI * 1.5) {
            const tmp = crAngleStart0;
            crAngleStart0 = crAngleEnd0;
            crAngleEnd0 = PI - tmp;
        }
        // first quadrant
        else {
            const tmp = crAngleStart0;
            crAngleStart0 = PI - crAngleEnd0;
            crAngleEnd0 = PI + tmp;
        }
    }
    else {
        // fourth quadrant
        if (startAngle >= 0 && startAngle < PI / 2) {
            const tmp = crAngleStart0;
            crAngleStart0 = PI + crAngleEnd0;
            crAngleEnd0 = PI - tmp;
        }
        // third quadrant
        else if (startAngle > 0 && startAngle < PI) {
            const tmp = crAngleStart0;
            crAngleStart0 = -crAngleEnd0;
            crAngleEnd0 = PI + tmp;
        }
        // second quadrant
        else if (startAngle > 0 && startAngle < PI * 1.5) {
            const tmp = crAngleStart0;
            crAngleStart0 = crAngleEnd0;
            crAngleEnd0 = -tmp;
        }
        // first quadrant
        else {
           const tmp = crAngleStart0;
           crAngleStart0 = PI - crAngleEnd0;
           crAngleEnd0 = tmp;
        }
    }

    const tprEnd = keyPoints.tprEnd;
    const tpCenterEnd = keyPoints.tpCenterEnd;
    const tpEnd = keyPoints.tpEnd;

    let crAngleStart1 = mathATan(mathAbs(tprEnd.y - tpCenterEnd.y) / mathAbs(tprEnd.x - tpCenterEnd.x));
    let crAngleEnd1 = mathATan(mathAbs(tpEnd.y - tpCenterEnd.y) / mathAbs(tpEnd.x - tpCenterEnd.x));

    if (clockwise) {
        // fourth quadrant
        if (endAngle > 0 && endAngle <= PI / 2) {
            crAngleStart1 = PI - crAngleStart1;
            crAngleEnd1 = PI + crAngleEnd1;
        }
        // third quadrant
        else if (endAngle > 0 && endAngle <= PI) {
            crAngleStart1 = PI + crAngleStart1;
            crAngleEnd1 = -crAngleEnd1;
        }
        // second quadrant
        else if (endAngle > 0 && endAngle <= PI * 1.5) {
            crAngleStart1 = -crAngleStart1;
        }
        // first quadrant
        else {
            crAngleEnd1 = PI - crAngleEnd1;
        }
    }
    else {
        // fourth quadrant
        if (endAngle >= 0 && endAngle < PI / 2) {
            crAngleStart1 = -crAngleStart1;
            crAngleEnd1 = PI + crAngleEnd1;
        }
        // third quadrant
        else if (endAngle > 0 && endAngle < PI) {
            crAngleEnd1 = -crAngleEnd1;
        }
        // second quadrant
        else if (endAngle > 0 && endAngle < PI * 1.5) {
            crAngleStart1 = PI - crAngleStart1;
        }
        // first quadrant
        else {
            crAngleStart1 = PI + crAngleStart1;
            crAngleEnd1 = PI - crAngleEnd1;
        }
    }

    return {
        start0: crAngleStart0,
        end0: crAngleEnd0,
        start1: crAngleStart1,
        end1: crAngleEnd1
    };
}