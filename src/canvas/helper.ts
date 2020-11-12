import { LinearGradientObject } from '../graphic/LinearGradient';
import { RadialGradientObject } from '../graphic/RadialGradient';
import { GradientObject } from '../graphic/Gradient';
import { RectLike } from '../core/BoundingRect';
import Path from '../graphic/Path';

export function createLinearGradient(
    this: void,
    ctx: CanvasRenderingContext2D,
    obj: LinearGradientObject,
    rect: RectLike
) {
    let x = obj.x == null ? 0 : obj.x;
    let x2 = obj.x2 == null ? 1 : obj.x2;
    let y = obj.y == null ? 0 : obj.y;
    let y2 = obj.y2 == null ? 0 : obj.y2;

    if (!obj.global) {
        x = x * rect.width + rect.x;
        x2 = x2 * rect.width + rect.x;
        y = y * rect.height + rect.y;
        y2 = y2 * rect.height + rect.y;
    }

    // Fix NaN when rect is Infinity
    x = isNaN(x) ? 0 : x;
    x2 = isNaN(x2) ? 1 : x2;
    y = isNaN(y) ? 0 : y;
    y2 = isNaN(y2) ? 0 : y2;

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

    let x = obj.x == null ? 0.5 : obj.x;
    let y = obj.y == null ? 0.5 : obj.y;
    let r = obj.r == null ? 0.5 : obj.r;
    if (!obj.global) {
        x = x * width + rect.x;
        y = y * height + rect.y;
        r = r * min;
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