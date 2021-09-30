/**
 * SVG Painter
 */

import {
    brush, BrushScope, setClipPath
} from './graphic';
import Displayable from '../graphic/Displayable';
import Storage from '../Storage';
import { PainterBase } from '../PainterBase';
import { createVNode, vNodeToString, SVGVNodeAttrs, SVGVNode, createElement, SVGNS, XLINKNS } from './core';
import { normalizeColor } from './helper';
import { extend, keys, logError, map } from '../core/util';
import Path from '../graphic/Path';
import patch from './patch';
import { getSize } from '../canvas/helper';

function createBrushScope() {
    const scope: BrushScope = {
        shadowCache: {},
        patternCache: {},
        gradientCache: {},
        clipPathCache: {},
        defs: {}
    };
    return scope;
}

interface SVGPainterOption {
    width?: number
    height?: number
    ssr?: boolean
}

class SVGPainter implements PainterBase {

    type = 'svg'

    storage: Storage

    root: HTMLElement

    private _svgDom: SVGElement
    private _viewport: HTMLElement

    private _opts: SVGPainterOption

    private _oldVNode: SVGVNode

    private _width: number
    private _height: number

    private _backgroundColor: string

    constructor(root: HTMLElement, storage: Storage, opts: SVGPainterOption, zrId: number) {
        this.storage = storage;
        this._opts = opts = extend({}, opts);

        this.root = root;

        if (root && !opts.ssr) {
            const viewport = this._viewport = document.createElement('div');
            viewport.style.cssText = 'overflow:hidden;position:relative';
            const svgDom = this._svgDom = createElement('svg');
            root.appendChild(viewport);
            viewport.appendChild(svgDom);

        }

        this.resize(opts.width, opts.height);
    }

    getType() {
        return this.type;
    }

    getViewportRoot() {
        return this._viewport;
    }
    getViewportRootOffset() {
        const viewportRoot = this.getViewportRoot();
        if (viewportRoot) {
            return {
                offsetLeft: viewportRoot.offsetLeft || 0,
                offsetTop: viewportRoot.offsetTop || 0
            };
        }
    }

    getSvgDom() {
        return this._svgDom;
    }

    refresh() {
        if (this.root) {
            const vnode = this.renderToVNode();
            patch(this._oldVNode || this._svgDom, vnode);
            this._oldVNode = vnode;
        }
    }

    renderOneToVNode(el: Displayable) {
        return brush(el, createBrushScope());
    }

    renderToVNode(opts?: {
        animation?: boolean
    }) {

        opts = opts || {};

        const list = this.storage.getDisplayList(true);
        const bgColor = this._backgroundColor;
        const width = this._width + '';
        const height = this._height + '';

        const scope = createBrushScope();
        scope.animation = opts.animation;

        const children: SVGVNode[] = [];

        if (bgColor && bgColor !== 'none') {
            const { color, opacity } = normalizeColor(bgColor);
            children.push(createVNode(
                'rect',
                'bg',
                {
                    width: width,
                    height: height,
                    x: '0',
                    y: '0',
                    id: '0',
                    fill: color,
                    fillOpacity: opacity
                }
            ));
        }

        this._paintList(list, scope, children);

        children.push(
            createVNode(
                'defs',
                'defs',
                {},
                map(keys(scope.defs), (id) => scope.defs[id])
            )
        );

        return createVNode(
            'svg',
            'root',
            {
                'width': width,
                'height': height,
                'xmlns': SVGNS,
                'xmlns:xlink': XLINKNS,
                'version': '1.1',
                'baseProfile': 'full'
            },
            children
        );
    }

    renderToString() {
        return vNodeToString(this.renderToVNode({
            animation: true
        }));
    }

    setBackgroundColor(backgroundColor: string) {
        this._backgroundColor = backgroundColor;
        // TOOD optimize for change bg only.
        this.renderToVNode();
    }

    _paintList(list: Displayable[], scope: BrushScope, out?: SVGVNode[]) {
        const listLen = list.length;

        const clipPathsGroupsStack: SVGVNode[] = [];
        let clipPathsGroupsStackDepth = 0;
        let currentClipPathGroup;
        let prevClipPaths: Path[];
        for (let i = 0; i < listLen; i++) {
            const displayable = list[i];
            if (!displayable.invisible) {
                const clipPaths = displayable.__clipPaths;
                const len = clipPaths && clipPaths.length || 0;
                const prevLen = prevClipPaths && prevClipPaths.length || 0;
                let lca;
                // Find the lowest common ancestor
                for (lca = Math.max(len - 1, prevLen - 1); lca >= 0; lca--) {
                    if (clipPaths && prevClipPaths
                        && clipPaths[lca] === prevClipPaths[lca]
                    ) {
                        break;
                    }
                }
                // pop the stack
                for (let i = prevLen - 1; i > lca; i--) {
                    clipPathsGroupsStackDepth--;
                    // svgEls.push(closeGroup);
                    currentClipPathGroup = clipPathsGroupsStack[clipPathsGroupsStackDepth - 1];
                }
                // Pop clip path group for clipPaths not match the previous.
                for (let i = lca + 1; i < len; i++) {
                    const groupAttrs: SVGVNodeAttrs = {};
                    setClipPath(
                        clipPaths[i],
                        groupAttrs,
                        scope
                    );
                    const g = createVNode(
                        'g',
                        'clip-g-' + clipPaths[i].id,
                        groupAttrs,
                        []
                    );
                    (currentClipPathGroup ? currentClipPathGroup.children : out).push(g);
                    clipPathsGroupsStack[clipPathsGroupsStackDepth++] = g;
                    currentClipPathGroup = g;
                }
                prevClipPaths = clipPaths;

                const ret = brush(displayable, scope);
                if (ret) {
                    (currentClipPathGroup ? currentClipPathGroup.children : out).push(ret);
                }
            }
        }
    }

    resize(width: number, height: number) {
        // Save input w/h
        const opts = this._opts;
        const root = this.root;
        const viewport = this._viewport;
        width != null && (opts.width = width);
        height != null && (opts.height = height);

        if (root && viewport) {
            // FIXME Why ?
            viewport.style.display = 'none';

            width = getSize(root, 0, opts);
            height = getSize(root, 1, opts);

            viewport.style.display = '';
        }

        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;

            if (viewport) {
                const viewportStyle = viewport.style;
                viewportStyle.width = width + 'px';
                viewportStyle.height = height + 'px';
            }

            const svgDom = this._svgDom;
            if (svgDom) {
                // Set width by 'svgRoot.width = width' is invalid
                svgDom.setAttribute('width', width as any);
                svgDom.setAttribute('height', height as any);
            }
        }
    }

    /**
     * 获取绘图区域宽度
     */
    getWidth() {
        return this._width;
    }

    /**
     * 获取绘图区域高度
     */
    getHeight() {
        return this._height;
    }

    dispose() {
        if (this.root) {
            this.root.innerHTML = '';
        }

        this._svgDom =
        this._viewport =
        this.storage =
        this._oldVNode = null;
    }
    clear() {
        if (this._svgDom) {
            this._svgDom.innerHTML = null;
        }
        this._oldVNode = null;
    }
    toDataURL() {
        const str = this.renderToString();
        const html = encodeURIComponent(str);
        return 'data:image/svg+xml;charset=UTF-8,' + html;
    }

    refreshHover = createMethodNotSupport('refreshHover') as PainterBase['refreshHover'];
    pathToImage = createMethodNotSupport('pathToImage') as PainterBase['pathToImage'];
    configLayer = createMethodNotSupport('configLayer') as PainterBase['configLayer'];
}


// Not supported methods
function createMethodNotSupport(method: string): any {
    return function () {
        logError('In SVG mode painter not support method "' + method + '"');
    };
}


export default SVGPainter;