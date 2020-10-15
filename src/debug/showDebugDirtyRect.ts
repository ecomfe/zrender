import type { ZRenderType } from '../zrender';
import type CanvasPainter from '../canvas/Painter';
import type BoundingRect from '../core/BoundingRect';
import { Dictionary } from '../core/types';

class DebugRect {

    dom: HTMLDivElement

    private _hideTimeout: number

    constructor(style: Opts['style']) {
        const dom = this.dom = document.createElement('div');

        style = Object.assign({}, style);
        Object.assign(style, {
            backgroundColor: 'rgba(0, 0, 255, 0.2)',
            border: '1px solid #00f'
        })
        dom.style.cssText = `
position: absolute;
opacity: 0;
transition: opacity 0.5s linear;
pointer-events: none;
`;

        for (let key in style) {
            if (style.hasOwnProperty(key)) {
                (dom.style as any)[key] = (style as any)[key];
            }
        }
    }

    update(rect: BoundingRect) {
        const domStyle = this.dom.style;
        domStyle.width = rect.width + 'px';
        domStyle.height = rect.height + 'px';
        domStyle.left = rect.x + 'px';
        domStyle.top = rect.y + 'px';
    }

    hide() {
        this.dom.style.opacity = '0';
    }
    show() {
        clearTimeout(this._hideTimeout);

        this.dom.style.opacity = '1';

        // Auto hide after 2 second
        this._hideTimeout = setTimeout(() => {
            this.hide();
        }, 2000) as unknown as number;
    }

}

interface Opts {
    style?: {
        backgroundColor?: string
        color?: string
    }
}

export default function (zr: ZRenderType, opts?: Opts) {
    opts = opts || {};
    const painter = zr.painter as CanvasPainter;
    if (!painter.getLayers) {
        throw new Error('Debug dirty rect can only been used on canvas renderer.');
    }
    if (painter.isSingleCanvas()) {
        throw new Error('Debug dirty rect can only been used on zrender inited with container.');
    }
    const debugViewRoot = document.createElement('div');
    debugViewRoot.style.cssText = `
position:absolute;
left:0;
top:0;
width:100%;
height:100%;
`;

    const debugRects: DebugRect[] = [];
    const dom = zr.dom;
    dom.appendChild(debugViewRoot);
    const computedStyle = getComputedStyle(dom);
    if (computedStyle.position === 'static') {
        dom.style.position = 'relative';
    }

    zr.on('rendered', function () {
        if (painter.getLayers) {
            painter.eachBuiltinLayer((layer) => {
                const paintRects = layer.debugGetPaintRects();
                let i;
                for (i = 0; i < paintRects.length; i++) {
                    if (!debugRects[i]) {
                        debugRects[i] = new DebugRect(opts.style);
                        debugViewRoot.appendChild(debugRects[i].dom);
                    }
                    debugRects[i].show();
                    debugRects[i].update(paintRects[i]);
                }
                for (; i < debugRects.length; i++) {
                    debugRects[i].hide();
                }
            });
        }
    });
}