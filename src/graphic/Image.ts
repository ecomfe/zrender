import Displayable, { DisplayableOption } from './Displayable';
import BoundingRect from '../core/BoundingRect';
import * as zrUtil from '../core/util';
import { PropType, AllPropTypes, ImageLike } from '../core/types';
import { ElementOption } from '../Element';

export interface ImageStyleOption {
    image?: string | ImageLike
    width?: number
    height?: number
    x?: number
    y?: number
    sx?: number
    sy?: number
    sWidth?: number
    sHeight?: number

    shadowBlur?: number
    shadowOffsetX?: number
    shadowOffsetY?: number
    shadowColor?: string

    opacity?: number
    blend?: string
}


interface ImageOption extends DisplayableOption {
    style?: ImageStyleOption
}

interface ZImage {
    constructor(opts?: ImageOption): void

    attr(key: ImageOption): ZImage
    attr(key: keyof ImageOption, value: AllPropTypes<ImageOption>): ZImage

    setStyle(key: ImageStyleOption): ZImage
    setStyle(key: keyof ImageStyleOption, value: AllPropTypes<ImageStyleOption>): ZImage

    useStyle(obj: ImageStyleOption): void
}

class ZImage extends Displayable {
    type = 'image'

    style: ImageStyleOption

    // FOR CANVAS RENDERER
    __image: ImageLike
    // FOR SVG RENDERER
    __imageSrc: string

    onload: (image: ImageLike) => void

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

export default ZImage;