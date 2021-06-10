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
import Element, {ElementEventCallback, ElementEvent} from './Element';
import { Dictionary, ElementEventName, RenderedEvent } from './core/types';
import { LayerConfig } from './canvas/Layer';
import { GradientObject } from './graphic/Gradient';
import { PatternObject } from './graphic/Pattern';
import { EventCallback } from './core/Eventful';
import TSpan from './graphic/TSpan';
import ZRImage from './graphic/Image';
import Displayable from './graphic/Displayable';
import { lum } from './tool/color';
import { DARK_MODE_THRESHOLD } from './config';
import Path from './graphic/Path';
import Group from './graphic/Group';


const useVML = !env.canvasSupported;

type PainterBaseCtor = {
    new(dom: HTMLElement, storage: Storage, ...args: any[]): PainterBase
}

const painterCtors: Dictionary<PainterBaseCtor> = {};

let instances: { [key: number]: ZRender } = {};

function delInstance(id: number) {
    delete instances[id];
}

function isDarkMode(backgroundColor: string | GradientObject | PatternObject): boolean {
    if (!backgroundColor) {
        return false;
    }
    if (typeof backgroundColor === 'string') {
        return lum(backgroundColor, 1) < DARK_MODE_THRESHOLD;
    }
    else if ((backgroundColor as GradientObject).colorStops) {
        const colorStops = (backgroundColor as GradientObject).colorStops;
        let totalLum = 0;
        const len = colorStops.length;
        // Simply do the math of average the color. Not consider the offset
        for (let i = 0; i < len; i++) {
            totalLum += lum(colorStops[i].color, 1);
        }
        totalLum /= len;

        return totalLum < DARK_MODE_THRESHOLD;
    }
    // Can't determine
    return false;
}

class ZRender {

    dom: HTMLElement

    id: number

    storage: Storage
    painter: PainterBase
    handler: Handler
    animation: Animation

    private _sleepAfterStill = 10;

    private _stillFrameAccum = 0;

    private _needsRefresh = true
    private _needsRefreshHover = true

    /**
     * If theme is dark mode. It will determine the color strategy for labels.
     */
    private _darkMode = false;

    private _backgroundColor: string | GradientObject | PatternObject;

    constructor(id: number, dom: HTMLElement, opts?: ZRenderInitOpt) {
        opts = opts || {};

        /**
         * @type {HTMLDomElement}
         */
        this.dom = dom;

        this.id = id;

        const storage = new Storage();

        let rendererType = opts.renderer || 'canvas';

        // TODO WebGL
        if (useVML) {
            throw new Error('IE8 support has been dropped since 5.0');
        }

        if (!painterCtors[rendererType]) {
            // Use the first registered renderer.
            rendererType = zrUtil.keys(painterCtors)[0];
        }
        if (!painterCtors[rendererType]) {
            throw new Error(`Renderer '${rendererType}' is not imported. Please import it first.`);
        }

        opts.useDirtyRect = opts.useDirtyRect == null
            ? false
            : opts.useDirtyRect;

        const painter = new painterCtors[rendererType](dom, storage, opts, id);

        this.storage = storage;
        this.painter = painter;

        const handerProxy = (!env.node && !env.worker)
            ? new HandlerProxy(painter.getViewportRoot(), painter.root)
            : null;
        this.handler = new Handler(storage, painter, handerProxy, painter.root);

        this.animation = new Animation({
            stage: {
                update: () => this._flush(true)
            }
        });
        this.animation.start();
    }

    /**
     * 添加元素
     */
    add(el: Element) {
        if (!el) {
            return;
        }
        this.storage.addRoot(el);
        el.addSelfToZr(this);
        this.refresh();
    }

    /**
     * 删除元素
     */
    remove(el: Element) {
        if (!el) {
            return;
        }
        this.storage.delRoot(el);
        el.removeSelfFromZr(this);
        this.refresh();
    }

    /**
     * Change configuration of layer
    */
    configLayer(zLevel: number, config: LayerConfig) {
        if (this.painter.configLayer) {
            this.painter.configLayer(zLevel, config);
        }
        this.refresh();
    }

    /**
     * Set background color
     */
    setBackgroundColor(backgroundColor: string | GradientObject | PatternObject) {
        if (this.painter.setBackgroundColor) {
            this.painter.setBackgroundColor(backgroundColor);
        }
        this.refresh();
        this._backgroundColor = backgroundColor;
        this._darkMode = isDarkMode(backgroundColor);
    }

    getBackgroundColor() {
        return this._backgroundColor;
    }

    /**
     * Force to set dark mode
     */
    setDarkMode(darkMode: boolean) {
        this._darkMode = darkMode;
    }

    isDarkMode() {
        return this._darkMode;
    }

    /**
     * Repaint the canvas immediately
     */
    refreshImmediately(fromInside?: boolean) {
        // const start = new Date();

        if (!fromInside) {
            // Update animation if refreshImmediately is invoked from outside.
            // Not trigger stage update to call flush again. Which may refresh twice
            this.animation.update(true);
        }

        // Clear needsRefresh ahead to avoid something wrong happens in refresh
        // Or it will cause zrender refreshes again and again.
        this._needsRefresh = false;
        this.painter.refresh();
        // Avoid trigger zr.refresh in Element#beforeUpdate hook
        this._needsRefresh = false;

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
        // Active the animation again.
        this.animation.start();
    }

    /**
     * Perform all refresh
     */
    flush() {
        this._flush(false);
    }

    private _flush(fromInside?: boolean) {
        let triggerRendered;

        const start = new Date().getTime();
        if (this._needsRefresh) {
            triggerRendered = true;
            this.refreshImmediately(fromInside);
        }

        if (this._needsRefreshHover) {
            triggerRendered = true;
            this.refreshHoverImmediately();
        }
        const end = new Date().getTime();

        if (triggerRendered) {
            this._stillFrameAccum = 0;
            this.trigger('rendered', {
                elapsedTime: end - start
            } as RenderedEvent);
        }
        else if (this._sleepAfterStill > 0) {
            this._stillFrameAccum++;
            // Stop the animiation after still for 10 frames.
            if (this._stillFrameAccum > this._sleepAfterStill) {
                this.animation.stop();
            }
        }
    }

    /**
     * Set sleep after still for frames.
     * Disable auto sleep when it's 0.
     */
    setSleepAfterStill(stillFramesCount: number) {
        this._sleepAfterStill = stillFramesCount;
    }

    /**
     * Wake up animation loop. But not render.
     */
    wakeUp() {
        this.animation.start();
        // Reset the frame count.
        this._stillFrameAccum = 0;
    }

    /**
     * Add element to hover layer
     */
    addHover(el: Displayable) {
        // deprecated.
    }

    /**
     * Add element from hover layer
     */
    removeHover(el: Path | TSpan | ZRImage) {
        // deprecated.
    }

    /**
     * Clear all hover elements in hover layer
     */
    clearHover() {
        // deprecated.
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
        if (this.painter.refreshHover && this.painter.getType() === 'canvas') {
            this.painter.refreshHover();
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
        if (this.painter.pathToImage) {
            return this.painter.pathToImage(e, dpr);
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
        target: Displayable
        topTarget: Displayable
    } {
        return this.handler.findHover(x, y);
    }

    on<Ctx>(eventName: ElementEventName, eventHandler: ElementEventCallback<Ctx, unknown>, context?: Ctx): this
    on<Ctx>(eventName: string, eventHandler: EventCallback<Ctx, unknown>, context?: Ctx): this
    // eslint-disable-next-line max-len
    on<Ctx>(eventName: string, eventHandler: EventCallback<Ctx, unknown> | EventCallback<Ctx, unknown, ElementEvent>, context?: Ctx): this {
        this.handler.on(eventName, eventHandler, context);
        return this;
    }

    /**
     * Unbind event
     * @param eventName Event name
     * @param eventHandler Handler function
     */
    // eslint-disable-next-line max-len
    off(eventName?: string, eventHandler?: EventCallback<unknown, unknown> | EventCallback<unknown, unknown, ElementEvent>) {
        this.handler.off(eventName, eventHandler);
    }

    /**
     * Trigger event manually
     *
     * @param eventName Event name
     * @param event Event object
     */
    trigger(eventName: string, event?: unknown) {
        this.handler.trigger(eventName, event);
    }


    /**
     * Clear all objects and the canvas.
     */
    clear() {
        const roots = this.storage.getRoots();
        for (let i = 0; i < roots.length; i++) {
            if (roots[i] instanceof Group) {
                roots[i].removeSelfFromZr(this);
            }
        }
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
    useDirtyRect?: boolean
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

export function registerPainter(name: string, Ctor: PainterBaseCtor) {
    painterCtors[name] = Ctor;
}

/**
 * @type {string}
 */
export const version = '5.1.1';


export interface ZRenderType extends ZRender {};