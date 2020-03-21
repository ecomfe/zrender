import Displayable, { DisplayableProps, CommonStyleProps, DEFAULT_COMMON_STYLE } from './Displayable';
import BoundingRect from '../core/BoundingRect';
import { ImageLike } from '../core/types';
import { defaults } from '../core/util';

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

interface ImageProps extends DisplayableProps {
    style?: ImageStyleProps

    onload?: (image: ImageLike) => void
}

class ZRImage extends Displayable<ImageProps> {
    type = 'image'

    style: ImageStyleProps

    // FOR CANVAS RENDERER
    __image: ImageLike
    // FOR SVG RENDERER
    __imageSrc: string

    onload: (image: ImageLike) => void

    useStyle(obj: ImageStyleProps, inherited?: ImageStyleProps) {
        this.innerUseStyle(obj, inherited || DEFAULT_IMAGE_STYLE);
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

export default ZRImage;