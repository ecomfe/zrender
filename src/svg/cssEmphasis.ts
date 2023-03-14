import LRU from '../core/LRU';
import { extend, isGradientObject, isString, map } from '../core/util';
import * as colorTool from '../tool/color';
import Displayable from '../graphic/Displayable';
import { GradientObject } from '../graphic/Gradient';
import { BrushScope, SVGVNodeAttrs } from './core';

// TODO: Consider deleting the same logic in ECharts and call this method?
const liftedColorCache = new LRU<string>(100);
function liftColor(color: GradientObject): GradientObject;
function liftColor(color: string): string;
function liftColor(color: string | GradientObject): string | GradientObject {
    if (isString(color)) {
        let liftedColor = liftedColorCache.get(color);
        if (!liftedColor) {
            liftedColor = colorTool.lift(color, -0.1);
            liftedColorCache.put(color, liftedColor);
        }
        return liftedColor;
    }
    else if (isGradientObject(color)) {
        const ret = extend({}, color) as GradientObject;
        ret.colorStops = map(color.colorStops, stop => ({
            offset: stop.offset,
            color: colorTool.lift(stop.color, -0.1)
        }));
        return ret;
    }
    // Change nothing.
    return color;
}

export function createCSSEmphasis(
    el: Displayable,
    attrs: SVGVNodeAttrs,
    scope: BrushScope
) {
    if (el.states.emphasis) {
        const empahsisStyle = el.states.emphasis.style;
        let fill = empahsisStyle.fill;
        if (!fill) {
            // No empahsis fill, lift color
            const normalFill = el.style.fill;
            const selectFill = el.states.select.style.fill;
            const fromFill = el.currentStates.indexOf('select') >= 0
                ? (selectFill || normalFill)
                : normalFill;
            if (fromFill) {
                fill = liftColor(fromFill);
            }
            else {
                // No fill information, ignore css
                return;
            }
        }
        const style = {
            cursor: 'pointer', // TODO: Should be included in el
            fill: fill,
            stroke: empahsisStyle.stroke,
            'stroke-width': empahsisStyle.lineWidth
        };
        const styleKey = JSON.stringify(style);
        let className = scope.cssStyleCache[styleKey];
        if (!className) {
            className = scope.zrId + '-cls-' + scope.cssClassIdx++;
            scope.cssStyleCache[styleKey] = className;
            scope.cssNodes['.' + className + ':hover'] = style;
        }
        attrs.class = attrs.class ? (attrs.class + ' ' + className) : className;
    }
}
