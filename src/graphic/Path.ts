import Displayable, { DisplayableOption } from './Displayable';
import Element from '../Element';
import * as zrUtil from '../core/util';
import PathProxy from '../core/PathProxy';
import * as pathContain from '../contain/path';
import Pattern, { PatternObject } from './Pattern';
import Gradient, { GradientObject } from './Gradient';
import Style, { StyleOption } from './Style';
import { LinearGradientObject } from './LinearGradient';
import { RadialGradientObject } from './RadialGradient';
import { Dictionary, PropType } from '../core/types';
import BoundingRect, { RectLike } from '../core/BoundingRect';
import { buildPath } from './helper/roundRect';

var getCanvasPattern = Pattern.prototype.getCanvasPattern;

var abs = Math.abs;

var pathProxyForDraw = new PathProxy(true);

export interface PathOption extends DisplayableOption{
    strokeContainThreshold?: number
    segmentIgnoreThreshold?: number
    subPixelOptimize?: boolean

    shape?: Dictionary<any>

    buildPath?: (
        ctx: PathProxy | CanvasRenderingContext2D,
        shapeCfg: Dictionary<any>,
        inBundle?: boolean
    ) => void
}

type PathKey = keyof PathOption
type PathPropertyType = PropType<PathOption, PathKey>

export default class Path extends Displayable {

    type = 'path'

    path: PathProxy

    strokeContainThreshold = 5

    // This item default to be false. But in map series in echarts,
    // in order to improve performance, it should be set to true,
    // so the shorty segment won't draw.
    segmentIgnoreThreshold = 0

    subPixelOptimize = false

    __dirtyPath: boolean = true
    __clipTarget: Element

    private _fillGradient: CanvasGradient
    private _strokeGradient: CanvasGradient

    private _rectWithStroke: BoundingRect

    // Must have an initial value on shape.
    // It will be assigned by default value.
    shape: Dictionary<any>

    brush(ctx: CanvasRenderingContext2D, prevEl?: Displayable) {
        const style = this.style;
        const path = this.path || pathProxyForDraw;
        const hasStroke = style.hasStroke();
        const hasFill = style.hasFill();
        const fill = style.fill;
        const stroke = style.stroke;
        const hasFillGradient = hasFill && !!(fill as GradientObject).colorStops;
        const hasStrokeGradient = hasStroke && !!(stroke as GradientObject).colorStops;
        const hasFillPattern = hasFill && !!(fill as PatternObject).image;
        const hasStrokePattern = hasStroke && !!(stroke as PatternObject).image;

        style.bind(ctx, this, prevEl);
        this.setTransform(ctx);

        if (this.__dirty) {
            let rect;
            // Update gradient because bounding rect may changed
            if (hasFillGradient) {
                rect = rect || this.getBoundingRect();
                this._fillGradient = Style.getGradient(ctx, fill as (LinearGradientObject | RadialGradientObject), rect);
            }
            if (hasStrokeGradient) {
                rect = rect || this.getBoundingRect();
                this._strokeGradient = Style.getGradient(ctx, stroke as (LinearGradientObject | RadialGradientObject), rect);
            }
        }
        // Use the gradient or pattern
        if (hasFillGradient) {
            // PENDING If may have affect the state
            ctx.fillStyle = this._fillGradient;
        }
        else if (hasFillPattern) {
            ctx.fillStyle = getCanvasPattern.call(fill, ctx);
        }
        if (hasStrokeGradient) {
            ctx.strokeStyle = this._strokeGradient;
        }
        else if (hasStrokePattern) {
            ctx.strokeStyle = getCanvasPattern.call(stroke, ctx);
        }

        const lineDash = style.lineDash;
        const lineDashOffset = style.lineDashOffset;

        const ctxLineDash = !!ctx.setLineDash;

        // Update path sx, sy
        const scale = this.getGlobalScale();
        path.setScale(scale[0], scale[1], this.segmentIgnoreThreshold);

        // Proxy context
        // Rebuild path in following 2 cases
        // 1. Path is dirty
        // 2. Path needs javascript implemented lineDash stroking.
        //    In this case, lineDash information will not be saved in PathProxy
        if (this.__dirtyPath
            || (lineDash && !ctxLineDash && hasStroke)
        ) {
            path.beginPath(ctx);

            // Setting line dash before build path
            if (lineDash && !ctxLineDash) {
                path.setLineDash(lineDash);
                path.setLineDashOffset(lineDashOffset);
            }

            this.buildPath(path, this.shape, false);

            // Clear path dirty flag
            if (this.path) {
                this.__dirtyPath = false;
            }
        }
        else {
            // Replay path building
            ctx.beginPath();
            this.path.rebuildPath(ctx);
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

        // Draw rect text
        if (style.text != null) {
            // Only restore transform when needs draw text.
            this.restoreTransform(ctx);
            this.drawRectText(ctx, this.getBoundingRect());
        }
    }

    // When bundling path, some shape may decide if use moveTo to begin a new subpath or closePath
    // Like in circle
    buildPath(
        ctx: PathProxy | CanvasRenderingContext2D,
        shapeCfg: Dictionary<any>,
        inBundle?: boolean
    ) {}

    createPathProxy() {
        this.path = new PathProxy();
    }

    getBoundingRect(): BoundingRect {
        let rect = this._rect;
        const style = this.style;
        const needsUpdateRect = !rect;
        if (needsUpdateRect) {
            let path = this.path;
            if (!path) {
                // Create path on demand.
                path = this.path = new PathProxy();
            }
            if (this.__dirtyPath) {
                path.beginPath();
                this.buildPath(path, this.shape, false);
            }
            rect = path.getBoundingRect();
        }
        this._rect = rect;

        if (style.hasStroke()) {
            // Needs update rect with stroke lineWidth when
            // 1. Element changes scale or lineWidth
            // 2. Shape is changed
            const rectWithStroke = this._rectWithStroke || (this._rectWithStroke = rect.clone());
            if (this.__dirty || needsUpdateRect) {
                rectWithStroke.copy(rect);
                // PENDING, Min line width is needed when line is horizontal or vertical
                const lineScale = style.strokeNoScale ? this.getLineScale() : 1;
                // FIXME Must after updateTransform
                let w = style.lineWidth;

                // Only add extra hover lineWidth when there are no fill
                if (!style.hasFill()) {
                    w = Math.max(w, this.strokeContainThreshold || 4);
                }
                // Consider line width
                // Line scale can't be 0;
                if (lineScale > 1e-10) {
                    rectWithStroke.width += w / lineScale;
                    rectWithStroke.height += w / lineScale;
                    rectWithStroke.x -= w / lineScale / 2;
                    rectWithStroke.y -= w / lineScale / 2;
                }
            }

            // Return rect with stroke
            return rectWithStroke;
        }

        return rect;
    }

    contain(x: number, y: number): boolean {
        const localPos = this.transformCoordToLocal(x, y);
        const rect = this.getBoundingRect();
        const style = this.style;
        x = localPos[0];
        y = localPos[1];

        if (rect.contain(x, y)) {
            const pathData = this.path.data;
            if (style.hasStroke()) {
                let lineWidth = style.lineWidth;
                let lineScale = style.strokeNoScale ? this.getLineScale() : 1;
                // Line scale can't be 0;
                if (lineScale > 1e-10) {
                    // Only add extra hover lineWidth when there are no fill
                    if (!style.hasFill()) {
                        lineWidth = Math.max(lineWidth, this.strokeContainThreshold);
                    }
                    if (pathContain.containStroke(
                        pathData, lineWidth / lineScale, x, y
                    )) {
                        return true;
                    }
                }
            }
            if (style.hasFill()) {
                return pathContain.contain(pathData, x, y);
            }
        }
        return false;
    }

    /**
     * @param  {boolean} dirtyPath
     */
    dirty(dirtyPath?: boolean) {
        if (dirtyPath == null) {
            dirtyPath = true;
        }
        // Only mark dirty, not mark clean
        if (dirtyPath) {
            this.__dirtyPath = dirtyPath;
            this._rect = null;
        }

        this.__dirty = this.__dirtyText = true;

        this.__zr && this.__zr.refresh();

        // Used as a clipping path
        if (this.__clipTarget) {
            this.__clipTarget.dirty();
        }
    }

    /**
     * Alias for animate('shape')
     * @param {boolean} loop
     */
    animateShape(loop: boolean) {
        return this.animate('shape', loop);
    }

    // Overwrite attrKV
    attrKV(key: PathKey, value: PathPropertyType) {
        // FIXME
        if (key === 'shape') {
            this.setShape(value as string | Dictionary<any>);
            this.__dirtyPath = true;
            this._rect = null;
        }
        else {
            super.attrKV(key as keyof DisplayableOption, value);
        }
    }

    setShape(key: string | Dictionary<any>, value?: any) {
        let shape = this.shape;
        if (!shape) {
            shape = this.shape = {};
        }
        // Path from string may not have shape
        if (zrUtil.isObject(key)) {
            for (let name in key as Dictionary<any>) {
                if (key.hasOwnProperty(name)) {
                    shape[name] = (key as Dictionary<any>)[name];
                }
            }
        }
        else {
            shape[key] = value;
        }
        this.dirty(true);

        return this;
    }

    getLineScale() {
        const m = this.transform;
        // Get the line scale.
        // Determinant of `m` means how much the area is enlarged by the
        // transformation. So its square root can be used as a scale factor
        // for width.
        return m && abs(m[0] - 1) > 1e-10 && abs(m[3] - 1) > 1e-10
            ? Math.sqrt(abs(m[0] * m[3] - m[2] * m[1]))
            : 1;
    }

    /**
     * 扩展一个 Path element, 比如星形，圆等。
     * Extend a path element
     * @param props
     * @param props.type Path type
     * @param props.init Initialize
     * @param props.buildPath Overwrite buildPath method
     * @param props.style Extended default style config
     * @param props.shape Extended default shape config
     * @param props.extra Extra info
     */
    static extend<ShapeType extends Dictionary<any>, ExtraType extends Dictionary<any>>(defaultProps: {
        type: string
        shape?: ShapeType
        style?: StyleOption
        extra?: ExtraType

        beforeBrush?: PropType<Displayable, 'beforeBrush'>
        afterBrush?: PropType<Displayable, 'afterBrush'>
        getBoundingRect?: PropType<Displayable, 'getBoundingRect'>

        buildPath: (this: Path, ctx: CanvasRenderingContext2D | PathProxy, shape: ShapeType, inBundle?: boolean) => void
        init?: (this: Path, opts: PathOption) => void // TODO Should be SubPathOption
    }) {
        interface SubPathOption extends PathOption {
            shape: ShapeType
        }

        class Sub extends Path {

            shape: ShapeType

            extra: ExtraType

            constructor(opts?: SubPathOption) {
                super(opts);

                if (defaultProps.style) {
                    // Extend default style
                    this.style.extendFrom(defaultProps.style, false);
                }

                // Extend default shape
                const defaultShape = defaultProps.shape;
                if (defaultShape) {
                    this.shape = this.shape || {} as ShapeType;
                    const thisShape = this.shape;
                    for (let name in defaultShape) {
                        if (
                            !thisShape.hasOwnProperty(name)
                            && defaultShape.hasOwnProperty(name)
                        ) {
                            thisShape[name] = defaultShape[name];
                        }
                    }
                }

                defaultProps.init && defaultProps.init.call(this, opts);
            }
        }

        Sub.prototype.buildPath = defaultProps.buildPath;
        Sub.prototype.beforeBrush = defaultProps.beforeBrush;
        Sub.prototype.afterBrush = defaultProps.afterBrush;

        return Sub;
    }
}