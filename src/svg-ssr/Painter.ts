/**
 * SVG Painter
 */

import {
    brush, BrushScope, setClipPath
} from './graphic';
import Displayable from '../graphic/Displayable';
import Storage from '../Storage';
import { PainterBase } from '../PainterBase';
import { createElement, createElementClose, createElementOpen, SVGAttrs } from './helper';
import { SVGNS, XLINKNS } from '../svg/core';
import { normalizeColor } from '../svg/shared';
import { extend, keys, logError, map } from '../core/util';
import Path from '../graphic/Path';

 function parseInt10(val: string) {
     return parseInt(val, 10);
 }

interface SVGPainterOption {
    width?: number
    height?: number
}

class SVGPainter implements PainterBase {

    type = 'svg-ssr'

    ssr = true

    storage: Storage

    private _opts: SVGPainterOption

    private _width: number
    private _height: number

    private _backgroundColor: string

    constructor(root: HTMLElement, storage: Storage, opts: SVGPainterOption, zrId: number) {
        this.storage = storage;
        this._opts = opts = extend({}, opts);

        this.resize(opts.width, opts.height);
    }

    getType() {
        return this.type;
    }

    refresh() {
        throw 'refresh is not supported in SSR mode';
    }

    renderToString() {
        const list = this.storage.getDisplayList(true);
        const bgColor = this._backgroundColor;
        const width = this._width + '';
        const height = this._height + '';

        const scope: BrushScope = {
            shadowCache: {},
            patternCache: {},
            gradientCache: {},
            clipPathCache: {},
            defs: {}
        };

        let backgroundRect;
        if (bgColor && bgColor !== 'none') {
            const { color, opacity } = normalizeColor(bgColor);
            backgroundRect = createElement(
                'rect',
                [
                    ['width', width],
                    ['height', height],
                    ['x', '0'],
                    ['y', '0'],
                    ['id', '0'],
                    ['fill', color],
                    ['fillOpacity', opacity + '']
                ]
            );
        }

        const svgElsArr = [
            createElementOpen('svg',
                [
                    ['width', width],
                    ['height', height],
                    ['xmlns', SVGNS],
                    ['xmlns:xlink', XLINKNS],
                    ['version', '1.1'],
                    ['baseProfile', 'full']
                ]
            ),
            // Background
            backgroundRect,

            // Elements
            this._paintList(list, scope),

            // After paint list
            createElement('defs', [], map(keys(scope.defs), (id) => scope.defs[id]).join('\n')),

            createElementClose('svg')
        ];

        return svgElsArr.join('\n');
    }

    setBackgroundColor(backgroundColor: string) {
        this._backgroundColor = backgroundColor;
    }

    _paintList(list: Displayable[], scope: BrushScope) {
        const listLen = list.length;

        const elStrs: string[] = [];

        const closeGroup = '</g>';
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
                    elStrs.push(closeGroup);
                }
                // Pop clip path group for clipPaths not match the previous.
                for (let i = lca + 1; i < len; i++) {
                    const groupAttrs: SVGAttrs = [];
                    setClipPath(
                        clipPaths[i],
                        groupAttrs,
                        scope
                    );
                    elStrs.push(createElementOpen('g', groupAttrs));
                }
                prevClipPaths = clipPaths;


                const str = brush(displayable, scope);
                str && elStrs.push(str);
            }
        }

        if (prevClipPaths) {
            for (let i = 0; i < prevClipPaths.length; i++) {
                elStrs.push(closeGroup);
            }
        }

        return elStrs.join('\n');
    }

    resize(width: number, height: number) {
        this._width = width;
        this._height = height;
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

    dispose() {}
    clear() {}
    toDataURL() {}

    getViewportRoot = createMethodNotSupport('getViewportRoot') as PainterBase['getViewportRoot']
    getViewportRootOffset = createMethodNotSupport('getViewportRootOffset') as PainterBase['getViewportRootOffset']

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