import { LinearGradientObject } from '../graphic/LinearGradient';
import { RadialGradientObject } from '../graphic/RadialGradient';
import { GradientObject } from '../graphic/Gradient';
import { RectLike } from '../core/BoundingRect';
import Path from '../graphic/Path';

export function safeNum(num: number, defalutNum: number = 0, negative = false) {
    // null NaN or empty string
    if (num === null || isNaN(num) || `${num}` === '') {
        return defalutNum;
    }
    // non-negative
    if (negative && num < 0) {
        return defalutNum;
    }
    return +num;
}

export function createLinearGradient(
    this: void,
    ctx: CanvasRenderingContext2D,
    obj: LinearGradientObject,
    rect: RectLike
) {
    let x = safeNum(obj.x, 0);
    let x2 = safeNum(obj.x2, 1);
    let y = safeNum(obj.y, 0);
    let y2 = safeNum(obj.y2, 0);

    if (!obj.global) {
        x = safeNum(x * rect.width + rect.x, 0);
        x2 = safeNum(x2 * rect.width + rect.x, 1);
        y = safeNum(y * rect.height + rect.y, 0);
        y2 = safeNum(y2 * rect.height + rect.y, 0);
    }

    const canvasGradient = ctx.createLinearGradient(x, y, x2, y2);

    return canvasGradient;
}

export function createRadialGradient(
    this: void,
    ctx: CanvasRenderingContext2D,
    obj: RadialGradientObject,
    rect: RectLike
) {
    const width = rect.width;
    const height = rect.height;
    const min = Math.min(width, height);

    let x = safeNum(obj.x, 0.5);
    let y = safeNum(obj.y, 0.5);
    let r = safeNum(obj.r, 0.5, true);

    if (!obj.global) {
        x = safeNum(x * width + rect.x, 0.5);
        y = safeNum(y * height + rect.y, 0.5);
        // r no-negative
        r = safeNum(r * min, 0.5, true);
    }

    const canvasGradient = ctx.createRadialGradient(x, y, 0, x, y, r);

    return canvasGradient;
}

export function getCanvasGradient(this: void, ctx: CanvasRenderingContext2D, obj: GradientObject, rect: RectLike) {
    // TODO Cache?
    const canvasGradient = obj.type === 'radial'
        ? createRadialGradient(ctx, obj as RadialGradientObject, rect)
        : createLinearGradient(ctx, obj as LinearGradientObject, rect);

    const colorStops = obj.colorStops;
    for (let i = 0; i < colorStops.length; i++) {
        canvasGradient.addColorStop(
            colorStops[i].offset, colorStops[i].color
        );
    }
    return canvasGradient;
}

export function isClipPathChanged(clipPaths: Path[], prevClipPaths: Path[]): boolean {
    // displayable.__clipPaths can only be `null`/`undefined` or an non-empty array.
    if (clipPaths === prevClipPaths || (!clipPaths && !prevClipPaths)) {
        return false;
    }
    if (!clipPaths || !prevClipPaths || (clipPaths.length !== prevClipPaths.length)) {
        return true;
    }
    for (let i = 0; i < clipPaths.length; i++) {
        if (clipPaths[i] !== prevClipPaths[i]) {
            return true;
        }
    }
    return false;
}

function parseInt10(val: string) {
    return parseInt(val, 10);
}
export function getSize(
    root: HTMLElement,
    whIdx: number,
    opts: { width?: number | string, height?: number | string}
) {

    const wh = ['width', 'height'][whIdx] as 'width' | 'height';
    const cwh = ['clientWidth', 'clientHeight'][whIdx] as 'clientWidth' | 'clientHeight';
    const plt = ['paddingLeft', 'paddingTop'][whIdx] as 'paddingLeft' | 'paddingTop';
    const prb = ['paddingRight', 'paddingBottom'][whIdx] as 'paddingRight' | 'paddingBottom';

    if (opts[wh] != null && opts[wh] !== 'auto') {
        return parseFloat(opts[wh] as string);
    }

    // IE8 does not support getComputedStyle, but it use VML.
    const stl = document.defaultView.getComputedStyle(root);

    return (
        (root[cwh] || parseInt10(stl[wh]) || parseInt10(root.style[wh]))
        - (parseInt10(stl[plt]) || 0)
        - (parseInt10(stl[prb]) || 0)
    ) | 0;
}