/**
 * SVG Painter
 * @module zrender/svg/Painter
 */

import {createElement} from './core';
import * as util from '../core/util';
import Path from '../graphic/Path';
import ZImage from '../graphic/Image';
import ZText from '../graphic/Text';
import arrayDiff from '../core/arrayDiff';
import GradientManager from './helper/GradientManager';
import ClippathManager from './helper/ClippathManager';
import ShadowManager from './helper/ShadowManager';
import {
    path as svgPath,
    image as svgImage,
    text as svgText
} from './graphic';
import Displayable from '../graphic/Displayable';
import Storage from '../Storage';
import { GradientObject } from '../graphic/Gradient';

function parseInt10(val: string) {
    return parseInt(val, 10);
}

function getSvgProxy(el: Displayable) {
    if (el instanceof Path) {
        return svgPath;
    }
    else if (el instanceof ZImage) {
        return svgImage;
    }
    else if (el instanceof ZText) {
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

// function append(parent, child) {
//     if (checkParentAvailable(parent, child)) {
//         parent.appendChild(child);
//     }
// }

function remove(parent: SVGElement, child: SVGElement) {
    if (child && parent && child.parentNode === parent) {
        parent.removeChild(child);
    }
}

function getTextSvgElement(displayable: Displayable) {
    return displayable.__textSvgEl;
}

function getSvgElement(displayable: Displayable) {
    return displayable.__svgEl;
}

interface SVGPainterOption {
    width?: number | string
    height?: number | string
}

class SVGPainter {

    type = 'svg'

    root: HTMLElement

    storage: Storage

    private _opts: SVGPainterOption

    private _svgRoot: SVGElement

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

        const svgRoot = createElement('svg');
        svgRoot.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgRoot.setAttribute('version', '1.1');
        svgRoot.setAttribute('baseProfile', 'full');
        svgRoot.style.cssText = 'user-select:none;position:absolute;left:0;top:0;';

        this._gradientManager = new GradientManager(zrId, svgRoot);
        this._clipPathManager = new ClippathManager(zrId, svgRoot);
        this._shadowManager = new ShadowManager(zrId, svgRoot);

        const viewport = document.createElement('div');
        viewport.style.cssText = 'overflow:hidden;position:relative';

        this._svgRoot = svgRoot;
        this._viewport = viewport;

        root.appendChild(viewport);
        viewport.appendChild(svgRoot);

        this.resize(opts.width, opts.height);

        this._visibleList = [];
    }

    getType() {
        return 'svg';
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

    refresh() {

        const list = this.storage.getDisplayList(true);

        this._paintList(list);
    }

    setBackgroundColor(backgroundColor: string) {
        // TODO gradient
        this._viewport.style.background = backgroundColor;
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
            const svgElement = getSvgElement(displayable)
                || getTextSvgElement(displayable);
            if (!displayable.invisible) {
                if (displayable.__dirty) {
                    svgProxy && svgProxy.brush(displayable);

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

                    displayable.__dirty = false;
                }
                newVisibleList.push(displayable);
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
                    const textSvgElement = getTextSvgElement(displayable);
                    remove(svgRoot, svgElement);
                    remove(svgRoot, textSvgElement);
                }
            }
        }
        for (let i = 0; i < diff.length; i++) {
            const item = diff[i];
            if (item.added) {
                for (let k = 0; k < item.count; k++) {
                    const displayable = newVisibleList[item.indices[k]];
                    const svgElement = getSvgElement(displayable);
                    const textSvgElement = getTextSvgElement(displayable);
                    prevSvgElement
                        ? insertAfter(svgRoot, svgElement, prevSvgElement)
                        : prepend(svgRoot, svgElement);
                    if (svgElement) {
                        insertAfter(svgRoot, textSvgElement, svgElement);
                    }
                    else if (prevSvgElement) {
                        insertAfter(
                            svgRoot, textSvgElement, prevSvgElement
                        );
                    }
                    else {
                        prepend(svgRoot, textSvgElement);
                    }
                    // Insert text
                    insertAfter(svgRoot, textSvgElement, svgElement);
                    prevSvgElement = textSvgElement || svgElement
                        || prevSvgElement;

                    // zrender.Text only create textSvgElement.
                    this._gradientManager
                        .addWithoutUpdate(svgElement || textSvgElement, displayable);
                    this._shadowManager
                        .addWithoutUpdate(svgElement || textSvgElement, displayable);
                    this._clipPathManager.markUsed(displayable);
                }
            }
            else if (!item.removed) {
                for (let k = 0; k < item.count; k++) {
                    const displayable = newVisibleList[item.indices[k]];
                    const svgElement = getSvgElement(displayable);
                    const textSvgElement = getTextSvgElement(displayable);

                    this._gradientManager.markUsed(displayable);
                    this._gradientManager
                        .addWithoutUpdate(svgElement || textSvgElement, displayable);

                    this._shadowManager.markUsed(displayable);
                    this._shadowManager
                        .addWithoutUpdate(svgElement || textSvgElement, displayable);

                    this._clipPathManager.markUsed(displayable);

                    if (textSvgElement) { // Insert text.
                        insertAfter(svgRoot, textSvgElement, svgElement);
                    }
                    prevSvgElement = svgElement
                        || textSvgElement || prevSvgElement;
                }
            }
        }

        this._gradientManager.removeUnused();
        this._clipPathManager.removeUnused();
        this._shadowManager.removeUnused();

        this._visibleList = newVisibleList;
    }

    _getDefs(isForceCreating?: boolean) {
        let svgRoot = this._svgRoot;
        let defs = this._svgRoot.getElementsByTagName('defs');
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

            const svgRoot = this._svgRoot;
            // Set width by 'svgRoot.width = width' is invalid
            svgRoot.setAttribute('width', width + '');
            svgRoot.setAttribute('height', height + '');
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

        this._svgRoot =
            this._viewport =
            this.storage =
            null;
    }

    clear() {
        if (this._viewport) {
            this.root.removeChild(this._viewport);
        }
    }

    pathToDataUrl() {
        this.refresh();
        const html = this._svgRoot.outerHTML;
        return 'data:image/svg+xml;charset=UTF-8,' + html;
    }
}


// Not supported methods
function createMethodNotSupport(method: string) {
    return function () {
        util.logError('In SVG mode painter not support method "' + method + '"');
    };
}

// Unsuppoted methods
util.each([
    'getLayer', 'insertLayer', 'eachLayer', 'eachBuiltinLayer',
    'eachOtherLayer', 'getLayers', 'modLayer', 'delLayer', 'clearLayer',
    'toDataURL', 'pathToImage'
], function (name) {
    (SVGPainter as any).prototype[name] = createMethodNotSupport(name);
});

export default SVGPainter;