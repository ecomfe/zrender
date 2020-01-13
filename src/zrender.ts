/*!
* ZRender, a high performance 2d drawing library.
*
* Copyright (c) 2013, Baidu Inc.
* All rights reserved.
*
* LICENSE
* https://github.com/ecomfe/zrender/blob/master/LICENSE.txt
*/

import env from './core/env';
import * as zrUtil from './core/util';
import Handler from './Handler';
import Storage from './Storage';
import {PainterBase} from './PainterBase';
import Animation from './animation/Animation';
import HandlerProxy from './dom/HandlerProxy';
import Element, {ElementEventCallback} from './Element';
import CanvasPainter from './canvas/Painter';
import { Dictionary, ElementEventName } from './core/types';
import { LayerConfig } from './canvas/Layer';
import { GradientObject } from './graphic/Gradient';
import { PatternObject } from './graphic/Pattern';
import { StyleOption } from './graphic/Style';
import Displayable from './graphic/Displayable';
import { Path } from './export';
import { EventCallback } from './core/Eventful';

const useVML = !env.canvasSupported;

const painterCtors: Dictionary<typeof PainterBase> = {
    canvas: CanvasPainter
};

let instances: { [key: number]: ZRender } = {};


function delInstance(id: number) {
    delete instances[id];
}


class ZRender {

    dom: HTMLElement

    id: number

    storage: Storage
    painter: PainterBase
    handler: Handler
    animation: Animation

    private _needsRefresh = true
    private _needsRefreshHover = true

    constructor(id: number, dom: HTMLElement, opts?: ZRenderInitOpt) {
        opts = opts || {};

        /**
         * @type {HTMLDomElement}
         */
        this.dom = dom;

        this.id = id;

        const self = this;
        const storage = new Storage();

        let rendererType = opts.renderer;
        // TODO WebGL
        if (useVML) {
            if (!painterCtors.vml) {
                throw new Error('You need to require \'zrender/vml/vml\' to support IE8');
            }
            rendererType = 'vml';
        }
        else if (!rendererType || !painterCtors[rendererType]) {
            rendererType = 'canvas';
        }
        const painter = new painterCtors[rendererType](dom, storage, opts, id);

        this.storage = storage;
        this.painter = painter;

        const handerProxy = (!env.node && !env.worker)
            ? new HandlerProxy(painter.getViewportRoot(), painter.root)
            : null;
        this.handler = new Handler(storage, painter, handerProxy, painter.root);

        /**
         * @type {module:zrender/animation/Animation}
         */
        this.animation = new Animation({
            stage: {
                update: zrUtil.bind(this.flush, this)
            }
        });
        this.animation.start();


        // 修改 storage.delFromStorage, 每次删除元素之前删除动画
        // FIXME 有点ugly
        const oldDelFromStorage = storage.delFromStorage;
        const oldAddToStorage = storage.addToStorage;

        storage.delFromStorage = function (el) {
            oldDelFromStorage.call(storage, el);
            el && el.removeSelfFromZr(self);
            return this;
        };

        storage.addToStorage = function (el) {
            oldAddToStorage.call(storage, el);
            el.addSelfToZr(self);
            return this;
        };
    }

    /**
     * 添加元素
     */
    add(el: Element) {
        this.storage.addRoot(el);
        this._needsRefresh = true;
    }

    /**
     * 删除元素
     */
    remove(el: Element) {
        this.storage.delRoot(el);
        this._needsRefresh = true;
    }

    /**
     * Change configuration of layer
    */
    configLayer(zLevel: number, config: LayerConfig) {
        if ((this.painter as CanvasPainter).configLayer) {
            (this.painter as CanvasPainter).configLayer(zLevel, config);
        }
        this._needsRefresh = true;
    }

    /**
     * Set background color
     */
    setBackgroundColor(
        backgroundColor: string | GradientObject | PatternObject
    ) {
        if ((this.painter as CanvasPainter).setBackgroundColor) {
            (this.painter as CanvasPainter).setBackgroundColor(backgroundColor);
        }
        this._needsRefresh = true;
    }

    /**
     * Repaint the canvas immediately
     */
    refreshImmediately() {
        // const start = new Date();

        // Clear needsRefresh ahead to avoid something wrong happens in refresh
        // Or it will cause zrender refreshes again and again.
        this._needsRefresh = this._needsRefreshHover = false;
        this.painter.refresh();
        // Avoid trigger zr.refresh in Element#beforeUpdate hook
        this._needsRefresh = this._needsRefreshHover = false;

        // const end = new Date();
        // const log = document.getElementById('log');
        // if (log) {
        //     log.innerHTML = log.innerHTML + '<br>' + (end - start);
        // }
    }

    /**
     * Mark and repaint the canvas in the next frame of browser
     */
    refresh() {
        this._needsRefresh = true;
    }

    /**
     * Perform all refresh
     */
    flush() {
        let triggerRendered;

        if (this._needsRefresh) {
            triggerRendered = true;
            this.refreshImmediately();
        }
        if (this._needsRefreshHover) {
            triggerRendered = true;
            this.refreshHoverImmediately();
        }

        triggerRendered && this.trigger('rendered');
    }

    /**
     * Add element to hover layer
     * @param el
     * @param {Object} style
     */
    addHover(el: Displayable, style: StyleOption) {
        if ((this.painter as CanvasPainter).addHover) {
            const elMirror = (this.painter as CanvasPainter).addHover(el, style);
            this.refreshHover();
            return elMirror;
        }
    }

    /**
     * Add element from hover layer
     */
    removeHover(el: Displayable) {
        if ((this.painter as CanvasPainter).removeHover) {
            (this.painter as CanvasPainter).removeHover(el);
            this.refreshHover();
        }
    }

    /**
     * Clear all hover elements in hover layer
     */
    clearHover() {
        if ((this.painter as CanvasPainter).clearHover) {
            (this.painter as CanvasPainter).clearHover();
            this.refreshHover();
        }
    }

    /**
     * Refresh hover in next frame
     */
    refreshHover() {
        this._needsRefreshHover = true;
    }

    /**
     * Refresh hover immediately
     */
    refreshHoverImmediately() {
        this._needsRefreshHover = false;
        if ((this.painter as CanvasPainter).refreshHover) {
            (this.painter as CanvasPainter).refreshHover();
        }
    }

    /**
     * Resize the canvas.
     * Should be invoked when container size is changed
     */
    resize(opts?: {
        width?: number| string
        height?: number | string
    }) {
        opts = opts || {};
        this.painter.resize(opts.width, opts.height);
        this.handler.resize();
    }

    /**
     * Stop and clear all animation immediately
     */
    clearAnimation() {
        this.animation.clear();
    }

    /**
     * Get container width
     */
    getWidth(): number {
        return this.painter.getWidth();
    }

    /**
     * Get container height
     */
    getHeight(): number {
        return this.painter.getHeight();
    }

    /**
     * Export the canvas as Base64 URL
     * @param {string} type
     * @param {string} [backgroundColor='#fff']
     * @return {string} Base64 URL
     */
    // toDataURL: function(type, backgroundColor) {
    //     return this.painter.getRenderedCanvas({
    //         backgroundColor: backgroundColor
    //     }).toDataURL(type);
    // },

    /**
     * Converting a path to image.
     * It has much better performance of drawing image rather than drawing a vector path.
     */
    pathToImage(e: Path, dpr: number) {
        if ((this.painter as CanvasPainter).pathToImage) {
            return (this.painter as CanvasPainter).pathToImage(e, dpr);
        }
    }

    /**
     * Set default cursor
     * @param cursorStyle='default' 例如 crosshair
     */
    setCursorStyle(cursorStyle: string) {
        this.handler.setCursorStyle(cursorStyle);
    }

    /**
     * Find hovered element
     * @param x
     * @param y
     * @return {target, topTarget}
     */
    findHover(x: number, y: number): {
        target: Element
        topTarget: Element
    } {
        return this.handler.findHover(x, y);
    }

    on(eventName: ElementEventName, eventHandler: ElementEventCallback, context?: Object): void
    on(eventName: string, eventHandler: EventCallback, context?: Object): void
    on(eventName: string, eventHandler: EventCallback, context?: Object) {
        this.handler.on(eventName, eventHandler, context);
    }

    /**
     * Unbind event
     * @param eventName Event name
     * @param eventHandler Handler function
     */
    off(eventName?: string, eventHandler?: EventCallback) {
        this.handler.off(eventName, eventHandler);
    }

    /**
     * Trigger event manually
     *
     * @param eventName Event name
     * @param event Event object
     */
    trigger(eventName: string, event?: Object) {
        this.handler.trigger(eventName, event);
    }


    /**
     * Clear all objects and the canvas.
     */
    clear() {
        this.storage.delAllRoots();
        this.painter.clear();
    }

    /**
     * Dispose self.
     */
    dispose() {
        this.animation.stop();

        this.clear();
        this.storage.dispose();
        this.painter.dispose();
        this.handler.dispose();

        this.animation =
        this.storage =
        this.painter =
        this.handler = null;

        delInstance(this.id);
    }
}


export interface ZRenderInitOpt {
    renderer?: string   // 'canvas' or 'svg
    devicePixelRatio?: number
    width?: number | string // 10, 10px, 'auto'
    height?: number | string
}

/**
 * Initializing a zrender instance
 */
export function init(dom: HTMLElement, opts?: ZRenderInitOpt) {
    const zr = new ZRender(zrUtil.guid(), dom, opts);
    instances[zr.id] = zr;
    return zr;
}

/**
 * Dispose zrender instance
 */
export function dispose(zr: ZRender) {
    zr.dispose();
}

/**
 * Dispose all zrender instances
 */
export function disposeAll() {
    for (let key in instances) {
        if (instances.hasOwnProperty(key)) {
            instances[key].dispose();
        }
    }
    instances = {};
}

/**
 * Get zrender instance by id
 */
export function getInstance(id: number): ZRender {
    return instances[id];
}

export function registerPainter(name: string, Ctor: typeof PainterBase) {
    painterCtors[name] = Ctor;
}

/**
 * @type {string}
 */
export const version = '4.2.0';


export interface ZRenderType extends ZRender {};