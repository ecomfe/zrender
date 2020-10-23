import { ImageLike } from '../core/types';

type CanvasPatternRepeat = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'

export interface PatternObject {
    id?: number

    type: 'pattern'

    image: ImageLike | string
    /**
     * svg element can only be used in svg renderer currently.
     * svgWidth, svgHeight defines width and height used for pattern.
     */
    svgElement: SVGElement
    svgWidth: number
    svgHeight: number

    repeat: CanvasPatternRepeat

    x?: number
    y?: number
    rotation?: number
    scaleX?: number
    scaleY?: number

    // Cached image. Which is created in the canvas painter.
    __image?: ImageLike
}

class Pattern {

    type: 'pattern'

    image: ImageLike | string
    /**
     * svg element can only be used in svg renderer currently.
     */
    svgElement: SVGElement

    repeat: CanvasPatternRepeat

    x: number
    y: number
    rotation: number
    scaleX: number
    scaleY: number

    constructor(image: ImageLike | string, repeat: CanvasPatternRepeat) {
        // Should do nothing more in this constructor. Because gradient can be
        // declard by `color: {image: ...}`, where this constructor will not be called.
        this.image = image;
        this.repeat = repeat;

        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
    }
}

export default Pattern;