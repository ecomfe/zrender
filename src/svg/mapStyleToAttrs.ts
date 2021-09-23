
import Path, { PathStyleProps } from '../graphic/Path';
import ZRImage, { ImageStyleProps } from '../graphic/Image';
import TSpan, { TSpanStyleProps } from '../graphic/TSpan';
import { normalizeLineDash } from '../graphic/helper/dashStyle';
import { map } from '../core/util';
import { normalizeColor } from './core';

type AllStyleOption = PathStyleProps | TSpanStyleProps | ImageStyleProps;

const NONE = 'none';
const mathRound = Math.round;

function pathHasFill(style: AllStyleOption): style is PathStyleProps {
    const fill = (style as PathStyleProps).fill;
    return fill != null && fill !== NONE;
}

function pathHasStroke(style: AllStyleOption): style is PathStyleProps {
    const stroke = (style as PathStyleProps).stroke;
    return stroke != null && stroke !== NONE;
}

export default function mapStyleToAttrs(
    updateAttr: (key: string, val: string) => void,
    style: AllStyleOption,
    el?: Path | TSpan | ZRImage
): void {
    const opacity = style.opacity == null ? 1 : style.opacity;

    // only set opacity. stroke and fill cannot be applied to svg image
    if (el instanceof ZRImage) {
        updateAttr('opacity', opacity + '');
        return;
    }

    if (pathHasFill(style)) {
        const fill = normalizeColor(style.fill as string);
        updateAttr('fill', fill.color);
        updateAttr(
            'fill-opacity',
            (style.fillOpacity != null
                ? style.fillOpacity * fill.opacity * opacity
                : fill.opacity * opacity
            ) + ''
        );
    }
    else {
        updateAttr('fill', NONE);
    }

    if (pathHasStroke(style)) {
        const stroke = normalizeColor(style.stroke as string);
        updateAttr('stroke', stroke.color);
        const strokeWidth = style.lineWidth;
        const strokeScale = style.strokeNoScale
            ? (el as Path).getLineScale()
            : 1;
        updateAttr('stroke-width', (strokeScale ? strokeWidth / strokeScale : 0) + '');
        // stroke then fill for text; fill then stroke for others
        updateAttr('paint-order', style.strokeFirst ? 'stroke' : 'fill');
        updateAttr('stroke-opacity', (
            style.strokeOpacity != null
                ? style.strokeOpacity * stroke.opacity * opacity
                : stroke.opacity * opacity
        ) + '');
        let lineDash = style.lineDash && strokeWidth > 0 && normalizeLineDash(style.lineDash, strokeWidth);
        if (lineDash) {
            let lineDashOffset = style.lineDashOffset;
            if (strokeScale && strokeScale !== 1) {
                lineDash = map(lineDash, function (rawVal) {
                    return rawVal / strokeScale;
                });
                if (lineDashOffset) {
                    lineDashOffset /= strokeScale;
                    lineDashOffset = mathRound(lineDashOffset);
                }
            }
            updateAttr('stroke-dasharray', lineDash.join(','));
            updateAttr('stroke-dashoffset', (lineDashOffset || 0) + '');
        }
        else {
            updateAttr('stroke-dasharray', NONE);
        }

        // PENDING
        style.lineCap && updateAttr('stroke-linecap', style.lineCap);
        style.lineJoin && updateAttr('stroke-linejoin', style.lineJoin);
        style.miterLimit && updateAttr('stroke-miterlimit', style.miterLimit + '');
    }
    else {
        updateAttr('stroke', NONE);
    }
}
