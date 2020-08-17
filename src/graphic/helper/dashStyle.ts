import { isArray, isNumber, isString } from '../../core/util';

function normalizeDashArray(lineType: any): number[] | false {
    if (!lineType || lineType === 'solid'
        || (isString(lineType) && lineType !== 'dashed' && lineType !== 'dotted')) {
        return [];
    }
    if (isArray(lineType)) {
        return lineType;
    }
    if (isNumber(lineType)) {
        return [lineType];
    }
}

export function normalizeLineDash(lineType: any, lineWidth?: number): number[] | false {
    if (lineWidth != null && lineWidth <= 0) {
        return [];
    }
    const dashArray = normalizeDashArray(lineType);
    if (dashArray) {
        return dashArray;
    }
    lineWidth = lineWidth || 1;
    return lineType === 'dashed' 
        ? [2 * lineWidth, lineWidth]
        : lineType === 'dotted' 
            ? [lineWidth]
            : [];
}