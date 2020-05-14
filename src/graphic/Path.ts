import Displayable, { DisplayableProps,
    CommonStyleProps,
    DEFAULT_COMMON_STYLE,
    DisplayableStatePropNames
} from './Displayable';
import Element, { PRESERVED_NORMAL_STATE, ElementAnimateConfig } from '../Element';
import PathProxy from '../core/PathProxy';
import * as pathContain from '../contain/path';
import { PatternObject } from './Pattern';
import { Dictionary, PropType } from '../core/types';
import BoundingRect from '../core/BoundingRect';
import { LinearGradientObject } from './LinearGradient';
import { RadialGradientObject } from './RadialGradient';
import { defaults, keys, extend, clone, isString, createObject } from '../core/util';
import Animator from '../animation/Animator';
import { parse } from '../tool/color';

export interface PathStyleProps extends CommonStyleProps {
    fill?: string | PatternObject | LinearGradientObject | RadialGradientObject
    stroke?: string | PatternObject | LinearGradientObject | RadialGradientObject
    strokePercent?: number
    strokeNoScale?: boolean
    fillOpacity?: number
    strokeOpacity?: number

    /**
     * `true` is not supported.
     * `false`/`null`/`undefined` are the same.
     * `false` is used to remove lineDash in some
     * case that `null`/`undefined` can not be set.
     * (e.g., emphasis.lineStyle in echarts)
     */
    lineDash?: false | number[]
    lineDashOffset?: number

    lineWidth?: number
    lineCap?: CanvasLineCap
    lineJoin?: CanvasLineJoin

    miterLimit?: number
    /**
     * Paint order, if do stroke first. Similar to SVG paint-order
     * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/paint-order
     */
    strokeFirst?: boolean
}

export const DEFAULT_PATH_STYLE: PathStyleProps = defaults({
    fill: '#000',
    stroke: null,
    strokePercent: 1,
    lineDashOffset: 0,
    lineWidth: 1,
    lineCap: 'butt',
    miterLimit: 10,

    strokeNoScale: false,
    strokeFirst: false
} as PathStyleProps, DEFAULT_COMMON_STYLE);

export interface PathProps extends DisplayableProps {
    strokeContainThreshold?: number
    segmentIgnoreThreshold?: number
    subPixelOptimize?: boolean

    style?: PathStyleProps
    shape?: Dictionary<any>

    autoBatch?: boolean

    buildPath?: (
        ctx: PathProxy | CanvasRenderingContext2D,
        shapeCfg: Dictionary<any>,
        inBundle?: boolean
    ) => void
}


type PathKey = keyof PathProps
type PathPropertyType = PropType<PathProps, PathKey>

interface Path<Props extends PathProps = PathProps> {
    animate(key?: '', loop?: boolean): Animator<this>
    animate(key: 'style', loop?: boolean): Animator<this['style']>
    animate(key: 'shape', loop?: boolean): Animator<this['shape']>

    getState(stateName: string): PathState
    ensureState(stateName: string): PathState

    states: Dictionary<PathState>
    stateProxy: (stateName: string) => PathState
}

export type PathStatePropNames = DisplayableStatePropNames | 'shape';
export type PathState = Pick<PathProps, PathStatePropNames>

class Path<Props extends PathProps = PathProps> extends Displayable<Props> {

    path: PathProxy

    strokeContainThreshold: number

    // This item default to be false. But in map series in echarts,
    // in order to improve performance, it should be set to true,
    // so the shorty segment won't draw.
    segmentIgnoreThreshold: number

    subPixelOptimize: boolean

    style: PathStyleProps
    /**
     * If element can be batched automatically
     */
    autoBatch: boolean

    private _rectWithStroke: BoundingRect

    protected _normalState: PathState

    // Must have an initial value on shape.
    // It will be assigned by default value.
    shape: Dictionary<any>

    constructor(opts?: Props) {
        super(opts);
    }

    protected _init(props?: Props) {
        // Init default properties
        const keysArr = keys(props);

        this.shape = this.getDefaultShape();
        const defaultStyle = this.getDefaultStyle();
        if (defaultStyle) {
            this.useStyle(defaultStyle);
        }

        for (let i = 0; i < keysArr.length; i++) {
            const key = keysArr[i];
            const value = props[key];
            if (key === 'style') {
                if (!this.style) {
                    // PENDING Reuse style object if possible?
                    this.useStyle(value);
                }
                else {
                    extend(this.style, value);
                }
            }
            else if (key === 'shape') {
                // this.shape = value;
                extend(this.shape, value);
            }
            else {
                super.attrKV(key as any, value);
            }
        }

        // Create an empty one if no style object exists.
        if (!this.style) {
            this.useStyle({});
        }
        // const defaultShape = this.getDefaultShape();
        // if (!this.shape) {
        //     this.shape = defaultShape;
        // }
        // else {
        //     defaults(this.shape, defaultShape);
        // }
    }

    protected getDefaultStyle(): Props['style'] {
        return null;
    }

    // Needs to override
    protected getDefaultShape() {
        return {};
    }

    // protected getInsideTextFill() {
    //     const pathFill = this.style.fill;
    //     if (pathFill !== 'none') {
    //         if (isString(pathFill)) {
    //             // Determin text color based on the lum of path fill.
    //             const arr = parse(pathFill);
    //             const lum =  (0.299 * arr[0] + 0.587 * arr[1] + 0.114 * arr[2]) * arr[3] / 255;
    //             if (lum > 0.5) {
    //                 return '#000';
    //             }
    //             return '#fff';
    //         }
    //         else if (pathFill) {
    //             return '#fff';
    //         }

    //     }
    //     return '#000';
    // }

    protected getInsideTextStroke(textFill?: string) {
        const pathFill = this.style.fill;
        // Not stroke on none fill object or gradient object
        if (isString(pathFill)) {
            return pathFill;
        }
    }

    // When bundling path, some shape may decide if use moveTo to begin a new subpath or closePath
    // Like in circle
    buildPath(
        ctx: PathProxy | CanvasRenderingContext2D,
        shapeCfg: Dictionary<any>,
        inBundle?: boolean
    ) {}

    pathUpdated() {
        this.__dirty &= ~Path.SHAPE_CHANGED_BIT;
    }

    createPathProxy() {
        this.path = new PathProxy(false);
    }

    hasStroke() {
        const style = this.style;
        const stroke = 'stroke' in style ? style.stroke : DEFAULT_PATH_STYLE.stroke;
        return stroke != null && stroke !== 'none' && style.lineWidth > 0;
    }

    hasFill() {
        const style = this.style;
        const fill = 'fill' in style ? style.fill : DEFAULT_PATH_STYLE.fill;
        return fill != null && fill !== 'none';
    }

    getBoundingRect(): BoundingRect {
        let rect = this._rect;
        const style = this.style;
        const needsUpdateRect = !rect;
        if (needsUpdateRect) {
            let firstInvoke = false;
            if (!this.path) {
                firstInvoke = true;
                // Create path on demand.
                this.createPathProxy();
            }
            let path = this.path;
            if (firstInvoke || (this.__dirty & Path.SHAPE_CHANGED_BIT)) {
                path.beginPath();
                this.buildPath(path, this.shape, false);
                this.pathUpdated();
            }
            rect = path.getBoundingRect();
        }
        this._rect = rect;

        if (this.hasStroke()) {
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
                if (!this.hasFill()) {
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
            if (this.hasStroke()) {
                let lineWidth = style.lineWidth;
                let lineScale = style.strokeNoScale ? this.getLineScale() : 1;
                // Line scale can't be 0;
                if (lineScale > 1e-10) {
                    // Only add extra hover lineWidth when there are no fill
                    if (!this.hasFill()) {
                        lineWidth = Math.max(lineWidth, this.strokeContainThreshold);
                    }
                    if (pathContain.containStroke(
                        pathData, lineWidth / lineScale, x, y
                    )) {
                        return true;
                    }
                }
            }
            if (this.hasFill()) {
                return pathContain.contain(pathData, x, y);
            }
        }
        return false;
    }

    /**
     * Shape changed
     */
    dirtyShape() {
        this.__dirty |= Path.SHAPE_CHANGED_BIT;
        if (this._rect) {
            this._rect = null;
        }
        this.markRedraw();
    }

    dirty() {
        this.dirtyStyle();
        this.dirtyShape();
    }

    /**
     * Alias for animate('shape')
     * @param {boolean} loop
     */
    animateShape(loop: boolean) {
        return this.animate('shape', loop);
    }

    // Override updateDuringAnimation
    updateDuringAnimation(targetKey: string) {
        if (targetKey === 'style') {
            this.dirtyStyle();
        }
        else if (targetKey === 'shape') {
            this.dirtyShape();
        }
        else {
            this.markRedraw();
        }
    }

    // Overwrite attrKV
    attrKV(key: PathKey, value: PathPropertyType) {
        // FIXME
        if (key === 'shape') {
            this.setShape(value as Props['shape']);
        }
        else {
            super.attrKV(key as keyof DisplayableProps, value);
        }
    }

    setShape(obj: Props['shape']): this
    setShape<T extends keyof Props['shape']>(obj: T, value: Props['shape'][T]): this
    setShape(keyOrObj: keyof Props['shape'] | Props['shape'], value?: unknown): this {
        let shape = this.shape;
        if (!shape) {
            shape = this.shape = {};
        }
        // Path from string may not have shape
        if (typeof keyOrObj === 'string') {
            shape[keyOrObj] = value;
        }
        else {
            extend(shape, keyOrObj as Props['shape']);
        }
        this.dirtyShape();

        return this;
    }

    /**
     * If shape changed. used with dirtyShape
     */
    shapeChanged() {
        return this.__dirty & Path.SHAPE_CHANGED_BIT;
    }

    /**
     * Create a path style object with default values in it's prototype.
     * @override
     */
    createStyle(obj?: Props['style']) {
        return createObject(DEFAULT_PATH_STYLE, obj);
    }

    protected _innerSaveToNormal(toState: PathState) {
        super._innerSaveToNormal(toState);

        const normalState = this._normalState;
        // Clone a new one. DON'T share object reference between states and current using.
        // TODO: Clone array in shape?.
        // TODO: Only save changed shape.
        if (toState.shape && !normalState.shape) {
            normalState.shape = extend({}, this.shape);
        }
    }

    protected _applyStateObj(
        stateName: string,
        state: PathState,
        normalState: PathState,
        keepCurrentStates: boolean,
        transition: boolean,
        animationCfg: ElementAnimateConfig
    ) {
        super._applyStateObj(stateName, state, normalState, keepCurrentStates, transition, animationCfg);
        const needsRestoreToNormal = !(state && keepCurrentStates);
        let targetShape: Props['shape'];
        if (state && state.shape) {
            // Only animate changed properties.
            if (transition) {
                if (keepCurrentStates) {
                    targetShape = state.shape;
                }
                else {
                    // Inherits from normal state.
                    targetShape = extend({}, normalState.shape);
                    extend(targetShape, state.shape);
                }
            }
            else {
                // Because the shape will be replaced. So inherits from current shape.
                targetShape = extend({}, keepCurrentStates ? this.shape : normalState.shape);
                extend(targetShape, state.shape);
            }
        }
        else if (needsRestoreToNormal) {
            targetShape = normalState.shape;
        }

        if (targetShape) {
            if (transition) {
                // Clone a new shape.
                this.shape = extend({}, this.shape);
                // Only supports transition on primary props. Because shape is not deep cloned.
                const targetShapePrimaryProps: Props['shape'] = {};
                const shapeKeys = keys(targetShape);
                for (let i = 0; i < shapeKeys.length; i++) {
                    const key = shapeKeys[i];
                    if (typeof targetShape[key] === 'object') {
                        (this.shape as Props['shape'])[key] = targetShape[key];
                    }
                    else {
                        targetShapePrimaryProps[key] = targetShape[key];
                    }
                }
                this._transitionState(stateName, {
                    shape: targetShapePrimaryProps
                } as Props, animationCfg);
            }
            else {
                this.shape = targetShape;
                this.dirtyShape();
            }
        }
    }

    /**
     * If path shape is zero area
     */
    isZeroArea(): boolean {
        return false;
    }
    /**
     * 扩展一个 Path element, 比如星形，圆等。
     * Extend a path element
     * @DEPRECATED Use class extends
     * @param props
     * @param props.type Path type
     * @param props.init Initialize
     * @param props.buildPath Overwrite buildPath method
     * @param props.style Extended default style config
     * @param props.shape Extended default shape config
     */
    static extend<Shape extends Dictionary<any>>(defaultProps: {
        type?: string
        shape?: Shape
        style?: PathStyleProps
        beforeBrush?: Displayable['beforeBrush']
        afterBrush?: Displayable['afterBrush']
        getBoundingRect?: Displayable['getBoundingRect']

        calculateTextPosition?: Element['calculateTextPosition']
        buildPath(this: Path, ctx: CanvasRenderingContext2D | PathProxy, shape: Shape, inBundle?: boolean): void
        init?(this: Path, opts: PathProps): void // TODO Should be SubPathOption
    }): {
        new(opts?: PathProps & {shape: Shape}): Path
    } {
        interface SubPathOption extends PathProps {
            shape: Shape
        }

        class Sub extends Path {

            shape: Shape

            getDefaultStyle() {
                return clone(defaultProps.style);
            }

            getDefaultShape() {
                return clone(defaultProps.shape);
            }

            constructor(opts?: SubPathOption) {
                super(opts);
                defaultProps.init && defaultProps.init.call(this as any, opts);
            }
        }

        // TODO Legacy usage. Extend functions
        for (let key in defaultProps) {
            if (typeof (defaultProps as any)[key] === 'function') {
                (Sub.prototype as any)[key] = (defaultProps as any)[key];
            }
        }
        // Sub.prototype.buildPath = defaultProps.buildPath;
        // Sub.prototype.beforeBrush = defaultProps.beforeBrush;
        // Sub.prototype.afterBrush = defaultProps.afterBrush;

        return Sub as any;
    }

    static SHAPE_CHANGED_BIT = 4

    protected static initDefaultProps = (function () {
        const pathProto = Path.prototype;
        pathProto.type = 'path';
        pathProto.strokeContainThreshold = 5;
        pathProto.segmentIgnoreThreshold = 0;
        pathProto.subPixelOptimize = false;
        pathProto.autoBatch = false;
        pathProto.__dirty = Element.REDARAW_BIT | Displayable.STYLE_CHANGED_BIT | Path.SHAPE_CHANGED_BIT;
    })()
}

export default Path;