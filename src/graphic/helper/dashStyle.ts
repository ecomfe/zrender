import { isArray, isNumber } from '../../core/util';

export function normalizeLineDash(lineType: any, lineWidth?: number): number[] | false {
    if (!lineType || lineType === 'solid' || !(lineWidth > 0)) {
        return null;
    }
    lineWidth = lineWidth || 1;
    return lineType === 'dashed'
        ? [4 * lineWidth, 2 * lineWidth]
        : lineType === 'dotted'
            ? [lineWidth]
            : isNumber(lineType)
                ? [lineType] : isArray(lineType) ? lineType : null;
}