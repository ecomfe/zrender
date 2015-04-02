define(function (require) {
    
    if (require('../core/env').canvasSupported) {
        return;
    }

    var ZImage = require('../graphic/Image');
    var vmlCore = require('./core');
    var vec2 = require('../core/vector');
    var round = Math.round;
    var applyTransform = vec2.applyTransform;
    var mathMax = Math.max;

    var Z = 10;
    var W = 10;
    var H = 10;
    var Z2 = Z / 2;

    var commma = ',';

    var imageTransformPrefix = 'progid:DXImageTransform.Microsoft';

    function isImage(img) {
        // FIXME img instanceof Image IE8 下会报错
        // return img instanceof Image;
        return (img instanceof Object) && img.tagName && img.tagName.toUpperCase() == 'IMG';
    }

    // Rewrite the original path method
    ZImage.prototype.brush = function (vmlRoot) {
        var style = this.style;
        var image = style.image;

        // Image original width, height
        var ow;
        var oh;

        if (isImage(image)) {
            var imageRuntimeStyle = image.runtimeStyle;
            var oldRuntimeWidth = imageRuntimeStyle.width;
            var oldRuntimeHeight = imageRuntimeStyle.height;
            imageRuntimeStyle.width = 'auto';
            imageRuntimeStyle.height = 'auto';

            // get the original size
            ow = image.width;
            oh = image.height;

            // and remove overides
            imageRuntimeStyle.width = oldRuntimeWidth;
            imageRuntimeStyle.height = oldRuntimeHeight;

            image = image.src;
        }
        if (! image) {
            return;
        }

        var x = style.x || 0;
        var y = style.y || 0;

        var dw = style.width;
        var dh = style.height;

        var sw = style.sWidth;
        var sh = style.sHeight;
        var sx = style.sx || 0;
        var sy = style.sy || 0;

        var hasCrop = sw && sh;

        var vmlEl = this.__vmlEl;
        if (! vmlEl) {
            // FIXME 使用 group 在 left, top 都不是 0 的时候就无法显示了。
            // vmlEl = vmlCore.createNode('group');
            vmlEl = vmlCore.doc.createElement('div');
            vmlEl.style.cssText = 'position:absolute;width:' + W + 'px;height:' + H + 'px;';
            // FIXME Why Z2 ?
            vmlEl.coordsize = Z2 * W + ' '  + Z2 * H;
            vmlEl.coordorigin = '0 0';

            vmlRoot.appendChild(vmlEl);
        }

        var vmlElStyle = vmlEl.style;
        var hasRotation = false;
        var m;
        var scaleX = this.scale[0];
        var scaleY = this.scale[1];
        if (this.needTransform) {
            m = this.transform;
            hasRotation = m[0] != scaleX || m[1] || m[3] != scaleY || m[2];
        }
        if (hasRotation) {
            // If filters are necessary (rotation exists), create them
            // filters are bog-slow, so only create them if abbsolutely necessary
            // The following check doesn't account for skews (which don't exist
            // in the canvas spec (yet) anyway.
            // From excanvas
            var p0 = [x, y];
            var p1 = [x + dw, y];
            var p2 = [x, y + dh];
            var p3 = [x + dw, y + dh];
            applyTransform(p0, p0, m);
            applyTransform(p1, p1, m);
            applyTransform(p2, p2, m);
            applyTransform(p3, p3, m);

            var maxX = mathMax(p0[0], p1[0], p2[0], p3[0]);
            var maxY = mathMax(p0[1], p1[1], p2[1], p3[1]);

            var transformFilter = [];
            transformFilter.push('M11=', m[0] / scaleX, commma,
                        'M12=', m[2] / scaleY, commma,
                        'M21=', m[1] / scaleX, commma,
                        'M22=', m[3] / scaleY, commma,
                        'Dx=', round(x + m[4]), commma,
                        'Dy=', round(y + m[5]));

            vmlElStyle.padding = '0 ' + round(maxX) + 'px ' + round(maxY) + 'px 0';
            // FIXME DXImageTransform 在 IE11 的兼容模式下不起作用
            vmlElStyle.filter = imageTransformPrefix + '.Matrix('
                + transformFilter.join('') + ', SizingMethod=clip)';
            
        }
        else {
            if (m) {
                x += m[4];
                y += m[5];
            }
            vmlElStyle.filter = '';
            vmlElStyle.left = round(x) + 'px';
            vmlElStyle.top = round(y) + 'px';
        }

        var imageEl = this._imageEl;
        var cropEl = this._cropEl;

        if (! imageEl) {
            imageEl = vmlCore.doc.createElement('div');
            this._imageEl = imageEl;
        }
        var imageELStyle = imageEl.style;
        if (hasCrop) {
            // Needs know image original width and height
            if (! (ow && oh)) {
                var tmpImage = new Image();
                tmpImage.onload = function () {
                    tmpImage.onload = null;
                    // Adjust image width and height to fit the ratio destinationSize / sourceSize
                    imageELStyle.width = round(scaleX * tmpImage.width * dw / sw) + 'px';
                    imageELStyle.height = round(scaleY * tmpImage.height * dh / sh) + 'px';
                }
                tmpImage.src = image;
            }
            else {
                imageELStyle.width = round(scaleX * ow * dw / sw) + 'px';
                imageELStyle.height = round(scaleY * oh * dh / sh) + 'px';
            }

            if (! cropEl) {
                cropEl = vmlCore.doc.createElement('div');
                cropEl.style.overflow = 'hidden';
                this._cropEl = cropEl;
            }
            var cropElStyle = cropEl.style;
            cropElStyle.width = round((dw + sx * dw / sw) * scaleX);
            cropElStyle.height = round((dh + sy * dh / sh) * scaleY);
            cropElStyle.filter = imageTransformPrefix + '.Matrix(Dx='
                    + (-sx * dw / sw * scaleX) + ',Dy=' + (-sy * dh / sh * scaleY) + ')';

            if (! cropEl.parentNode) {
                vmlEl.appendChild(cropEl);
            }
            if (imageEl.parentNode != cropEl) {
                cropEl.appendChild(imageEl);
            }
        }
        else {
            imageELStyle.width = round(scaleX * dw) + 'px';
            imageELStyle.height = round(scaleY * dh) + 'px';

            vmlEl.appendChild(imageEl);

            if (cropEl && cropEl.parentNode) {
                vmlEl.removeChild(cropEl);
                this._cropEl = null;
            }
        }

        var filterStr = '';
        var alpha = style.opacity;
        if (alpha < 1) {
            filterStr += '.Alpha(opacity=' + round(alpha * 100) + ') ';
        }
        filterStr += imageTransformPrefix + '.AlphaImageLoader(src=' + image + ', SizingMethod=scale)';

        imageELStyle.filter = filterStr;
    };

    ZImage.prototype.dispose = function () {
        this._cropEl = null;
        this._imageEl = null;
    };
});