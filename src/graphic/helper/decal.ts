import {DecalObject, DecalDashArray} from '../Decal';
import Pattern, {PatternObject} from '../Pattern';
import {createCanvas, getLeastCommonMultiple} from '../../core/util';

const decalDefaults: DecalObject = {
    shape: 'rect',
    image: null,
    symbolSize: 1,
    symbolKeepAspect: true,
    color: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: null,
    dashArrayX: [20, 5],
    dashArrayY: [10, 2],
    dashOffsetX: 0,
    dashOffsetY: 0
};

/**
 * Create or update pattern image from decal options
 *
 * @param {DecalObject} decalObject decal options
 * @param {number} canvasWidth canvas width of the zrender
 * @param {number} canvasHeight canvas height of the zrender
 * @return {Pattern} pattern with generated image
 */
export function createOrUpdatePatternFromDecal(
    decalObject: DecalObject,
    canvasWidth: number,
    canvasHeight: number
): PatternObject {
    const dashArrayX = normalizeDashArray(decalObject.dashArrayX);
    const dashArrayY = normalizeDashArray(decalObject.dashArrayY);
    console.log(dashArrayX, dashArrayY);

    const lineBlockLengthsX = getLineBlockLength(dashArrayX);
    const lineBlockLengthsY = getLineBlockLength(dashArrayY);

    const canvas = createCanvas();
    const pSize = getPatternSize();
    console.log(pSize);

    canvas.width = pSize.width;
    canvas.height = pSize.height;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    const ctx = canvas.getContext('2d');

    brush();

    const base64 = canvas.toDataURL();
    console.log(base64);

    return new Pattern(base64, 'repeat');

    /**
     * Get minumum length that can make a repeatable pattern.
     *
     * @return {Object} pattern width and height
     */
    function getPatternSize(): {width: number, height: number} {
        /**
         * For example, if dash is [[3, 2], [2, 1]] for X, it looks like
         * |---  ---  ---  ---  --- ...
         * |-- -- -- -- -- -- -- -- ...
         * |---  ---  ---  ---  --- ...
         * |-- -- -- -- -- -- -- -- ...
         * So the minumum length of X is 15,
         * which is the least common multiple of `3 + 2` and `2 + 1`
         * |---  ---  ---  |---  --- ...
         * |-- -- -- -- -- |-- -- -- ...
         *
         * When consider with dashLineOffset, it means the `n`th line has the offset
         * of `n * dashLineOffset`.
         * For example, if dash is [[3, 1], [1, 1]] and dashLineOffset is 3,
         * and use `=` for the start to make it clear, it looks like
         * |=-- --- --- --- --- -...
         * | - = - - - - - - - - ...
         * |- --- =-- --- --- -- ...
         * | - - - - = - - - - - ...
         * |--- --- --- =-- --- -...
         * | - - - - - - - = - - ...
         * In this case, the minumum length is 12, which is the least common
         * multiple of `3 + 1`, `1 + 1` and `3 * 2` where `2` is xlen
         * |=-- --- --- |--- --- -...
         * | - = - - - -| - - - - ...
         * |- --- =-- --|- --- -- ...
         * | - - - - = -| - - - - ...
         */
        const offsetMultipleX = decalObject.dashLineOffsetX || 1;
        const offsetMultipleY = decalObject.dashLineOffsetY || 1;
        let width = 1;
        let height = 1;
        let xRepeats = 1;
        let yRepeats = 1;
        for (let i = 0, xlen = lineBlockLengthsX.length; i < xlen; ++i) {
            const x = getLeastCommonMultiple(offsetMultipleX * xlen, lineBlockLengthsX[i]);
            width = getLeastCommonMultiple(width, x);
            yRepeats = getLeastCommonMultiple(yRepeats, offsetMultipleX * xlen * lineBlockLengthsX[i] / x);
        }
        for (let j = 0, ylen = lineBlockLengthsY.length; j < ylen; ++j) {
            const y = getLeastCommonMultiple(offsetMultipleY * ylen, lineBlockLengthsY[j]);
            height = getLeastCommonMultiple(height, y);
            xRepeats = getLeastCommonMultiple(xRepeats, offsetMultipleY * ylen * lineBlockLengthsY[j] / y);
        }

        return {
            width: Math.max(1, Math.min(width * xRepeats, canvasWidth)),
            height: Math.max(1, Math.min(height * yRepeats, canvasHeight))
        };
    }

    function brush() {
        ctx.fillStyle = '#000';
        // debugger;


        ctx.strokeStyle = 'red';
        ctx.strokeRect(0, 0, pSize.width, pSize.height);
    }

}

/**
 * Convert dash input into dashArray
 *
 * @param {DecalDashArray} dash dash input
 * @return {number[][]} normolized dash array
 */
function normalizeDashArray(dash: DecalDashArray): number[][] {
    if (!dash || typeof dash === 'object' && dash.length === 0) {
        return [[0, 0]];
    }
    if (typeof dash === 'number') {
        return [[dash, dash]];
    }

    const result: number[][] = [];
    for (let i = 0; i < dash.length; ++i) {
        if (typeof dash[i] === 'number') {
            result.push([dash[i] as number, dash[i] as number]);
        }
        else if ((dash[i] as number[]).length % 2 === 1) {
            // [4, 2, 1] means |----  -    -- |----  -    -- |
            // so normalize it to be [4, 2, 1, 4, 2, 1]
            result.push((dash[i] as number[]).concat(dash[i]));
        }
        else {
            result.push(dash[i] as number[]);
        }
    }
    return result;
}

/**
 * Get block length of each line. A block is the length of dash line and space.
 * For example, a line with [4, 1] has a dash line of 4 and a space of 1 after
 * that, so the block length of this line is 5.
 *
 * @param {number[][]} dash dash arrary of X or Y
 * @return {number[]} block length of each line
 */
function getLineBlockLength(dash: number[][]): number[] {
    const lineBlockLengths = [];
    for (var i = 0; i < dash.length; ++i) {
        // basicLength is the length of dash line and space for a line
        let basicLength = 0;
        if (dash[i].length === 1) {
            // [0] is for |--------| whose block length is 1
            // [2] is for |--  --  | whose block length is 4
            basicLength = dash[i][0] === 0 ? 1 : dash[i][0] * 2;
        }
        else {
            for (var j = 0; j < dash[i].length; ++j) {
                basicLength += dash[i][j];
            }
            if (dash[i].length % 2 === 1) {
                // [4, 2, 1] means |----  -    -- |----  -    -- |
                // So total length is (4 + 2 + 1) * 2
                basicLength += basicLength;
            }
        }

        lineBlockLengths.push(basicLength);
    }
    return lineBlockLengths;
}
