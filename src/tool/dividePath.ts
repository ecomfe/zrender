import { fromPoints } from '../core/bbox';
import BoundingRect from '../core/BoundingRect';
import { Point } from '../export';
import Path from '../graphic/Path';
import Polygon from '../graphic/shape/Polygon';
import Rect from '../graphic/shape/Rect';
import Sector from '../graphic/shape/Sector';
import { pathToPolygons } from './convertPath';
import { clonePath } from './path';

// Default shape dividers

interface BinaryDivide {
    (shape: Path['shape']): Path['shape'][]
}

const SECTOR_COMMON_PROPS: (keyof Sector['shape'])[] = ['clockwise', 'cornerRadius', 'innerCornerRadius', 'cx', 'cy'];

function copyShapeProps(out: Path['shape'][], source: Path['shape'], keys: string[]) {
    // Copy common props
    for (let i = 0; i < SECTOR_COMMON_PROPS.length; i++) {
        const propName = SECTOR_COMMON_PROPS[i];
        if (source[propName] != null) {
            out[0][propName] = out[1][propName] = source[propName];
        }
    }
}

function binaryDivideSector(sectorShape: Sector['shape']) {
    // Divide into two
    const r0 = sectorShape.r0;
    const r = sectorShape.r;
    const startAngle = sectorShape.startAngle;
    const endAngle = sectorShape.endAngle;
    const angle = Math.abs(endAngle - startAngle);
    const arcLen = angle * r;
    const out: Sector['shape'][] = [];
    if (arcLen < Math.abs(r - r0)) {
        const midR = (r0 + r) / 2;
        // Divide on radius
        out[0] = {
            startAngle,
            endAngle,
            r0,
            r: midR
        } as Sector['shape'];
        out[1] = {
            startAngle,
            endAngle,
            r0: midR,
            r
        } as Sector['shape'];
    }
    else {
        const midAngle = (startAngle + endAngle) / 2;
        // Divide on angle
        out[0] = {
            startAngle,
            endAngle: midAngle,
            r0,
            r
        } as Sector['shape'];
        out[1] = {
            startAngle: midAngle,
            endAngle,
            r0,
            r
        } as Sector['shape'];
    }

    copyShapeProps(out, sectorShape, SECTOR_COMMON_PROPS);

    return out;
}


function binaryDivideRect(rectShape: Rect['shape']) {
    const width = rectShape.width;
    const height = rectShape.height;
    const x = rectShape.x;
    const y = rectShape.y;

    const out: Rect['shape'][] = [];
    if (width < height) {
        const halfHeight = height / 2;
        out[0] = {
            x, width,
            y, height: halfHeight
        };
        out[1] = {
            x, width,
            y: y + halfHeight, height: halfHeight
        };
    }
    else {
        const halfWidth = width / 2;
        out[0] = {
            y, height,
            x, width: halfWidth
        };
        out[1] = {
            y, height,
            x: x + halfWidth, width: halfWidth
        };
    }

    if (rectShape.r != null) {
        out[0].r = out[1].r = rectShape.r;
    }
    return out;
}

function crossProduct2d(x1: number, y1: number, x2: number, y2: number) {
    return x1 * y2 - x2 * y1;
}

function lineLineIntersect(
    a1x: number, a1y: number, a2x: number, a2y: number, // p1
    b1x: number, b1y: number, b2x: number, b2y: number // p2
): Point {
    const mx = a2x - a1x;
    const my = a2y - a1y;
    const nx = b2x - b1x;
    const ny = b2y - b1y;

    const nmCrossProduct = crossProduct2d(nx, ny, mx, my);
    if (Math.abs(nmCrossProduct) < 1e-6) {
        return null;
    }

    const b1a1x = a1x - b1x;
    const b1a1y = a1y - b1y;

    const p = crossProduct2d(b1a1x, b1a1y, nx, ny) / nmCrossProduct;
    if (p < 0 || p > 1) {
        return null;
    }
    // p2 is an infinite line
    return new Point(
        p * mx + a1x,
        p * my + a1y
    );
}

function projPtOnLine(pt: Point, lineA: Point, lineB: Point): number {
    const dir = new Point();
    Point.sub(dir, lineB, lineA);
    dir.normalize();
    const dir2 = new Point();
    Point.sub(dir2, pt, lineA);
    const len = dir2.dot(dir);
    return len;
}

function addToPoly(poly: number[][], pt: number[]) {
    const last = poly[poly.length - 1];
    if (last && last[0] === pt[0] && last[1] === pt[1]) {
        return;
    }
    poly.push(pt);
}

function splitPolygonByLine(points: number[][], lineA: Point, lineB: Point) {
    const len = points.length;
    const intersections: {
        projPt: number,
        pt: Point
        idx: number
    }[] = [];
    for (let i = 0; i < len; i++) {
        const p0 = points[i];
        const p1 = points[(i + 1) % len];
        const intersectionPt = lineLineIntersect(
            p0[0], p0[1], p1[0], p1[1],
            lineA.x, lineA.y, lineB.x, lineB.y
        );
        if (intersectionPt) {
            intersections.push({
                projPt: projPtOnLine(intersectionPt, lineA, lineB),
                pt: intersectionPt,
                idx: i
            });
        }
    }

    // TODO No intersection?
    if (intersections.length < 2) {
        // Do clone
        return [ { points}, {points} ];
    }

    // Find two farthest points.
    intersections.sort((a, b) => {
        return a.projPt - b.projPt;
    });
    let splitPt0 = intersections[0];
    let splitPt1 = intersections[intersections.length - 1];
    if (splitPt1.idx < splitPt0.idx) {
        const tmp = splitPt0;
        splitPt0 = splitPt1;
        splitPt1 = tmp;
    }

    const splitPt0Arr = [splitPt0.pt.x, splitPt0.pt.y];
    const splitPt1Arr = [splitPt1.pt.x, splitPt1.pt.y];

    const newPolyA: number[][] = [splitPt0Arr];
    const newPolyB: number[][] = [splitPt1Arr];

    for (let i = splitPt0.idx + 1; i <= splitPt1.idx; i++) {
        addToPoly(newPolyA, points[i].slice());
    }
    addToPoly(newPolyA, splitPt1Arr);
    // Close the path
    addToPoly(newPolyA, splitPt0Arr);

    for (let i = splitPt1.idx + 1; i <= splitPt0.idx + len; i++) {
        addToPoly(newPolyB, points[i % len].slice());
    }
    addToPoly(newPolyB, splitPt0Arr);
    // Close the path
    addToPoly(newPolyB, splitPt1Arr);

    return [{
        points: newPolyA
    }, {
        points: newPolyB
    }];
}

function binaryDividePolygon(
    polygonShape: Pick<Polygon['shape'], 'points'>
) {
    const points = polygonShape.points;
    const min: number[] = [];
    const max: number[] = [];
    fromPoints(points, min, max);
    const boundingRect = new BoundingRect(
        min[0], min[1], max[0] - min[0], max[1] - min[1]
    );

    const width = boundingRect.width;
    const height = boundingRect.height;
    const x = boundingRect.x;
    const y = boundingRect.y;

    const pt0 = new Point();
    const pt1 = new Point();
    if (width > height) {
        pt0.x = pt1.x = x + width / 2;
        pt0.y = y;
        pt1.y = y + height;
    }
    else {
        pt0.y = pt1.y = y + height / 2;
        pt0.x = x;
        pt1.x = x + width;
    }
    return splitPolygonByLine(points, pt0, pt1);
}


function binaryDivideRecursive<T extends Path['shape']>(
    divider: BinaryDivide, shape: T, count: number, out: T[]
): T[] {
    if (count === 1) {
        out.push(shape);
    }
    else {
        const mid = Math.floor(count / 2);
        const sub = divider(shape);
        binaryDivideRecursive(divider, sub[0], mid, out);
        binaryDivideRecursive(divider, sub[1], count - mid, out);
    }

    return out;
}

export function clone(path: Path, count: number) {
    const paths = [];
    for (let i = 0; i < count; i++) {
        paths.push(clonePath(path));
    }
    return paths;
}

function copyPathProps(source: Path, target: Path) {
    target.setStyle(source.style);
    target.z = source.z;
    target.z2 = source.z2;
    target.zlevel = source.zlevel;
}

function polygonConvert(points: number[]): number[][] {
    const out = [];
    for (let i = 0; i < points.length;) {
        out.push([points[i++], points[i++]]);
    }
    return out;
}

export function split(
    path: Path, count: number
) {
    const outShapes: Path['shape'][] = [];
    const shape = path.shape;
    let OutShapeCtor: new() => Path;
    // TODO Use clone when shape size is small
    switch (path.type) {
        case 'rect':
            binaryDivideRecursive(binaryDivideRect, shape, count, outShapes);
            OutShapeCtor = Rect;
            break;
        case 'sector':
            binaryDivideRecursive(binaryDivideSector, shape, count, outShapes);
            OutShapeCtor = Sector;
            break;
        case 'circle':
            binaryDivideRecursive(binaryDivideSector, {
                r0: 0, r: shape.r, startAngle: 0, endAngle: Math.PI * 2,
                cx: shape.cx, cy: shape.cy
            } as Sector['shape'], count, outShapes);
            OutShapeCtor = Sector;
            break;
        default:
            // TODO
            const polygons = pathToPolygons(path.getUpdatedPathProxy());
            binaryDivideRecursive(binaryDividePolygon, {
                points: polygonConvert(polygons[0])
            }, count, outShapes);
            OutShapeCtor = Polygon;
            break;
    }

    if (!OutShapeCtor) {
        // Unkown split algorithm. Use clone instead
        return clone(path, count);
    }
    const out: Path[] = [];

    for (let i = 0; i < outShapes.length; i++) {
        const subPath = new OutShapeCtor();
        subPath.setShape(outShapes[i]);
        copyPathProps(path, subPath);
        out.push(subPath);
    }

    return out;
}