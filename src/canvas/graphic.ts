import Displayable, { DEFAULT_COMMON_STYLE } from '../graphic/Displayable';
import PathProxy from '../core/PathProxy';
import { GradientObject } from '../graphic/Gradient';
import { PatternObject } from '../graphic/Pattern';
import { LinearGradientObject } from '../graphic/LinearGradient';
import { RadialGradientObject } from '../graphic/RadialGradient';
import { ZRCanvasRenderingContext } from '../core/types';
import BoundingRect from '../core/BoundingRect';
import { createOrUpdateImage, isImageReady } from '../graphic/helper/image';
import { getCanvasGradient } from './helper';
import Path, { PathStyleProps } from '../graphic/Path';
import ZRImage, { ImageStyleProps } from '../graphic/Image';
import ZRText, {TextStyleProps} from '../graphic/Text';
import { DEFAULT_FONT } from '../contain/text';
import { IncrementalDisplayable } from '../export';
import { MatrixArray } from '../core/matrix';

const pathProxyForDraw = new PathProxy(true);

function doFillPath(ctx: CanvasRenderingContext2D, el: Path) {
    const style = el.style;
    if (style.fillOpacity != null && style.fillOpacity !== 1) {
        const originalGlobalAlpha = ctx.globalAlpha;
        ctx.globalAlpha = style.fillOpacity * style.opacity;
        ctx.fill();
        // Set back globalAlpha
        ctx.globalAlpha = originalGlobalAlpha;
    }
    else {
        ctx.fill();
    }
}

function doStrokePath(ctx: CanvasRenderingContext2D, el: Path) {
    const style = el.style;
    if (style.strokeOpacity != null && style.strokeOpacity !== 1) {
        const originalGlobalAlpha = ctx.globalAlpha;
        ctx.globalAlpha = style.strokeOpacity * style.opacity;
        ctx.stroke();
        // Set back globalAlpha
        ctx.globalAlpha = originalGlobalAlpha;
    }
    else {
        ctx.stroke();
    }
}

export function createCanvasPattern(
    this: void,
    ctx: CanvasRenderingContext2D,
    pattern: PatternObject,
    el: {dirty: () => void}
): CanvasPattern {
    const image = createOrUpdateImage(pattern.image, pattern.__image, el);
    if (isImageReady(image)) {
        return ctx.createPattern(image, pattern.repeat || 'repeat');
    }
}

// Draw Path Elements
function brushPath(ctx: CanvasRenderingContext2D, el: Path, inBatch: boolean) {
    let hasStroke = el.hasStroke();
    let hasFill = el.hasFill();

    const style = el.style;
    const path = el.path || pathProxyForDraw;

    if (!inBatch) {
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
            const patternObj = createCanvasPattern(ctx, fill as PatternObject, el);
            if (patternObj) {
                ctx.fillStyle = patternObj;
            }
            else {
                // Don't fill if image is not ready
                hasFill = false;
            }
        }
        if (hasStrokeGradient) {
            ctx.strokeStyle = strokeGradient;
        }
        else if (hasStrokePattern) {
            const patternObj = createCanvasPattern(ctx, stroke as PatternObject, el);
            if (patternObj) {
                ctx.strokeStyle = patternObj;
            }
            else {
                // Don't stroke if image is not ready
                hasStroke = false;
            }
        }
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
        path.setContext(ctx);
        path.reset();

        // Setting line dash before build path
        if (lineDash && !ctxLineDash) {
            path.setLineDash(lineDash);
            path.setLineDashOffset(lineDashOffset);
        }

        el.buildPath(path, el.shape, inBatch);
        path.toStatic();

        // Clear path dirty flag
        if (el.path) {
            el.__dirtyPath = false;
        }
    }
    else {
        el.path.rebuildPath(ctx);
    }

    if (lineDash && ctxLineDash) {
        ctx.setLineDash(lineDash);
        ctx.lineDashOffset = lineDashOffset;
    }

    if (!inBatch) {
        if (style.strokeFirst) {
            if (hasStroke) {
                doStrokePath(ctx, el);
            }
            if (hasStroke) {
                doFillPath(ctx, el);
            }
        }
        else {
            if (hasFill) {
                doFillPath(ctx, el);
            }
            if (hasStroke) {
                doStrokePath(ctx, el);
            }
        }
    }

    if (lineDash && ctxLineDash) {
        // PENDING
        // Remove lineDash
        ctx.setLineDash([]);
    }
}

// Draw Image Elements
function brushImage(ctx: CanvasRenderingContext2D, el: ZRImage) {
    const style = el.style;

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
function brushText(ctx: CanvasRenderingContext2D, el: ZRText) {

    const style = el.style;

    let text = style.text;
    // Convert to string
    text != null && (text += '');

    if (text) {
        ctx.font = style.font || DEFAULT_FONT;
        ctx.textAlign = style.textAlign;
        ctx.textBaseline = style.textBaseline;

        if (style.strokeFirst) {
            if (el.hasStroke()) {
                ctx.strokeText(text, style.x, style.y);
            }
            if (el.hasFill()) {
                ctx.fillText(text, style.x, style.y);
            }
        }
        else {
            if (el.hasFill()) {
                ctx.fillText(text, style.x, style.y);
            }
            if (el.hasStroke()) {
                ctx.strokeText(text, style.x, style.y);
            }
        }
    }
}

const SHADOW_NUMBER_PROPS = ['shadowBlur', 'shadowOffsetX', 'shadowOffsetY'] as const;
const STROKE_PROPS = [
    ['lineCap', 'butt'], ['lineJoin', 'miter'], ['miterLimit', 10]
] as const;

type AllStyleOption = PathStyleProps | TextStyleProps | ImageStyleProps;
// type ShadowPropNames = typeof SHADOW_PROPS[number][0];
// type StrokePropNames = typeof STROKE_PROPS[number][0];
// type DrawPropNames = typeof DRAW_PROPS[number][0];

function bindCommonProps(
    ctx: CanvasRenderingContext2D,
    style: AllStyleOption,
    prevStyle: AllStyleOption,
    forceSetAll: boolean,
    scope: BrushScope
): boolean {
    let styleChanged = false;
    if (!forceSetAll) {
        prevStyle = prevStyle || {};
    }
    if (forceSetAll || style.opacity !== prevStyle.opacity) {
        if (!styleChanged) {
            flushPathDrawn(ctx, scope);
            styleChanged = true;
        }
        ctx.globalAlpha = style.opacity == null ? DEFAULT_COMMON_STYLE.opacity : style.opacity;
    }

    if (forceSetAll || style.blend !== prevStyle.blend) {
        if (!styleChanged) {
            flushPathDrawn(ctx, scope);
            styleChanged = true;
        }
        ctx.globalCompositeOperation = style.blend || DEFAULT_COMMON_STYLE.blend;
    }
    for (let i = 0; i < SHADOW_NUMBER_PROPS.length; i++) {
        const propName = SHADOW_NUMBER_PROPS[i];
        if (forceSetAll || style[propName] !== prevStyle[propName]) {
            if (!styleChanged) {
                flushPathDrawn(ctx, scope);
                styleChanged = true;
            }
            // FIXME Invalid property value will cause style leak from previous element.
            ctx[propName] = (ctx as ZRCanvasRenderingContext).dpr * (style[propName] || 0);
        }
    }
    if (forceSetAll || style.shadowColor !== prevStyle.shadowColor) {
        if (!styleChanged) {
            flushPathDrawn(ctx, scope);
            styleChanged = true;
        }
        ctx.shadowColor = style.shadowColor || DEFAULT_COMMON_STYLE.shadowColor;
    }
    return styleChanged;
}

function bindPathAndTextCommonStyle(
    ctx: CanvasRenderingContext2D,
    el: ZRText | Path,
    prevEl: ZRText | Path,
    forceSetAll: boolean,
    scope: BrushScope
) {
    const style = el.style;
    const prevStyle = forceSetAll
        ? null
        : (prevEl && prevEl.style || {});

    let styleChanged = bindCommonProps(ctx, style, prevStyle, forceSetAll, scope);

    if (forceSetAll || style.fill !== prevStyle.fill) {
        if (!styleChanged) {
            // Flush before set
            flushPathDrawn(ctx, scope);
            styleChanged = true;
        }
        ctx.fillStyle = style.fill as string;
    }
    if (forceSetAll || style.stroke !== prevStyle.stroke) {
        if (!styleChanged) {
            flushPathDrawn(ctx, scope);
            styleChanged = true;
        }
        ctx.strokeStyle = style.stroke as string;
    }
    if (forceSetAll || style.opacity !== prevStyle.opacity) {
        if (!styleChanged) {
            flushPathDrawn(ctx, scope);
            styleChanged = true;
        }
        ctx.globalAlpha = style.opacity == null ? 1 : style.opacity;
    }
    if (el.hasStroke()) {
        const lineWidth = style.lineWidth;
        const newLineWidth = lineWidth / (
            (style.strokeNoScale && el && el.getLineScale) ? el.getLineScale() : 1
        );
        if (ctx.lineWidth !== newLineWidth) {
            if (!styleChanged) {
                flushPathDrawn(ctx, scope);
                styleChanged = true;
            }
            ctx.lineWidth = newLineWidth;
        }
    }

    for (let i = 0; i < STROKE_PROPS.length; i++) {
        const prop = STROKE_PROPS[i];
        const propName = prop[0];
        if (forceSetAll || style[propName] !== prevStyle[propName]) {
            if (!styleChanged) {
                flushPathDrawn(ctx, scope);
                styleChanged = true;
            }
            // FIXME Invalid property value will cause style leak from previous element.
            (ctx as any)[propName] = style[propName] || prop[1];
        }
    }

    return styleChanged;
}

function bindImageStyle(
    ctx: CanvasRenderingContext2D,
    el: ZRImage,
    prevEl: ZRImage,
    // forceSetAll must be true if prevEl is null
    forceSetAll: boolean,
    scope: BrushScope
) {
    bindCommonProps(ctx, el.style, prevEl && prevEl.style, forceSetAll, scope);
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

function updateClipStatus(clipPaths: Path[], ctx: CanvasRenderingContext2D, scope: BrushScope) {
    let allClipped = false;
    for (let i = 0; i < clipPaths.length; i++) {
        const clipPath = clipPaths[i];
        // Ignore draw following elements if clipPath has zero area.
        allClipped = allClipped || clipPath.isZeroArea();

        setContextTransform(ctx, clipPath);
        ctx.beginPath();
        clipPath.buildPath(ctx, clipPath.shape);
        ctx.clip();
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
    // width / height of viewport
    viewWidth: number
    viewHeight: number

    // Status for clipping
    prevElClipPaths?: Path[]
    prevEl?: Displayable
    allClipped?: boolean    // If the whole element can be clipped

    // Status for batching
    batchFill?: string
    batchStroke?: string
}

// If path can be batched
function canPathBatch(el: Path) {
    const style = el.style;
    // Line dash is dynamically set in brush function.
    if (style.lineDash) {
        return false;
    }
    const hasFill = el.hasFill();
    const hasStroke = el.hasStroke();
    // Can't batch if element is both set fill and stroke. Or both not set
    if (!(+hasFill ^ +hasStroke)) {
        return false;
    }
    // Can't batch if element is drawn with gradient or pattern.
    if (hasFill && typeof style.fill !== 'string') {
        return false;
    }
    if (hasStroke && typeof style.stroke !== 'string') {
        return false;
    }
    return true;
}

function flushPathDrawn(ctx: CanvasRenderingContext2D, scope: BrushScope) {
    // Force flush all after drawn last element
    scope.batchFill && ctx.fill();
    scope.batchStroke && ctx.stroke();
    scope.batchFill = '';
    scope.batchStroke = '';
}

// Brush different type of elements.
export function brush(
    ctx: CanvasRenderingContext2D,
    el: Displayable,
    scope: BrushScope,
    isLast: boolean
) {
    const m = el.transform;

    if (
        // Ignore invisible element
        el.invisible
        // Ignore transparent element
        || el.style.opacity === 0
        // Ignore culled element
        || (el.culling && isDisplayableCulled(el, scope.viewWidth, scope.viewHeight))
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

    let forceSetTransform = false;
    let forceSetStyle = false;
    // Optimize when clipping on group with several elements
    if (!prevElClipPaths || isClipPathChanged(clipPaths, prevElClipPaths)) {
        // If has previous clipping state, restore from it
        if (prevElClipPaths) {
            ctx.restore();
            // Must set all style and transform because context changed by restore
            forceSetStyle = forceSetTransform = true;

            scope.prevElClipPaths = null;
            scope.allClipped = false;
            // Reset prevEl since context has been restored
            scope.prevEl = null;
        }
        // New clipping state
        if (clipPaths && clipPaths.length) {
            ctx.save();
            updateClipStatus(clipPaths, ctx, scope);
            // Must set transform because it's changed when clip.
            forceSetTransform = true;
        }
        scope.prevElClipPaths = clipPaths;
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
    // TODO el type changed.
    if (!prevEl) {
        forceSetStyle = forceSetTransform = true;
    }

    let canBatchPath = el.autoBatch
        && el instanceof Path   // Only path supports batch
        && canPathBatch(el as Path);

    if (forceSetTransform || isTransformChanged(m, prevEl.transform)) {
        setContextTransform(ctx, el);
        // Flush
        flushPathDrawn(ctx, scope);
    }
    else if (!canBatchPath) {
        // Flush previous
        flushPathDrawn(ctx, scope);
    }

    if (el instanceof Path) {
        bindPathAndTextCommonStyle(ctx, el as Path, prevEl as Path, forceSetStyle, scope);
        // Begin path at start
        if (!canBatchPath || (!scope.batchFill && !scope.batchStroke)) {
            ctx.beginPath();
        }
        brushPath(ctx, el as Path, canBatchPath);
        if (canBatchPath) {
            scope.batchFill = el.style.fill as string || '';
            scope.batchStroke = el.style.stroke as string || '';
        }
    }
    else {
        if (el instanceof ZRText) {
            bindPathAndTextCommonStyle(ctx, el as ZRText, prevEl as ZRText, forceSetStyle, scope);
            brushText(ctx, el as ZRText);
        }
        else if (el instanceof ZRImage) {
            bindImageStyle(ctx, el as ZRImage, prevEl as ZRImage, forceSetStyle, scope);
            brushImage(ctx, el as ZRImage);
        }
        else if (el instanceof IncrementalDisplayable) {
            brushIncremental(ctx, el, scope);
        }

    }

    if (canBatchPath && isLast) {
        flushPathDrawn(ctx, scope);
    }

    el.innerAfterBrush();
    el.afterBrush && el.afterBrush();

    scope.prevEl = el;
}

function brushIncremental(
    ctx: CanvasRenderingContext2D,
    el: IncrementalDisplayable,
    scope: BrushScope
) {
    let displayables = el.getDisplayables();
    let temporalDisplayables = el.getTemporalDisplayables();
    // Provide an inner scope.
    // Save current context and restore after brushed.
    ctx.save();
    let innerScope: BrushScope = {
        prevElClipPaths: null,
        prevEl: null,
        allClipped: false,
        viewWidth: scope.viewWidth,
        viewHeight: scope.viewHeight
    };
    let i;
    let len;
    // Render persistant displayables.
    for (i = el.getCursor(), len = displayables.length; i < len; i++) {
        const displayable = displayables[i];
        displayable.beforeBrush && displayable.beforeBrush();
        displayable.innerBeforeBrush();
        brush(ctx, displayable, innerScope, i === len - 1);
        displayable.innerAfterBrush();
        displayable.afterBrush && displayable.afterBrush();
        innerScope.prevEl = displayable;
    }
    // Render temporary displayables.
    for (let i = 0, len = temporalDisplayables.length - 1; i < len; i++) {
        const displayable = temporalDisplayables[i];
        displayable.beforeBrush && displayable.beforeBrush();
        displayable.innerBeforeBrush();
        brush(ctx, displayable, innerScope, i === len - 1);
        displayable.innerAfterBrush();
        displayable.afterBrush && displayable.afterBrush();
        innerScope.prevEl = displayable;
    }
    el.clearTemporalDisplayables();
    el.notClear = true;

    ctx.restore();
}
