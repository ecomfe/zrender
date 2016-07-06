/**
 * Handler
 * @module zrender/Handler
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *         errorrik (errorrik@gmail.com)
 *         pissang (shenyi.914@gmail.com)
 */
define(function (require) {

    'use strict';

    var util = require('./core/util');
    var Draggable = require('./mixin/Draggable');

    var Eventful = require('./mixin/Eventful');

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

    function EmptyProxy () {}
    EmptyProxy.prototype.dispose = function () {};

    var handlerNames = [
        'click', 'dblclick', 'mousewheel', 'mouseout',
        'mouseup', 'mousedown', 'mousemove'
    ];
    /**
     * @alias module:zrender/Handler
     * @constructor
     * @extends module:zrender/mixin/Eventful
     * @param {HTMLElement} root Main HTML element for painting.
     * @param {module:zrender/Storage} storage Storage instance.
     * @param {module:zrender/Painter} painter Painter instance.
     */
    var Handler = function(storage, painter, proxy) {
        Eventful.call(this);

        this.storage = storage;

        this.painter = painter;

        proxy = proxy || new EmptyProxy();
        /**
         * Proxy of event. can be Dom, WebGLSurface, etc.
         */
        this.proxy = proxy;

        // Attach handler
        proxy.handler = this;

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


        Draggable.call(this);

        util.each(handlerNames, function (name) {
            proxy.on && proxy.on(name, this[name], this);
        }, this);
    };

    Handler.prototype = {

        constructor: Handler,

        mousemove: function (event) {
            var x = event.zrX;
            var y = event.zrY;

            var hovered = this.findHover(x, y, null);
            var lastHovered = this._hovered;
            var proxy = this.proxy;

            this._hovered = hovered;

            proxy.setCursor && proxy.setCursor(hovered ? hovered.cursor : 'default');

            // Mouse out on previous hovered element
            if (lastHovered && hovered !== lastHovered && lastHovered.__zr) {
                this.dispatchToElement(lastHovered, 'mouseout', event);
            }

            // Mouse moving on one element
            this.dispatchToElement(hovered, 'mousemove', event);

            // Mouse over on a new element
            if (hovered && hovered !== lastHovered) {
                this.dispatchToElement(hovered, 'mouseover', event);
            }
        },

        mouseout: function (event) {
            this.dispatchToElement(this._hovered, 'mouseout', event);

            this.trigger('globalout', {
                event: event
            });
        },

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
            var handler = this[eventName];
            handler && handler.call(this, eventArgs);
        },

        /**
         * Dispose
         */
        dispose: function () {

            this.proxy.dispose();

            this.storage =
            this.proxy =
            this.painter = null;
        },

        /**
         * 设置默认的cursor style
         * @param {string} [cursorStyle='default'] 例如 crosshair
         */
        setCursorStyle: function (cursorStyle) {
            var proxy = this.proxy;
            proxy.setCursor && proxy.setCursor(cursorStyle);
        },

        /**
         * 事件分发代理
         *
         * @private
         * @param {Object} targetEl 目标图形元素
         * @param {string} eventName 事件名称
         * @param {Object} event 事件对象
         */
        dispatchToElement: function (targetEl, eventName, event) {
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

    // Common handlers
    util.each(['click', 'mousedown', 'mouseup', 'mousewheel', 'dblclick'], function (name) {
        Handler.prototype[name] = function (event) {
            // Find hover again to avoid click event is dispatched manually. Or click is triggered without mouseover
            var hovered = this.findHover(event.zrX, event.zrY, null);

            if (name === 'mousedown') {
                this._downel = hovered;
                // In case click triggered before mouseup
                this._upel = hovered;
            }
            else if (name === 'mosueup') {
                this._upel = hovered;
            }
            else if (name === 'click') {
                if (this._downel !== this._upel) {
                    return;
                }
            }

            this.dispatchToElement(hovered, name, event);
        };
    });

    function isHover(displayable, x, y) {
        if (displayable[displayable.rectHover ? 'rectContain' : 'contain'](x, y)) {
            var el = displayable;
            while (el) {
                // If ancestor is silent or clipped by ancestor
                if (el.silent || (el.clipPath && !el.clipPath.contain(x, y)))  {
                    return false;
                }
                el = el.parent;
            }
            return true;
        }

        return false;
    }

    util.mixin(Handler, Eventful);
    util.mixin(Handler, Draggable);

    return Handler;
});