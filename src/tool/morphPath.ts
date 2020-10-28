import PathProxy from '../core/PathProxy';
import { cubicSubdivide } from '../core/curve';
import Path from '../graphic/Path';
import Element, { ElementAnimateConfig } from '../Element';
import { defaults, assert, noop, clone } from '../core/util';
import { lerp } from '../core/vector';
import Rect from '../graphic/shape/Rect';
import Sector from '../graphic/shape/Sector';
import { ZRenderType } from '../zrender';
import Group from '../graphic/Group';

const CMD = PathProxy.CMD;
const PI2 = Math.PI * 2;

const PROP_XY = ['x', 'y'] as const;
const PROP_WH = ['width', 'height'] as const;

const tmpArr: number[] = [];


interface CombiningPath extends Path {
    __combiningSubList: Path[];
    __oldAddSelfToZr: Element['addSelfToZr'];
    __oldRemoveSelfFromZr: Element['removeSelfFromZr'];
    __oldBuildPath: Path['buildPath'];
    // See `Stroage['_updateAndAddDisplayable']`
    childrenRef(): Path[];
}

export type MorphDividingMethod = 'split' | 'duplicate';

export interface CombineSeparateConfig extends ElementAnimateConfig {
    dividingMethod?: MorphDividingMethod;
}

export interface CombineSeparateResult {
    // The length of `fromIndividuals`, `toIndividuals`
    // are the same as `count`.
    fromIndividuals: Path[];
    toIndividuals: Path[];
    count: number;
}

function aroundEqual(a: number, b: number) {
    return Math.abs(a - b) < 1e-5;
}

export function pathToBezierCurves(path: PathProxy) {

    const data = path.data;
    const len = path.len();

    const bezierArray: number[][] = [];
    let currentSubpath: number[];

    let xi = 0;
    let yi = 0;
    let x0 = 0;
    let y0 = 0;

    function createNewSubpath(x: number, y: number) {
        // More than one M command
        if (currentSubpath && currentSubpath.length > 2) {
            bezierArray.push(currentSubpath);
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
        bezierArray.push(currentSubpath);
    }

    return bezierArray;
}

function alignSubpath(subpath1: number[], subpath2: number[]): [number[], number[]] {
    const len1 = subpath1.length;
    const len2 = subpath2.length;
    if (len1 === len2) {
        return [subpath1, subpath2];
    }

    const shorterPath = len1 < len2 ? subpath1 : subpath2;
    const shorterLen = Math.min(len1, len2);
    // Should divide excatly
    const diff = Math.abs(len2 - len1) / 6;
    const shorterBezierCount = (shorterLen - 2) / 6;
    // Add `diff` number of beziers
    const eachCurveSubDivCount = Math.ceil(diff / shorterBezierCount) + 1;

    const newSubpath = [shorterPath[0], shorterPath[1]];
    let remained = diff;

    const tmpSegX: number[] = [];
    const tmpSegY: number[] = [];

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
    __oldBuildPath: Path['buildPath'];
    __morphingData: MorphingData;
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

/**
 * Morphing from old path to new path.
 */
export function morphPath(
    // `fromPath` only provides the current path state, which will
    // not be rendered or kept.
    // Note:
    // should be able to handle `isIndividualMorphingPath(fromPath)` is `ture`.
    fromPath: Path,
    // `toPath` is the target path that will be rendered and kept.
    // Note:
    // (1) `toPath` and `fromPath` might be the same.
    // e.g., when triggering the same transition repeatly.
    // (2) should be able to handle `isIndividualMorphingPath(toPath)` is `ture`.
    toPath: Path,
    animationOpts: ElementAnimateConfig
): Path {
    let fromPathProxy: PathProxy;
    let toPathProxy: PathProxy;

    if (!fromPath || !toPath) {
        return toPath;
    }

    // Calculate the current path into `fromPathProxy` from `fromPathInput`.
    !fromPath.path && fromPath.createPathProxy();
    fromPathProxy = fromPath.path;
    fromPathProxy.beginPath();
    fromPath.buildPath(fromPathProxy, fromPath.shape);

    // Calculate the target path into `toPathProxy` from `toPath`.
    !toPath.path && toPath.createPathProxy();
    toPathProxy = toPath.path;
    // From and to might be the same path.
    toPathProxy === fromPathProxy && (toPathProxy = new PathProxy(false));
    toPathProxy.beginPath();
    // toPath should always calculate the final state rather than morphing state.
    if (isIndividualMorphingPath(toPath)) {
        toPath.__oldBuildPath(toPathProxy, toPath.shape);
    }
    else {
        toPath.buildPath(toPathProxy, toPath.shape);
    }

    const [fromBezierCurves, toBezierCurves] =
        alignBezierCurves(pathToBezierCurves(fromPathProxy), pathToBezierCurves(toPathProxy));

    const morphingData = findBestMorphingRotation(fromBezierCurves, toBezierCurves, 10, Math.PI);
    becomeIndividualMorphingPath(toPath, morphingData, 0);

    const oldDone = animationOpts && animationOpts.done;
    const oldAborted = animationOpts && animationOpts.aborted;
    const oldDuring = animationOpts && animationOpts.during;

    toPath.animateTo({
        __morphT: 1
    } as any, defaults({
        during(p) {
            toPath.dirtyShape();
            oldDuring && oldDuring(p);
        },
        done() {
            restoreIndividualMorphingPath(toPath);
            // Cleanup.
            toPath.createPathProxy();
            toPath.dirtyShape();
            oldDone && oldDone();
        },
        aborted() {
            oldAborted && oldAborted();
        }
    } as ElementAnimateConfig, animationOpts));

    return toPath;
}

function morphingPathBuildPath(
    this: Pick<MorphingPath, '__morphT' | '__morphingData'>,
    path: PathProxy
): void {
    const morphingData = this.__morphingData;
    const t = this.__morphT;
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

        for (let m = 0; m < from.length;) {
            if (m === 0) {
                path.moveTo(tmpArr[m++], tmpArr[m++]);
            }
            path.bezierCurveTo(
                tmpArr[m++], tmpArr[m++],
                tmpArr[m++], tmpArr[m++],
                tmpArr[m++], tmpArr[m++]
            );
        }
    }
};

function becomeIndividualMorphingPath(
    path: Path,
    morphingData: MorphingData,
    morphT: number
): void {
    if (isIndividualMorphingPath(path)) {
        updateIndividualMorphingPath(path, morphingData, morphT);
        return;
    }

    const morphingPath = path as MorphingPath;
    morphingPath.__oldBuildPath = morphingPath.buildPath;
    morphingPath.buildPath = morphingPathBuildPath;
    updateIndividualMorphingPath(morphingPath, morphingData, morphT);
}

function updateIndividualMorphingPath(
    morphingPath: MorphingPath,
    morphingData: MorphingData,
    morphT: number
): void {
    morphingPath.__morphingData = morphingData;
    morphingPath.__morphT = morphT;
}

function restoreIndividualMorphingPath(path: Path): void {
    if (isIndividualMorphingPath(path)) {
        path.buildPath = path.__oldBuildPath;
        path.__oldBuildPath = path.__morphingData = null;
    }
}

function isIndividualMorphingPath(path: Path): path is MorphingPath {
    return (path as MorphingPath).__oldBuildPath != null;
}

export function isCombiningPath(path: Path): path is CombiningPath {
    return !!(path as CombiningPath).__combiningSubList;
}

export function isInAnyMorphing(path: Path): boolean {
    return isIndividualMorphingPath(path) || isCombiningPath(path);
}


/**
 * Make combining morphing from many paths to one.
 * Make the MorphingKind of `toPath` become `'COMBINING'`.
 */
export function combine(
    fromPathList: Path[],
    toPath: Path,
    animationOpts: CombineSeparateConfig,
    copyPropsIfDivided?: (srcPath: Path, tarPath: Path, needClone: boolean) => void
): CombineSeparateResult {

    const fromIndividuals: Path[] = [];
    let separateCount = 0;
    for (let i = 0; i < fromPathList.length; i++) {
        const fromPath = fromPathList[i];
        if (isCombiningPath(fromPath)) {
            // If fromPath is combining, use the combineFromList as the from.
            const fromCombiningSubList = fromPath.__combiningSubList;
            for (let j = 0; j < fromCombiningSubList.length; j++) {
                fromIndividuals.push(fromCombiningSubList[j]);
            }
            separateCount += fromCombiningSubList.length;
        }
        else {
            fromIndividuals.push(fromPath);
            separateCount++;
        }
    }

    // fromPathList.length is 0.
    if (!separateCount) {
        return;
    }

    // PENDING: more separate strategies other than `divideShape`?
    const dividingMethod = animationOpts ? animationOpts.dividingMethod : null;
    const toPathSplittedList = divideShape(toPath, separateCount, dividingMethod);
    assert(toPathSplittedList.length === separateCount);

    const oldDone = animationOpts && animationOpts.done;
    const oldAborted = animationOpts && animationOpts.aborted;
    const oldDuring = animationOpts && animationOpts.during;

    let doneCount = 0;
    let abortedCalled = false;
    const morphAnimationOpts = defaults({
        during(p) {
            oldDuring && oldDuring(p);
        },
        done() {
            doneCount++;
            if (doneCount === toPathSplittedList.length) {
                restoreCombiningPath(toPath);
                oldDone && oldDone();
            }
        },
        aborted() {
            // PENDING: is it logically correct?
            if (!abortedCalled) {
                abortedCalled = true;
                oldAborted && oldAborted();
            }
        }
    } as ElementAnimateConfig, animationOpts);

    for (let i = 0; i < separateCount; i++) {
        const from = fromIndividuals[i];
        const to = toPathSplittedList[i];
        copyPropsIfDivided && copyPropsIfDivided(toPath, to, true);
        morphPath(from, to, morphAnimationOpts);
    }

    becomeCombiningPath(toPath, toPathSplittedList);

    return {
        fromIndividuals: fromIndividuals,
        toIndividuals: toPathSplittedList,
        count: separateCount
    };
}


// PENDING: This is NOT a good implementation to decorate path methods.
// Potential flaw: when get path by `group.childAt(i)`,
// it might return the `combiningSubList` group, which is not expected.
// Probably this feature should be implemented same as the way of rich text?
function becomeCombiningPath(path: Path, combiningSubList: Path[]): void {
    if (isCombiningPath(path)) {
        updateCombiningPathSubList(path, combiningSubList);
        return;
    }

    const combiningPath = path as CombiningPath;

    updateCombiningPathSubList(combiningPath, combiningSubList);

    // PENDING: Too tricky. error-prone.
    // Decorate methods. Do not do it repeatly.
    combiningPath.__oldAddSelfToZr = path.addSelfToZr;
    combiningPath.__oldRemoveSelfFromZr = path.removeSelfFromZr;
    combiningPath.addSelfToZr = combiningAddSelfToZr;
    combiningPath.removeSelfFromZr = combiningRemoveSelfFromZr;
    combiningPath.__oldBuildPath = combiningPath.buildPath;
    combiningPath.buildPath = noop;
    combiningPath.childrenRef = combiningChildrenRef;

    // PENDING: bounding rect?
}

function restoreCombiningPath(path: Path): void {
    if (!isCombiningPath(path)) {
        return;
    }

    const combiningPath = path as CombiningPath;

    updateCombiningPathSubList(combiningPath, null);

    combiningPath.addSelfToZr = combiningPath.__oldAddSelfToZr;
    combiningPath.removeSelfFromZr = combiningPath.__oldRemoveSelfFromZr;
    combiningPath.buildPath = combiningPath.__oldBuildPath;
    combiningPath.childrenRef =
        combiningPath.__combiningSubList =
        combiningPath.__oldAddSelfToZr =
        combiningPath.__oldRemoveSelfFromZr =
        combiningPath.__oldBuildPath = null;
}

function updateCombiningPathSubList(
    combiningPath: CombiningPath,
    // Especially, `combiningSubList` is null/undefined means that remove sub list.
    combiningSubList: Path[]
): void {
    if (combiningPath.__combiningSubList !== combiningSubList) {
        combiningPathSubListAddRemoveWithZr(combiningPath, 'removeSelfFromZr');
        combiningPath.__combiningSubList = combiningSubList;
        if (combiningSubList) {
            for (let i = 0; i < combiningSubList.length; i++) {
                // Tricky: make `updateTransform` work in `Transformable`. The parent can only be Group.
                combiningSubList[i].parent = combiningPath as unknown as Group;
            }
        }
        combiningPathSubListAddRemoveWithZr(combiningPath, 'addSelfToZr');
    }
}

function combiningAddSelfToZr(this: CombiningPath, zr: ZRenderType): void {
    this.__oldAddSelfToZr(zr);
    combiningPathSubListAddRemoveWithZr(this, 'addSelfToZr');
}

function combiningPathSubListAddRemoveWithZr(
    path: CombiningPath,
    method: 'addSelfToZr' | 'removeSelfFromZr'
): void {
    const combiningSubList = path.__combiningSubList;
    const zr = path.__zr;
    if (combiningSubList && zr) {
        for (let i = 0; i < combiningSubList.length; i++) {
            const child = combiningSubList[i];
            child[method](zr);
        }
    }
}

function combiningRemoveSelfFromZr(this: CombiningPath, zr: ZRenderType): void {
    this.__oldRemoveSelfFromZr(zr);
    const combiningSubList = this.__combiningSubList;
    for (let i = 0; i < combiningSubList.length; i++) {
        const child = combiningSubList[i];
        child.removeSelfFromZr(zr);
    }
}

function combiningChildrenRef(this: CombiningPath): Path[] {
    return this.__combiningSubList;
}


/**
 * Make separate morphing from one path to many paths.
 * Make the MorphingKind of `toPath` become `'ONE_ONE'`.
 */
export function separate(
    fromPath: Path,
    toPathList: Path[],
    animationOpts: CombineSeparateConfig,
    copyPropsIfDivided?: (srcPath: Path, tarPath: Path, needClone: boolean) => void
): CombineSeparateResult {
    const toPathListLen = toPathList.length;
    let fromPathList: Path[];
    const dividingMethod = animationOpts ? animationOpts.dividingMethod : null;
    let copyProps = false;

    // This case most happen when a combining path is called to reverse the animation
    // to its original separated state.
    if (isCombiningPath(fromPath)) {
        // [CATEAT]:
        // do not `restoreCombiningPath`, because it will cause the sub paths been removed
        // from its host, so that the original "global transform" can not be gotten any more.

        const fromCombiningSubList = fromPath.__combiningSubList;
        if (fromCombiningSubList.length === toPathListLen) {
            fromPathList = fromCombiningSubList;
        }
        // The fromPath is a `CombiningPath` and its combiningSubCount is different from toPathList.length
        // At present we do not make "continuous" animation for this case. It's might bring complicated logic.
        else {
            fromPathList = divideShape(fromPath, toPathListLen, dividingMethod);
            copyProps = true;
        }
    }
    else {
        fromPathList = divideShape(fromPath, toPathListLen, dividingMethod);
        copyProps = true;
    }

    assert(fromPathList.length === toPathListLen);
    for (let i = 0; i < toPathListLen; i++) {
        if (copyProps && copyPropsIfDivided) {
            copyPropsIfDivided(fromPath, fromPathList[i], false);
        }
        morphPath(fromPathList[i], toPathList[i], animationOpts);
    }

    return {
        fromIndividuals: fromPathList,
        toIndividuals: toPathList,
        count: toPathListLen
    };
}


/**
 * TODO: triangulate separate
 *
 * @return Never be null/undefined, may empty [].
 */
function divideShape(
    path: Path,
    separateCount: number,
    // By default 'split'.
    dividingMethod?: MorphDividingMethod
): Path[] {
    return dividingMethod === 'duplicate'
        ? duplicateShape(path, separateCount)
        : splitShape(path, separateCount);
}

/**
 * @return Never be null/undefined, may empty [].
 */
function splitShape(
    path: Path,
    separateCount: number
): Path[] {
    const resultPaths: Path[] = [];
    if (separateCount <= 0) {
        return resultPaths;
    }
    if (separateCount === 1) {
        return duplicateShape(path, separateCount);
    }

    if (path instanceof Rect) {
        const toPathShape = path.shape;
        const splitPropIdx = toPathShape.height > toPathShape.width ? 1 : 0;
        const propWH = PROP_WH[splitPropIdx];
        const propXY = PROP_XY[splitPropIdx];
        const subWH = toPathShape[propWH] / separateCount;
        let xyCurr = toPathShape[propXY];

        for (let i = 0; i < separateCount; i++, xyCurr += subWH) {
            const subShape = {
                x: toPathShape.x,
                y: toPathShape.y,
                width: toPathShape.width,
                height: toPathShape.height
            };
            subShape[propXY] = xyCurr;
            subShape[propWH] = i < separateCount - 1
                ? subWH
                : toPathShape[propXY] + toPathShape[propWH] - xyCurr;
            const splitted = new Rect({ shape: subShape });
            resultPaths.push(splitted);
        }
    }
    else if (path instanceof Sector) {
        const toPathShape = path.shape;
        const clockwise = toPathShape.clockwise;
        const startAngle = toPathShape.startAngle;
        const endAngle = toPathShape.endAngle;
        const endAngleNormalized = normalizeRadian(startAngle, toPathShape.endAngle, clockwise);
        const step = (endAngleNormalized - startAngle) / separateCount;
        let angleCurr = startAngle;
        for (let i = 0; i < separateCount; i++, angleCurr += step) {
            const splitted = new Sector({
                shape: {
                    cx: toPathShape.cx,
                    cy: toPathShape.cy,
                    r: toPathShape.r,
                    r0: toPathShape.r0,
                    clockwise: clockwise,
                    startAngle: angleCurr,
                    endAngle: i === separateCount - 1 ? endAngle : angleCurr + step
                }
            });
            resultPaths.push(splitted);
        }
    }
    // TODO: triangulate path and split.
    // And should consider path is morphing.
    else {
        return duplicateShape(path, separateCount);
    }

    return resultPaths;
}

/**
 * @return Never be null/undefined, may empty [].
 */
function duplicateShape(
    path: Path,
    separateCount: number
): Path[] {
    const resultPaths: Path[] = [];
    if (separateCount <= 0) {
        return resultPaths;
    }
    const ctor = path.constructor;
    for (let i = 0; i < separateCount; i++) {
        const sub = new (ctor as any)({
            shape: clone(path.shape)
        });
        resultPaths.push(sub);
    }
    return resultPaths;
}

/**
 * If `clockwise`, normalize the `end` to the interval `[start, start + 2 * PI)` and return.
 * else, normalize the `end` to the interval `(start - 2 * PI, start]` and return.
 */
function normalizeRadian(start: number, end: number, clockwise: boolean): number {
    return end + PI2 * (
        Math[clockwise ? 'ceil' : 'floor']((start - end) / PI2)
    );
}
