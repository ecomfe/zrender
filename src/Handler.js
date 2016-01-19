/**
 * Handler控制模块
 * @module zrender/Handler
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *         errorrik (errorrik@gmail.com)
 *         pissang (shenyi.914@gmail.com)
 */
define(function (require) {

    'use strict';

    var env = require('./core/env');
    var eventTool = require('./core/event');
    var util = require('./core/util');
    var Draggable = require('./mixin/Draggable');
    var GestureMgr = require('./core/GestureMgr');

    var Eventful = require('./mixin/Eventful');

    var domHandlerNames = [
        'click', 'dblclick',
        'mousewheel', 'mousemove', 'mouseout', 'mouseup', 'mousedown'
    ];

    var touchHandlerNames = [
        'touchstart', 'touchend', 'touchmove'
    ];

    var TOUCH_CLICK_DELAY = 300;

    // touch指尖错觉的尝试偏移量配置
    // var MOBILE_TOUCH_OFFSETS = [
    //     { x: 10 },
    //     { x: -20 },
    //     { x: 10, y: 10 },
    //     { y: -20 }
    // ];

    var addEventListener = eventTool.addEventListener;
    var removeEventListener = eventTool.removeEventListener;
    var normalizeEvent = eventTool.normalizeEvent;

    function proxyEventName(name) {
        return '_' + name + 'Handler';
    }

    function makeEventPacket(eveType, target, event) {
        return {
            type: eveType,
            event: event,
            target: target,
            cancelBubble: false,
            offsetX: event.zrX,
            offsetY: event.zrY,
            gestureEvent: event.gestureEvent,
            pinchX: event.pinchX,
            pinchY: event.pinchY,
            pinchScale: event.pinchScale,
            wheelDelta: event.zrDelta
        };
    }

    var domHandlers = {
        /**
         * Mouse move handler
         * @inner
         * @param {Event} event
         */
        mousemove: function (event) {
            event = normalizeEvent(this.root, event);

            var x = event.zrX;
            var y = event.zrY;

            var hovered = this._findHover(x, y, null);
            var lastHovered = this._hovered;

            this._hovered = hovered;

            this.root.style.cursor = hovered ? hovered.cursor : this._defaultCursorStyle;
            // Mouse out on previous hovered element
            if (lastHovered && hovered !== lastHovered && lastHovered.__zr) {
                this._dispatchProxy(lastHovered, 'mouseout', event);
            }

            // Mouse moving on one element
            this._dispatchProxy(hovered, 'mousemove', event);

            // Mouse over on a new element
            if (hovered && hovered !== lastHovered) {
                this._dispatchProxy(hovered, 'mouseover', event);
            }
        },

        /**
         * Mouse out handler
         * @inner
         * @param {Event} event
         */
        mouseout: function (event) {
            event = normalizeEvent(this.root, event);

            var element = event.toElement || event.relatedTarget;
            if (element != this.root) {
                while (element && element.nodeType != 9) {
                    // 忽略包含在root中的dom引起的mouseOut
                    if (element === this.root) {
                        return;
                    }

                    element = element.parentNode;
                }
            }

            this._dispatchProxy(this._hovered, 'mouseout', event);

            this.trigger('globalout', {
                event: event
            });
        },

        /**
         * Touch开始响应函数
         * @inner
         * @param {Event} event
         */
        touchstart: function (event) {
            // FIXME
            // 移动端可能需要default行为，例如静态图表时。
            // eventTool.stop(event);// 阻止浏览器默认事件，重要
            event = normalizeEvent(this.root, event);

            this._lastTouchMoment = new Date();

            processGesture(this, event, 'start');

            // 平板补充一次findHover
            // this._mobileFindFixed(event);
            // Trigger mousemove and mousedown
            this._mousemoveHandler(event);

            this._mousedownHandler(event);
        },

        /**
         * Touch移动响应函数
         * @inner
         * @param {Event} event
         */
        touchmove: function (event) {
            // eventTool.stop(event);// 阻止浏览器默认事件，重要
            event = normalizeEvent(this.root, event);

            processGesture(this, event, 'change');

            // Mouse move should always be triggered no matter whether
            // there is gestrue event, because mouse move and pinch may
            // be used at the same time.
            this._mousemoveHandler(event);
        },

        /**
         * Touch结束响应函数
         * @inner
         * @param {Event} event
         */
        touchend: function (event) {
            // eventTool.stop(event);// 阻止浏览器默认事件，重要
            event = normalizeEvent(this.root, event);

            processGesture(this, event, 'end');

            this._mouseupHandler(event);

            // click event should always be triggered no matter whether
            // there is gestrue event. System click can not be prevented.
            if (+new Date() - this._lastTouchMoment < TOUCH_CLICK_DELAY) {
                // this._mobileFindFixed(event);
                this._clickHandler(event);
            }
        }
    };

    // Common handlers
    util.each(['click', 'mousedown', 'mouseup', 'mousewheel', 'dblclick'], function (name) {
        domHandlers[name] = function (event) {
            event = normalizeEvent(this.root, event);

            // Find hover again to avoid click event is dispatched manually. Or click is triggered without mouseover
            var hovered = this._findHover(event.zrX, event.zrY, null);
            this._dispatchProxy(hovered, name, event);
        };
    });

    function processGesture(zrHandler, event, stage) {
        var gestureMgr = zrHandler._gestureMgr;

        stage === 'start' && gestureMgr.clear();

        var gestureInfo = gestureMgr.recognize(
            event,
            zrHandler._findHover(event.zrX, event.zrY, null)
        );

        stage === 'end' && gestureMgr.clear();

        if (gestureInfo) {
            // eventTool.stop(event);
            var type = gestureInfo.type;
            event.gestureEvent = type;

            zrHandler._dispatchProxy(gestureInfo.target, type, gestureInfo.event);
        }
    }

    /**
     * 为控制类实例初始化dom 事件处理函数
     *
     * @inner
     * @param {module:zrender/Handler} instance 控制类实例
     */
    function initDomHandler(instance) {
        var handlerNames = domHandlerNames.concat(touchHandlerNames);
        var len = handlerNames.length;
        while (len--) {
            var name = handlerNames[len];
            instance[proxyEventName(name)] = util.bind(domHandlers[name], instance);
        }
    }

    /**
     * @alias module:zrender/Handler
     * @constructor
     * @extends module:zrender/mixin/Eventful
     * @param {HTMLElement} root 绘图区域
     * @param {module:zrender/Storage} storage Storage实例
     * @param {module:zrender/Painter} painter Painter实例
     */
    var Handler = function(root, storage, painter) {
        Eventful.call(this);

        this.root = root;
        this.storage = storage;
        this.painter = painter;

        /**
         * @private
         */
        this._hovered;
        /**
         * @private
         */
        this._lastTouchMoment;
        /**
         * @private
         */
        this._lastX;
        /**
         * @private
         */
        this._lastY;
        /**
         * @private
         */
        this._defaultCursorStyle = 'default'
        /**
         * @private
         */
        this._gestureMgr = new GestureMgr();

        initDomHandler(this);

        // @see #2350, some windows tablet (like lenovo X240) enable touch but can
        // use IE10, which not supports touch events.
        if (env.touchEventsSupported) {
            // mobile支持
            // mobile的click/move/up/down自己模拟
            util.each(touchHandlerNames, function (name) {
                addEventListener(root, name, this[proxyEventName(name)]);
            }, this);

            addEventListener(root, 'mouseout', this._mouseoutHandler);
        }
        else {
            util.each(domHandlerNames, function (name) {
                addEventListener(root, name, this[proxyEventName(name)]);
            }, this);
            // Firefox
            addEventListener(root, 'DOMMouseScroll', this._mousewheelHandler);
        }

        Draggable.call(this);
    };

    Handler.prototype = {

        constructor: Handler,

        /**
         * Resize
         */
        resize: function (event) {
            this._hovered = null;
        },

        /**
         * Dispatch event
         * @param {string} eventName
         * @param {event=} eventArgs
         */
        dispatch: function (eventName, eventArgs) {
            var handler = this[proxyEventName(eventName)];
            handler && handler(eventArgs);
        },

        /**
         * Dispose
         */
        dispose: function () {
            var root = this.root;

            var handlerNames = domHandlerNames.concat(touchHandlerNames);

            for (var i = 0; i < handlerNames.length; i++) {
                var name = handlerNames[i];
                removeEventListener(root, name, this[proxyEventName(name)]);
            }

            // Firefox
            removeEventListener(root, 'DOMMouseScroll', this._mousewheelHandler);

            this.root =
            this.storage =
            this.painter = null;
        },

        /**
         * 设置默认的cursor style
         * @param {string} cursorStyle 例如 crosshair
         */
        setDefaultCursorStyle: function (cursorStyle) {
            this._defaultCursorStyle = cursorStyle;
        },

        /**
         * 事件分发代理
         *
         * @private
         * @param {Object} targetEl 目标图形元素
         * @param {string} eventName 事件名称
         * @param {Object} event 事件对象
         */
        _dispatchProxy: function (targetEl, eventName, event) {
            var eventHandler = 'on' + eventName;
            var eventPacket = makeEventPacket(eventName, targetEl, event);

            var el = targetEl;

            while (el) {
                el[eventHandler]
                    && (eventPacket.cancelBubble = el[eventHandler].call(el, eventPacket));

                el.trigger(eventName, eventPacket);

                el = el.parent;

                if (eventPacket.cancelBubble) {
                    break;
                }
            }

            if (!eventPacket.cancelBubble) {
                // 冒泡到顶级 zrender 对象
                this.trigger(eventName, eventPacket);
                // 分发事件到用户自定义层
                // 用户有可能在全局 click 事件中 dispose，所以需要判断下 painter 是否存在
                this.painter && this.painter.eachOtherLayer(function (layer) {
                    if (typeof(layer[eventHandler]) == 'function') {
                        layer[eventHandler].call(layer, eventPacket);
                    }
                    if (layer.trigger) {
                        layer.trigger(eventName, eventPacket);
                    }
                });
            }
        },

        /**
         * @private
         * @param {number} x
         * @param {number} y
         * @param {module:zrender/graphic/Displayable} exclude
         * @method
         */
        _findHover: function(x, y, exclude) {
            var list = this.storage.getDisplayList();
            for (var i = list.length - 1; i >= 0 ; i--) {
                if (!list[i].silent
                 && list[i] !== exclude
                 && isHover(list[i], x, y)) {
                    return list[i];
                }
            }
        }
    };

    function isHover(displayable, x, y) {
        if (displayable[displayable.rectHover ? 'rectContain' : 'contain'](x, y)) {
            var p = displayable.parent;
            while (p) {
                if (p.clipPath && !p.clipPath.contain(x, y))  {
                    // Clipped by parents
                    return false;
                }
                p = p.parent;
            }
            return true;
        }

        return false;
    }

    util.mixin(Handler, Eventful);
    util.mixin(Handler, Draggable);

    return Handler;
});
