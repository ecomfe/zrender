import * as util from './core/util';
import * as vec2 from './core/vector';
import Draggable from './mixin/Draggable';
import Eventful from './mixin/Eventful';
import * as eventTool from './core/event';
import GestureMgr from './core/GestureMgr';


/**
 * [The interface between `Handler` and `HandlerProxy`]:
 *
 * The default `HandlerProxy` only support the common standard web environment
 * (e.g., standalone browser, headless browser, embed browser in mobild APP, ...).
 * But `HandlerProxy` can be replaced to support more non-standard environment
 * (e.g., mini app), or to support more feature that the default `HandlerProxy`
 * not provided (like echarts-gl did).
 * So the interface between `Handler` and `HandlerProxy` should be stable. Do not
 * make break changes util inevitable. The interface include the public methods
 * of `Handler` and the events listed in `handlerNames` below, by which `HandlerProxy`
 * drives `Handler`.
 */

/**
 * [Drag outside]:
 *
 * That is, triggering `mousemove` and `mouseup` event when the pointer is out of the
 * zrender area when dragging. That is important for the improvement of the user experience
 * when dragging something near the boundary without being terminated unexpectedly.
 *
 * We originally consider to introduce new events like `pagemovemove` and `pagemouseup`
 * to resolve this issue. But some drawbacks of it is described in
 * https://github.com/ecomfe/zrender/pull/536#issuecomment-560286899
 *
 * Instead, we referenced the specifications:
 * https://www.w3.org/TR/touch-events/#the-touchmove-event
 * https://www.w3.org/TR/2014/WD-DOM-Level-3-Events-20140925/#event-type-mousemove
 * where the the mousemove/touchmove can be continue to fire if the user began a drag
 * operation and the pointer has left the boundary. (for the mouse event, browsers
 * only do it on `document` and when the pointer has left the boundary of the browser.)
 *
 * So the default `HandlerProxy` supports this feature similarly: if it is in the dragging
 * state (see `pointerCapture` in `HandlerProxy`), the `mousemove` and `mouseup` continue
 * to fire until release the pointer. That is implemented by listen to those event on
 * `document`.
 * If we implement some other `HandlerProxy` only for touch device, that would be easier.
 * The touch event support this feature by default.
 *
 * Note:
 * There might be some cases that the mouse event can not be
 * received on `document`. For example,
 * (A) `useCapture` is not supported and some user defined event listeners on the ancestor
 * of zr dom throw Error .
 * (B) `useCapture` is not supported Some user defined event listeners on the ancestor of
 * zr dom call `stopPropagation`.
 * In these cases, the `mousemove` event might be keep triggered event
 * if the mouse is released. We try to reduce the side-effect in those cases.
 * That is, do nothing (especially, `findHover`) in those cases. See `isOutsideBoundary`.
 *
 * Note:
 * If `HandlerProxy` listens to `document` with `useCapture`, `HandlerProxy` needs to
 * make sure `stopPropagation` and `preventDefault` doing nothing if and only if the event
 * target is not zrender dom. Becuase it is dangerous to enable users to call them in
 * `document` capture phase to prevent the propagation to any listener of the webpage.
 * But they are needed to work when the pointer inside the zrender dom.
 */


var SILENT = 'silent';

function makeEventPacket(eveType, targetInfo, event) {
    return {
        type: eveType,
        event: event,
        // target can only be an element that is not silent.
        target: targetInfo.target,
        // topTarget can be a silent element.
        topTarget: targetInfo.topTarget,
        cancelBubble: false,
        offsetX: event.zrX,
        offsetY: event.zrY,
        gestureEvent: event.gestureEvent,
        pinchX: event.pinchX,
        pinchY: event.pinchY,
        pinchScale: event.pinchScale,
        wheelDelta: event.zrDelta,
        zrByTouch: event.zrByTouch,
        which: event.which,
        stop: stopEvent
    };
}

function stopEvent() {
    eventTool.stop(this.event);
}

function EmptyProxy() {}
EmptyProxy.prototype.dispose = function () {};


var handlerNames = [
    'click', 'dblclick', 'mousewheel', 'mouseout',
    'mouseup', 'mousedown', 'mousemove', 'contextmenu'
];

/**
 * @alias module:zrender/Handler
 * @constructor
 * @extends module:zrender/mixin/Eventful
 * @param {module:zrender/Storage} storage Storage instance.
 * @param {module:zrender/Painter} painter Painter instance.
 * @param {module:zrender/dom/HandlerProxy} proxy HandlerProxy instance.
 * @param {HTMLElement} painterRoot painter.root (not painter.getViewportRoot()).
 */
var Handler = function (storage, painter, proxy, painterRoot) {
    Eventful.call(this);

    this.storage = storage;

    this.painter = painter;

    this.painterRoot = painterRoot;

    proxy = proxy || new EmptyProxy();

    /**
     * Proxy of event. can be Dom, WebGLSurface, etc.
     */
    this.proxy = null;

    /**
     * {target, topTarget, x, y}
     * @private
     * @type {Object}
     */
    this._hovered = {};

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
     * @type {module:zrender/core/GestureMgr}
     */
    this._gestureMgr;

    Draggable.call(this);

    this.setHandlerProxy(proxy);
};

Handler.prototype = {

    constructor: Handler,

    setHandlerProxy: function (proxy) {
        if (this.proxy) {
            this.proxy.dispose();
        }

        if (proxy) {
            util.each(handlerNames, function (name) {
                proxy.on && proxy.on(name, this[name], this);
            }, this);
            // Attach handler
            proxy.handler = this;
        }
        this.proxy = proxy;
    },

    mousemove: function (event) {
        var x = event.zrX;
        var y = event.zrY;

        var isOutside = isOutsideBoundary(this, x, y);

        var lastHovered = this._hovered;
        var lastHoveredTarget = lastHovered.target;

        // If lastHoveredTarget is removed from zr (detected by '__zr') by some API call
        // (like 'setOption' or 'dispatchAction') in event handlers, we should find
        // lastHovered again here. Otherwise 'mouseout' can not be triggered normally.
        // See #6198.
        if (lastHoveredTarget && !lastHoveredTarget.__zr) {
            lastHovered = this.findHover(lastHovered.x, lastHovered.y);
            lastHoveredTarget = lastHovered.target;
        }

        var hovered = this._hovered = isOutside ? {x: x, y: y} : this.findHover(x, y);
        var hoveredTarget = hovered.target;

        var proxy = this.proxy;
        proxy.setCursor && proxy.setCursor(hoveredTarget ? hoveredTarget.cursor : 'default');

        // Mouse out on previous hovered element
        if (lastHoveredTarget && hoveredTarget !== lastHoveredTarget) {
            this.dispatchToElement(lastHovered, 'mouseout', event);
        }

        // Mouse moving on one element
        this.dispatchToElement(hovered, 'mousemove', event);

        // Mouse over on a new element
        if (hoveredTarget && hoveredTarget !== lastHoveredTarget) {
            this.dispatchToElement(hovered, 'mouseover', event);
        }
    },

    mouseout: function (event) {
        var eventControl = event.zrEventControl;
        var zrIsToLocalDOM = event.zrIsToLocalDOM;

        if (eventControl !== 'only_globalout') {
            this.dispatchToElement(this._hovered, 'mouseout', event);
        }

        if (eventControl !== 'no_globalout') {
            // FIXME: if the pointer moving from the extra doms to realy "outside",
            // the `globalout` should have been triggered. But currently not.
            !zrIsToLocalDOM && this.trigger('globalout', {type: 'globalout', event: event});
        }
    },

    /**
     * Resize
     */
    resize: function (event) {
        this._hovered = {};
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
     * @param {Object} targetInfo {target, topTarget} 目标图形元素
     * @param {string} eventName 事件名称
     * @param {Object} event 事件对象
     */
    dispatchToElement: function (targetInfo, eventName, event) {
        targetInfo = targetInfo || {};
        var el = targetInfo.target;
        if (el && el.silent) {
            return;
        }
        var eventHandler = 'on' + eventName;
        var eventPacket = makeEventPacket(eventName, targetInfo, event);

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
                if (typeof (layer[eventHandler]) === 'function') {
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
     * @return {model:zrender/Element}
     * @method
     */
    findHover: function (x, y, exclude) {
        var list = this.storage.getDisplayList();
        var out = {x: x, y: y};

        for (var i = list.length - 1; i >= 0; i--) {
            var hoverCheckResult;
            if (list[i] !== exclude
                // getDisplayList may include ignored item in VML mode
                && !list[i].ignore
                && (hoverCheckResult = isHover(list[i], x, y))
            ) {
                !out.topTarget && (out.topTarget = list[i]);
                if (hoverCheckResult !== SILENT) {
                    out.target = list[i];
                    break;
                }
            }
        }

        return out;
    },

    processGesture: function (event, stage) {
        if (!this._gestureMgr) {
            this._gestureMgr = new GestureMgr();
        }
        var gestureMgr = this._gestureMgr;

        stage === 'start' && gestureMgr.clear();

        var gestureInfo = gestureMgr.recognize(
            event,
            this.findHover(event.zrX, event.zrY, null).target,
            this.proxy.dom
        );

        stage === 'end' && gestureMgr.clear();

        // Do not do any preventDefault here. Upper application do that if necessary.
        if (gestureInfo) {
            var type = gestureInfo.type;
            event.gestureEvent = type;

            this.dispatchToElement({target: gestureInfo.target}, type, gestureInfo.event);
        }
    }
};

// Common handlers
util.each(['click', 'mousedown', 'mouseup', 'mousewheel', 'dblclick', 'contextmenu'], function (name) {
    Handler.prototype[name] = function (event) {
        var x = event.zrX;
        var y = event.zrY;
        var isOutside = isOutsideBoundary(this, x, y);

        var hovered;
        var hoveredTarget;

        if (name !== 'mouseup' || !isOutside) {
            // Find hover again to avoid click event is dispatched manually. Or click is triggered without mouseover
            hovered = this.findHover(x, y);
            hoveredTarget = hovered.target;
        }

        if (name === 'mousedown') {
            this._downEl = hoveredTarget;
            this._downPoint = [event.zrX, event.zrY];
            // In case click triggered before mouseup
            this._upEl = hoveredTarget;
        }
        else if (name === 'mouseup') {
            this._upEl = hoveredTarget;
        }
        else if (name === 'click') {
            if (this._downEl !== this._upEl
                // Original click event is triggered on the whole canvas element,
                // including the case that `mousedown` - `mousemove` - `mouseup`,
                // which should be filtered, otherwise it will bring trouble to
                // pan and zoom.
                || !this._downPoint
                // Arbitrary value
                || vec2.dist(this._downPoint, [event.zrX, event.zrY]) > 4
            ) {
                return;
            }
            this._downPoint = null;
        }

        this.dispatchToElement(hovered, name, event);
    };
});

function isHover(displayable, x, y) {
    if (displayable[displayable.rectHover ? 'rectContain' : 'contain'](x, y)) {
        var el = displayable;
        var isSilent;
        while (el) {
            // If clipped by ancestor.
            // FIXME: If clipPath has neither stroke nor fill,
            // el.clipPath.contain(x, y) will always return false.
            if (el.clipPath && !el.clipPath.contain(x, y)) {
                return false;
            }
            if (el.silent) {
                isSilent = true;
            }
            el = el.parent;
        }
        return isSilent ? SILENT : true;
    }

    return false;
}

/**
 * See [Drag outside].
 */
function isOutsideBoundary(handlerInstance, x, y) {
    var painter = handlerInstance.painter;
    return x < 0 || x > painter.getWidth() || y < 0 || y > painter.getHeight();
}

util.mixin(Handler, Eventful);
util.mixin(Handler, Draggable);

export default Handler;
