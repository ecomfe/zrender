/**
 * Image element
 * @module zrender/graphic/Image
 */

define(function (require) {

    var Displayable = require('./Displayable');
    var BoundingRect = require('../core/BoundingRect');
    var zrUtil = require('../core/util');
    var roundRectHelper = require('./helper/roundRect');

    /**
     * @alias zrender/graphic/Image
     * @extends module:zrender/graphic/Displayable
     * @constructor
     * @param {Object} opts
     */
    var ZImage = function (opts) {
        Displayable.call(this, opts);
    };

    ZImage.prototype = {

        constructor: ZImage,

        type: 'image',

        brush: function (ctx) {
            var style = this.style;
            var image = style.image;
            var self = this;

            // FIXME Case create many images with src
            if (!this._imageCache) {
                this._imageCache = {};
            }
            if (typeof(image) === 'string') {
                var src = image;
                if (this._imageCache[src]) {
                    image = this._imageCache[src];
                } else {
                    image = new Image();
                    image.onload = function () {
                        image.onload = null;
                        self.dirty();
                    };

                    image.src = src;
                    this._imageCache[src] = image;
                }
            }
            if (image) {
                // 图片已经加载完成
                if (image.nodeName.toUpperCase() == 'IMG') {
                    if (! image.complete) {
                        return;
                    }
                }
                // Else is canvas

                var width = style.width || image.width;
                var height = style.height || image.height;
                var x = style.x || 0;
                var y = style.y || 0;
                // 图片加载失败
                if (!image.width || !image.height) {
                    return;
                }

                ctx.save();

                style.bind(ctx);

                // 设置transform
                this.setTransform(ctx);

                if (style.r) {
                    // Border radius clipping
                    // FIXME
                    ctx.beginPath();
                    roundRectHelper.buildPath(ctx, style);
                    ctx.clip();
                }

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

                // 如果没设置宽和高的话自动根据图片宽高设置
                if (style.width == null) {
                    style.width = width;
                }
                if (style.height == null) {
                    style.height = height;
                }

                // Draw rect text
                if (style.text) {
                    this.drawRectText(ctx, this.getBoundingRect());
                }

                ctx.restore();
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

    return ZImage;
});