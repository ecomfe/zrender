import {DecalObject, DecalDashArrayX, DecalDashArrayY} from '../Decal';
import Pattern, {PatternObject} from '../Pattern';
import {createCanvas, getLeastCommonMultiple, map} from '../../core/util';

const decalDefaults: DecalObject = {
    shape: 'rect',
    image: null,
    symbolSize: 1,
    symbolKeepAspect: true,
    color: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: null,
    dashArrayX: [20, 5],
    dashArrayY: [10, 2],
    dashLineOffset: 0
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
    const dashArrayX = normalizeDashArrayX(decalObject.dashArrayX);
    const dashArrayY = normalizeDashArrayY(decalObject.dashArrayY);

    const lineBlockLengthsX = getLineBlockLengthX(dashArrayX);
    const lineBlockLengthY = getLineBlockLengthY(dashArrayY);

    const canvas = createCanvas();
    const pSize = getPatternSize();

    canvas.width = pSize.width;
    canvas.height = pSize.height;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    const ctx = canvas.getContext('2d');

    brush();

    const base64 = canvas.toDataURL();

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
        const offsetMultipleX = decalObject.dashLineOffset || 1;
        let width = 1;
        for (let i = 0, xlen = lineBlockLengthsX.length; i < xlen; ++i) {
            const x = getLeastCommonMultiple(offsetMultipleX * xlen, lineBlockLengthsX[i]);
            width = getLeastCommonMultiple(width, x);
        }
        const height = lineBlockLengthY * width / offsetMultipleX;

        return {
            width: Math.max(1, Math.min(width, canvasWidth)),
            height: Math.max(1, Math.min(height, canvasHeight))
        };
    }

    function fixStartPosition(lineOffset: number, blockLength: number) {
        let start = lineOffset || 0;
        while (start > 0) {
            start -= blockLength;
        }
        return start;
    }

    function brush() {
        ctx.fillStyle = '#000';

        let yCnt = 0;
        let y = 0;
        let yId = 0;
        let xId0 = 0;
        while (y < pSize.height) {
            if (yId % 2 === 0) {
                let x = fixStartPosition(
                    decalObject.dashLineOffset * yCnt / 2,
                    lineBlockLengthsX[0]
                );
                let xId1 = 0;
                while (x < pSize.width) {
                    if (xId1 % 2 === 0) {
                        // E.g., [15, 5, 20, 5] draws only for 15 and 20
                        ctx.fillRect(
                            x,
                            y,
                            dashArrayX[xId0][xId1],
                            dashArrayY[yId]
                        );
                    }

                    x += dashArrayX[xId0][xId1];
                    ++xId1;
                    if (xId1 === dashArrayX[xId0].length) {
                        xId1 = 0;
                    }
                }

                ++xId0;
                if (xId0 === dashArrayX.length) {
                    xId0 = 0;
                }
            }

            ++yCnt;
            y += dashArrayY[yId];

            ++yId;
            if (yId === dashArrayY.length) {
                yId = 0;
            }
        }

        ctx.strokeStyle = 'red';
        ctx.strokeRect(0, 0, pSize.width, pSize.height);
    }

}

/**
 * Convert dash input into dashArray
 *
 * @param {DecalDashArrayX} dash dash input
 * @return {number[][]} normolized dash array
 */
function normalizeDashArrayX(dash: DecalDashArrayX): number[][] {
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
            result.push((dash[i] as number[]).slice());
        }
    }
    return result;
}

/**
 * Convert dash input into dashArray
 *
 * @param {DecalDashArrayY} dash dash input
 * @return {number[]} normolized dash array
 */
function normalizeDashArrayY(dash: DecalDashArrayY): number[] {
    if (!dash || typeof dash === 'object' && dash.length === 0) {
        return [0, 0];
    }
    if (typeof dash === 'number') {
        return [dash, dash];
    }
    return dash.length % 2 ? dash.concat(dash) : dash.slice();
}

/**
 * Get block length of each line. A block is the length of dash line and space.
 * For example, a line with [4, 1] has a dash line of 4 and a space of 1 after
 * that, so the block length of this line is 5.
 *
 * @param {number[][]} dash dash arrary of X or Y
 * @return {number[]} block length of each line
 */
function getLineBlockLengthX(dash: number[][]): number[] {
    return map(dash, function (line) {
        return getLineBlockLengthY(line);
    });
}

function getLineBlockLengthY(dash: number[]): number {
    let blockLength = 0;
    for (let i = 0; i < dash.length; ++i) {
        blockLength += dash[i];
    }
    if (dash.length % 2 === 1) {
        // [4, 2, 1] means |----  -    -- |----  -    -- |
        // So total length is (4 + 2 + 1) * 2
        return blockLength * 2;
    }
    return blockLength;
}
