import PathProxy from '../core/PathProxy';
import { cubicSubdivide } from '../core/curve';
import Path from '../graphic/Path';
import Element, { ElementAnimateConfig } from '../Element';
import { defaults, assert } from '../core/util';
import { lerp } from '../core/vector';
import Group, { GroupLike } from '../graphic/Group';
import { clonePath } from './path';
import { MatrixArray } from '../core/matrix';
import Transformable from '../core/Transformable';
import { ZRenderType } from '../zrender';
import { split } from './dividePath';

const CMD = PathProxy.CMD;

function aroundEqual(a: number, b: number) {
    return Math.abs(a - b) < 1e-5;
}

export function pathToBezierCurves(path: PathProxy) {

    const data = path.data;
    const len = path.len();

    const bezierArrayGroups: number[][] = [];
    let currentSubpath: number[];

    let xi = 0;
    let yi = 0;
    let x0 = 0;
    let y0 = 0;

    function createNewSubpath(x: number, y: number) {
        // More than one M command
        if (currentSubpath && currentSubpath.length > 2) {
            bezierArrayGroups.push(currentSubpath);
        }
        currentSubpath = [x, y];
    }

    function addLine(x0: number, y0: number, x1: number, y1: number) {
        if (!(aroundEqual(x0, x1) && aroundEqual(y0, y1))) {
            currentSubpath.push(x0, y0, x1, y1, x1, y1);
        }
    }

    function addArc(startAngle: number, endAngle: number, cx: number, cy: number, rx: number, ry: number) {
        // https://stackoverflow.com/questions/1734745/how-to-create-circle-with-b%C3%A9zier-curves
        const delta = Math.abs(endAngle - startAngle);
        const len = Math.tan(delta / 4) * 4 / 3;
        const dir = endAngle < startAngle ? -1 : 1;

        const c1 = Math.cos(startAngle);
        const s1 = Math.sin(startAngle);
        const c2 = Math.cos(endAngle);
        const s2 = Math.sin(endAngle);

        const x1 = c1 * rx + cx;
        const y1 = s1 * ry + cy;

        const x4 = c2 * rx + cx;
        const y4 = s2 * ry + cy;

        const hx = rx * len * dir;
        const hy = ry * len * dir;
        currentSubpath.push(
            // Move control points on tangent.
            x1 - hx * s1, y1 + hy * c1,
            x4 + hx * s2, y4 - hy * c2,
            x4, y4
        );
    }

    let x1;
    let y1;
    let x2;
    let y2;

    for (let i = 0; i < len;) {
        const cmd = data[i++];
        const isFirst = i === 1;

        if (isFirst) {
            // 如果第一个命令是 L, C, Q
            // 则 previous point 同绘制命令的第一个 point
            // 第一个命令为 Arc 的情况下会在后面特殊处理
            xi = data[i];
            yi = data[i + 1];

            x0 = xi;
            y0 = yi;

            if (cmd === CMD.L || cmd === CMD.C || cmd === CMD.Q) {
                // Start point
                currentSubpath = [x0, y0];
            }
        }

        switch (cmd) {
            case CMD.M:
                // moveTo 命令重新创建一个新的 subpath, 并且更新新的起点
                // 在 closePath 的时候使用
                xi = x0 = data[i++];
                yi = y0 = data[i++];

                createNewSubpath(x0, y0);
                break;
            case CMD.L:
                x1 = data[i++];
                y1 = data[i++];
                addLine(xi, yi, x1, y1);
                xi = x1;
                yi = y1;
                break;
            case CMD.C:
                currentSubpath.push(
                    data[i++], data[i++], data[i++], data[i++],
                    xi = data[i++], yi = data[i++]
                );
                break;
            case CMD.Q:
                x1 = data[i++];
                y1 = data[i++];
                x2 = data[i++];
                y2 = data[i++];
                currentSubpath.push(
                    // Convert quadratic to cubic
                    xi + 2 / 3 * (x1 - xi), yi + 2 / 3 * (y1 - yi),
                    x2 + 2 / 3 * (x1 - x2), y2 + 2 / 3 * (y1 - y2),
                    x2, y2
                );
                xi = x2;
                yi = y2;
                break;
            case CMD.A:
                const cx = data[i++];
                const cy = data[i++];
                const rx = data[i++];
                const ry = data[i++];
                const startAngle = data[i++];
                const endAngle = data[i++] + startAngle;

                // TODO Arc rotation
                i += 1;
                const anticlockwise = !data[i++];

                x1 = Math.cos(startAngle) * rx + cx;
                y1 = Math.sin(startAngle) * ry + cy;
                if (isFirst) {
                    // 直接使用 arc 命令
                    // 第一个命令起点还未定义
                    x0 = x1;
                    y0 = y1;
                    createNewSubpath(x0, y0);
                }
                else {
                    // Connect a line between current point to arc start point.
                    addLine(xi, yi, x1, y1);
                }

                xi = Math.cos(endAngle) * rx + cx;
                yi = Math.sin(endAngle) * ry + cy;

                const step = (anticlockwise ? -1 : 1) * Math.PI / 2;

                for (let angle = startAngle; anticlockwise ? angle > endAngle : angle < endAngle; angle += step) {
                    const nextAngle = anticlockwise ? Math.max(angle + step, endAngle)
                        : Math.min(angle + step, endAngle);
                    addArc(angle, nextAngle, cx, cy, rx, ry);
                }

                break;
            case CMD.R:
                x0 = xi = data[i++];
                y0 = yi = data[i++];
                x1 = x0 + data[i++];
                y1 = y0 + data[i++];

                // rect is an individual path.
                createNewSubpath(x1, y0);
                addLine(x1, y0, x1, y1);
                addLine(x1, y1, x0, y1);
                addLine(x0, y1, x0, y0);
                addLine(x0, y0, x1, y0);
                break;
            case CMD.Z:
                currentSubpath && addLine(xi, yi, x0, y0);
                xi = x0;
                yi = y0;
                break;
        }
    }

    if (currentSubpath && currentSubpath.length > 2) {
        bezierArrayGroups.push(currentSubpath);
    }

    return bezierArrayGroups;
}

function adpativeBezier(
    x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
    out: number[]
) {
    // This bezier is used to simulates a line when converting path to beziers.
    if (aroundEqual(x0, x1) && aroundEqual(y0, y1) && aroundEqual(x2, x3) && aroundEqual(y2, y3)) {
        out.push(x3, y3);
        return;
    }

    const PIXEL_DISTANCE = 2;
    const PIXEL_DISTANCE_SQR = PIXEL_DISTANCE * PIXEL_DISTANCE;

    // Determine if curve is straight enough
    let dx = x3 - x0;
    let dy = y3 - y0;
    const d = Math.sqrt(dx * dx + dy * dy);
    dx /= d;
    dy /= d;

    const dx1 = x1 - x0;
    const dy1 = y1 - y0;
    const dx2 = x2 - x3;
    const dy2 = y2 - y3;

    const cp1LenSqr = dx1 * dx1 + dy1 * dy1;
    const cp2LenSqr = dx2 * dx2 + dy2 * dy2;

    if (cp1LenSqr < PIXEL_DISTANCE_SQR && cp2LenSqr < PIXEL_DISTANCE_SQR) {
        // Add small segment
        out.push(x3, y3);
        return;
    }

    // Project length of cp1
    const projLen1 = dx * dx1 + dy * dy1;
    // Project length of cp2
    const projLen2 = -dx * dx2 - dy * dy2;

    // Distance from cp1 to start-end line.
    const d1Sqr = cp1LenSqr - projLen1 * projLen1;
    // Distance from cp2 to start-end line.
    const d2Sqr = cp2LenSqr - projLen2 * projLen2;

    // IF the cp1 and cp2 is near to the start-line enough
    // We treat it straight enough
    if (d1Sqr < PIXEL_DISTANCE_SQR && projLen1 >= 0
        && d2Sqr < PIXEL_DISTANCE_SQR && projLen2 >= 0
    ) {
        out.push(x3, y3);
        return;
    }


    const tmpSegX: number[] = [];
    const tmpSegY: number[] = [];
    // Subdivide
    cubicSubdivide(x0, x1, x2, x3, 0.5, tmpSegX);
    cubicSubdivide(y0, y1, y2, y3, 0.5, tmpSegY);

    adpativeBezier(
        tmpSegX[0], tmpSegY[0], tmpSegX[1], tmpSegY[1], tmpSegX[2], tmpSegY[2], tmpSegX[3], tmpSegY[3],
        out
    );
    adpativeBezier(
        tmpSegX[4], tmpSegY[4], tmpSegX[5], tmpSegY[5], tmpSegX[6], tmpSegY[6], tmpSegX[7], tmpSegY[7],
        out
    );
}

export function pathToPolygons(path: PathProxy) {
    const bezierArrayGroups = pathToBezierCurves(path);

    const polygons: number[][] = [];

    for (let i = 0; i < bezierArrayGroups.length; i++) {
        const beziers = bezierArrayGroups[i];
        const polygon = [];
        let x0 = beziers[0];
        let y0 = beziers[1];

        for (let k = 2; k < beziers.length;) {
            polygon.push(x0, y0);

            const x1 = beziers[k++];
            const y1 = beziers[k++];
            const x2 = beziers[k++];
            const y2 = beziers[k++];
            const x3 = beziers[k++];
            const y3 = beziers[k++];

            adpativeBezier(x0, y0, x1, y1, x2, y2, x3, y3, polygon);

            x0 = x3;
            y0 = y3;
        }

        polygons.push(polygon);
    }
    return polygons;
}

function alignSubpath(subpath1: number[], subpath2: number[]): [number[], number[]] {
    const len1 = subpath1.length;
    const len2 = subpath2.length;
    if (len1 === len2) {
        return [subpath1, subpath2];
    }
    const tmpSegX: number[] = [];
    const tmpSegY: number[] = [];

    const shorterPath = len1 < len2 ? subpath1 : subpath2;
    const shorterLen = Math.min(len1, len2);
    // Should divide excatly
    const diff = Math.abs(len2 - len1) / 6;
    const shorterBezierCount = (shorterLen - 2) / 6;
    // Add `diff` number of beziers
    const eachCurveSubDivCount = Math.ceil(diff / shorterBezierCount) + 1;

    const newSubpath = [shorterPath[0], shorterPath[1]];
    let remained = diff;

    for (let i = 2; i < shorterLen;) {
        let x0 = shorterPath[i - 2];
        let y0 = shorterPath[i - 1];
        let x1 = shorterPath[i++];
        let y1 = shorterPath[i++];
        let x2 = shorterPath[i++];
        let y2 = shorterPath[i++];
        let x3 = shorterPath[i++];
        let y3 = shorterPath[i++];

        if (remained <= 0) {
            newSubpath.push(x1, y1, x2, y2, x3, y3);
            continue;
        }

        let actualSubDivCount = Math.min(remained, eachCurveSubDivCount - 1) + 1;
        for (let k = 1; k <= actualSubDivCount; k++) {
            const p = k / actualSubDivCount;

            cubicSubdivide(x0, x1, x2, x3, p, tmpSegX);
            cubicSubdivide(y0, y1, y2, y3, p, tmpSegY);

            // tmpSegX[3] === tmpSegX[4]
            x0 = tmpSegX[3];
            y0 = tmpSegY[3];

            newSubpath.push(tmpSegX[1], tmpSegY[1], tmpSegX[2], tmpSegY[2], x0, y0);
            x1 = tmpSegX[5];
            y1 = tmpSegY[5];
            x2 = tmpSegX[6];
            y2 = tmpSegY[6];
            // The last point (x3, y3) is still the same.
        }
        remained -= actualSubDivCount - 1;
    }

    return shorterPath === subpath1 ? [newSubpath, subpath2] : [subpath1, newSubpath];
}

function createSubpath(lastSubpathSubpath: number[], otherSubpath: number[]) {
    const len = lastSubpathSubpath.length;
    const lastX = lastSubpathSubpath[len - 2];
    const lastY = lastSubpathSubpath[len - 1];

    const newSubpath: number[] = [];
    for (let i = 0; i < otherSubpath.length;) {
        newSubpath[i++] = lastX;
        newSubpath[i++] = lastY;
    }
    return newSubpath;
}

/**
 * Make two bezier arrays aligns on structure. To have better animation.
 *
 * It will:
 * Make two bezier arrays have same number of subpaths.
 * Make each subpath has equal number of bezier curves.
 *
 * array is the convert result of pathToBezierCurves.
 */
export function alignBezierCurves(array1: number[][], array2: number[][]) {

    let lastSubpath1;
    let lastSubpath2;

    let newArray1 = [];
    let newArray2 = [];

    for (let i = 0; i < Math.max(array1.length, array2.length); i++) {
        const subpath1 = array1[i];
        const subpath2 = array2[i];

        let newSubpath1;
        let newSubpath2;

        if (!subpath1) {
            newSubpath1 = createSubpath(lastSubpath1 || subpath2, subpath2);
            newSubpath2 = subpath2;
        }
        else if (!subpath2) {
            newSubpath2 = createSubpath(lastSubpath2 || subpath1, subpath1);
            newSubpath1 = subpath1;
        }
        else {
            [newSubpath1, newSubpath2] = alignSubpath(subpath1, subpath2);
            lastSubpath1 = newSubpath1;
            lastSubpath2 = newSubpath2;
        }

        newArray1.push(newSubpath1);
        newArray2.push(newSubpath2);
    }

    return [newArray1, newArray2];
}

interface MorphingPath extends Path {
    __morphT: number;
}

export interface CombineMorphingPath extends Path {
    childrenRef(): (CombineMorphingPath | Path)[]
    __isCombineMorphing: boolean;
}

export function centroid(array: number[]) {
    // https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
    let signedArea = 0;
    let cx = 0;
    let cy = 0;
    const len = array.length;
    // Polygon should been closed.
    for (let i = 0, j = len - 2; i < len; j = i, i += 2) {
        const x0 = array[j];
        const y0 = array[j + 1];
        const x1 = array[i];
        const y1 = array[i + 1];
        const a = x0 * y1 - x1 * y0;
        signedArea += a;
        cx += (x0 + x1) * a;
        cy += (y0 + y1) * a;
    }

    if (signedArea === 0) {
        return [array[0] || 0, array[1] || 0];
    }

    return [cx / signedArea / 3, cy / signedArea / 3, signedArea];
}

/**
 * Offset the points to find the nearest morphing distance.
 * Return beziers count needs to be offset.
 */
function findBestRingOffset(
    fromSubBeziers: number[],
    toSubBeziers: number[],
    fromCp: number[],
    toCp: number[]
) {
    const bezierCount = (fromSubBeziers.length - 2) / 6;
    let bestScore = Infinity;
    let bestOffset = 0;

    const len = fromSubBeziers.length;
    const len2 = len - 2;
    for (let offset = 0; offset < bezierCount; offset++) {
        const cursorOffset = offset * 6;
        let score = 0;

        for (let k = 0; k < len; k += 2) {
            let idx = k === 0 ? cursorOffset : ((cursorOffset + k - 2) % len2 + 2);

            const x0 = fromSubBeziers[idx] - fromCp[0];
            const y0 = fromSubBeziers[idx + 1] - fromCp[1];
            const x1 = toSubBeziers[k] - toCp[0];
            const y1 = toSubBeziers[k + 1] - toCp[1];

            const dx = x1 - x0;
            const dy = y1 - y0;
            score += dx * dx + dy * dy;
        }
        if (score < bestScore) {
            bestScore = score;
            bestOffset = offset;
        }
    }

    return bestOffset;
}

function reverse(array: number[]) {
    const newArr: number[] = [];
    const len = array.length;
    for (let i = 0; i < len; i += 2) {
        newArr[i] = array[len - i - 2];
        newArr[i + 1] = array[len - i - 1];
    }
    return newArr;
}

type MorphingData = {
    from: number[];
    to: number[];
    fromCp: number[];
    toCp: number[];
    rotation: number;
}[];

/**
 * If we interpolating between two bezier curve arrays.
 * It will have many broken effects during the transition.
 * So we try to apply an extra rotation which can make each bezier curve morph as small as possible.
 */
function findBestMorphingRotation(
    fromArr: number[][],
    toArr: number[][],
    searchAngleIteration: number,
    searchAngleRange: number
): MorphingData {
    const result = [];

    let fromNeedsReverse: boolean;

    for (let i = 0; i < fromArr.length; i++) {
        let fromSubpathBezier = fromArr[i];
        const toSubpathBezier = toArr[i];

        const fromCp = centroid(fromSubpathBezier);
        const toCp = centroid(toSubpathBezier);

        if (fromNeedsReverse == null) {
            // Reverse from array if two have different directions.
            // Determine the clockwise based on the first subpath.
            // Reverse all subpaths or not. Avoid winding rule changed.
            fromNeedsReverse = fromCp[2] < 0 !== toCp[2] < 0;
        }

        const newFromSubpathBezier: number[] = [];
        const newToSubpathBezier: number[] = [];
        let bestAngle = 0;
        let bestScore = Infinity;
        let tmpArr: number[] = [];

        const len = fromSubpathBezier.length;
        if (fromNeedsReverse) {
            // Make sure clockwise
            fromSubpathBezier = reverse(fromSubpathBezier);
        }
        const offset = findBestRingOffset(fromSubpathBezier, toSubpathBezier, fromCp, toCp) * 6;

        const len2 = len - 2;
        for (let k = 0; k < len2; k += 2) {
            // Not include the start point.
            const idx = (offset + k) % len2 + 2;
            newFromSubpathBezier[k + 2] = fromSubpathBezier[idx] - fromCp[0];
            newFromSubpathBezier[k + 3] = fromSubpathBezier[idx + 1] - fromCp[1];
        }
        newFromSubpathBezier[0] = fromSubpathBezier[offset] - fromCp[0];
        newFromSubpathBezier[1] = fromSubpathBezier[offset + 1] - fromCp[1];

        if (searchAngleIteration > 0) {
            const step = searchAngleRange / searchAngleIteration;
            for (let angle = -searchAngleRange / 2; angle <= searchAngleRange / 2; angle += step) {
                const sa = Math.sin(angle);
                const ca = Math.cos(angle);
                let score = 0;

                for (let k = 0; k < fromSubpathBezier.length; k += 2) {
                    const x0 = newFromSubpathBezier[k];
                    const y0 = newFromSubpathBezier[k + 1];
                    const x1 = toSubpathBezier[k] - toCp[0];
                    const y1 = toSubpathBezier[k + 1] - toCp[1];

                    // Apply rotation on the target point.
                    const newX1 = x1 * ca - y1 * sa;
                    const newY1 = x1 * sa + y1 * ca;

                    tmpArr[k] = newX1;
                    tmpArr[k + 1] = newY1;

                    const dx = newX1 - x0;
                    const dy = newY1 - y0;

                    // Use dot product to have min direction change.
                    // const d = Math.sqrt(x0 * x0 + y0 * y0);
                    // score += x0 * dx / d + y0 * dy / d;
                    score += dx * dx + dy * dy;
                }

                if (score < bestScore) {
                    bestScore = score;
                    bestAngle = angle;
                    // Copy.
                    for (let m = 0; m < tmpArr.length; m++) {
                        newToSubpathBezier[m] = tmpArr[m];
                    }
                }
            }
        }
        else {
            for (let i = 0; i < len; i += 2) {
                newToSubpathBezier[i] = toSubpathBezier[i] - toCp[0];
                newToSubpathBezier[i + 1] = toSubpathBezier[i + 1] - toCp[1];
            }
        }

        result.push({
            from: newFromSubpathBezier,
            to: newToSubpathBezier,
            fromCp,
            toCp,
            rotation: -bestAngle
        });
    }
    return result;
}

export function isCombineMorphing(path: Element): path is CombineMorphingPath {
    return (path as CombineMorphingPath).__isCombineMorphing;
}

export function isMorphing(el: Element) {
    return (el as MorphingPath).__morphT >= 0;
}

const SAVED_METHOD_PREFIX = '__mOriginal_';
function saveAndModifyMethod<T extends object, M extends keyof T>(
    obj: T,
    methodName: M,
    modifiers: { replace?: T[M], after?: T[M], before?: T[M] }
) {
    const savedMethodName = SAVED_METHOD_PREFIX + methodName;
    const originalMethod = (obj as any)[savedMethodName] || obj[methodName];
    if (!(obj as any)[savedMethodName]) {
        (obj as any)[savedMethodName] = obj[methodName];
    }
    const replace = modifiers.replace;
    const after = modifiers.after;
    const before = modifiers.before;

    (obj as any)[methodName] = function () {
        const args = arguments;
        let res;
        before && (before as unknown as Function).apply(this, args);
        // Still call the original method if not replacement.
        if (replace) {
            res = (replace as unknown as Function).apply(this, args);
        }
        else {
            res = originalMethod.apply(this, args);
        }
        after && (after as unknown as Function).apply(this, args);
        return res;
    };
}
function restoreMethod<T extends object>(
    obj: T,
    methodName: keyof T
) {
    const savedMethodName = SAVED_METHOD_PREFIX + methodName;
    if ((obj as any)[savedMethodName]) {
        obj[methodName] = (obj as any)[savedMethodName];
        (obj as any)[savedMethodName] = null;
    }
}

function applyTransformOnBeziers(bezierCurves: number[][], mm: MatrixArray) {
    for (let i = 0; i < bezierCurves.length; i++) {
        const subBeziers = bezierCurves[i];
        for (let k = 0; k < subBeziers.length;) {
            const x = subBeziers[k];
            const y = subBeziers[k + 1];

            subBeziers[k++] = mm[0] * x + mm[2] * y + mm[4];
            subBeziers[k++] = mm[1] * x + mm[3] * y + mm[5];
        }
    }
}

function prepareMorphPath(
    fromPath: Path,
    toPath: Path
) {
    const fromPathProxy = fromPath.getUpdatedPathProxy();
    const toPathProxy = toPath.getUpdatedPathProxy();

    const [fromBezierCurves, toBezierCurves] =
        alignBezierCurves(pathToBezierCurves(fromPathProxy), pathToBezierCurves(toPathProxy));

    const fromPathTransform = fromPath.getComputedTransform();
    const toPathTransform = toPath.getComputedTransform();
    function updateIdentityTransform(this: Transformable) {
        this.transform = null;
    }
    if (fromPathTransform) {
        applyTransformOnBeziers(fromBezierCurves, fromPathTransform);
        // Just ignore transform
        saveAndModifyMethod(fromPath, 'updateTransform', { replace: updateIdentityTransform });
        fromPath.transform = null;
    }
    if (toPathTransform) {
        applyTransformOnBeziers(toBezierCurves, toPathTransform);
        saveAndModifyMethod(toPath, 'updateTransform', { replace: updateIdentityTransform });
        toPath.transform = null;
    }

    const morphingData = findBestMorphingRotation(fromBezierCurves, toBezierCurves, 10, Math.PI);

    const tmpArr: number[] = [];

    saveAndModifyMethod(toPath, 'buildPath', { replace(path: PathProxy) {
        const t = (toPath as MorphingPath).__morphT;
        const onet = 1 - t;

        const newCp: number[] = [];
        for (let i = 0; i < morphingData.length; i++) {
            const item = morphingData[i];
            const from = item.from;
            const to = item.to;
            const angle = item.rotation * t;
            const fromCp = item.fromCp;
            const toCp = item.toCp;
            const sa = Math.sin(angle);
            const ca = Math.cos(angle);

            lerp(newCp, fromCp, toCp, t);

            for (let m = 0; m < from.length; m += 2) {
                const x0 = from[m];
                const y0 = from[m + 1];
                const x1 = to[m];
                const y1 = to[m + 1];

                const x = x0 * onet + x1 * t;
                const y = y0 * onet + y1 * t;

                tmpArr[m] = (x * ca - y * sa) + newCp[0];
                tmpArr[m + 1] = (x * sa + y * ca) + newCp[1];
            }

            let x0 = tmpArr[0];
            let y0 = tmpArr[1];

            path.moveTo(x0, y0);

            for (let m = 2; m < from.length;) {
                const x1 = tmpArr[m++];
                const y1 = tmpArr[m++];
                const x2 = tmpArr[m++];
                const y2 = tmpArr[m++];
                const x3 = tmpArr[m++];
                const y3 = tmpArr[m++];

                // Is a line.
                if (x0 === x1 && y0 === y1 && x2 === x3 && y2 === y3) {
                    path.lineTo(x3, y3);
                }
                else {
                    path.bezierCurveTo(x1, y1, x2, y2, x3, y3);
                }
                x0 = x3;
                y0 = y3;
            }
        }
    } });
}

/**
 * Morphing from old path to new path.
 */
export function morphPath(
    fromPath: Path,
    toPath: Path,
    animationOpts: ElementAnimateConfig
): Path {
    if (!fromPath || !toPath) {
        return toPath;
    }

    const oldDone = animationOpts.done;
    // const oldAborted = animationOpts.aborted;
    const oldDuring = animationOpts.during;

    prepareMorphPath(fromPath, toPath);

    (toPath as MorphingPath).__morphT = 0;

    function restoreToPath() {
        restoreMethod(toPath, 'buildPath');
        restoreMethod(toPath, 'updateTransform');
        restoreMethod(fromPath, 'updateTransform');
        // Mark as not in morphing
        (toPath as MorphingPath).__morphT = -1;
        // Cleanup.
        toPath.createPathProxy();
        toPath.dirtyShape();
    }

    toPath.animateTo({
        __morphT: 1
    } as any, defaults({
        during(p) {
            toPath.dirtyShape();
            oldDuring && oldDuring(p);
        },
        done() {
            restoreToPath();
            oldDone && oldDone();
        }
        // NOTE: Don't do restore if aborted.
        // Because all status was just set when animation started.
        // aborted() {
        //     oldAborted && oldAborted();
        // }
    } as ElementAnimateConfig, animationOpts));

    return toPath;
}

export interface DividePathParams {
    path: Path,
    count: number
};
interface DividePath {
    (params: DividePathParams): Path[]
}

function defaultDividePath(param: DividePathParams) {
    return split(param.path, param.count);
}
export interface CombineConfig extends ElementAnimateConfig {
    /**
     * Transform of returned will be ignored.
     */
    dividePath?: DividePath
}
/**
 * Make combine morphing from many paths to one.
 * Will return a group to replace the original path.
 */
export function combineMorph(
    fromList: (CombineMorphingPath | Path)[],
    toPath: Path,
    animationOpts: CombineConfig
) {
    const fromPathList: Path[] = [];

    function addFromPath(fromList: Element[]) {
        for (let i = 0; i < fromList.length; i++) {
            const from = fromList[i];
            if (isCombineMorphing(from)) {
                addFromPath((from as GroupLike).childrenRef());
            }
            else if (from instanceof Path) {
                fromPathList.push(from);
            }
        }
    }
    addFromPath(fromList);

    const separateCount = fromPathList.length;

    // fromPathList.length is 0.
    if (!separateCount) {
        return;
    }

    const dividePath = animationOpts.dividePath || defaultDividePath;

    const toSubPathList = dividePath({
        path: toPath, count: separateCount
    });
    assert(toSubPathList.length === separateCount);

    const oldDone = animationOpts.done;
    // const oldAborted = animationOpts.aborted;
    const oldDuring = animationOpts.during;

    const identityTransform = new Transformable();
    for (let i = 0; i < separateCount; i++) {
        const from = fromPathList[i];
        const to = toSubPathList[i];
        to.parent = toPath as unknown as Group;

        // Ignore set transform in each subpath.
        to.copyTransform(identityTransform);

        prepareMorphPath(from, to);
    }

    (toPath as CombineMorphingPath).__isCombineMorphing = true;
    (toPath as CombineMorphingPath).childrenRef = function () {
        return toSubPathList;
    };

    function addToSubPathListToZr(zr: ZRenderType) {
        for (let i = 0; i < toSubPathList.length; i++) {
            toSubPathList[i].addSelfToZr(zr);
        }
    }
    saveAndModifyMethod(toPath, 'addSelfToZr', {
        after(zr) {
            addToSubPathListToZr(zr);
        }
    });
    saveAndModifyMethod(toPath, 'removeSelfFromZr', {
        after(zr) {
            for (let i = 0; i < toSubPathList.length; i++) {
                toSubPathList[i].removeSelfFromZr(zr);
            }
        }
    });

    function restoreToPath() {
        (toPath as CombineMorphingPath).__isCombineMorphing = false;
        // Mark as not in morphing
        (toPath as MorphingPath).__morphT = -1;
        (toPath as CombineMorphingPath).childrenRef = null;

        restoreMethod(toPath, 'addSelfToZr');
        restoreMethod(toPath, 'removeSelfFromZr');

        for (let i = 0; i < fromList.length; i++) {
            restoreMethod(fromList[i], 'updateTransform');
        }
    }

    (toPath as MorphingPath).__morphT = 0;
    toPath.animateTo({
        __morphT: 1
    } as any, defaults({
        during(p) {
            for (let i = 0; i < toSubPathList.length; i++) {
                const child = toSubPathList[i] as MorphingPath;
                child.__morphT = (toPath as MorphingPath).__morphT;
                child.dirtyShape();
            }
            oldDuring && oldDuring(p);
        },
        done() {
            restoreToPath();
            oldDone && oldDone();
        }
        // NOTE: Don't do restore if aborted.
        // Because all status was just set when animation started.
        // aborted() {
        //     oldAborted && oldAborted();
        // }
    } as ElementAnimateConfig, animationOpts));

    if (toPath.__zr) {
        addToSubPathListToZr(toPath.__zr);
    }

    return {
        fromIndividuals: fromPathList,
        toIndividuals: toSubPathList,
        count: toSubPathList.length
    };
}
export interface SeparateConfig extends ElementAnimateConfig {
    dividePath?: DividePath
    // // If the from path of separate animation is doing combine animation.
    // // And the paths number is not same with toPathList. We need to do enter/leave animation
    // // on the missing/spare paths.
    // enter?: (el: Path) => void
    // leave?: (el: Path) => void
}

/**
 * Make separate morphing from one path to many paths.
 * Make the MorphingKind of `toPath` become `'ONE_ONE'`.
 */
export function separateMorph(
    fromPath: Path,
    toPathList: Path[],
    animationOpts: SeparateConfig
) {
    const toLen = toPathList.length;
    let fromPathList: Path[] = [];

    const dividePath = animationOpts.dividePath || defaultDividePath;

    function addFromPath(fromList: Element[]) {
        for (let i = 0; i < fromList.length; i++) {
            const from = fromList[i];
            if (isCombineMorphing(from)) {
                addFromPath((from as GroupLike).childrenRef());
            }
            else if (from instanceof Path) {
                fromPathList.push(from);
            }
        }
    }
    // This case most happen when a combining path is called to reverse the animation
    // to its original separated state.
    if (isCombineMorphing(fromPath)) {
        addFromPath(fromPath.childrenRef());

        const fromLen = fromPathList.length;
        if (fromLen !== toLen) {
            if (fromLen < toLen) {
                let k = 0;
                for (let i = fromLen; i < toLen; i++) {
                    // Create a clone
                    fromPathList.push(clonePath(fromPathList[k++ % fromLen]));
                }
            }
            // Else simply remove.
        }

        fromPathList.length = toLen;
    }
    else {
        fromPathList = dividePath({ path: fromPath, count: toLen });
        for (let i = 0; i < fromPathList.length; i++) {
            // Use transform of source path.
            fromPathList[i].copyTransform(fromPath);
        }
        assert(fromPathList.length === toLen);
    }

    for (let i = 0; i < toLen; i++) {
        morphPath(fromPathList[i], toPathList[i], animationOpts);
    }

    return {
        fromIndividuals: fromPathList,
        toIndividuals: toPathList,
        count: toPathList.length
    };
}