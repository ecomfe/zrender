import PathProxy, { normalizeArcAngles } from '../../core/PathProxy';

const PI = Math.PI;
const PI2 = PI * 2;
const mathSin = Math.sin;
const mathCos = Math.cos;
const mathACos = Math.acos;
const mathATan2 = Math.atan2;
const mathAbs = Math.abs;
const mathSqrt = Math.sqrt;
const mathMax = Math.max;
const mathMin = Math.min;
const e = 1e-4;

type CornerTangents = {
    cx: number
    cy: number
    x01: number
    y01: number
    x11: number
    y11: number
};

function intersect(
    x0: number, y0: number, 
    x1: number, y1: number, 
    x2: number, y2: number, 
    x3: number, y3: number
): [number, number] {
    const x10 = x1 - x0;
    const y10 = y1 - y0;
    const x32 = x3 - x2;
    const y32 = y3 - y2;
    let t = y32 * x10 - x32 * y10;
    if (t * t < e) {
        return;
    }
    t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / t;
    return [x0 + t * x10, y0 + t * y10];
}

// Compute perpendicular offset line of length rc.
function computeCornerTangents(
    x0: number, y0: number, 
    x1: number, y1: number, 
    radius: number, cr: number, 
    clockwise: boolean
): CornerTangents {
  const x01 = x0 - x1;
  const y01 = y0 - y1;
  const lo = (clockwise ? cr : -cr) / mathSqrt(x01 * x01 + y01 * y01);
  const ox = lo * y01;
  const oy = -lo * x01;
  const x11 = x0 + ox;
  const y11 = y0 + oy;
  const x10 = x1 + ox;
  const y10 = y1 + oy;
  const x00 = (x11 + x10) / 2;
  const y00 = (y11 + y10) / 2;
  const dx = x10 - x11;
  const dy = y10 - y11;
  const d2 = dx * dx + dy * dy;
  const r = radius - cr;
  const s = x11 * y10 - x10 * y11;
  const d = (dy < 0 ? -1 : 1) * mathSqrt(mathMax(0, r * r * d2 - s * s));
  let cx0 = (s * dy - dx * d) / d2;
  let cy0 = (-s * dx - dy * d) / d2;
  const cx1 = (s * dy + dx * d) / d2;
  const cy1 = (-s * dx + dy * d) / d2;
  const dx0 = cx0 - x00;
  const dy0 = cy0 - y00;
  const dx1 = cx1 - x00;
  const dy1 = cy1 - y00;

  // Pick the closer of the two intersection points
  // TODO: Is there a faster way to determine which intersection to use?
  if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) {
      cx0 = cx1;
      cy0 = cy1;
  }

  return {
    cx: cx0,
    cy: cy0,
    x01: -ox,
    y01: -oy,
    x11: cx0 * (radius / r - 1),
    y11: cy0 * (radius / r - 1)
  };
}

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
    let radius = mathMax(shape.r, 0);
    let innerRadius = mathMax(shape.r0 || 0, 0);
    const hasRadius = radius > 0;
    const hasInnerRadius = innerRadius > 0;

    if (!hasRadius && !hasInnerRadius) {
        return;
    }

    if (!hasRadius) {
        // use innerRadius as radius if no radius
        radius = innerRadius;
        innerRadius = 0;
    }

    if (innerRadius > radius) {
        // swap, ensure that radius is always larger than innerRadius
        const tmp = radius;
        radius = innerRadius;
        innerRadius = tmp;
    }

    const clockwise = !!shape.clockwise;
    const startAngle = shape.startAngle;
    const endAngle = shape.endAngle;

    // PENDING: whether normalizing angles is required?
    let arc: number;
    // FIXME: there may be a precision issue in `normalizeArcAngles`
    if (startAngle === endAngle) {
        arc = 0;
    }
    else {
        const tmpAngles = [startAngle, endAngle];
        normalizeArcAngles(tmpAngles, !clockwise);
        arc = mathAbs(tmpAngles[0] - tmpAngles[1]);
    }

    const x = shape.cx;
    const y = shape.cy;
    const cornerRadius = shape.cornerRadius || 0;
    const innerCornerRadius = shape.innerCornerRadius || 0;

    // is a point
    if (!(radius > e)) {
        ctx.moveTo(x, y);
    }
    // is a circle or annulus
    else if (arc > PI2 - e) {
        ctx.moveTo(
            x + radius * mathCos(startAngle), 
            y + radius * mathSin(startAngle)
        );
        ctx.arc(x, y, radius, startAngle, endAngle, !clockwise);

        if (innerRadius > e) {
            ctx.moveTo(
                x + innerRadius * mathCos(endAngle), 
                y + innerRadius * mathSin(endAngle)
            );
            ctx.arc(x, y, innerRadius, endAngle, startAngle, clockwise);
        }
    }
    // is a circular or annular sector
    else {
        const halfRd = mathAbs(radius - innerRadius) / 2;
        const cr = mathMin(halfRd, cornerRadius);
        const icr = mathMin(halfRd, innerCornerRadius);
        let cr0 = icr;
        let cr1 = cr;

        const xrs = radius * mathCos(startAngle);
        const yrs = radius * mathSin(startAngle);
        const xire = innerRadius * mathCos(endAngle);
        const yire = innerRadius * mathSin(endAngle);

        let xre;
        let yre;
        let xirs;
        let yirs;

        // draw corner radius
        if (cr > e || icr > e) {
            xre = radius * mathCos(endAngle);
            yre = radius * mathSin(endAngle);
            xirs = innerRadius * mathCos(startAngle);
            yirs = innerRadius * mathSin(startAngle);

            // restrict the max value of corner radius
            if (arc < PI) {
                const it = intersect(xrs, yrs, xirs, yirs, xre, yre, xire, yire);
                if (it) {
                    const x0 = xrs - it[0];
                    const y0 = yrs - it[1];
                    const x1 = xre - it[0];
                    const y1 = yre - it[1];
                    const a = 1 / mathSin(
                        mathACos((x0 * x1 + y0 * y1) / (mathSqrt(x0 * x0 + y0 * y0) * mathSqrt(x1 * x1 + y1 * y1))) / 2
                    );
                    const b = mathSqrt(it[0] * it[0] + it[1] * it[1]);
                    cr0 = mathMin(icr, (innerRadius - b) / (a - 1));
                    cr1 = mathMin(cr, (radius - b) / (a + 1));
                }
            }
        }

        // the sector is collapsed to a line
        if (!(arc > e)) {
            ctx.moveTo(x + xrs, y + yrs);
        }
        // the outer ring has corners
        else if (cr1 > e) {
            const ct0 = computeCornerTangents(xirs, yirs, xrs, yrs, radius, cr1, clockwise);
            const ct1 = computeCornerTangents(xre, yre, xire, yire, radius, cr1, clockwise);

            ctx.moveTo(x + ct0.cx + ct0.x01, y + ct0.cy + ct0.y01);

            // Have the corners merged?
            if (cr1 < cr) {
                ctx.arc(x + ct0.cx, y + ct0.cy, cr1, mathATan2(ct0.y01, ct0.x01), mathATan2(ct1.y01, ct1.x01), !clockwise);
            }
            else {
              // draw the two corners and the ring
              ctx.arc(x + ct0.cx, y + ct0.cy, cr1, mathATan2(ct0.y01, ct0.x01), mathATan2(ct0.y11, ct0.x11), !clockwise);

              ctx.arc(x, y, radius, mathATan2(ct0.cy + ct0.y11, ct0.cx + ct0.x11), mathATan2(ct1.cy + ct1.y11, ct1.cx + ct1.x11), !clockwise);

              ctx.arc(x + ct1.cx, y + ct1.cy, cr1, mathATan2(ct1.y11, ct1.x11), mathATan2(ct1.y01, ct1.x01), !clockwise);
            }
        }
        // the outer ring is a circular arc
        else {
            ctx.moveTo(x + xrs, y + yrs);
            ctx.arc(x, y, radius, startAngle, endAngle, !clockwise);
        }

        // no inner ring, is a circular sector
        if (!(innerRadius > e) || !(arc > e)) {
            ctx.lineTo(x + xire, y + yire);
        }
        // the inner ring has corners
        else if (cr0 > e) {
            const ct0 = computeCornerTangents(xire, yire, xre, yre, innerRadius, -cr0, clockwise);
            const ct1 = computeCornerTangents(xrs, yrs, xirs, yirs, innerRadius, -cr0, clockwise);
            ctx.lineTo(x + ct0.cx + ct0.x01, y + ct0.cy + ct0.y01);

            // Have the corners merged?
            if (cr0 < icr) {
                ctx.arc(x + ct0.cx, y + ct0.cy, cr0, mathATan2(ct0.y01, ct0.x01), mathATan2(ct1.y01, ct1.x01), !clockwise);
            }
            // draw the two corners and the ring
            else {
              ctx.arc(x + ct0.cx, y + ct0.cy, cr0, mathATan2(ct0.y01, ct0.x01), mathATan2(ct0.y11, ct0.x11), !clockwise);

              ctx.arc(x, y, innerRadius, mathATan2(ct0.cy + ct0.y11, ct0.cx + ct0.x11), mathATan2(ct1.cy + ct1.y11, ct1.cx + ct1.x11), clockwise);

              ctx.arc(x + ct1.cx, y + ct1.cy, cr0, mathATan2(ct1.y11, ct1.x11), mathATan2(ct1.y01, ct1.x01), !clockwise);
            }
        }
        // the inner ring is just a circular arc
        else {
            // FIXME: if no lineTo, svg renderer will perform an abnormal drawing behavior.
            ctx.lineTo(x + xire, y + yire);

            ctx.arc(x, y, innerRadius, endAngle, startAngle, clockwise);
        }
    }

    ctx.closePath();
}
