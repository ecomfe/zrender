/**
 * Handler控制模块
 * @module zrender/Handler
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *         errorrik (errorrik@gmail.com)
 *         pissang (shenyi.914@gmail.com)
 */
define(function (require) {

    'use strict';

    var config = require('./config');
    var env = require('./core/env');
    var eventTool = require('./core/event');
    var util = require('./core/util');
    var Draggable = require('./mixin/Draggable');

    var EVENT = config.EVENT;

    var Eventful = require('./mixin/Eventful');

    var domHandlerNames = [
        'click', 'dblclick',
        'mousewheel', 'mousemove', 'mouseout', 'mouseup', 'mousedown'
    ];

    var touchHandlerNames = [
        'touchstart', 'touchend', 'touchmove'
    ]

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

            this._hasfound = false;

            var hovered = this._findHover(x, y, null);
            var lastHovered = this._hovered;

            this._hovered = hovered;

            this.root.style.cursor = hovered ? hovered.cursor : 'default';
            // Mouse out on previous hovered element
            if (lastHovered && hovered !== lastHovered && lastHovered.__zr) {
                this._dispatch(lastHovered, EVENT.MOUSEOUT, event);
            }

            // Mouse moving on one element
            this._dispatch(hovered, EVENT.MOUSEMOVE, event);

            // Mouse over on a new element
            if (hovered && hovered !== lastHovered) {
                this._dispatch(hovered, EVENT.MOUSEOVER, event);
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

            this._dispatch(this._hovered, EVENT.MOUSEOUT, event);
        },

        /**
         * Touch开始响应函数
         * @inner
         * @param {Event} event
         */
        touchstart: function (event) {
            // eventTool.stop(event);// 阻止浏览器默认事件，重要
            event = normalizeEvent(this.root, event);

            this._lastTouchMoment = new Date();

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
            event = normalizeEvent(this.root, event);

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

            this._mouseupHandler(event);

            if (+new Date() - this._lastTouchMoment < EVENT.touchClickDelay) {
                // this._mobileFindFixed(event);
                this._clickHandler(event);
            }
        }
    };

    // Common handlers
    util.each(['click', 'mousedown', 'mouseup', 'mousewheel', 'dblclick'], function (name) {
        domHandlers[name] = function (event) {
            event = normalizeEvent(this.root, event);
            this._dispatch(this._hovered, name, event);
        };
    });

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
        // 添加事件分发器特性
        Eventful.call(this);

        this.root = root;
        this.storage = storage;
        this.painter = painter;

        // 各种事件标识的私有变量
        // this._hovered = null;
        // this._lastTouchMoment;
        // this._lastX =
        // this._lastY = 0;

        initDomHandler(this);

        if (env.os.tablet || env.os.phone) {
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
         * 事件触发
         * @param {string} eventName 事件名称，resize，hover，drag，etc~
         * @param {event=} eventArgs event dom事件对象
         */
        dispatch: function (eventName, eventArgs) {
            var handler = this[proxyEventName(eventName)];
            handler && handler(eventArgs);
        },

        /**
         * 释放，解绑所有事件
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
         * 事件分发代理
         *
         * @private
         * @param {Object} targetShape 目标图形元素
         * @param {string} eventName 事件名称
         * @param {Object} event 事件对象
         */
        _dispatch: function (targetShape, eventName, event) {
            var eventHandler = 'on' + eventName;
            var eventPacket = makeEventPacket(eventName, targetShape, event);

            var el = targetShape;

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
                this.painter.eachOtherLayer(function (layer) {
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

        // touch有指尖错觉，四向尝试，让touch上的点击更好触发事件
        // _mobileFindFixed: function (event) {
        //     var x = event.zrX;
        //     var y = event.zrY;

        //     this._hovered = null;

        //     this._event = event;

        //     this._findHover(x, y);
        //     for (var i = 0; !this._hovered && i < MOBILE_TOUCH_OFFSETS.length ; i++) {
        //         var offset = MOBILE_TOUCH_OFFSETS[ i ];
        //         offset.x && (x += offset.x);
        //         offset.y && (y += offset.y);

        //         this._findHover(x, y);
        //     }

        //     if (this._hovered) {
        //         event.zrX = x;
        //         event.zrY = y;
        //     }
        // }
    };

    function isHover(displayable, x, y) {
        if (displayable.contain(x, y)) {
            if (displayable.hoverable) {
                // this.storage.addHover(displayable);
            }
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
