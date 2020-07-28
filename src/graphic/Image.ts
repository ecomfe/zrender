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

    protected _getAnimationStyleProps() {
        return DEFAULT_IMAGE_ANIMATION_PROPS;
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

ZRImage.prototype.type = 'image';

export default ZRImage;