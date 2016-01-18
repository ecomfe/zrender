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
    zrender.version = '3.0.1';

    /**
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
     * 获取zrender实例
     * @param {string} id ZRender对象索引
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
        // VML 下为了性能可能会直接操作 VMLRoot 的位置
        // 因此鼠标的相对位置应该是相对于 VMLRoot
        // PENDING
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
         * @param  {string|module:zrender/Element} el
         */
        add: function (el) {
            this.storage.addRoot(el);
            this._needsRefresh = true;
        },

        /**
         * 删除元素
         * @param  {string|module:zrender/Element} el
         */
        remove: function (el) {
            this.storage.delRoot(el);
            this._needsRefresh = true;
        },

        /**
         * 修改指定zlevel的绘制配置项
         *
         * @param {string} zLevel
         * @param {Object} config 配置对象
         * @param {string} [config.clearColor=0] 每次清空画布的颜色
         * @param {string} [config.motionBlur=false] 是否开启动态模糊
         * @param {number} [config.lastFrameAlpha=0.7]
         *                 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
        */
        configLayer: function (zLevel, config) {
            this.painter.configLayer(zLevel, config);
            this._needsRefresh = true;
        },

        /**
         * 视图更新
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
         * 标记视图在浏览器下一帧需要绘制
         */
        refresh: function() {
            this._needsRefresh = true;
        },

        /**
         * 调整视图大小
         */
        resize: function() {
            this.painter.resize();
            this.handler && this.handler.resize();
        },

        /**
         * 停止所有动画
         */
        clearAnimation: function () {
            this.animation.clear();
        },

        /**
         * 获取视图宽度
         */
        getWidth: function() {
            return this.painter.getWidth();
        },

        /**
         * 获取视图高度
         */
        getHeight: function() {
            return this.painter.getHeight();
        },

        /**
         * 图像导出
         * @param {string} type
         * @param {string} [backgroundColor='#fff'] 背景色
         * @return {string} 图片的Base64 url
         */
        toDataURL: function(type, backgroundColor, args) {
            return this.painter.toDataURL(type, backgroundColor, args);
        },

        /**
         * 将常规shape转成image shape
         * @param {module:zrender/shape/Base} e
         * @param {number} width
         * @param {number} height
         */
        pathToImage: function(e, width, height) {
            var id = guid();
            return this.painter.pathToImage(id, e, width, height);
        },

        /**
         * 设置默认的cursor style
         * @param {string} cursorStyle 例如 crosshair
         */
        setDefaultCursorStyle: function (cursorStyle) {
            this.handler.setDefaultCursorStyle(cursorStyle);
        },

        /**
         * 事件绑定
         *
         * @param {string} eventName 事件名称
         * @param {Function} eventHandler 响应函数
         * @param {Object} [context] 响应函数
         */
        on: function(eventName, eventHandler, context) {
            this.handler && this.handler.on(eventName, eventHandler, context);
        },

        /**
         * 事件解绑定，参数为空则解绑所有自定义事件
         *
         * @param {string} eventName 事件名称
         * @param {Function} eventHandler 响应函数
         */
        off: function(eventName, eventHandler) {
            this.handler && this.handler.off(eventName, eventHandler);
        },

        /**
         * 事件触发
         *
         * @param {string} eventName 事件名称，resize，hover，drag，etc
         * @param {event=} event event dom事件对象
         */
        trigger: function (eventName, event) {
            this.handler && this.handler.trigger(eventName, event);
        },


        /**
         * 清除当前ZRender下所有类图的数据和显示，clear后MVC和已绑定事件均还存在在，ZRender可用
         */
        clear: function () {
            this.storage.delRoot();
            this.painter.clear();
        },

        /**
         * 释放当前ZR实例（删除包括dom，数据、显示和事件绑定），dispose后ZR不可用
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
