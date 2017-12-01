import Displayable from './Displayable';
import BoundingRect from '../core/BoundingRect';
import * as zrUtil from '../core/util';
import * as imageHelper from './helper/image';

/**
 * @alias zrender/graphic/Image
 * @extends module:zrender/graphic/Displayable
 * @constructor
 * @param {Object} opts
 */
function ZImage(opts) {
    Displayable.call(this, opts);
}

ZImage.prototype = {

    constructor: ZImage,

    type: 'image',

    brush: function (ctx, prevEl) {
        var style = this.style;
        var src = style.image;

        // Must bind each time
        style.bind(ctx, this, prevEl);

        var image = this._image = imageHelper.createOrUpdateImage(
            src,
            this._image,
            this,
            this.onload
        );

        if (!image || !imageHelper.isImageReady(image)) {
            return;
        }

        // 图片已经加载完成
        // if (image.nodeName.toUpperCase() == 'IMG') {
        //     if (!image.complete) {
        //         return;
        //     }
        // }
        // Else is canvas

        var x = style.x || 0;
        var y = style.y || 0;
        var width = style.width;
        var height = style.height;
        var aspect = image.width / image.height;
        if (width == null && height != null) {
            // Keep image/height ratio
            width = height * aspect;
        }
        else if (height == null && width != null) {
            height = width / aspect;
        }
        else if (width == null && height == null) {
            width = image.width;
            height = image.height;
        }

        // 设置transform
        this.setTransform(ctx);

        if (style.sWidth && style.sHeight) {
            var sx = style.sx || 0;
            var sy = style.sy || 0;
            ctx.drawImage(
                image,
                sx, sy, style.sWidth, style.sHeight,
                x, y, width, height
            );
        }
        else if (style.sx && style.sy) {
            var sx = style.sx;
            var sy = style.sy;
            var sWidth = width - sx;
            var sHeight = height - sy;
            ctx.drawImage(
                image,
                sx, sy, sWidth, sHeight,
                x, y, width, height
            );
        }
        else {
            ctx.drawImage(image, x, y, width, height);
        }

        // Draw rect text
        if (style.text != null) {
            // Only restore transform when needs draw text.
            this.restoreTransform(ctx);    
            this.drawRectText(ctx, this.getBoundingRect());
        }
    },

    getBoundingRect: function () {
        var style = this.style;
        if (! this._rect) {
            this._rect = new BoundingRect(
                style.x || 0, style.y || 0, style.width || 0, style.height || 0
            );
        }
        return this._rect;
    }
};

zrUtil.inherits(ZImage, Displayable);

export default ZImage;