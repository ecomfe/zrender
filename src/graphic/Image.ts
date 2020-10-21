import Displayable, { DisplayableProps,
    CommonStyleProps,
    DEFAULT_COMMON_STYLE,
    DisplayableStatePropNames,
    DEFAULT_COMMON_ANIMATION_PROPS
} from './Displayable';
import BoundingRect from '../core/BoundingRect';
import { ImageLike, MapToType } from '../core/types';
import { defaults, createObject } from '../core/util';
import { ElementCommonState } from '../Element';

export interface ImageStyleProps extends CommonStyleProps {
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

export const DEFAULT_IMAGE_STYLE: CommonStyleProps = defaults({
    x: 0,
    y: 0
}, DEFAULT_COMMON_STYLE);

export const DEFAULT_IMAGE_ANIMATION_PROPS: MapToType<ImageProps, boolean> = {
    style: defaults<MapToType<ImageStyleProps, boolean>, MapToType<ImageStyleProps, boolean>>({
        x: true,
        y: true,
        width: true,
        height: true,
        sx: true,
        sy: true,
        sWidth: true,
        sHeight: true
    }, DEFAULT_COMMON_ANIMATION_PROPS.style)
 };

interface ImageProps extends DisplayableProps {
    style?: ImageStyleProps

    onload?: (image: ImageLike) => void
}

export type ImageState = Pick<ImageProps, DisplayableStatePropNames> & ElementCommonState

function isImageLike(source: unknown) {
    return source
        && typeof source !== 'string'
        // Image source is an image, canvas, video.
        && (source as HTMLImageElement).width && (source as HTMLImageElement).height;
}

class ZRImage extends Displayable<ImageProps> {

    style: ImageStyleProps

    // FOR CANVAS RENDERER
    __image: ImageLike
    // FOR SVG RENDERER
    __imageSrc: string

    onload: (image: ImageLike) => void

    /**
     * Create an image style object with default values in it's prototype.
     * @override
     */
    createStyle(obj?: ImageStyleProps) {
        return createObject(DEFAULT_IMAGE_STYLE, obj);
    }

    getWidth(): number {
        const style = this.style;
        const imageSource = style.image;
        if (isImageLike(imageSource)) {
            return (imageSource as HTMLImageElement).width;
        }

        if (!this.__image) {
            return 0;
        }

        let width = style.width;
        let height = style.height;
        if (width == null) {
            if (height == null) {
                return this.__image.width;
            }
            else {
                const aspect = this.__image.width / this.__image.height;
                return aspect * height;
            }
        }
        else {
            return width;
        }
    }

    getHeight(): number {
        const style = this.style;
        const imageSource = style.image;
        if (isImageLike(imageSource)) {
            return (imageSource as HTMLImageElement).height;
        }

        if (!this.__image) {
            return 0;
        }

        let width = style.width;
        let height = style.height;
        if (height == null) {
            if (width == null) {
                return this.__image.height;
            }
            else {
                const aspect = this.__image.height / this.__image.width;
                return aspect * width;
            }
        }
        else {
            return height;
        }
    }

    getAnimationStyleProps() {
        return DEFAULT_IMAGE_ANIMATION_PROPS;
    }

    getBoundingRect(): BoundingRect {
        const style = this.style;
        if (!this._rect) {
            this._rect = new BoundingRect(
                style.x || 0, style.y || 0, this.getWidth(), this.getHeight()
            );
        }
        return this._rect;
    }
}

ZRImage.prototype.type = 'image';

export default ZRImage;