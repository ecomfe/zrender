export * from './lib/zrender';
export * from './lib/export';

import {registerPainter} from './lib/zrender';
import CanvasPainter from './lib/canvas/Painter';
import SVGPainter from './lib/svg/Painter';
registerPainter('canvas', CanvasPainter);
registerPainter('svg', SVGPainter);