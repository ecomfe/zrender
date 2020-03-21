import Path, { PathStyleProps } from './graphic/Path';
import ZRText, { TextStyleProps } from './graphic/Text';
import ZRImage, { ImageStyleProps } from './graphic/Image';
import { GradientObject } from './graphic/Gradient';
import { PatternObject } from './graphic/Pattern';
import { Dictionary } from './core/types';

interface PainterOption {
    width?: number | string  // Can be 10 / 10px / auto
    height?: number | string
}

export interface PainterBase {

    type: string

    root: HTMLElement

    // constructor(dom: HTMLElement, storage: Storage, opts: PainterOption, id: number): void

    resize(width?: number | string, height?: number | string): void
    refresh(): void
    clear(): void

    getViewportRoot(): HTMLElement
    getType: () => string

    getWidth(): number
    getHeight(): number
    dispose(): void

    getViewportRoot: () => HTMLElement
    getViewportRootOffset: () => {offsetLeft: number, offsetTop: number}

    // Following methods won't implemented by every Painter
    addHover(el: Path, style?: PathStyleProps): Path
    addHover(el: ZRText, style?: TextStyleProps): ZRText
    addHover(el: ZRImage, style?: ImageStyleProps): ZRImage

    removeHover(el: Path | ZRText | ZRImage): void
    clearHover(): void
    refreshHover(): void
    pathToImage(e: Path, dpr: number): ZRImage

    configLayer(zlevel: number, config: Dictionary<any>): void
    setBackgroundColor(backgroundColor: string | GradientObject | PatternObject): void
}