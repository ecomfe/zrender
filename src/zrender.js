/*!
 * ZRender, a high performance 2d drawing library.
 *
 * Copyright (c) 2013, Baidu Inc.
 * All rights reserved.
 *
 * LICENSE
 * https://github.com/ecomfe/zrender/blob/master/LICENSE.txt
 */
// Global defines
define(function(require) {
    var guid = require('./core/guid');
    var env = require('./core/env');

    var Handler = require('./Handler');
    var Storage = require('./Storage');
    var Animation = require('./animation/Animation');

    var useVML = !env.canvasSupported;

    var painterCtors = {
        canvas: require('./Painter')
    };

    var instances = {};    // ZRender实例map索引

    var zrender = {};
    /**
     * @type {string}
     */
    zrender.version = '3.1.1';

    /**
     * Initializing a zrender instance
     * @param {HTMLElement} dom
     * @param {Object} opts
     * @param {string} [opts.renderer='canvas'] 'canvas' or 'svg'
     * @param {number} [opts.devicePixelRatio]
     * @return {module:zrender/ZRender}
     */
    zrender.init = function(dom, opts) {
        var zr = new ZRender(guid(), dom, opts);
        instances[zr.id] = zr;
        return zr;
    };

    /**
     * Dispose zrender instance
     * @param {module:zrender/ZRender} zr
     */
    zrender.dispose = function (zr) {
        if (zr) {
            zr.dispose();
        }
        else {
            for (var key in instances) {
                instances[key].dispose();
            }
            instances = {};
        }

        return zrender;
    };

    /**
     * Get zrender instance by id
     * @param {string} id zrender instance id
     * @return {module:zrender/ZRender}
     */
    zrender.getInstance = function (id) {
        return instances[id];
    };

    zrender.registerPainter = function (name, Ctor) {
        painterCtors[name] = Ctor;
    };

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
     * @param {HTMLDomElement} dom
     * @param {Object} opts
     * @param {string} [opts.renderer='canvas'] 'canvas' or 'svg'
     * @param {number} [opts.devicePixelRatio]
     */
    var ZRender = function(id, dom, opts) {

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
        if (useVML) {
            if (!painterCtors.vml) {
                throw new Error('You need to require \'zrender/vml/vml\' to support IE8');
            }
            rendererType = 'vml';
        }
        else if (!rendererType || !painterCtors[rendererType]) {
            rendererType = 'canvas';
        }
        var painter = new painterCtors[rendererType](dom, storage, opts);

        this.storage = storage;
        this.painter = painter;
        if (!env.node) {
            this.handler = new Handler(painter.getViewportRoot(), storage, painter);
        }

        /**
         * @type {module:zrender/animation/Animation}
         */
        this.animation = new Animation({
            stage: {
                update: function () {
                    if (self._needsRefresh) {
                        self.refreshImmediately();
                    }
                    if (self._needsRefreshHover) {
                        self.refreshHoverImmediately();
                    }
                }
            }
        });
        this.animation.start();

        /**
         * @type {boolean}
         * @private
         */
        this._needsRefresh;

        // 修改 storage.delFromMap, 每次删除元素之前删除动画
        // FIXME 有点ugly
        var oldDelFromMap = storage.delFromMap;
        var oldAddToMap = storage.addToMap;

        storage.delFromMap = function (elId) {
            var el = storage.get(elId);

            oldDelFromMap.call(storage, elId);

            el && el.removeSelfFromZr(self);
        };

        storage.addToMap = function (el) {
            oldAddToMap.call(storage, el);

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
            this.painter.configLayer(zLevel, config);
            this._needsRefresh = true;
        },

        /**
         * Repaint the canvas immediately
         */
        refreshImmediately: function () {
            // Clear needsRefresh ahead to avoid something wrong happens in refresh
            // Or it will cause zrender refreshes again and again.
            this._needsRefresh = false;
            this.painter.refresh();
            /**
             * Avoid trigger zr.refresh in Element#beforeUpdate hook
             */
            this._needsRefresh = false;
        },

        /**
         * Mark and repaint the canvas in the next frame of browser
         */
        refresh: function() {
            this._needsRefresh = true;
        },

        /**
         * Add element to hover layer
         * @param  {module:zrender/Element} el
         * @param {Object} style
         */
        addHover: function (el, style) {
            if (this.painter.addHover) {
                this.painter.addHover(el, style);
                this.refreshHover();
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
         */
        resize: function() {
            this.painter.resize();
            this.handler && this.handler.resize();
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
        getWidth: function() {
            return this.painter.getWidth();
        },

        /**
         * Get container height
         */
        getHeight: function() {
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
        pathToImage: function(e, width, height) {
            var id = guid();
            return this.painter.pathToImage(id, e, width, height);
        },

        /**
         * Set default cursor
         * @param {string} [cursorStyle='default'] 例如 crosshair
         */
        setCursorStyle: function (cursorStyle) {
            this.handler && this.handler.setCursorStyle(cursorStyle);
        },

        /**
         * Bind event
         *
         * @param {string} eventName Event name
         * @param {Function} eventHandler Handler function
         * @param {Object} [context] Context object
         */
        on: function(eventName, eventHandler, context) {
            this.handler && this.handler.on(eventName, eventHandler, context);
        },

        /**
         * Unbind event
         * @param {string} eventName Event name
         * @param {Function} [eventHandler] Handler function
         */
        off: function(eventName, eventHandler) {
            this.handler && this.handler.off(eventName, eventHandler);
        },

        /**
         * Trigger event manually
         *
         * @param {string} eventName Event name
         * @param {event=} event Event object
         */
        trigger: function (eventName, event) {
            this.handler && this.handler.trigger(eventName, event);
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
            this.handler && this.handler.dispose();

            this.animation =
            this.storage =
            this.painter =
            this.handler = null;

            delInstance(this.id);
        }
    };

    return zrender;
});
