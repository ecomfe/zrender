import Displayable, { DisplayableOption } from './Displayable';
import BoundingRect from '../core/BoundingRect';
import * as zrUtil from '../core/util';
import * as imageHelper from './helper/image';
import Style, { StyleOption } from './Style';
import { PropType, AllPropTypes, ImageLike } from '../core/types';
import { ElementOption } from '../Element';

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
class ImageStyleOption extends StyleOption {
    image: string | ImageLike
    width?: number
    height?: number
    sx?: number
    sy?: number
    sWidth?: number
    sHeight?: number
}

interface ZImageOption extends DisplayableOption {
    style?: ImageStyleOption
}

export default class ZImage extends Displayable {
    type = 'image'

    private _image: ImageLike

    style: ImageStyle

    // FOR SVG RENDERER
    __imageSrc: string

    onload: (image: ImageLike) => void

    constructor(opts?: ZImageOption) {
        super(opts);
    }

    brush(ctx: CanvasRenderingContext2D, prevEl: Displayable) {
        const style = this.style;
        const src = <string>style.image;

        // Must bind each time
        style.bind(ctx, this, prevEl);

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

    attr(key: ZImageOption): ZImage
    attr(key: keyof ZImageOption, value: AllPropTypes<ZImageOption>): ZImage
    attr(key: (keyof ZImageOption) | ZImageOption, value?: AllPropTypes<ZImageOption>) {
        // TODO Displayable should overrite `attr` of Element?
        // TODO Should simply use string?
        return super.attr(key as keyof ElementOption, value);
    }

    setStyle(key: (keyof ImageStyleOption) | ImageStyleOption, value?: AllPropTypes<ImageStyleOption>) {
        return super.setStyle(key, value as AllPropTypes<StyleOption>);
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