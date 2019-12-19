/**
 * Mixin for drawing text in a element bounding rect
 * @module zrender/mixin/RectText
 */

import * as textHelper from '../helper/text';
import BoundingRect from '../../core/BoundingRect';
import {WILL_BE_RESTORED} from '../constant';

var tmpRect = new BoundingRect();

var RectText = function () {};

RectText.prototype = {

    constructor: RectText,

    /**
     * Draw text in a rect with specified position.
     * @param  {CanvasRenderingContext2D} ctx
     * @param  {Object} rect Displayable rect
     */
    drawRectText: function (ctx, rect) {
        var style = this.style;

        rect = style.textRect || rect;

        // Optimize, avoid normalize every time.
        this.__dirty && textHelper.normalizeTextStyle(style, true);

        var text = style.text;

        // Convert to string
        text != null && (text += '');

        if (!textHelper.needDrawText(text, style)) {
            return;
        }

        // FIXME
        // Do not provide prevEl to `textHelper.renderText` for ctx prop cache,
        // but use `ctx.save()` and `ctx.restore()`. Because the cache for rect
        // text propably break the cache for its host elements.
        ctx.save();

        // Transform rect to view space
        var transform = this.transform;
        if (!style.transformText) {
            if (transform) {
                tmpRect.copy(rect);
                tmpRect.applyTransform(transform);
                rect = tmpRect;
            }
        }
        else {
            this.setTransform(ctx);
        }

        // transformText and textRotation can not be used at the same time.
        textHelper.renderText(this, ctx, text, style, rect, WILL_BE_RESTORED);

        ctx.restore();
    }
};

export default RectText;