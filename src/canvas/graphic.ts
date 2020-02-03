import Displayable from '../graphic/Displayable';
import PathProxy from '../core/PathProxy';
import { GradientObject } from '../graphic/Gradient';
import Pattern, { PatternObject } from '../graphic/Pattern';
import { LinearGradientObject } from '../graphic/LinearGradient';
import { RadialGradientObject } from '../graphic/RadialGradient';
import { ZRCanvasRenderingContext } from '../core/types';
import BoundingRect from '../core/BoundingRect';
import { createOrUpdateImage, isImageReady } from '../graphic/helper/image';
import { getCanvasGradient } from './helper';
import Path, { PathStyleOption } from '../graphic/Path';
import ZImage, { ImageStyleOption } from '../graphic/Image';
import ZText, {TextStyleOption} from '../graphic/Text';
import { DEFAULT_FONT } from '../contain/text';
import { IncrementalDisplayable } from '../export';
import { MatrixArray } from '../core/matrix';

const pathProxyForDraw = new PathProxy(true);

const getCanvasPattern = Pattern.prototype.getCanvasPattern;

// Draw Path Elements
function brushPath(this: void, ctx: CanvasRenderingContext2D, el: Path) {
    const style = el.style;
    const path = el.path || pathProxyForDraw;
    const hasStroke = el.hasStroke();
    const hasFill = el.hasFill();
    const fill = style.fill;
    const stroke = style.stroke;
    const hasFillGradient = hasFill && !!(fill as GradientObject).colorStops;
    const hasStrokeGradient = hasStroke && !!(stroke as GradientObject).colorStops;
    const hasFillPattern = hasFill && !!(fill as PatternObject).image;
    const hasStrokePattern = hasStroke && !!(stroke as PatternObject).image;

    let fillGradient;
    let strokeGradient;
    if (el.__dirty) {
        let rect;
        // Update gradient because bounding rect may changed
        if (hasFillGradient) {
            rect = rect || el.getBoundingRect();
            fillGradient = getCanvasGradient(ctx, fill as (LinearGradientObject | RadialGradientObject), rect);
        }
        if (hasStrokeGradient) {
            rect = rect || el.getBoundingRect();
            strokeGradient = getCanvasGradient(ctx, stroke as (LinearGradientObject | RadialGradientObject), rect);
        }
    }
    // Use the gradient or pattern
    if (hasFillGradient) {
        // PENDING If may have affect the state
        ctx.fillStyle = fillGradient;
    }
    else if (hasFillPattern) {
        ctx.fillStyle = getCanvasPattern.call(fill, ctx);
    }
    if (hasStrokeGradient) {
        ctx.strokeStyle = strokeGradient;
    }
    else if (hasStrokePattern) {
        ctx.strokeStyle = getCanvasPattern.call(stroke, ctx);
    }

    const lineDash = style.lineDash;
    const lineDashOffset = style.lineDashOffset;

    const ctxLineDash = !!ctx.setLineDash;

    // Update path sx, sy
    const scale = el.getGlobalScale();
    path.setScale(scale[0], scale[1], el.segmentIgnoreThreshold);

    // Proxy context
    // Rebuild path in following 2 cases
    // 1. Path is dirty
    // 2. Path needs javascript implemented lineDash stroking.
    //    In this case, lineDash information will not be saved in PathProxy
    if (el.__dirtyPath
        || (lineDash && !ctxLineDash && hasStroke)
    ) {
        path.beginPath(ctx);

        // Setting line dash before build path
        if (lineDash && !ctxLineDash) {
            path.setLineDash(lineDash);
            path.setLineDashOffset(lineDashOffset);
        }

        el.buildPath(path, el.shape, false);

        // Clear path dirty flag
        if (el.path) {
            el.__dirtyPath = false;
        }
    }
    else {
        // Replay path building
        ctx.beginPath();
        el.path.rebuildPath(ctx);
    }

    if (hasFill) {
        if (style.fillOpacity != null) {
            const originalGlobalAlpha = ctx.globalAlpha;
            ctx.globalAlpha = style.fillOpacity * style.opacity;
            path.fill(ctx);
            ctx.globalAlpha = originalGlobalAlpha;
        }
        else {
            path.fill(ctx);
        }
    }

    if (lineDash && ctxLineDash) {
        ctx.setLineDash(lineDash);
        ctx.lineDashOffset = lineDashOffset;
    }

    if (hasStroke) {
        if (style.strokeOpacity != null) {
            const originalGlobalAlpha = ctx.globalAlpha;
            ctx.globalAlpha = style.strokeOpacity * style.opacity;
            path.stroke(ctx);
            ctx.globalAlpha = originalGlobalAlpha;
        }
        else {
            path.stroke(ctx);
        }
    }

    if (lineDash && ctxLineDash) {
        // PENDING
        // Remove lineDash
        ctx.setLineDash([]);
    }
}

// Draw Image Elements
function brushImage(this: void, ctx: CanvasRenderingContext2D, el: ZImage) {
    const style = el.style;
    const src = style.image as string;

    const image = el.__image = createOrUpdateImage(
        style.image,
        el.__image,
        el,
        el.onload
    );

    if (!image || !isImageReady(image)) {
        return;
    }

    const x = style.x || 0;
    const y = style.y || 0;
    let width = style.width;
    let height = style.height;
    const aspect = image.width / image.height;
    if (width == null && height != null) {
        // Keep image/height ratio
        width = height * aspect;
    }
    else if (height == null && width != null) {
        height = width / aspect;
    }
    else if (width == null && height == null) {
        width = image.width;
        height = image.height;
    }

    if (style.sWidth && style.sHeight) {
        const sx = style.sx || 0;
        const sy = style.sy || 0;
        ctx.drawImage(
            image,
            sx, sy, style.sWidth, style.sHeight,
            x, y, width, height
        );
    }
    else if (style.sx && style.sy) {
        const sx = style.sx;
        const sy = style.sy;
        const sWidth = width - sx;
        const sHeight = height - sy;
        ctx.drawImage(
            image,
            sx, sy, sWidth, sHeight,
            x, y, width, height
        );
    }
    else {
        ctx.drawImage(image, x, y, width, height);
    }
}

// Draw Text Elements
function brushText(this: void, ctx: CanvasRenderingContext2D, el: ZText) {

    const style = el.style;

    let text = style.text;
    // Convert to string
    text != null && (text += '');

    if (text) {
        ctx.font = style.font || DEFAULT_FONT;
        ctx.textAlign = style.textAlign;
        ctx.textBaseline = style.textBaseline;

        ctx.fillText(text, style.x, style.y);
    }
}

const SHADOW_NUMBER_PROPS = ['shadowBlur', 'shadowOffsetX', 'shadowOffsetY'] as const;
const STROKE_PROPS = [
    ['lineCap', 'butt'], ['lineJoin', 'miter'], ['miterLimit', 10]
] as const;
const DRAW_PROPS = [
    ['fill'], ['stroke']
] as const;

type AllStyleOption = PathStyleOption | TextStyleOption | ImageStyleOption;
// type ShadowPropNames = typeof SHADOW_PROPS[number][0];
// type StrokePropNames = typeof STROKE_PROPS[number][0];
// type DrawPropNames = typeof DRAW_PROPS[number][0];

function bindCommonProps(
    this: void,
    ctx: CanvasRenderingContext2D,
    style: AllStyleOption,
    prevStyle: AllStyleOption,
    forceSetAll: boolean
) {
    if (!forceSetAll) {
        prevStyle = prevStyle || {};
    }
    if (forceSetAll || style.opacity !== prevStyle.opacity) {
        ctx.globalAlpha = style.opacity == null ? 1 : style.opacity;
    }
    if (forceSetAll || style.blend !== prevStyle.blend) {
        ctx.globalCompositeOperation = style.blend || 'source-over';
    }
    for (let i = 0; i < SHADOW_NUMBER_PROPS.length; i++) {
        const propName = SHADOW_NUMBER_PROPS[i];
        if (forceSetAll || style[propName] !== prevStyle[propName]) {
            // FIXME Invalid property value will cause style leak from previous element.
            ctx[propName] = (ctx as ZRCanvasRenderingContext).dpr * (style[propName] || 0);
        }
    }
    if (forceSetAll || style.shadowColor !== prevStyle.shadowColor) {
        ctx.shadowColor = style.shadowColor || '#000';
    }
}

function bindPathAndTextCommonStyle(
    this: void,
    ctx: CanvasRenderingContext2D,
    el: ZText | Path,
    prevEl: ZText | Path,
    forceSetAll: boolean
) {
    const style = el.style;
    const prevStyle = forceSetAll
        ? null
        : (prevEl && prevEl.style || {})

    bindCommonProps(ctx, style, prevStyle, forceSetAll);

    if (forceSetAll || style.fill !== prevStyle.fill) {
        ctx.fillStyle = style.fill as string;
    }
    if (forceSetAll || style.stroke !== prevStyle.stroke) {
        ctx.strokeStyle = style.stroke as string;
    }
    if (forceSetAll || style.opacity !== prevStyle.opacity) {
        ctx.globalAlpha = style.opacity == null ? 1 : style.opacity;
    }
    if (el.hasStroke()) {
        const lineWidth = style.lineWidth;
        ctx.lineWidth = lineWidth / (
            (style.strokeNoScale && el && el.getLineScale) ? el.getLineScale() : 1
        );

        for (let i = 0; i < STROKE_PROPS.length; i++) {
            const prop = STROKE_PROPS[i];
            const propName = prop[0];
            if (forceSetAll || style[propName] !== prevStyle[propName]) {
                // FIXME Invalid property value will cause style leak from previous element.
                (ctx as any)[propName] = style[propName] || prop[1];
            }
        }
    }
}

function bindImageStyle(
    this: void,
    ctx: CanvasRenderingContext2D,
    el: ZImage,
    prevEl: ZImage,
    // forceSetAll must be true if prevEl is null
    forceSetAll: boolean
) {
    bindCommonProps(ctx, el.style, prevEl && prevEl.style, forceSetAll);
}

function setContextTransform(ctx: CanvasRenderingContext2D, el: Displayable) {
    const m = el.transform;
    const dpr = (ctx as ZRCanvasRenderingContext).dpr || 1;
    if (m) {
        ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
    }
    else {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
}

function restoreTransform(ctx: CanvasRenderingContext2D) {
    const dpr = (ctx as ZRCanvasRenderingContext).dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}


const tmpRect = new BoundingRect(0, 0, 0, 0);
const viewRect = new BoundingRect(0, 0, 0, 0);
function isDisplayableCulled(el: Displayable, width: number, height: number) {
    tmpRect.copy(el.getBoundingRect());
    if (el.transform) {
        tmpRect.applyTransform(el.transform);
    }
    viewRect.width = width;
    viewRect.height = height;
    return !tmpRect.intersect(viewRect);
}

function isClipPathChanged(clipPaths: Path[], prevClipPaths: Path[]): boolean {
    // displayable.__clipPaths can only be `null`/`undefined` or an non-empty array.
    if (clipPaths === prevClipPaths) {
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

function doClip(clipPaths: Path[], ctx: CanvasRenderingContext2D, scope: BrushScope) {
    let allClipped = false;
    for (let i = 0; i < clipPaths.length; i++) {
        const clipPath = clipPaths[i];
        // Ignore draw following elements if clipPath has zero area.
        allClipped = allClipped || clipPath.isZeroArea();

        setContextTransform(ctx, clipPath);
        ctx.beginPath();
        clipPath.buildPath(ctx, clipPath.shape);
        ctx.clip();
        // Transform back
        restoreTransform(ctx);
    }
    scope.allClipped = allClipped;
}

function isTransformChanged(m0: MatrixArray, m1: MatrixArray): boolean {
    if (m0 && m1) {
        return m0[0] !== m1[0]
            || m0[1] !== m1[1]
            || m0[2] !== m1[2]
            || m0[3] !== m1[3]
            || m0[4] !== m1[4]
            || m0[5] !== m1[5];
    }
    else if (!m0 && !m1) {  // All identity matrix.
        return false;
    }

    return true;
}

export type BrushScope = {
    prevElClipPaths?: Path[],
    prevEl?: Displayable
    allClipped?: boolean
}
// Brush different type of elements.
export function brush(
    ctx: CanvasRenderingContext2D,
    el: Displayable,
    scope: BrushScope
) {
    const m = el.transform;

    if (
        // Ignore invisible element
        el.invisible
        // Ignore transparent element
        || el.style.opacity === 0
        // Ignore culled element
        || (el.culling && isDisplayableCulled(el, this._width, this._height))
        // Ignore scale 0 element, in some environment like node-canvas
        // Draw a scale 0 element can cause all following draw wrong
        // And setTransform with scale 0 will cause set back transform failed.
        || (m && !m[0] && !m[3])
    ) {
        return;
    }

    // HANDLE CLIPPING
    const clipPaths = el.__clipPaths;
    const prevElClipPaths = scope.prevElClipPaths;

    // Optimize when clipping on group with several elements
    if (!prevElClipPaths || isClipPathChanged(clipPaths, prevElClipPaths)) {
        // If has previous clipping state, restore from it
        if (prevElClipPaths) {
            ctx.restore();
            scope.prevElClipPaths = null;
            scope.allClipped = false;
            // Reset prevEl since context has been restored
            scope.prevEl = null;
        }
        // New clipping state
        if (clipPaths) {
            ctx.save();
            doClip(clipPaths, ctx, scope);
            scope.prevElClipPaths = clipPaths;
        }
    }

    // Not rendering elements if it's clipped by a zero area path.
    // Or it may cause bug on some version of IE11 (like 11.0.9600.178**),
    // where exception "unexpected call to method or property access"
    // might be thrown when calling ctx.fill or ctx.stroke after a path
    // whose area size is zero is drawn and ctx.clip() is called and
    // shadowBlur is set. See #4572, #3112, #5777.
    // (e.g.,
    //  ctx.moveTo(10, 10);
    //  ctx.lineTo(20, 10);
    //  ctx.closePath();
    //  ctx.clip();
    //  ctx.shadowBlur = 10;
    //  ...
    //  ctx.fill();
    // )
    if (scope.allClipped) {
        return;
    }

    // START BRUSH
    el.beforeBrush && el.beforeBrush();
    el.innerBeforeBrush();

    const prevEl = scope.prevEl;
    const forceSetAll = !prevEl;

    if (!prevEl || isTransformChanged(m, prevEl.transform)) {
        setContextTransform(ctx, el);
    }

    if (el instanceof Path) {
        bindPathAndTextCommonStyle(ctx, el as Path, prevEl as Path, forceSetAll);
        brushPath(ctx, el as Path);
    }
    else if (el instanceof ZText) {
        bindPathAndTextCommonStyle(ctx, el as ZText, prevEl as ZText, forceSetAll);
        brushText(ctx, el as ZText);
    }
    else if (el instanceof ZImage) {
        bindImageStyle(ctx, el as ZImage, prevEl as ZImage, forceSetAll);
        brushImage(ctx, el as ZImage);
    }
    else if (el instanceof IncrementalDisplayable) {
        brushIncremental(ctx, el);
    }

    el.innerAfterBrush();
    el.afterBrush && el.afterBrush();

    scope.prevEl = el;
}

function brushIncremental(this: void, ctx: CanvasRenderingContext2D, el: IncrementalDisplayable) {
    let i;
    let displayables = el.getDisplayables();
    let temporalDisplayables = el.getTemporalDisplayables();
    // Provide an inner scope.
    // Save current context and restore after brushed.
    ctx.save();
    let innerScope: BrushScope = {
        prevElClipPaths: null,
        prevEl: null,
        allClipped: false
    }
    // Render persistant displayables.
    for (i = el.getCursor(); i < displayables.length; i++) {
        const displayable = displayables[i];
        displayable.beforeBrush && displayable.beforeBrush();
        displayable.innerBeforeBrush();
        brush(ctx, displayable, innerScope);
        displayable.innerAfterBrush();
        displayable.afterBrush && displayable.afterBrush();
        innerScope.prevEl = displayable;
    }
    // Render temporary displayables.
    for (let i = 0; i < temporalDisplayables.length; i++) {
        const displayable = temporalDisplayables[i];
        displayable.beforeBrush && displayable.beforeBrush();
        displayable.innerBeforeBrush();
        brush(ctx, displayable, innerScope);
        displayable.innerAfterBrush();
        displayable.afterBrush && displayable.afterBrush();
        innerScope.prevEl = displayable;
    }
    el.clearTemporalDisplayables();
    el.notClear = true;

    ctx.restore();
}
