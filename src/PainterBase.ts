import { GradientObject } from './graphic/Gradient';
import { PatternObject } from './graphic/Pattern';
import { DevicePixelRatioOpts, Dictionary, DOMSizeOpts, NullUndefined } from './core/types';
import { CanvasPainterRefreshOpt } from './canvas/Painter';

// interface PainterOption {
//     width?: number | string  // Can be 10 / 10px / auto
//     height?: number | string
// }

export interface PainterBase {

    type: string

    // root will be undefined if ssr is true
    root?: HTMLElement

    // If ssr only
    ssrOnly?: boolean

    // constructor(dom: HTMLElement, storage: Storage, opts: PainterOption, id: number): void

    resize(
        width?: DOMSizeOpts['width'],
        height?: DOMSizeOpts['height'],
        devicePixelRatio?: DevicePixelRatioOpts['devicePixelRatio']
    ): void
    refresh(opt?: CanvasPainterRefreshOpt | NullUndefined): void
    clear(): void

    // must be given if ssr is true.
    renderToString?(): string;

    getType: () => string

    getWidth(): number
    getHeight(): number
    dispose(): void

    getViewportRoot: () => HTMLElement
    getViewportRootOffset: () => {offsetLeft: number, offsetTop: number}

    configLayer(zlevel: number, config: Dictionary<any>): void
    setBackgroundColor(backgroundColor: string | GradientObject | PatternObject): void
}