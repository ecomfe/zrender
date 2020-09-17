import { ImageLike } from '../core/types';

type CanvasPatternRepeat = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'

export interface PatternObject {
    type: 'pattern'

    image: ImageLike | string
    repeat: CanvasPatternRepeat
    rotation?: number

    // Cached image. Which is created in the canvas painter.
    __image?: ImageLike
}

class Pattern {

    type: 'pattern'

    image: ImageLike | string
    repeat: CanvasPatternRepeat
    rotation: number

    constructor(image: ImageLike | string, repeat: CanvasPatternRepeat, rotation?: number) {
        // Should do nothing more in this constructor. Because gradient can be
        // declard by `color: {image: ...}`, where this constructor will not be called.
        this.image = image;
        this.repeat = repeat;
        this.rotation = rotation || 0;
    }
}

export default Pattern;