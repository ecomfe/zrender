/**
 * Do not mount those modules on 'src/zrender' for better tree shaking.
 */

import * as zrUtil from './core/util';
import * as matrix from './core/matrix';
import * as vector from './core/vector';
import * as colorTool from './tool/color';
import * as pathTool from './tool/path';
import {parseSVG} from './tool/parseSVG';

import * as morphPathTool from './tool/morphPath';

export {default as Point} from './core/Point';
export type {PointLike} from './core/Point';

export {default as Element} from './Element';
export type {
    ElementAnimateConfig,
    ElementTextConfig,
    ElementTextGuideLineConfig,
    ElementEvent,
    ElementEventCallback,
    ElementProps
} from './Element';

export {default as Displayable} from './graphic/Displayable';
export type {DisplayableProps} from './graphic/Displayable';
export {default as Group} from './graphic/Group';
export type {GroupProps} from './graphic/Group';
export {default as Path} from './graphic/Path';
export type {PathStyleProps, PathProps, PathStatePropNames, PathState} from './graphic/Path';
export {default as Image} from './graphic/Image';
export type {ImageStyleProps, ImageProps, ImageState} from './graphic/Image';
export {default as CompoundPath} from './graphic/CompoundPath';
export type {CompoundPathShape} from './graphic/CompoundPath';
export {default as TSpan} from './graphic/TSpan';
export type {TSpanStyleProps, TSpanProps, TSpanState} from './graphic/TSpan';
export {default as IncrementalDisplayable} from './graphic/IncrementalDisplayable';
export {default as Text} from './graphic/Text';
export type {TextStylePropsPart, TextStyleProps, TextProps, TextState} from './graphic/Text';

export {default as Arc, ArcShape} from './graphic/shape/Arc';
export type {ArcProps} from './graphic/shape/Arc';
export {default as BezierCurve, BezierCurveShape} from './graphic/shape/BezierCurve';
export type {BezierCurveProps} from './graphic/shape/BezierCurve';
export {default as Circle, CircleShape} from './graphic/shape/Circle';
export type {CircleProps} from './graphic/shape/Circle';
export {default as Droplet, DropletShape} from './graphic/shape/Droplet';
export type {DropletProps} from './graphic/shape/Droplet';
export {default as Ellipse, EllipseShape} from './graphic/shape/Ellipse';
export type {EllipseProps} from './graphic/shape/Ellipse';
export {default as Heart, HeartShape} from './graphic/shape/Heart';
export type {HeartProps} from './graphic/shape/Heart';
export {default as Isogon, IsogonShape} from './graphic/shape/Isogon';
export type {IsogonProps} from './graphic/shape/Isogon';
export {default as Line, LineShape} from './graphic/shape/Line';
export type {LineProps} from './graphic/shape/Line';
export {default as Polygon, PolygonShape} from './graphic/shape/Polygon';
export type {PolygonProps} from './graphic/shape/Polygon';
export {default as Polyline, PolylineShape} from './graphic/shape/Polyline';
export type {PolylineProps} from './graphic/shape/Polyline';
export {default as Rect, RectShape} from './graphic/shape/Rect';
export type {RectProps} from './graphic/shape/Rect';
export {default as Ring, RingShape} from './graphic/shape/Ring';
export type {RingProps} from './graphic/shape/Ring';
export {default as Rose, RoseShape} from './graphic/shape/Rose';
export type {RoseProps} from './graphic/shape/Rose';
export {default as Sector, SectorShape} from './graphic/shape/Sector';
export type {SectorProps} from './graphic/shape/Sector';
export {default as Star, StarShape} from './graphic/shape/Star';
export type {StarProps} from './graphic/shape/Star';
export {default as Trochoid, TrochoidShape} from './graphic/shape/Trochoid';
export type {TrochoidProps} from './graphic/shape/Trochoid';

export {default as LinearGradient} from './graphic/LinearGradient';
export type {LinearGradientObject} from './graphic/LinearGradient';
export {default as RadialGradient} from './graphic/RadialGradient';
export type {RadialGradientObject} from './graphic/RadialGradient';
export {default as Pattern} from './graphic/Pattern';
export type {
    PatternObjectBase,
    PatternObject,
    ImagePatternObject,
    SVGPatternObject
} from './graphic/Pattern';
export {default as BoundingRect} from './core/BoundingRect';
export type {RectLike} from './core/BoundingRect';
export {default as OrientedBoundingRect} from './core/OrientedBoundingRect';

export {matrix};
export {vector};
export {colorTool as color};
export {pathTool as path};
export {zrUtil as util};

export {morphPathTool as morph};

export {parseSVG};

export {default as showDebugDirtyRect} from './debug/showDebugDirtyRect';

export {setPlatformAPI} from './core/platform';