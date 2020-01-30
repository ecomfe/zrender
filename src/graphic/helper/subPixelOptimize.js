/**
 * Sub-pixel optimize for canvas rendering, prevent from blur
 * when rendering a thin vertical/horizontal line.
 */

var round = Math.round;

/**
 * Sub pixel optimize line for canvas
 *
 * @param {Object} outputShape The modification will be performed on `outputShape`.
 *                 `outputShape` and `inputShape` can be the same object.
 *                 `outputShape` object can be used repeatly, because all of
 *                 the `x1`, `x2`, `y1`, `y2` will be assigned in this method.
 * @param {Object} [inputShape]
 * @param {number} [inputShape.x1]
 * @param {number} [inputShape.y1]
 * @param {number} [inputShape.x2]
 * @param {number} [inputShape.y2]
 * @param {Object} [style]
 * @param {number} [style.lineWidth] If `null`/`undefined`/`0`, do not optimize.
 */
export function subPixelOptimizeLine(outputShape, inputShape, style) {
    if (!inputShape) {
        return;
    }

    var x1 = inputShape.x1;
    var x2 = inputShape.x2;
    var y1 = inputShape.y1;
    var y2 = inputShape.y2;

    outputShape.x1 = x1;
    outputShape.x2 = x2;
    outputShape.y1 = y1;
    outputShape.y2 = y2;

    var lineWidth = style && style.lineWidth;
    if (!lineWidth) {
        return;
    }

    if (round(x1 * 2) === round(x2 * 2)) {
        outputShape.x1 = outputShape.x2 = subPixelOptimize(x1, lineWidth, true);
    }
    if (round(y1 * 2) === round(y2 * 2)) {
        outputShape.y1 = outputShape.y2 = subPixelOptimize(y1, lineWidth, true);
    }
}

/**
 * Sub pixel optimize rect for canvas
 *
 * @param {Object} outputShape The modification will be performed on `outputShape`.
 *                 `outputShape` and `inputShape` can be the same object.
 *                 `outputShape` object can be used repeatly, because all of
 *                 the `x`, `y`, `width`, `height` will be assigned in this method.
 * @param {Object} [inputShape]
 * @param {number} [inputShape.x]
 * @param {number} [inputShape.y]
 * @param {number} [inputShape.width]
 * @param {number} [inputShape.height]
 * @param {Object} [style]
 * @param {number} [style.lineWidth] If `null`/`undefined`/`0`, do not optimize.
 */
export function subPixelOptimizeRect(outputShape, inputShape, style) {
    if (!inputShape) {
        return;
    }

    var originX = inputShape.x;
    var originY = inputShape.y;
    var originWidth = inputShape.width;
    var originHeight = inputShape.height;

    outputShape.x = originX;
    outputShape.y = originY;
    outputShape.width = originWidth;
    outputShape.height = originHeight;

    var lineWidth = style && style.lineWidth;
    if (!lineWidth) {
        return;
    }

    outputShape.x = subPixelOptimize(originX, lineWidth, true);
    outputShape.y = subPixelOptimize(originY, lineWidth, true);
    outputShape.width = Math.max(
        subPixelOptimize(originX + originWidth, lineWidth, false) - outputShape.x,
        originWidth === 0 ? 0 : 1
    );
    outputShape.height = Math.max(
        subPixelOptimize(originY + originHeight, lineWidth, false) - outputShape.y,
        originHeight === 0 ? 0 : 1
    );
}

/**
 * Sub pixel optimize for canvas
 *
 * @param {number} position Coordinate, such as x, y
 * @param {number} lineWidth If `null`/`undefined`/`0`, do not optimize.
 * @param {boolean=} positiveOrNegative Default false (negative).
 * @return {number} Optimized position.
 */
export function subPixelOptimize(position, lineWidth, positiveOrNegative) {
    if (!lineWidth) {
        return position;
    }
    // Assure that (position + lineWidth / 2) is near integer edge,
    // otherwise line will be fuzzy in canvas.
    var doubledPosition = round(position * 2);
    return (doubledPosition + round(lineWidth)) % 2 === 0
        ? doubledPosition / 2
        : (doubledPosition + (positiveOrNegative ? 1 : -1)) / 2;
}
