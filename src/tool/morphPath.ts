import PathProxy from '../core/PathProxy';
import { cubicSubdivide } from '../core/curve';
import Path from '../graphic/Path';
import { ElementAnimateConfig } from '../Element';
import { extend, defaults } from '../core/util';
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
        const delta = endAngle - startAngle;
        const len = Math.tan(delta / 4) * 4 / 3;

        const c1 = Math.cos(startAngle);
        const s1 = Math.sin(startAngle);
        const c2 = Math.cos(endAngle);
        const s2 = Math.sin(endAngle);

        const x1 = c1 * rx + cx;
        const y1 = s1 * ry + cy;

        const x4 = c2 * rx + cx;
        const y4 = s2 * ry + cy;

        const hx = rx * len;
        const hy = ry * len;
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

                xi = Math.cos(endAngle) * rx + cx;
                yi = Math.sin(endAngle) * ry + cy;
                if (isFirst) {
                    // 直接使用 arc 命令
                    // 第一个命令起点还未定义
                    x0 = x1;
                    y0 = y1;
                    createNewSubpath(x0, y0);
                }
                // Connect a line between current point to arc start point.
                addLine(x0, y0, x1, y1);

                const minAngle = Math.min(startAngle, endAngle);
                const maxAngle = Math.max(startAngle, endAngle);
                const step = Math.PI / 2;

                for (let angle = minAngle; angle < maxAngle; angle += step) {
                    addArc(angle, Math.min(angle + step, maxAngle), cx, cy, rx, ry);
                }

                break;
            case CMD.R:
                x0 = xi = data[i++];
                y0 = yi = data[i++];
                x1 = x0 + data[i++];
                y1 = y0 + data[i++];

                // rect is an individual path.
                createNewSubpath(x0, y0);
                addLine(x0, y0, x1, y0);
                addLine(x1, y0, x1, y1);
                addLine(x1, y1, x0, y1);
                addLine(x0, y1, x0, y0);
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

function createSubpath(otherSubpath: number[]) {
    const len = otherSubpath.length;
    const lastX = otherSubpath[len - 2];
    const lastY = otherSubpath[len - 1];

    const newSubpath: number[] = [];
    for (let i = 0; i < len;) {
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
            newSubpath1 = createSubpath(lastSubpath1 || subpath2);
        }
        else if (!subpath2) {
            newSubpath2 = createSubpath(lastSubpath2 || subpath1);
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
    fromPath.buildPath(fromPath.path, fromPath.shape);
    toPath.buildPath(toPath.path, toPath.shape);

    const [fromBezierCurves, toBezierCurves] =
        alignBezierCurves(pathToBezierCurves(fromPath.path), pathToBezierCurves(toPath.path));

    const oldBuildPath = toPath.buildPath;

    const morphingPath = toPath as MorphingPath;
    morphingPath.buildPath = function (path: PathProxy, shape: unknown) {
        const t = morphingPath.__morphT;
        const onet = 1 - t;
        for (let i = 0; i < fromBezierCurves.length; i++) {
            const a = fromBezierCurves[i];
            const b = toBezierCurves[i];

            for (let m = 0, n = 0; m < a.length;) {
                if (m === 0) {
                    path.moveTo(
                        a[m++] * onet + b[n++] * t, a[m++] * onet + b[n++] * t
                    );
                }
                path.bezierCurveTo(
                    a[m++] * onet + b[n++] * t, a[m++] * onet + b[n++] * t,
                    a[m++] * onet + b[n++] * t, a[m++] * onet + b[n++] * t,
                    a[m++] * onet + b[n++] * t, a[m++] * onet + b[n++] * t
                )
            }
        }
    };
    (morphingPath as MorphingPath).__morphT = 0;

    const oldDone = animationOpts && animationOpts.done;
    const oldAborted = animationOpts.aborted && animationOpts.aborted;

    morphingPath.animateTo({
        __morphT: 1
    } as any, defaults({
        done() {
            morphingPath.buildPath = oldBuildPath;
            // Cleanup.
            morphingPath.createPathProxy();
            morphingPath.buildPath(morphingPath.path, morphingPath.shape);
            oldDone && oldDone();
        },
        aborted() {
            morphingPath.buildPath = oldBuildPath;
            oldAborted && oldAborted();
        }
    } as ElementAnimateConfig, animationOpts));

    return toPath;
}