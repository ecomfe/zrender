/**
 * Do not mount those modules on 'src/zrender' for better tree shaking.
 */

import * as zrUtil from './core/util';
import * as matrix from './core/matrix';
import * as vector from './core/vector';
import * as colorTool from './tool/color';
import * as pathTool from './tool/path';
import {parseSVG} from './tool/parseSVG';


export {default as Group} from './container/Group';
export {default as Path} from './graphic/Path';
export {default as Image} from './graphic/Image';
export {default as CompoundPath} from './graphic/CompoundPath';
export {default as Text} from './graphic/Text';
export {default as IncrementalDisplayable} from './graphic/IncrementalDisplayable';

export {default as Arc} from './graphic/shape/Arc';
export {default as BezierCurve} from './graphic/shape/BezierCurve';
export {default as Circle} from './graphic/shape/Circle';
export {default as Droplet} from './graphic/shape/Droplet';
export {default as Ellipse} from './graphic/shape/Ellipse';
export {default as Heart} from './graphic/shape/Heart';
export {default as Isogon} from './graphic/shape/Isogon';
export {default as Line} from './graphic/shape/Line';
export {default as Polygon} from './graphic/shape/Polygon';
export {default as Polyline} from './graphic/shape/Polyline';
export {default as Rect} from './graphic/shape/Rect';
export {default as Ring} from './graphic/shape/Ring';
export {default as Rose} from './graphic/shape/Rose';
export {default as Sector} from './graphic/shape/Sector';
export {default as Star} from './graphic/shape/Star';
export {default as Trochoid} from './graphic/shape/Trochoid';

export {default as LinearGradient} from './graphic/LinearGradient';
export {default as RadialGradient} from './graphic/RadialGradient';
export {default as Pattern} from './graphic/Pattern';
export {default as BoundingRect} from './core/BoundingRect';

export {matrix};
export {vector};
export {colorTool as color};
export {pathTool as path};
export {zrUtil as util};

export {parseSVG};
