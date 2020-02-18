import Displayable, { DisplayableProps } from './Displayable';
import BoundingRect from '../core/BoundingRect';
import * as imageHelper from './helper/image';
import Style, { StyleProps } from './Style';
import { ImageLike } from '../core/types';

class ImageStyle extends Style {
    image: string | ImageLike
    width?: number
    height?: number
    sx?: number
    sy?: number
    sWidth?: number
    sHeight?: number
}

// TODO
class ImageStyleProps extends StyleProps {
    image?: string | ImageLike
    width?: number
    height?: number
    sx?: number
    sy?: number
    sWidth?: number
    sHeight?: number
}

interface ZImageOption extends DisplayableProps {
    style?: ImageStyleProps,
    onload?: (image: ImageLike) => void
}

export default class ZImage extends Displayable<ZImageOption> {
    type = 'image'

    private _image: ImageLike

    style: ImageStyle

    // FOR SVG RENDERER
    __imageSrc: string

    onload: (image: ImageLike) => void

    brush(ctx: CanvasRenderingContext2D, prevEl: Displayable) {
        const style = this.style;
        const src = <string>style.image;

        // Must bind each time
        style.bind(ctx, this as unknown as Displayable, prevEl);

        const image = this._image = imageHelper.createOrUpdateImage(
            style.image,
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

        const x = style.x || 0;
        const y = style.y || 0;
        let width = style.width;
        let height = style.height;
        const aspect = image.width / image.height;
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
            const sx = style.sx || 0;
            const sy = style.sy || 0;
            ctx.drawImage(
                image,
                sx, sy, style.sWidth, style.sHeight,
                x, y, width, height
            );
        }
        else if (style.sx && style.sy) {
            const sx = style.sx;
            const sy = style.sy;
            const sWidth = width - sx;
            const sHeight = height - sy;
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
    }

    getBoundingRect(): BoundingRect {
        const style = this.style;
        if (!this._rect) {
            this._rect = new BoundingRect(
                style.x || 0, style.y || 0, style.width || 0, style.height || 0
            );
        }
        return this._rect;
    }
}