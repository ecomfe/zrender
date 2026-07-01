/**
 * CAUTION:
 *  This is the most underlying module. Do not import any other modules.
 */

export const DEFAULT_FONT_SIZE = 12;
export const DEFAULT_FONT_FAMILY = 'sans-serif';
export const DEFAULT_FONT = `${DEFAULT_FONT_SIZE}px ${DEFAULT_FONT_FAMILY}`;

/* global document, Image */

interface Platform {
    // [CAUTION_ZRENDER_PLATFORM_CREATE_CANVAS]:
    //  - Effectively, the returned instance may be a canvas-like instance, not necessarily a `HTMLCanvasElement`.
    //    For example, `echarts-for-weixin` project returns a customized plain instance (WxCanvas); `node-echarts`
    //    project returns an instance created by `node-canvas` project.
    //    PENDING:
    //      Use a `CanvasLike` type here?
    //  - [CAUTION_BORROW_MAIN_CANVAS]:
    //    `createCanvas` is normally intended to create a new dedicated canvas for some off-screen or on-screen
    //    usage. But a special pattern has long been in use: `createCanvas` always returns the same canvas, which
    //    is the instance passed to `echarts.init(canvas)`. We call it BORROW_MAIN_CANVAS for short. For example,
    //    `echarts-for-weixin` and `node-echarts` use this pattern.
    //    But this pattern is inherently incorrect in most cases.
    //    - Case: BORROW_MAIN_CANVAS_FOR_TRANSIENT_MODIFICATION:
    //      The pattern can work correctly in this case. A typical usage is `measureText`, where only `ctx.font`
    //      is changed and restorable. See the default implementation of `measureText` for more info.
    //    - Case: BORROW_MAIN_CANVAS_FOR_PERSISTENT_MODIFICATION:
    //      The pattern can not work correctly in cases like "multiple zlevels", "hover layer", "incremental layer",
    //      "decal", "using a dedicated layer for heatmap" or "motion blur", where the canvas needs to be persistently
    //      modified. And this pattern may cause different charts (i.e., different zrender instances) to affect each
    //      other unexpectedly, since `createCanvas` is a static method without any instance info provided.
    //    Some platforms may allow only one canvas instance per runtime context, where using this pattern
    //    is unavoidable if we require a precise `measureText` (`measureText` has a fallback implementation but
    //    not precise). But other functionality requiring persistent modification to a dedicated canvas are
    //    inherently unavailable.
    //  PENDING:
    //    Currently zrender does not automatically disable the features above even when BORROW_MAIN_CANVAS is used
    //    and they work incorrectly. One reason is that automatic disabling would require non-trivial refactoring,
    //    for example, style merging (including "hover style") is handled in `el.useState()` API, where `createCanvas`
    //    is not called yet. Therefore, upstream applications or users have to to manually disable these features.
    createCanvas(): HTMLCanvasElement
    measureText(text: string, font?: string): { width: number }
    loadImage(
        src: string,
        onload: () => void | HTMLImageElement['onload'],
        onerror: () => void | HTMLImageElement['onerror']
    ): HTMLImageElement
    // Testing friendly to control frames
    getTime(): number
}

// Text width map used for environment there is no canvas
// Only common ascii is used for size concern.

// Generated from following code
//
// ctx.font = '12px sans-serif';
// const asciiRange = [32, 126];
// let mapStr = '';
// for (let i = asciiRange[0]; i <= asciiRange[1]; i++) {
//     const char = String.fromCharCode(i);
//     const width = ctx.measureText(char).width;
//     const ratio = Math.round(width / 12 * 100);
//     mapStr += String.fromCharCode(ratio + 20))
// }
// mapStr.replace(/\\/g, '\\\\');
const OFFSET = 20;
const SCALE = 100;
// TODO other basic fonts?
// eslint-disable-next-line
const defaultWidthMapStr = `007LLmW'55;N0500LLLLLLLLLL00NNNLzWW\\\\WQb\\0FWLg\\bWb\\WQ\\WrWWQ000CL5LLFLL0LL**F*gLLLL5F0LF\\FFF5.5N`;

function getTextWidthMap(mapStr: string): Record<string, number> {
    const map: Record<string, number> = {};
    if (typeof JSON === 'undefined') {
        return map;
    }
    for (let i = 0; i < mapStr.length; i++) {
        const char = String.fromCharCode(i + 32);
        const size = (mapStr.charCodeAt(i) - OFFSET) / SCALE;
        map[char] = size;
    }
    return map;
}

export const DEFAULT_TEXT_WIDTH_MAP = getTextWidthMap(defaultWidthMapStr);


export const platformApi: Platform = {

    createCanvas() {
        return typeof document !== 'undefined'
            && document.createElement('canvas');
    },

    measureText: (function () {

        let _ctx: CanvasRenderingContext2D;
        let _cachedFont: string;
        return (text: string, font?: string) => {
            if (!_ctx) {
                const canvas = platformApi.createCanvas();
                _ctx = canvas && canvas.getContext('2d');
            }
            if (_ctx) {
                // FIXME:
                //  Consider wrapping this with `_ctx.save()` and `_ctx.restore()`, or restoring font after use?
                //  Currently, `measureText` is mainly called in `Element['update']` phase and does not
                //  affect the brush phase by coincidence, but this is fragile to other usages.
                //  @see CAUTION_BORROW_MAIN_CANVAS for more details.
                if (_cachedFont !== font) {
                    _cachedFont = _ctx.font = font || DEFAULT_FONT;
                }
                return _ctx.measureText(text);
            }
            else {
                text = text || '';
                font = font || DEFAULT_FONT;
                // Use font size if there is no other method can be used.
                const res = /((?:\d+)?\.?\d*)px/.exec(font);
                const fontSize = res && +res[1] || DEFAULT_FONT_SIZE;
                let width = 0;
                if (font.indexOf('mono') >= 0) {   // is monospace
                    width = fontSize * text.length;
                }
                else {
                    for (let i = 0; i < text.length; i++) {
                        const preCalcWidth = DEFAULT_TEXT_WIDTH_MAP[text[i]];
                        width += preCalcWidth == null ? fontSize : (preCalcWidth * fontSize);
                    }
                }
                return { width };
            }
        };
    })(),

    loadImage(src, onload, onerror) {
        const image = new Image();
        image.onload = onload;
        image.onerror = onerror;
        image.src = src;
        return image;
    },

    getTime(): number {
        // Indicatively, Date.now can be executed in 13,025,305 ops/second in a certain env.
        // eslint-disable-next-line @echarts-x/ec/no-props-polyfill-uncertain
        return Date.now ? Date.now() : +(new Date());
    }
};

export function setPlatformAPI(newPlatformApis: Partial<Platform>) {
    for (let key in platformApi) {
        // Don't assign unknown methods.
        if (platformApi.hasOwnProperty(key) && (newPlatformApis as any)[key]) {
            (platformApi as any)[key] = (newPlatformApis as any)[key];
        }
    }
}

/**
 * Export it to users for possible restore.
 */
export function getPlatformAPI(method: keyof Platform): Platform[keyof Platform] {
    return platformApi[method];
}
