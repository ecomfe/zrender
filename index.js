export * from './lib/zrender';
export * from './lib/export';

import {registerPainter} from './src/zrender';
import CanvasPainter from './src/canvas/Painter';
import SVGPainter from './src/svg/Painter';
import SVGSSRPainter from './src/svg-ssr/Painter';
registerPainter('canvas', CanvasPainter);
registerPainter('svg', SVGPainter);
registerPainter('svg-ssr', SVGSSRPainter);
