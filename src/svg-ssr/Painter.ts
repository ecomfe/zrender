/**
 * SVG Painter
 */

import {
    brush, BrushScope, setClipPath
} from './graphic';
import Displayable from '../graphic/Displayable';
import Storage from '../Storage';
import { PainterBase } from '../PainterBase';
import { createElement, elDefToString, SVGElAttrsDef, SVGElDef } from './core';
import { SVGNS, XLINKNS } from '../svg/core';
import { normalizeColor } from '../svg/shared';
import { extend, keys, logError, map } from '../core/util';
import Path from '../graphic/Path';

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

    _renderToDef() {
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

        const svgEl = createElement('svg',
            [
                ['width', width],
                ['height', height],
                ['xmlns', SVGNS],
                ['xmlns:xlink', XLINKNS],
                ['version', '1.1'],
                ['baseProfile', 'full']
            ],
            []
        );
        const children = svgEl.children;

        if (bgColor && bgColor !== 'none') {
            const { color, opacity } = normalizeColor(bgColor);
            svgEl.children.push(createElement(
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
            ));
        }

        this._paintList(list, scope, children);

        children.push(
            createElement('defs', [], map(keys(scope.defs), (id) => scope.defs[id]))
        );

        return svgEl;
    }

    renderToString() {
        return elDefToString(this._renderToDef());
    }

    setBackgroundColor(backgroundColor: string) {
        this._backgroundColor = backgroundColor;
    }

    _paintList(list: Displayable[], scope: BrushScope, out?: SVGElDef[]) {
        const listLen = list.length;

        const clipPathsGroupsStack: SVGElDef[] = [];
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
                    const groupAttrs: SVGElAttrsDef = [];
                    setClipPath(
                        clipPaths[i],
                        groupAttrs,
                        scope
                    );
                    const g = createElement('g', groupAttrs, []);
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