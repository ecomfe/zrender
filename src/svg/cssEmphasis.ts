import Displayable from '../graphic/Displayable';
import { liftColor } from '../tool/color';
import { BrushScope, SVGVNodeAttrs } from './core';
import { getClassId } from './cssClassId';

export function createCSSEmphasis(
    el: Displayable,
    attrs: SVGVNodeAttrs,
    scope: BrushScope
) {
    if (!el.ignore && el.__metaData) {
        const emphasisStyle = el.states.emphasis && el.states.emphasis.style
            ? el.states.emphasis.style
            : {};
        let fill = emphasisStyle.fill;
        if (!fill) {
            // No empahsis fill, lift color
            const normalFill = el.style && el.style.fill;
            const selectFill = el.states.select
                && el.states.select.style
                && el.states.select.style.fill;
            const fromFill = el.currentStates.indexOf('select') >= 0
                ? (selectFill || normalFill)
                : normalFill;
            if (fromFill) {
                fill = liftColor(fromFill);
            }
        }
        let lineWidth = emphasisStyle.lineWidth;
        if (lineWidth) {
            // Symbols use transform to set size, so lineWidth
            // should be divided by scaleX
            const scaleX = (!emphasisStyle.strokeNoScale && el.transform)
                ? el.transform[0]
                : 1;
            lineWidth = lineWidth / scaleX;
        }
        const style = {
            cursor: 'pointer', // TODO: Should this be customized?
        } as any;
        if (fill) {
            style.fill = fill;
        }
        if (emphasisStyle.stroke) {
            style.stroke = emphasisStyle.stroke;
        }
        if (lineWidth) {
            style['stroke-width'] = lineWidth;
        }
        const styleKey = JSON.stringify(style);
        let className = scope.cssStyleCache[styleKey];
        if (!className) {
            className = scope.zrId + '-cls-' + getClassId();
            scope.cssStyleCache[styleKey] = className;
            scope.cssNodes['.' + className + ':hover'] = style;
        }
        attrs.class = attrs.class ? (attrs.class + ' ' + className) : className;
    }
}
