import { PainterBase } from '../PainterBase';
import Path, { PathStyleOption } from '../graphic/Path';
import ZText, { TextStyleOption } from '../graphic/Text';
import ZImage, { ImageStyleOption } from '../graphic/Image';
import { LayerConfig } from './Layer';
import { GradientObject } from '../graphic/Gradient';
import { PatternObject } from '../graphic/Pattern';

export interface CanvasPainterInterface extends PainterBase {

    addHover(el: Path, style: PathStyleOption): Path
    addHover(el: ZText, style: TextStyleOption): ZText
    addHover(el: ZImage, style: ImageStyleOption): ZImage

    removeHover(el: Path | ZText | ZImage): void
    clearHover(): void
    refreshHover(): void
    pathToImage(e: Path, dpr: number): ZImage

    configLayer(zlevel: number, config: LayerConfig): void
    setBackgroundColor(backgroundColor: string | GradientObject | PatternObject): void
}
