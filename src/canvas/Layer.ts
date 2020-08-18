import * as util from '../core/util';
import {devicePixelRatio} from '../config';
import { PatternObject } from '../graphic/Pattern';
import CanvasPainter from './Painter';
import { GradientObject } from '../graphic/Gradient';
import { ZRCanvasRenderingContext } from '../core/types';
import Eventful from '../core/Eventful';
import { ElementEventCallback } from '../Element';
import { getCanvasGradient } from './helper';
import { createCanvasPattern } from './graphic';
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

function isValidPaintRect(rect: BoundingRect): boolean {
    return rect && !isNaN(rect.x) && !isNaN(rect.y)
        && !isNaN(rect.width) && !isNaN(rect.height);
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

    maxRepaintRectCount = 5

    __painter: CanvasPainter

    __dirty = true
    __firstTimePaint = true

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

    createRepaintRects(displayList: Displayable[], prevList: Displayable[]) {
        if (this.__firstTimePaint) {
            util.each(displayList, el => {
                if (el.__dirty) {
                    el.setPrevPaintRect(el.getPaintRect());
                }
            });

            this.__firstTimePaint = false;
            return [];
        }

        const mergedRepaintRects: BoundingRect[] = [];
        const rects: BoundingRect[] = [];

        // Add current and previous bounding rect
        util.each(displayList, el => {
            if (el.__dirty) {
                el.__needsRepaintDirtyRect = false;

                const prevRect = el.getPrevPaintRect();
                if (isValidPaintRect(prevRect)) {
                    rects.push(prevRect);
                }

                const curRect = el.getPaintRect();
                if (isValidPaintRect(curRect)) {
                    rects.push(curRect);
                    el.setPrevPaintRect(curRect);
                }
            }
        });

        // Add removed displayables because they need to be cleared
        util.each(prevList, el => {
            if (el.__needsRepaintDirtyRect) {
                // el is removed
                const prevRect = el.getPrevPaintRect();
                if (isValidPaintRect(prevRect)) {
                    rects.push(prevRect);
                }
            }
        });

        // Merge
        util.each(rects, rect => {
            if (mergedRepaintRects.length === 0) {
                // First rect, create new merged rect
                const boundingRect = new BoundingRect(0, 0, 0, 0);
                boundingRect.copy(rect);
                mergedRepaintRects.push(boundingRect);
            }
            else {
                let isMerged = false;
                for (let i = 0; i < mergedRepaintRects.length; ++i) {
                    const mergedRect = mergedRepaintRects[i];

                    // Merge if has intersection
                    if (mergedRect.intersect(rect)) {
                        const pendingRect = new BoundingRect(0, 0, 0, 0);
                        pendingRect.copy(mergedRect);
                        pendingRect.union(rect);
                        mergedRepaintRects[i] = pendingRect;
                        isMerged = true;
                        break;
                    }
                }
                if (!isMerged) {
                    // Create new merged rect if cannot merge with current
                    const boundingRect = new BoundingRect(0, 0, 0, 0);
                    boundingRect.copy(rect);
                    mergedRepaintRects.push(boundingRect);
                }
            }
        });

        // Decrease mergedRepaintRects counts to maxRepaintRectCount
        const pendingRect = new BoundingRect(0, 0, 0, 0);
        while (mergedRepaintRects.length > this.maxRepaintRectCount) {
            let minDeltaArea = Number.MAX_VALUE;
            let minAId: number = null;
            let minBId: number = null;
            for (let i = 0, len = mergedRepaintRects.length; i < len; ++i) {
                for (let j = i + 1; j < len; ++j) {
                    const aRect = mergedRepaintRects[i];
                    const aArea = aRect.width * aRect.height;
                    const bRect = mergedRepaintRects[j];
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
            mergedRepaintRects[minAId].union(mergedRepaintRects[minBId]);
            mergedRepaintRects.splice(minBId, 1);
        }

        // Merge intersected rects in the result
        function checkIntersection() {
            if (mergedRepaintRects.length > 1) {
                for (let i = 0; i < mergedRepaintRects.length; ++i) {
                    for (let j = i + 1; j < mergedRepaintRects.length; ++j) {
                        if (mergedRepaintRects[i] && mergedRepaintRects[j]
                            && mergedRepaintRects[i].intersect(mergedRepaintRects[j])
                        ) {
                            mergedRepaintRects[i].union(mergedRepaintRects[j]);
                            mergedRepaintRects.splice(j, 1);
                            checkIntersection();
                            return;
                        }
                    }
                }
            }
        }
        checkIntersection();

        return mergedRepaintRects;
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
    clear(
        clearAll?: boolean,
        clearColor?: string | GradientObject | PatternObject,
        repaintRects?: BoundingRect[]
    ) {
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

        const doClear = (rect: BoundingRect) => {
            ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
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
                ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
                ctx.restore();
            }

            if (haveMotionBLur) {
                const domBack = this.domBack;
                ctx.save();
                ctx.globalAlpha = lastFrameAlpha;
                ctx.drawImage(domBack, rect.x, rect.y, rect.width, rect.height);
                ctx.restore();
            }
        };

        if (!repaintRects || !repaintRects.length) {
            // Clear the full canvas
            doClear(new BoundingRect(0, 0, width, height));
        }
        else {
            // Clear the repaint areas
            util.each(repaintRects, rect => {
                doClear(new BoundingRect(
                    rect.x * dpr,
                    rect.y * dpr,
                    rect.width * dpr,
                    rect.height * dpr
                ));
            });
        }
    }

    // Iterface of refresh
    refresh: (clearColor?: string | GradientObject | PatternObject) => void

    // Interface of renderToCanvas in getRenderedCanvas
    renderToCanvas: (ctx: CanvasRenderingContext2D) => void

    // Events
    onclick: ElementEventCallback<unknown, this>
    ondblclick: ElementEventCallback<unknown, this>
    onmouseover: ElementEventCallback<unknown, this>
    onmouseout: ElementEventCallback<unknown, this>
    onmousemove: ElementEventCallback<unknown, this>
    onmousewheel: ElementEventCallback<unknown, this>
    onmousedown: ElementEventCallback<unknown, this>
    onmouseup: ElementEventCallback<unknown, this>
    oncontextmenu: ElementEventCallback<unknown, this>

    ondrag: ElementEventCallback<unknown, this>
    ondragstart: ElementEventCallback<unknown, this>
    ondragend: ElementEventCallback<unknown, this>
    ondragenter: ElementEventCallback<unknown, this>
    ondragleave: ElementEventCallback<unknown, this>
    ondragover: ElementEventCallback<unknown, this>
    ondrop: ElementEventCallback<unknown, this>
}