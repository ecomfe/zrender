import PathProxy from '../core/PathProxy';
import { cubicSubdivide } from '../core/curve';
import Path from '../graphic/Path';
import { ElementAnimateConfig } from '../Element';
import { extend, defaults } from '../core/util';
import { lerp, max } from '../core/vector';
const CMD = PathProxy.CMD;

function aroundEqual(a: number, b: number) {
    return Math.abs(a - b) < 1e-5;
}

export function pathToBezierCurves(path: PathProxy) {

    const data = path.data;

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

    let x1, y1, x2, y2;

    for (let i = 0; i < data.length;) {
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

                const step = (anticlockwise? -1 : 1) * Math.PI / 2;

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
    __morphT: number
    __oldBuildPath: Path['buildPath']
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
 * If we interpolating between two bezier curve arrays.
 * It will have many broken effects during the transition.
 * So we try to apply an extra rotation which can make each bezier curve morph as small as possible.
 */
function findBestMorphingRotation(
    fromArr: number[][],
    toArr: number[][],
    iteration: number
): {
    from: number[]
    to: number[]
    fromCp: number[]
    toCp: number[]
    rotation: number
}[] {

    const step = Math.PI * 2 / iteration;

    const result = [];

    // TODO shift points.

    let fromNeedsReverse: boolean;

    for (let i = 0; i < fromArr.length; i++) {
        const fromSubpathBezier = fromArr[i];
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
        for (let k = 0; k < len; k += 2) {
            const x = fromSubpathBezier[k] - fromCp[0];
            const y = fromSubpathBezier[k + 1] - fromCp[1];
            if (fromNeedsReverse) {
                // Make sure clockwise
                newFromSubpathBezier[len - k - 2] = x;
                newFromSubpathBezier[len - k - 1] = y;
            }
            else {
                newFromSubpathBezier[k] = x;
                newFromSubpathBezier[k + 1] = y;
            }
        }

        for (let angle = -Math.PI; angle <= Math.PI; angle += step) {
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
 * new path will be kept and rendered.
 */
export function morphPath(fromPath: Path, toPath: Path, animationOpts: ElementAnimateConfig) {
    if (!fromPath.path) {
        fromPath.createPathProxy();
    }
    if (!toPath.path) {
        toPath.createPathProxy();
    }
    fromPath.path.beginPath();
    fromPath.buildPath(fromPath.path, fromPath.shape);
    toPath.path.beginPath();
    toPath.buildPath(toPath.path, toPath.shape);

    const [fromBezierCurves, toBezierCurves] =
        alignBezierCurves(pathToBezierCurves(fromPath.path), pathToBezierCurves(toPath.path));

    const morphingData = findBestMorphingRotation(
        fromBezierCurves, toBezierCurves, 30
    );

    const morphingPath = toPath as MorphingPath;

    if (!morphingPath.__oldBuildPath) {
        morphingPath.__oldBuildPath = morphingPath.buildPath;
    }

    let tmpArr: number[] = [];
    morphingPath.buildPath = function (path: PathProxy, shape: unknown) {
        const t = morphingPath.__morphT;
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
                )
            }
        }
    };
    (morphingPath as MorphingPath).__morphT = 0;

    const oldDone = animationOpts && animationOpts.done;
    const oldAborted = animationOpts && animationOpts.aborted;
    const oldDuring = animationOpts && animationOpts.during;

    morphingPath.animateTo({
        __morphT: 1
    } as any, defaults({
        during(p) {
            morphingPath.dirtyShape();
            oldDuring && oldDuring(p);
        },
        done() {
            // Restore
            morphingPath.buildPath = morphingPath.__oldBuildPath;
            morphingPath.__oldBuildPath = null;
            // Cleanup.
            morphingPath.createPathProxy();
            morphingPath.dirtyShape();
            oldDone && oldDone();
        },
        aborted() {
            oldAborted && oldAborted();
        }
    } as ElementAnimateConfig, animationOpts));

    return toPath;
}