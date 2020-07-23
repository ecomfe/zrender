/**
 * SVG Painter
 * @module zrender/svg/Painter
 */

import {createElement} from './core';
import * as util from '../core/util';
import Path from '../graphic/Path';
import ZRImage from '../graphic/Image';
import TSpan from '../graphic/TSpan';
import arrayDiff from '../core/arrayDiff';
import GradientManager from './helper/GradientManager';
import ClippathManager from './helper/ClippathManager';
import ShadowManager from './helper/ShadowManager';
import {
    path as svgPath,
    image as svgImage,
    text as svgText,
    SVGProxy
} from './graphic';
import Displayable from '../graphic/Displayable';
import Storage from '../Storage';
import { GradientObject } from '../graphic/Gradient';
import { PainterBase } from '../PainterBase';

function parseInt10(val: string) {
    return parseInt(val, 10);
}

function getSvgProxy(el: Displayable) {
    if (el instanceof Path) {
        return svgPath;
    }
    else if (el instanceof ZRImage) {
        return svgImage;
    }
    else if (el instanceof TSpan) {
        return svgText;
    }
    else {
        return svgPath;
    }
}

function checkParentAvailable(parent: SVGElement, child: SVGElement) {
    return child && parent && child.parentNode !== parent;
}

function insertAfter(parent: SVGElement, child: SVGElement, prevSibling: SVGElement) {
    if (checkParentAvailable(parent, child) && prevSibling) {
        const nextSibling = prevSibling.nextSibling;
        nextSibling ? parent.insertBefore(child, nextSibling)
            : parent.appendChild(child);
    }
}

function prepend(parent: SVGElement, child: SVGElement) {
    if (checkParentAvailable(parent, child)) {
        const firstChild = parent.firstChild;
        firstChild ? parent.insertBefore(child, firstChild)
            : parent.appendChild(child);
    }
}

function remove(parent: SVGElement, child: SVGElement) {
    if (child && parent && child.parentNode === parent) {
        parent.removeChild(child);
    }
}

function getSvgElement(displayable: Displayable) {
    return displayable.__svgEl;
}

interface SVGPainterOption {
    width?: number | string
    height?: number | string
}

class SVGPainter implements PainterBase {

    type = 'svg'

    root: HTMLElement

    storage: Storage

    private _opts: SVGPainterOption

    private _svgDom: SVGElement
    private _svgRoot: SVGGElement
    private _backgroundRoot: SVGGElement
    private _backgroundNode: SVGRectElement

    private _gradientManager: GradientManager
    private _clipPathManager: ClippathManager
    private _shadowManager: ShadowManager

    private _viewport: HTMLDivElement
    private _visibleList: Displayable[]

    private _width: number
    private _height: number

    constructor(root: HTMLElement, storage: Storage, opts: SVGPainterOption, zrId: number) {
        this.root = root;
        this.storage = storage;
        this._opts = opts = util.extend({}, opts || {});

        const svgDom = createElement('svg');
        svgDom.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgDom.setAttribute('version', '1.1');
        svgDom.setAttribute('baseProfile', 'full');
        svgDom.style.cssText = 'user-select:none;position:absolute;left:0;top:0;';

        const bgRoot = createElement('g') as SVGGElement;
        svgDom.appendChild(bgRoot);
        const svgRoot = createElement('g') as SVGGElement;
        svgDom.appendChild(svgRoot);

        this._gradientManager = new GradientManager(zrId, svgRoot);
        this._clipPathManager = new ClippathManager(zrId, svgRoot);
        this._shadowManager = new ShadowManager(zrId, svgRoot);

        const viewport = document.createElement('div');
        viewport.style.cssText = 'overflow:hidden;position:relative';

        this._svgDom = svgDom;
        this._svgRoot = svgRoot;
        this._backgroundRoot = bgRoot;
        this._viewport = viewport;

        root.appendChild(viewport);
        viewport.appendChild(svgDom);

        this.resize(opts.width, opts.height);

        this._visibleList = [];
    }

    getType() {
        return 'svg';
    }

    getViewportRoot() {
        return this._viewport;
    }

    getSvgDom() {
        return this._svgDom;
    }

    getSvgRoot() {
        return this._svgRoot;
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

    refresh() {

        const list = this.storage.getDisplayList(true);

        this._paintList(list);
    }

    setBackgroundColor(backgroundColor: string) {
        // TODO gradient
        // Insert a bg rect instead of setting background to viewport.
        // Otherwise, the exported SVG don't have background.
        if (this._backgroundRoot && this._backgroundNode) {
            this._backgroundRoot.removeChild(this._backgroundNode);
        }

        const bgNode = createElement('rect') as SVGRectElement;
        bgNode.setAttribute('width', this.getWidth() as any);
        bgNode.setAttribute('height', this.getHeight() as any);
        bgNode.setAttribute('x', 0 as any);
        bgNode.setAttribute('y', 0 as any);
        bgNode.setAttribute('id', 0 as any);
        bgNode.style.fill = backgroundColor;
        this._backgroundRoot.appendChild(bgNode);
        this._backgroundNode = bgNode;
    }

    _paintList(list: Displayable[]) {
        this._gradientManager.markAllUnused();
        this._clipPathManager.markAllUnused();
        this._shadowManager.markAllUnused();

        const svgRoot = this._svgRoot;
        const visibleList = this._visibleList;
        const listLen = list.length;

        const newVisibleList = [];
        for (let i = 0; i < listLen; i++) {
            const displayable = list[i];
            const svgProxy = getSvgProxy(displayable);
            const svgElement = getSvgElement(displayable);
            if (!displayable.invisible) {
                if (displayable.__dirty || !svgElement) {
                    svgProxy && (svgProxy as SVGProxy<Displayable>).brush(displayable);

                    // Update clipPath
                    this._clipPathManager.update(displayable);

                    // Update gradient and shadow
                    if (displayable.style) {
                        this._gradientManager
                            .update(displayable.style.fill as GradientObject);
                        this._gradientManager
                            .update(displayable.style.stroke as GradientObject);
                        this._shadowManager
                            .update(svgElement, displayable);
                    }

                    displayable.__dirty = 0;
                }

                // May have optimizations and ignore brush(like empty string in TSpan)
                if (getSvgElement(displayable)) {
                    newVisibleList.push(displayable);
                }
            }
        }

        const diff = arrayDiff(visibleList, newVisibleList);
        let prevSvgElement;

        // First do remove, in case element moved to the head and do remove
        // after add
        for (let i = 0; i < diff.length; i++) {
            const item = diff[i];
            if (item.removed) {
                for (let k = 0; k < item.count; k++) {
                    const displayable = visibleList[item.indices[k]];
                    const svgElement = getSvgElement(displayable);
                    remove(svgRoot, svgElement);
                }
            }
        }
        for (let i = 0; i < diff.length; i++) {
            const item = diff[i];
            if (item.added) {
                for (let k = 0; k < item.count; k++) {
                    const displayable = newVisibleList[item.indices[k]];
                    const svgElement = getSvgElement(displayable);
                    prevSvgElement
                        ? insertAfter(svgRoot, svgElement, prevSvgElement)
                        : prepend(svgRoot, svgElement);

                    prevSvgElement = svgElement || prevSvgElement;

                    // zrender.Text only create textSvgElement.
                    this._gradientManager
                        .addWithoutUpdate(svgElement, displayable);
                    this._shadowManager
                        .addWithoutUpdate(svgElement, displayable);
                    this._clipPathManager.markUsed(displayable);
                }
            }
            else if (!item.removed) {
                for (let k = 0; k < item.count; k++) {
                    const displayable = newVisibleList[item.indices[k]];
                    const svgElement = getSvgElement(displayable);

                    this._gradientManager.markUsed(displayable);
                    this._gradientManager
                        .addWithoutUpdate(svgElement, displayable);

                    this._shadowManager.markUsed(displayable);
                    this._shadowManager
                        .addWithoutUpdate(svgElement, displayable);

                    this._clipPathManager.markUsed(displayable);

                    prevSvgElement = svgElement
                        || prevSvgElement;
                }
            }
        }

        this._gradientManager.removeUnused();
        this._clipPathManager.removeUnused();
        this._shadowManager.removeUnused();

        this._visibleList = newVisibleList;
    }

    _getDefs(isForceCreating?: boolean) {
        let svgRoot = this._svgDom;
        let defs = svgRoot.getElementsByTagName('defs');
        if (defs.length === 0) {
            // Not exist
            if (isForceCreating) {
                let defs = svgRoot.insertBefore(
                    createElement('defs'), // Create new tag
                    svgRoot.firstChild // Insert in the front of svg
                );
                if (!defs.contains) {
                    // IE doesn't support contains method
                    defs.contains = function (el) {
                        const children = defs.children;
                        if (!children) {
                            return false;
                        }
                        for (let i = children.length - 1; i >= 0; --i) {
                            if (children[i] === el) {
                                return true;
                            }
                        }
                        return false;
                    };
                }
                return defs;
            }
            else {
                return null;
            }
        }
        else {
            return defs[0];
        }
    }

    resize(width: number | string, height: number | string) {
        const viewport = this._viewport;
        // FIXME Why ?
        viewport.style.display = 'none';

        // Save input w/h
        const opts = this._opts;
        width != null && (opts.width = width);
        height != null && (opts.height = height);

        width = this._getSize(0);
        height = this._getSize(1);

        viewport.style.display = '';

        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;

            const viewportStyle = viewport.style;
            viewportStyle.width = width + 'px';
            viewportStyle.height = height + 'px';

            const svgRoot = this._svgDom;
            // Set width by 'svgRoot.width = width' is invalid
            svgRoot.setAttribute('width', width + '');
            svgRoot.setAttribute('height', height + '');
        }

        if (this._backgroundNode) {
            this._backgroundNode.setAttribute('width', width as any);
            this._backgroundNode.setAttribute('height', height as any);
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

    _getSize(whIdx: number) {
        const opts = this._opts;
        const wh = ['width', 'height'][whIdx] as 'width' | 'height';
        const cwh = ['clientWidth', 'clientHeight'][whIdx] as 'clientWidth' | 'clientHeight';
        const plt = ['paddingLeft', 'paddingTop'][whIdx] as 'paddingLeft' | 'paddingTop';
        const prb = ['paddingRight', 'paddingBottom'][whIdx] as 'paddingRight' | 'paddingBottom';

        if (opts[wh] != null && opts[wh] !== 'auto') {
            return parseFloat(opts[wh] as string);
        }

        const root = this.root;
        // IE8 does not support getComputedStyle, but it use VML.
        const stl = document.defaultView.getComputedStyle(root);

        return (
            (root[cwh] || parseInt10(stl[wh]) || parseInt10(root.style[wh]))
            - (parseInt10(stl[plt]) || 0)
            - (parseInt10(stl[prb]) || 0)
        ) | 0;
    }

    dispose() {
        this.root.innerHTML = '';

        this._svgRoot
            = this._backgroundRoot
            = this._svgDom
            = this._backgroundNode
            = this._viewport
            = this.storage
            = null;
    }

    clear() {
        if (this._viewport) {
            this.root.removeChild(this._viewport);
        }
    }

    toDataURL() {
        this.refresh();
        const html = encodeURIComponent(this._svgDom.outerHTML.replace(/></g, '>\n\r<'));
        return 'data:image/svg+xml;charset=UTF-8,' + html;
    }
    refreshHover = createMethodNotSupport('refreshHover') as PainterBase['refreshHover'];
    pathToImage = createMethodNotSupport('pathToImage') as PainterBase['pathToImage'];
    configLayer = createMethodNotSupport('configLayer') as PainterBase['configLayer'];
}


// Not supported methods
function createMethodNotSupport(method: string): any {
    return function () {
        util.logError('In SVG mode painter not support method "' + method + '"');
    };
}


export default SVGPainter;