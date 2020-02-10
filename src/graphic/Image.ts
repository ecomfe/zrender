import Displayable, { DisplayableOption, CommonStyleOption, DEFAULT_COMMON_STYLE } from './Displayable';
import BoundingRect from '../core/BoundingRect';
import { PropType, AllPropTypes, ImageLike } from '../core/types';
import { defaults, extend } from '../core/util';

export interface ImageStyleOption extends CommonStyleOption {
    image?: string | ImageLike
    x?: number
    y?: number
    width?: number
    height?: number
    sx?: number
    sy?: number
    sWidth?: number
    sHeight?: number
}

export const DEFAULT_IMAGE_STYLE: CommonStyleOption = defaults({
    x: 0,
    y: 0
}, DEFAULT_COMMON_STYLE);

class StyleCtor {}
StyleCtor.prototype = DEFAULT_IMAGE_STYLE;
interface ImageOption extends DisplayableOption {
    style?: ImageStyleOption
}

interface ZImage {
    constructor(opts?: ImageOption): void

    attr(key: ImageOption): ZImage
    attr(key: keyof ImageOption, value: AllPropTypes<ImageOption>): ZImage

    setStyle(key: ImageStyleOption): ZImage
    setStyle(key: keyof ImageStyleOption, value: AllPropTypes<ImageStyleOption>): ZImage
}

class ZImage extends Displayable {
    type = 'image'

    style: ImageStyleOption

    // FOR CANVAS RENDERER
    __image: ImageLike
    // FOR SVG RENDERER
    __imageSrc: string

    onload: (image: ImageLike) => void

    useStyle(obj: ImageStyleOption) {
        this.style = new StyleCtor();
        extend(this.style, obj);

        this.dirtyStyle();
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

export default ZImage;