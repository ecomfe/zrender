
type CanvasPatternRepeat = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'

export interface PatternObject {
    type: 'pattern'

    image: HTMLImageElement
    repeat: CanvasPatternRepeat
}

class Pattern {

    type = 'pattern'

    image: HTMLImageElement
    repeat: CanvasPatternRepeat

    constructor(image: HTMLImageElement, repeat: CanvasPatternRepeat) {
        // Should do nothing more in this constructor. Because gradient can be
        // declard by `color: {image: ...}`, where this constructor will not be called.
        this.image = image;
        this.repeat = repeat
    }

    getCanvasPattern(ctx: CanvasRenderingContext2D) {
        return ctx.createPattern(this.image, this.repeat || 'repeat');
    }
}

export default Pattern;