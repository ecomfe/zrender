import * as util from '../core/util';
import {devicePixelRatio} from '../config';
import Pattern, { PatternObject } from '../graphic/Pattern';
import CanvasPainter from './Painter';
import { GradientObject } from '../graphic/Gradient';
import { ZRCanvasRenderingContext } from '../core/types';
import Eventful from '../core/Eventful';
import { ElementEventCallback } from '../Element';
import { getCanvasGradient } from './helper';
import { createCanvasPattern, getPaintRect } from './graphic';
import { ZRenderType } from '../zrender';
import Displayable from '../graphic/Displayable';
import BoundingRect from '../core/BoundingRect';

function returnFalse() {
    return false;
}

function createDom(id: string, painter: CanvasPainter, dpr: number) {
    const newDom = util.createCanvas();
    const width = painter.getWidth();
    const height = painter.getHeight();

    const newDomStyle = newDom.style;
    if (newDomStyle) {  // In node or some other non-browser environment
        newDomStyle.position = 'absolute';
        newDomStyle.left = '0';
        newDomStyle.top = '0';
        newDomStyle.width = width + 'px';
        newDomStyle.height = height + 'px';

        newDom.setAttribute('data-zr-dom-id', id);
    }

    newDom.width = width * dpr;
    newDom.height = height * dpr;

    return newDom;
}

export interface LayerConfig {
    // 每次清空画布的颜色
    clearColor?: string | GradientObject | PatternObject
    // 是否开启动态模糊
    motionBlur?: boolean
    // 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
    lastFrameAlpha?: number
};

export default class Layer extends Eventful {

    id: string

    dom: HTMLCanvasElement
    domBack: HTMLCanvasElement

    ctx: CanvasRenderingContext2D
    ctxBack: CanvasRenderingContext2D

    painter: CanvasPainter

    // Configs
    /**
     * 每次清空画布的颜色
     */
    clearColor: string | GradientObject | PatternObject
    /**
     * 是否开启动态模糊
     */
    motionBlur = false
    /**
     * 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
     */
    lastFrameAlpha = 0.7
    /**
     * Layer dpr
     */
    dpr = 1

    /**
     * Virtual layer will not be inserted into dom.
     */
    virtual = false

    config = {}

    incremental = false

    zlevel = 0

    lastFramePaintRects: BoundingRect[]
    currentPaintRects: BoundingRect[]

    maxRepaintRectCount = 3
    mergedRepaintRects: BoundingRect[]

    __painter: CanvasPainter

    __dirty = true

    __used = false

    __drawIndex = 0
    __startIndex = 0
    __endIndex = 0

    __builtin__: boolean

    constructor(id: string | HTMLCanvasElement, painter: CanvasPainter, dpr?: number) {
        super();

        let dom;
        dpr = dpr || devicePixelRatio;
        if (typeof id === 'string') {
            dom = createDom(id, painter, dpr);
        }
        // Not using isDom because in node it will return false
        else if (util.isObject(id)) {
            dom = id;
            id = dom.id;
        }
        this.id = id as string;
        this.dom = dom;

        const domStyle = dom.style;
        if (domStyle) { // Not in node
            dom.onselectstart = returnFalse; // 避免页面选中的尴尬
            domStyle.webkitUserSelect = 'none';
            domStyle.userSelect = 'none';
            domStyle.webkitTapHighlightColor = 'rgba(0,0,0,0)';
            (domStyle as any)['-webkit-touch-callout'] = 'none';
            domStyle.padding = '0';
            domStyle.margin = '0';
            domStyle.borderWidth = '0';
        }

        this.domBack = null;
        this.ctxBack = null;

        this.painter = painter;

        this.config = null;

        this.dpr = dpr;

        this.lastFramePaintRects = [];
        this.currentPaintRects = [];
        this.mergedRepaintRects = [];
    }

    getElementCount() {
        return this.__endIndex - this.__startIndex;
    }

    initContext() {
        this.ctx = this.dom.getContext('2d');
        (this.ctx as ZRCanvasRenderingContext).dpr = this.dpr;
    }

    createBackBuffer() {
        const dpr = this.dpr;

        this.domBack = createDom('back-' + this.id, this.painter, dpr);
        this.ctxBack = this.domBack.getContext('2d');

        if (dpr !== 1) {
            this.ctxBack.scale(dpr, dpr);
        }
    }

    updateRepaintRects(displayList: Displayable[]) {
        this._updateRenderingRects(displayList)
        this.mergedRepaintRects = [];

        const rects = this.lastFramePaintRects.concat(this.currentPaintRects);
        util.each(rects, rect => {
            if (this.mergedRepaintRects.length === 0) {
                // First rect, create new merged rect
                const boundingRect = new BoundingRect();
                boundingRect.copy(rect);
                this.mergedRepaintRects.push(boundingRect);
            }
            else {
                let isMerged = false;
                const rectArea = rect.width * rect.height;
                for (let i = 0; i < this.mergedRepaintRects.length; ++i) {
                    const mergedRect = this.mergedRepaintRects[i];
                    const mergedArea = mergedRect.width * mergedRect.height;

                    // The rect after merging rect with mergedRect
                    const pendingRect = new BoundingRect();
                    pendingRect.copy(mergedRect);
                    pendingRect.union(rect);
                    const pendingArea = pendingRect.width * pendingRect.height;

                    if (pendingArea < rectArea + mergedArea) {
                        // Allow merging when size is smaller if merged
                        this.mergedRepaintRects[i] = pendingRect;
                        isMerged = true;
                        break;
                    }
                }
                if (!isMerged) {
                    // Create new merged rect if cannot merge with current
                    const boundingRect = new BoundingRect();
                    boundingRect.copy(rect);
                    this.mergedRepaintRects.push(boundingRect);
                }
            }
        });

        // Decrease mergedRepaintRects counts to maxRepaintRectCount
        const pendingRect = new BoundingRect();
        while (this.mergedRepaintRects.length > this.maxRepaintRectCount) {
            let minDeltaArea = Number.MAX_VALUE;
            let minAId: number = null;
            let minBId: number = null;
            for (let i = 0, len = this.mergedRepaintRects.length; i < len; ++i) {
                for (let j = i + 1; j < len; ++j) {
                    const aRect = this.mergedRepaintRects[i];
                    const aArea = aRect.width * aRect.height;
                    const bRect = this.mergedRepaintRects[j];
                    const bArea = bRect.width * bRect.height;

                    pendingRect.copy(aRect);
                    pendingRect.union(bRect);
                    const pendingArea = pendingRect.width * pendingRect.height;
                    const deltaArea = pendingArea - aArea - bArea;

                    if (deltaArea < minDeltaArea) {
                        minDeltaArea = deltaArea;
                        minAId = i;
                        minBId = j;
                    }
                }
            }

            // Merge the smallest two
            this.mergedRepaintRects[minAId].union(this.mergedRepaintRects[minBId]);
            this.mergedRepaintRects.splice(minBId, 1);
        }
        console.log(this.mergedRepaintRects);
        this._drawRect(this.mergedRepaintRects);
    }

    resize(width: number, height: number) {
        const dpr = this.dpr;

        const dom = this.dom;
        const domStyle = dom.style;
        const domBack = this.domBack;

        if (domStyle) {
            domStyle.width = width + 'px';
            domStyle.height = height + 'px';
        }

        dom.width = width * dpr;
        dom.height = height * dpr;

        if (domBack) {
            domBack.width = width * dpr;
            domBack.height = height * dpr;

            if (dpr !== 1) {
                this.ctxBack.scale(dpr, dpr);
            }
        }
    }

    /**
     * 清空该层画布
     */
    clear(clearAll?: boolean, clearColor?: string | GradientObject | PatternObject) {
        const dom = this.dom;
        const ctx = this.ctx;
        const width = dom.width;
        const height = dom.height;

        clearColor = clearColor || this.clearColor;
        const haveMotionBLur = this.motionBlur && !clearAll;
        const lastFrameAlpha = this.lastFrameAlpha;

        const dpr = this.dpr;
        const self = this;

        if (haveMotionBLur) {
            if (!this.domBack) {
                this.createBackBuffer();
            }

            this.ctxBack.globalCompositeOperation = 'copy';
            this.ctxBack.drawImage(
                dom, 0, 0,
                width / dpr,
                height / dpr
            );
        }

        ctx.clearRect(0, 0, width, height);
        if (clearColor && clearColor !== 'transparent') {
            let clearColorGradientOrPattern;
            // Gradient
            if (util.isGradientObject(clearColor)) {
                // Cache canvas gradient
                clearColorGradientOrPattern = clearColor.__canvasGradient
                    || getCanvasGradient(ctx, clearColor, {
                        x: 0,
                        y: 0,
                        width: width,
                        height: height
                    });

                clearColor.__canvasGradient = clearColorGradientOrPattern;
            }
            // Pattern
            else if (util.isPatternObject(clearColor)) {
                clearColorGradientOrPattern = createCanvasPattern(
                    ctx, clearColor, {
                        dirty: function () {
                            // TODO
                            self.__painter.refresh();
                        }
                    }
                );
            }
            ctx.save();
            ctx.fillStyle = clearColorGradientOrPattern || (clearColor as string);
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        if (haveMotionBLur) {
            const domBack = this.domBack;
            ctx.save();
            ctx.globalAlpha = lastFrameAlpha;
            ctx.drawImage(domBack, 0, 0, width, height);
            ctx.restore();
        }
    }

    // Iterface of refresh
    refresh: (clearColor?: string | GradientObject | PatternObject) => void

    // Interface of renderToCanvas in getRenderedCanvas
    renderToCanvas: (ctx: CanvasRenderingContext2D) => void


    // Events
    onclick: ElementEventCallback
    ondblclick: ElementEventCallback
    onmouseover: ElementEventCallback
    onmouseout: ElementEventCallback
    onmousemove: ElementEventCallback
    onmousewheel: ElementEventCallback
    onmousedown: ElementEventCallback
    onmouseup: ElementEventCallback
    oncontextmenu: ElementEventCallback

    ondrag: ElementEventCallback
    ondragstart: ElementEventCallback
    ondragend: ElementEventCallback
    ondragenter: ElementEventCallback
    ondragleave: ElementEventCallback
    ondragover: ElementEventCallback
    ondrop: ElementEventCallback


    private _updateRenderingRects(displayList: Displayable[]) {
        this.lastFramePaintRects = this.currentPaintRects;
        this.currentPaintRects = [];

        util.each(displayList, el => {
            const renderingRect = getPaintRect(el);
            this.currentPaintRects.push(renderingRect);
        });
    }

    private _drawRect(rects: BoundingRect[]) {
        setTimeout(() => {
            this.ctx.save();
            this.ctx.fillStyle = 'none';
            this.ctx.strokeStyle = '#0ff';
            util.each(rects, rect => {
                this.ctx.strokeRect(rect.x * this.dpr, rect.y * this.dpr, rect.width * this.dpr, rect.height * this.dpr);
            });
            this.ctx.restore();
        });
    }
}