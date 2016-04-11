/**
 * Handler
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

    var mouseHandlerNames = [
        'click', 'dblclick', 'mousewheel', 'mouseout'
    ];
    !usePointerEvent() && mouseHandlerNames.push(
        'mouseup', 'mousedown', 'mousemove'
    );

    var touchHandlerNames = [
        'touchstart', 'touchend', 'touchmove'
    ];

    var pointerHandlerNames = [
        'pointerdown', 'pointerup', 'pointermove'
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

            var hovered = this.findHover(x, y, null);
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
            domHandlers.mousemove.call(this, event);

            domHandlers.mousedown.call(this, event);

            setTouchTimer(this);
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
            domHandlers.mousemove.call(this, event);

            setTouchTimer(this);
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

            domHandlers.mouseup.call(this, event);

            // click event should always be triggered no matter whether
            // there is gestrue event. System click can not be prevented.
            if (+new Date() - this._lastTouchMoment < TOUCH_CLICK_DELAY) {
                // this._mobileFindFixed(event);
                domHandlers.click.call(this, event);
            }

            setTouchTimer(this);
        }
    };

    // Common handlers
    util.each(['click', 'mousedown', 'mouseup', 'mousewheel', 'dblclick'], function (name) {
        domHandlers[name] = function (event) {
            event = normalizeEvent(this.root, event);
            // Find hover again to avoid click event is dispatched manually. Or click is triggered without mouseover
            var hovered = this.findHover(event.zrX, event.zrY, null);
            this._dispatchProxy(hovered, name, event);
        };
    });

    // Pointer event handlers
    // util.each(['pointerdown', 'pointermove', 'pointerup'], function (name) {
    //     domHandlers[name] = function (event) {
    //         var mouseName = name.replace('pointer', 'mouse');
    //         domHandlers[mouseName].call(this, event);
    //     };
    // });

    function processGesture(zrHandler, event, stage) {
        var gestureMgr = zrHandler._gestureMgr;

        stage === 'start' && gestureMgr.clear();

        var gestureInfo = gestureMgr.recognize(
            event,
            zrHandler.findHover(event.zrX, event.zrY, null)
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
        var handlerNames = touchHandlerNames.concat(pointerHandlerNames);
        for (var i = 0; i < handlerNames.length; i++) {
            var name = handlerNames[i];
            instance._handlers[name] = util.bind(domHandlers[name], instance);
        }

        for (var i = 0; i < mouseHandlerNames.length; i++) {
            var name = mouseHandlerNames[i];
            instance._handlers[name] = makeMouseHandler(domHandlers[name], instance);
        }

        function makeMouseHandler(fn, instance) {
            return function () {
                if (instance._touching) {
                    return;
                }
                return fn.apply(instance, arguments);
            };
        }
    }

    /**
     * @alias module:zrender/Handler
     * @constructor
     * @extends module:zrender/mixin/Eventful
     * @param {HTMLElement} root Main HTML element for painting.
     * @param {module:zrender/Storage} storage Storage instance.
     * @param {module:zrender/Painter} painter Painter instance.
     */
    var Handler = function(root, storage, painter) {
        Eventful.call(this);

        this.root = root;
        this.storage = storage;
        this.painter = painter;

        /**
         * @private
         * @type {boolean}
         */
        this._hovered;

        /**
         * @private
         * @type {Date}
         */
        this._lastTouchMoment;

        /**
         * @private
         * @type {number}
         */
        this._lastX;

        /**
         * @private
         * @type {number}
         */
        this._lastY;

        /**
         * @private
         * @type {string}
         */
        this._defaultCursorStyle = 'default';

        /**
         * @private
         * @type {module:zrender/core/GestureMgr}
         */
        this._gestureMgr = new GestureMgr();

        /**
         * @private
         * @type {Array.<Function>}
         */
        this._handlers = [];

        /**
         * @private
         * @type {boolean}
         */
        this._touching = false;

        /**
         * @private
         * @type {number}
         */
        this._touchTimer;

        initDomHandler(this);

        if (usePointerEvent()) {
            mountHandlers(pointerHandlerNames, this);
        }
        else if (useTouchEvent()) {
            mountHandlers(touchHandlerNames, this);

            // Handler of 'mouseout' event is needed in touch mode, which will be mounted below.
            // addEventListener(root, 'mouseout', this._mouseoutHandler);
        }

        // Considering some devices that both enable touch and mouse event (like MS Surface
        // and lenovo X240, @see #2350), we make mouse event be always listened, otherwise
        // mouse event can not be handle in those devices.
        mountHandlers(mouseHandlerNames, this);

        Draggable.call(this);

        function mountHandlers(handlerNames, instance) {
            util.each(handlerNames, function (name) {
                addEventListener(root, eventNameFix(name), instance._handlers[name]);
            }, instance);
        }
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
            var handler = this._handlers[eventName];
            handler && handler.call(this, eventArgs);
        },

        /**
         * Dispose
         */
        dispose: function () {
            var root = this.root;

            var handlerNames = mouseHandlerNames.concat(touchHandlerNames);

            for (var i = 0; i < handlerNames.length; i++) {
                var name = handlerNames[i];
                removeEventListener(root, eventNameFix(name), this._handlers[name]);
            }

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
        findHover: function(x, y, exclude) {
            var list = this.storage.getDisplayList();
            for (var i = list.length - 1; i >= 0 ; i--) {
                if (!list[i].silent
                 && list[i] !== exclude
                 // getDisplayList may include ignored item in VML mode
                 && !list[i].ignore
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

    /**
     * Prevent mouse event from being dispatched after Touch Events action
     * @see <https://github.com/deltakosh/handjs/blob/master/src/hand.base.js>
     * 1. Mobile browsers dispatch mouse events 300ms after touchend.
     * 2. Chrome for Android dispatch mousedown for long-touch about 650ms
     * Result: Blocking Mouse Events for 700ms.
     */
    function setTouchTimer(instance) {
        instance._touching = true;
        clearTimeout(instance._touchTimer);
        instance._touchTimer = setTimeout(function () {
            instance._touching = false;
        }, 700);
    }

    /**
     * Althought MS Surface support screen touch, IE10/11 do not support
     * touch event and MS Edge supported them but not by default (but chrome
     * and firefox do). Thus we use Pointer event on MS browsers to handle touch.
     */
    function usePointerEvent() {
        // TODO
        // pointermove event dont trigger when using finger.
        // We may figger it out latter.
        return false;
        // return env.pointerEventsSupported
            // In no-touch device we dont use pointer evnets but just
            // use mouse event for avoiding problems.
            // && window.navigator.maxTouchPoints;
    }

    function useTouchEvent() {
        return env.touchEventsSupported;
    }

    function eventNameFix(name) {
        return (name === 'mousewheel' && env.browser.firefox) ? 'DOMMouseScroll' : name;
    }

    util.mixin(Handler, Eventful);
    util.mixin(Handler, Draggable);

    return Handler;
});