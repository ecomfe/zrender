/*!
* ZRender, a high performance 2d drawing library.
*
* Copyright (c) 2013, Baidu Inc.
* All rights reserved.
*
* LICENSE
* https://github.com/ecomfe/zrender/blob/master/LICENSE.txt
*/

import guid from './core/guid';
import env from './core/env';
import * as zrUtil from './core/util';
import Handler from './Handler';
import Storage from './Storage';
import Painter from './Painter';
import Animation from './animation/Animation';
import HandlerProxy from './dom/HandlerProxy';

var useVML = !env.canvasSupported;

var painterCtors = {
    canvas: Painter
};

var instances = {};    // ZRender实例map索引

/**
 * @type {string}
 */
export var version = '4.1.1';

/**
 * Initializing a zrender instance
 * @param {HTMLElement} dom
 * @param {Object} [opts]
 * @param {string} [opts.renderer='canvas'] 'canvas' or 'svg'
 * @param {number} [opts.devicePixelRatio]
 * @param {number|string} [opts.width] Can be 'auto' (the same as null/undefined)
 * @param {number|string} [opts.height] Can be 'auto' (the same as null/undefined)
 * @return {module:zrender/ZRender}
 */
export function init(dom, opts) {
    var zr = new ZRender(guid(), dom, opts);
    instances[zr.id] = zr;
    return zr;
}

/**
 * Dispose zrender instance
 * @param {module:zrender/ZRender} zr
 */
export function dispose(zr) {
    if (zr) {
        zr.dispose();
    }
    else {
        for (var key in instances) {
            if (instances.hasOwnProperty(key)) {
                instances[key].dispose();
            }
        }
        instances = {};
    }

    return this;
}

/**
 * Get zrender instance by id
 * @param {string} id zrender instance id
 * @return {module:zrender/ZRender}
 */
export function getInstance(id) {
    return instances[id];
}

export function registerPainter(name, Ctor) {
    painterCtors[name] = Ctor;
}

function delInstance(id) {
    delete instances[id];
}

/**
 * @module zrender/ZRender
 */
/**
 * @constructor
 * @alias module:zrender/ZRender
 * @param {string} id
 * @param {HTMLElement} dom
 * @param {Object} opts
 * @param {string} [opts.renderer='canvas'] 'canvas' or 'svg'
 * @param {number} [opts.devicePixelRatio]
 * @param {number} [opts.width] Can be 'auto' (the same as null/undefined)
 * @param {number} [opts.height] Can be 'auto' (the same as null/undefined)
 */
var ZRender = function (id, dom, opts) {

    opts = opts || {};

    /**
     * @type {HTMLDomElement}
     */
    this.dom = dom;

    /**
     * @type {string}
     */
    this.id = id;

    var self = this;
    var storage = new Storage();

    var rendererType = opts.renderer;
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
    var painter = new painterCtors[rendererType](dom, storage, opts, id);

    this.storage = storage;
    this.painter = painter;

    var handerProxy = (!env.node && !env.worker) ? new HandlerProxy(painter.getViewportRoot()) : null;
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

    /**
     * @type {boolean}
     * @private
     */
    this._needsRefresh;

    // 修改 storage.delFromStorage, 每次删除元素之前删除动画
    // FIXME 有点ugly
    var oldDelFromStorage = storage.delFromStorage;
    var oldAddToStorage = storage.addToStorage;

    storage.delFromStorage = function (el) {
        oldDelFromStorage.call(storage, el);

        el && el.removeSelfFromZr(self);
    };

    storage.addToStorage = function (el) {
        oldAddToStorage.call(storage, el);

        el.addSelfToZr(self);
    };
};

ZRender.prototype = {

    constructor: ZRender,
    /**
     * 获取实例唯一标识
     * @return {string}
     */
    getId: function () {
        return this.id;
    },

    /**
     * 添加元素
     * @param  {module:zrender/Element} el
     */
    add: function (el) {
        this.storage.addRoot(el);
        this._needsRefresh = true;
    },

    /**
     * 删除元素
     * @param  {module:zrender/Element} el
     */
    remove: function (el) {
        this.storage.delRoot(el);
        this._needsRefresh = true;
    },

    /**
     * Change configuration of layer
     * @param {string} zLevel
     * @param {Object} config
     * @param {string} [config.clearColor=0] Clear color
     * @param {string} [config.motionBlur=false] If enable motion blur
     * @param {number} [config.lastFrameAlpha=0.7] Motion blur factor. Larger value cause longer trailer
    */
    configLayer: function (zLevel, config) {
        if (this.painter.configLayer) {
            this.painter.configLayer(zLevel, config);
        }
        this._needsRefresh = true;
    },

    /**
     * Set background color
     * @param {string} backgroundColor
     */
    setBackgroundColor: function (backgroundColor) {
        if (this.painter.setBackgroundColor) {
            this.painter.setBackgroundColor(backgroundColor);
        }
        this._needsRefresh = true;
    },

    /**
     * Repaint the canvas immediately
     */
    refreshImmediately: function () {
        // var start = new Date();

        // Clear needsRefresh ahead to avoid something wrong happens in refresh
        // Or it will cause zrender refreshes again and again.
        this._needsRefresh = this._needsRefreshHover = false;
        this.painter.refresh();
        // Avoid trigger zr.refresh in Element#beforeUpdate hook
        this._needsRefresh = this._needsRefreshHover = false;

        // var end = new Date();
        // var log = document.getElementById('log');
        // if (log) {
        //     log.innerHTML = log.innerHTML + '<br>' + (end - start);
        // }
    },

    /**
     * Mark and repaint the canvas in the next frame of browser
     */
    refresh: function () {
        this._needsRefresh = true;
    },

    /**
     * Perform all refresh
     */
    flush: function () {
        var triggerRendered;

        if (this._needsRefresh) {
            triggerRendered = true;
            this.refreshImmediately();
        }
        if (this._needsRefreshHover) {
            triggerRendered = true;
            this.refreshHoverImmediately();
        }

        triggerRendered && this.trigger('rendered');
    },

    /**
     * Add element to hover layer
     * @param  {module:zrender/Element} el
     * @param {Object} style
     */
    addHover: function (el, style) {
        if (this.painter.addHover) {
            var elMirror = this.painter.addHover(el, style);
            this.refreshHover();
            return elMirror;
        }
    },

    /**
     * Add element from hover layer
     * @param  {module:zrender/Element} el
     */
    removeHover: function (el) {
        if (this.painter.removeHover) {
            this.painter.removeHover(el);
            this.refreshHover();
        }
    },

    /**
     * Clear all hover elements in hover layer
     * @param  {module:zrender/Element} el
     */
    clearHover: function () {
        if (this.painter.clearHover) {
            this.painter.clearHover();
            this.refreshHover();
        }
    },

    /**
     * Refresh hover in next frame
     */
    refreshHover: function () {
        this._needsRefreshHover = true;
    },

    /**
     * Refresh hover immediately
     */
    refreshHoverImmediately: function () {
        this._needsRefreshHover = false;
        this.painter.refreshHover && this.painter.refreshHover();
    },

    /**
     * Resize the canvas.
     * Should be invoked when container size is changed
     * @param {Object} [opts]
     * @param {number|string} [opts.width] Can be 'auto' (the same as null/undefined)
     * @param {number|string} [opts.height] Can be 'auto' (the same as null/undefined)
     */
    resize: function (opts) {
        opts = opts || {};
        this.painter.resize(opts.width, opts.height);
        this.handler.resize();
    },

    /**
     * Stop and clear all animation immediately
     */
    clearAnimation: function () {
        this.animation.clear();
    },

    /**
     * Get container width
     */
    getWidth: function () {
        return this.painter.getWidth();
    },

    /**
     * Get container height
     */
    getHeight: function () {
        return this.painter.getHeight();
    },

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
     * @param {module:zrender/graphic/Path} e
     * @param {number} width
     * @param {number} height
     */
    pathToImage: function (e, dpr) {
        return this.painter.pathToImage(e, dpr);
    },

    /**
     * Set default cursor
     * @param {string} [cursorStyle='default'] 例如 crosshair
     */
    setCursorStyle: function (cursorStyle) {
        this.handler.setCursorStyle(cursorStyle);
    },

    /**
     * Find hovered element
     * @param {number} x
     * @param {number} y
     * @return {Object} {target, topTarget}
     */
    findHover: function (x, y) {
        return this.handler.findHover(x, y);
    },

    /**
     * Bind event
     *
     * @param {string} eventName Event name
     * @param {Function} eventHandler Handler function
     * @param {Object} [context] Context object
     */
    on: function (eventName, eventHandler, context) {
        this.handler.on(eventName, eventHandler, context);
    },

    /**
     * Unbind event
     * @param {string} eventName Event name
     * @param {Function} [eventHandler] Handler function
     */
    off: function (eventName, eventHandler) {
        this.handler.off(eventName, eventHandler);
    },

    /**
     * Trigger event manually
     *
     * @param {string} eventName Event name
     * @param {event=} event Event object
     */
    trigger: function (eventName, event) {
        this.handler.trigger(eventName, event);
    },


    /**
     * Clear all objects and the canvas.
     */
    clear: function () {
        this.storage.delRoot();
        this.painter.clear();
    },

    /**
     * Dispose self.
     */
    dispose: function () {
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
};

