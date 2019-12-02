
/* global document */

import {
    addEventListener,
    removeEventListener,
    normalizeEvent,
    getNativeEvent
} from '../core/event';
import * as zrUtil from '../core/util';
import Eventful from '../mixin/Eventful';
import env from '../core/env';

var TOUCH_CLICK_DELAY = 300;
// "page event" is defined in the comment of `[Page Event]`.
var pageEventSupported = env.domSupported;


/**
 * [Page Event]
 * "page events" are `pagemousemove` and `pagemouseup`.
 * They are triggered when a user pointer interacts on the whole webpage
 * rather than only inside the zrender area.
 *
 * The use case of page events can be, for example, if we are implementing a dragging feature:
 * ```js
 * zr.on('mousedown', function (event) {
 *     var dragging = true;
 *
 *     // Listen to `pagemousemove` and `pagemouseup` rather than `mousemove` and `mouseup`,
 *     // because `mousemove` and `mouseup` will not be triggered when the pointer is out
 *     // of the zrender area.
 *     zr.on('pagemousemove', handleMouseMove);
 *     zr.on('pagemouseup', handleMouseUp);
 *
 *     function handleMouseMove(event) {
 *         if (dragging) { ... }
 *     }
 *     function handleMouseUp(event) {
 *         dragging = false; ...
 *         zr.off('pagemousemove', handleMouseMove);
 *         zr.off('pagemouseup', handleMouseUp);
 *     }
 * });
 * ```
 *
 * [NOTICE]:
 * (1) There are cases that `pagemousexxx` will not be triggered when the pointer is out of
 * zrender area:
 * "document.addEventListener" is not available in the current runtime environment,
 * or there is any `stopPropagation` called at some user defined listeners on the ancestors
 * of the zrender dom.
 * (2) Although those bad cases exist, users do not need to worry about that. That is, if you
 * listen to `pagemousexxx`, you do not need to listen to the correspoinding event `mousexxx`
 * any more.
 * Becuase inside zrender area, `pagemousexxx` will always be triggered, where they are
 * triggered just after `mousexxx` triggered and sharing the same event object. Those bad
 * cases only happen when the pointer is out of zrender area.
 */


var localNativeListenerNames = (function () {
    var mouseHandlerNames = [
        'click', 'dblclick', 'mousewheel', 'mouseout',
        'mouseup', 'mousedown', 'mousemove', 'contextmenu'
    ];
    var touchHandlerNames = [
        'touchstart', 'touchend', 'touchmove'
    ];
    var pointerEventNameMap = {
        pointerdown: 1, pointerup: 1, pointermove: 1, pointerout: 1
    };
    var pointerHandlerNames = zrUtil.map(mouseHandlerNames, function (name) {
        var nm = name.replace('mouse', 'pointer');
        return pointerEventNameMap.hasOwnProperty(nm) ? nm : name;
    });

    return {
        mouse: mouseHandlerNames,
        touch: touchHandlerNames,
        pointer: pointerHandlerNames
    };
})();

var globalNativeListenerNames = {
    mouse: ['mousemove', 'mouseup'],
    touch: ['touchmove', 'touchend'],
    pointer: ['pointermove', 'pointerup']
};


function eventNameFix(name) {
    return (name === 'mousewheel' && env.browser.firefox) ? 'DOMMouseScroll' : name;
}

function isPointerFromTouch(event) {
    var pointerType = event.pointerType;
    return pointerType === 'pen' || pointerType === 'touch';
}

// function useMSGuesture(handlerProxy, event) {
//     return isPointerFromTouch(event) && !!handlerProxy._msGesture;
// }

// function onMSGestureChange(proxy, event) {
//     if (event.translationX || event.translationY) {
//         // mousemove is carried by MSGesture to reduce the sensitivity.
//         proxy.handler.dispatchToElement(event.target, 'mousemove', event);
//     }
//     if (event.scale !== 1) {
//         event.pinchX = event.offsetX;
//         event.pinchY = event.offsetY;
//         event.pinchScale = event.scale;
//         proxy.handler.dispatchToElement(event.target, 'pinch', event);
//     }
// }

/**
 * Prevent mouse event from being dispatched after Touch Events action
 * @see <https://github.com/deltakosh/handjs/blob/master/src/hand.base.js>
 * 1. Mobile browsers dispatch mouse events 300ms after touchend.
 * 2. Chrome for Android dispatch mousedown for long-touch about 650ms
 * Result: Blocking Mouse Events for 700ms.
 *
 * @param {DOMHandlerScope} scope
 */
function setTouchTimer(scope) {
    scope.touching = true;
    if (scope.touchTimer != null) {
        clearTimeout(scope.touchTimer);
        scope.touchTimer = null;
    }
    scope.touchTimer = setTimeout(function () {
        scope.touching = false;
        scope.touchTimer = null;
    }, 700);
}

function markTriggeredFromLocal(event) {
    event && (event.zrIsFromLocal = true);
}

function isTriggeredFromLocal(event) {
    return !!(event && event.zrIsFromLocal);
}

// Mark touch, which is useful in distinguish touch and
// mouse event in upper applicatoin.
function markTouch(event) {
    event && (event.zrByTouch = true);
}


// ----------------------------
// Native event handlers BEGIN
// ----------------------------

/**
 * Local DOM Handlers
 * @this {HandlerProxy}
 */
var localDOMHandlers = {

    mouseout: function (event) {
        event = normalizeEvent(this.dom, event);

        var element = event.toElement || event.relatedTarget;
        if (element !== this.dom) {
            while (element && element.nodeType !== 9) {
                // 忽略包含在root中的dom引起的mouseOut
                if (element === this.dom) {
                    return;
                }

                element = element.parentNode;
            }
        }

        this.trigger('mouseout', event);
    },

    touchstart: function (event) {
        // Default mouse behaviour should not be disabled here.
        // For example, page may needs to be slided.
        event = normalizeEvent(this.dom, event);

        markTouch(event);

        this._lastTouchMoment = new Date();

        this.handler.processGesture(event, 'start');

        // For consistent event listener for both touch device and mouse device,
        // we simulate "mouseover-->mousedown" in touch device. So we trigger
        // `mousemove` here (to trigger `mouseover` inside), and then trigger
        // `mousedown`.
        localDOMHandlers.mousemove.call(this, event);
        localDOMHandlers.mousedown.call(this, event);
    },

    touchmove: function (event) {
        event = normalizeEvent(this.dom, event);

        markTouch(event);

        this.handler.processGesture(event, 'change');

        // Mouse move should always be triggered no matter whether
        // there is gestrue event, because mouse move and pinch may
        // be used at the same time.
        localDOMHandlers.mousemove.call(this, event);
    },

    touchend: function (event) {
        event = normalizeEvent(this.dom, event);

        markTouch(event);

        this.handler.processGesture(event, 'end');

        localDOMHandlers.mouseup.call(this, event);

        // Do not trigger `mouseout` here, in spite of `mousemove`(`mouseover`) is
        // triggered in `touchstart`. This seems to be illogical, but by this mechanism,
        // we can conveniently implement "hover style" in both PC and touch device just
        // by listening to `mouseover` to add "hover style" and listening to `mouseout`
        // to remove "hover style" on an element, without any additional code for
        // compatibility. (`mouseout` will not be triggered in `touchend`, so "hover
        // style" will remain for user view)

        // click event should always be triggered no matter whether
        // there is gestrue event. System click can not be prevented.
        if (+new Date() - this._lastTouchMoment < TOUCH_CLICK_DELAY) {
            localDOMHandlers.click.call(this, event);
        }
    },

    pointerdown: function (event) {
        localDOMHandlers.mousedown.call(this, event);

        // if (useMSGuesture(this, event)) {
        //     this._msGesture.addPointer(event.pointerId);
        // }
    },

    pointermove: function (event) {
        // FIXME
        // pointermove is so sensitive that it always triggered when
        // tap(click) on touch screen, which affect some judgement in
        // upper application. So, we dont support mousemove on MS touch
        // device yet.
        if (!isPointerFromTouch(event)) {
            localDOMHandlers.mousemove.call(this, event);
        }
    },

    pointerup: function (event) {
        localDOMHandlers.mouseup.call(this, event);
    },

    pointerout: function (event) {
        // pointerout will be triggered when tap on touch screen
        // (IE11+/Edge on MS Surface) after click event triggered,
        // which is inconsistent with the mousout behavior we defined
        // in touchend. So we unify them.
        // (check localDOMHandlers.touchend for detailed explanation)
        if (!isPointerFromTouch(event)) {
            localDOMHandlers.mouseout.call(this, event);
        }
    }

};

/**
 * Othere DOM UI Event handlers for zr dom.
 * @this {HandlerProxy}
 */
zrUtil.each(['click', 'mousemove', 'mousedown', 'mouseup', 'mousewheel', 'dblclick', 'contextmenu'], function (name) {
    localDOMHandlers[name] = function (event) {
        event = normalizeEvent(this.dom, event);
        this.trigger(name, event);

        if (name === 'mousemove' || name === 'mouseup') {
            // Trigger `pagemousexxx` immediately with the same event object.
            // See the reason described in the comment of `[Page Event]`.
            this.trigger('page' + name, event);
        }
    };
});


/**
 * Page DOM UI Event handlers for global page.
 * @this {HandlerProxy}
 */
var globalDOMHandlers = {

    touchmove: function (event) {
        markTouch(event);
        globalDOMHandlers.mousemove.call(this, event);
    },

    touchend: function (event) {
        markTouch(event);
        globalDOMHandlers.mouseup.call(this, event);
    },

    pointermove: function (event) {
        // FIXME
        // pointermove is so sensitive that it always triggered when
        // tap(click) on touch screen, which affect some judgement in
        // upper application. So, we dont support mousemove on MS touch
        // device yet.
        if (!isPointerFromTouch(event)) {
            globalDOMHandlers.mousemove.call(this, event);
        }
    },

    pointerup: function (event) {
        globalDOMHandlers.mouseup.call(this, event);
    },

    mousemove: function (event) {
        event = normalizeEvent(this.dom, event, true);
        this.trigger('pagemousemove', event);
    },

    mouseup: function (event) {
        event = normalizeEvent(this.dom, event, true);
        this.trigger('pagemouseup', event);
    }
};

// ----------------------------
// Native event handlers END
// ----------------------------


/**
 * @param {HandlerProxy} instance
 * @param {DOMHandlerScope} scope
 * @param {Object} nativeListenerNames {mouse: Array<string>, touch: Array<string>, poiner: Array<string>}
 * @param {boolean} localOrGlobal `true`: target local, `false`: target global.
 */
function mountDOMEventListeners(instance, scope, nativeListenerNames, localOrGlobal) {
    var domHandlers = scope.domHandlers;
    var domTarget = scope.domTarget;

    if (env.pointerEventsSupported) { // Only IE11+/Edge
        // 1. On devices that both enable touch and mouse (e.g., MS Surface and lenovo X240),
        // IE11+/Edge do not trigger touch event, but trigger pointer event and mouse event
        // at the same time.
        // 2. On MS Surface, it probablely only trigger mousedown but no mouseup when tap on
        // screen, which do not occurs in pointer event.
        // So we use pointer event to both detect touch gesture and mouse behavior.
        zrUtil.each(nativeListenerNames.pointer, function (nativeEventName) {
            mountSingle(nativeEventName, function (event) {
                if (localOrGlobal || !isTriggeredFromLocal(event)) {
                    localOrGlobal && markTriggeredFromLocal(event);
                    domHandlers[nativeEventName].call(instance, event);
                }
            });
        });

        // FIXME
        // Note: MS Gesture require CSS touch-action set. But touch-action is not reliable,
        // which does not prevent defuault behavior occasionally (which may cause view port
        // zoomed in but use can not zoom it back). And event.preventDefault() does not work.
        // So we have to not to use MSGesture and not to support touchmove and pinch on MS
        // touch screen. And we only support click behavior on MS touch screen now.

        // MS Gesture Event is only supported on IE11+/Edge and on Windows 8+.
        // We dont support touch on IE on win7.
        // See <https://msdn.microsoft.com/en-us/library/dn433243(v=vs.85).aspx>
        // if (typeof MSGesture === 'function') {
        //     (this._msGesture = new MSGesture()).target = dom; // jshint ignore:line
        //     dom.addEventListener('MSGestureChange', onMSGestureChange);
        // }
    }
    else {
        if (env.touchEventsSupported) {
            zrUtil.each(nativeListenerNames.touch, function (nativeEventName) {
                mountSingle(nativeEventName, function (event) {
                    if (localOrGlobal || !isTriggeredFromLocal(event)) {
                        localOrGlobal && markTriggeredFromLocal(event);
                        domHandlers[nativeEventName].call(instance, event);
                        setTouchTimer(scope);
                    }
                });
            });
            // Handler of 'mouseout' event is needed in touch mode, which will be mounted below.
            // addEventListener(root, 'mouseout', this._mouseoutHandler);
        }

        // 1. Considering some devices that both enable touch and mouse event (like on MS Surface
        // and lenovo X240, @see #2350), we make mouse event be always listened, otherwise
        // mouse event can not be handle in those devices.
        // 2. On MS Surface, Chrome will trigger both touch event and mouse event. How to prevent
        // mouseevent after touch event triggered, see `setTouchTimer`.
        zrUtil.each(nativeListenerNames.mouse, function (nativeEventName) {
            mountSingle(nativeEventName, function (event) {
                event = getNativeEvent(event);
                if (!scope.touching
                    && (localOrGlobal || !isTriggeredFromLocal(event))
                ) {
                    localOrGlobal && markTriggeredFromLocal(event);
                    domHandlers[nativeEventName].call(instance, event);
                }
            });
        });
    }

    function mountSingle(nativeEventName, listener) {
        scope.mounted[nativeEventName] = listener;
        addEventListener(domTarget, eventNameFix(nativeEventName), listener);
    }
}

function unmountDOMEventListeners(scope) {
    var mounted = scope.mounted;
    for (var nativeEventName in mounted) {
        if (mounted.hasOwnProperty(nativeEventName)) {
            removeEventListener(scope.domTarget, eventNameFix(nativeEventName), mounted[nativeEventName]);
        }
    }
    scope.mounted = {};
}


/**
 * @inner
 * @class
 */
function DOMHandlerScope(domTarget, domHandlers) {
    this.domTarget = domTarget;
    this.domHandlers = domHandlers;

    // Key: eventName, value: mounted handler funcitons.
    // Used for unmount.
    this.mounted = {};

    this.touchTimer = null;
    this.touching = false;
}

/**
 * @public
 * @class
 */
function HandlerDomProxy(dom) {
    Eventful.call(this);

    this.dom = dom;

    this._localHandlerScope = new DOMHandlerScope(dom, localDOMHandlers);

    if (pageEventSupported) {
        this._globalHandlerScope = new DOMHandlerScope(document, globalDOMHandlers);
    }

    this._pageEventEnabled = false;

    mountDOMEventListeners(this, this._localHandlerScope, localNativeListenerNames, true);
}

var handlerDomProxyProto = HandlerDomProxy.prototype;

handlerDomProxyProto.dispose = function () {
    unmountDOMEventListeners(this._localHandlerScope);
    if (pageEventSupported) {
        unmountDOMEventListeners(this._globalHandlerScope);
    }
};

handlerDomProxyProto.setCursor = function (cursorStyle) {
    this.dom.style && (this.dom.style.cursor = cursorStyle || 'default');
};

/**
 * The implementation of page event depends on listening to document.
 * So we should better only listen to that on needed, and remove the
 * listeners when do not need them to escape unexpected side-effect.
 * @param {boolean} enableOrDisable `true`: enable page event. `false`: disable page event.
 */
handlerDomProxyProto.togglePageEvent = function (enableOrDisable) {
    zrUtil.assert(enableOrDisable != null);

    if (pageEventSupported && (this._pageEventEnabled ^ enableOrDisable)) {
        this._pageEventEnabled = enableOrDisable;

        var globalHandlerScope = this._globalHandlerScope;
        enableOrDisable
            ? mountDOMEventListeners(this, globalHandlerScope, globalNativeListenerNames)
            : unmountDOMEventListeners(globalHandlerScope);
    }
};

zrUtil.mixin(HandlerDomProxy, Eventful);

export default HandlerDomProxy;
