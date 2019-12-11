
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

var globalEventSupported = env.domSupported;


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

// Mark touch, which is useful in distinguish touch and
// mouse event in upper applicatoin.
function markTouch(event) {
    event && (event.zrByTouch = true);
}


// function markTriggeredFromLocal(event) {
//     event && (event.__zrIsFromLocal = true);
// }

// function isTriggeredFromLocal(instance, event) {
//     return !!(event && event.__zrIsFromLocal);
// }

function normalizeGlobalEvent(instance, event) {
    // offsetX, offsetY still need to be calculated. They are necessary in the event
    // handlers of the upper applications. Set `true` to force calculate them.
    return normalizeEvent(instance.dom, new FakeGlobalEvent(instance, event), true);
}

/**
 * Detect whether the given el is in `painterRoot`.
 */
function isLocalEl(instance, el) {
    var isLocal = false;
    do {
        el = el && el.parentNode;
    }
    while (el && el.nodeType !== 9 && !(
        isLocal = el === instance.painterRoot
    ));
    return isLocal;
}

/**
 * Make a fake event but not change the original event,
 * becuase the global event probably be used by other
 * listeners not belonging to zrender.
 * @class
 */
function FakeGlobalEvent(instance, event) {
    this.type = event.type;
    this.target = this.currentTarget = instance.dom;
    this.pointerType = event.pointerType;
    // Necessray for the force calculation of zrX, zrY
    this.clientX = event.clientX;
    this.clientY = event.clientY;
    // Because we do not mount global listeners to touch events,
    // we do not copy `targetTouches` and `changedTouches` here.
}
var fakeGlobalEventProto = FakeGlobalEvent.prototype;
// we make the default methods on the event do nothing,
// otherwise it is dangerous. See more details in
// [Drag outside] in `Handler.js`.
fakeGlobalEventProto.stopPropagation =
    fakeGlobalEventProto.stopImmediatePropagation =
    fakeGlobalEventProto.preventDefault = zrUtil.noop;


/**
 * Local DOM Handlers
 * @this {HandlerProxy}
 */
var localDOMHandlers = {

    mousedown: function (event) {
        event = normalizeEvent(this.dom, event);

        this._mayPointerCapture = [event.zrX, event.zrY];

        this.trigger('mousedown', event);
    },

    mousemove: function (event) {
        event = normalizeEvent(this.dom, event);

        var downPoint = this._mayPointerCapture;
        if (downPoint && (event.zrX !== downPoint[0] || event.zrY !== downPoint[1])) {
            togglePointerCapture(this, true);
        }

        this.trigger('mousemove', event);
    },

    mouseup: function (event) {
        event = normalizeEvent(this.dom, event);

        togglePointerCapture(this, false);

        this.trigger('mouseup', event);
    },

    mouseout: function (event) {
        event = normalizeEvent(this.dom, event);

        // Similarly to the browser did on `document` and touch event,
        // `globalout` will be delayed to final pointer cature release.
        if (this._pointerCapturing) {
            event.zrEventControl = 'no_globalout';
        }

        // There might be some doms created by upper layer application
        // at the same level of painter.getViewportRoot() (e.g., tooltip
        // dom created by echarts), where 'globalout' event should not
        // be triggered when mouse enters these doms. (But 'mouseout'
        // should be triggered at the original hovered element as usual).
        var element = event.toElement || event.relatedTarget;
        event.zrIsToLocalDOM = isLocalEl(this, element);

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
zrUtil.each(['click', 'mousewheel', 'dblclick', 'contextmenu'], function (name) {
    localDOMHandlers[name] = function (event) {
        event = normalizeEvent(this.dom, event);
        this.trigger(name, event);
    };
});


/**
 * DOM UI Event handlers for global page.
 *
 * [Caution]:
 * those handlers should both support in capture phase and bubble phase!
 *
 * @this {HandlerProxy}
 */
var globalDOMHandlers = {

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
        this.trigger('mousemove', event);
    },

    mouseup: function (event) {
        var pointerCaptureReleasing = this._pointerCapturing;

        togglePointerCapture(this, false);

        this.trigger('mouseup', event);

        if (pointerCaptureReleasing) {
            event.zrEventControl = 'only_globalout';
            this.trigger('mouseout', event);
        }
    }

};


/**
 * @param {HandlerProxy} instance
 * @param {DOMHandlerScope} scope
 */
function mountLocalDOMEventListeners(instance, scope) {
    var domHandlers = scope.domHandlers;

    if (env.pointerEventsSupported) { // Only IE11+/Edge
        // 1. On devices that both enable touch and mouse (e.g., MS Surface and lenovo X240),
        // IE11+/Edge do not trigger touch event, but trigger pointer event and mouse event
        // at the same time.
        // 2. On MS Surface, it probablely only trigger mousedown but no mouseup when tap on
        // screen, which do not occurs in pointer event.
        // So we use pointer event to both detect touch gesture and mouse behavior.
        zrUtil.each(localNativeListenerNames.pointer, function (nativeEventName) {
            mountSingleDOMEventListener(scope, nativeEventName, function (event) {
                // markTriggeredFromLocal(event);
                domHandlers[nativeEventName].call(instance, event);
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
            zrUtil.each(localNativeListenerNames.touch, function (nativeEventName) {
                mountSingleDOMEventListener(scope, nativeEventName, function (event) {
                    // markTriggeredFromLocal(event);
                    domHandlers[nativeEventName].call(instance, event);
                    setTouchTimer(scope);
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
        zrUtil.each(localNativeListenerNames.mouse, function (nativeEventName) {
            mountSingleDOMEventListener(scope, nativeEventName, function (event) {
                event = getNativeEvent(event);
                if (!scope.touching) {
                    // markTriggeredFromLocal(event);
                    domHandlers[nativeEventName].call(instance, event);
                }
            });
        });
    }
}

/**
 * @param {HandlerProxy} instance
 * @param {DOMHandlerScope} scope
 */
function mountGlobalDOMEventListeners(instance, scope) {
    // Only IE11+/Edge. See the comment in `mountLocalDOMEventListeners`.
    if (env.pointerEventsSupported) {
        zrUtil.each(globalNativeListenerNames.pointer, mount);
    }
    // Touch event has implemented "drag outside" so we do not mount global listener for touch event.
    // (see https://www.w3.org/TR/touch-events/#the-touchmove-event)
    // We do not consider "both-support-touch-and-mouse device" for this feature (see the comment of
    // `mountLocalDOMEventListeners`) to avoid bugs util some requirements come.
    else if (!env.touchEventsSupported) {
        zrUtil.each(globalNativeListenerNames.mouse, mount);
    }

    function mount(nativeEventName) {
        function nativeEventListener(event) {
            event = getNativeEvent(event);
            // See the reason in [Drag outside] in `Handler.js`
            // This checking supports both `useCapture` or not.
            // PENDING: if there is performance issue in some devices,
            // we probably can not use `useCapture` and change a easier
            // to judes whether local (mark).
            if (!isLocalEl(instance, event.target)) {
                event = normalizeGlobalEvent(instance, event);
                scope.domHandlers[nativeEventName].call(instance, event);
            }
        }
        mountSingleDOMEventListener(
            scope, nativeEventName, nativeEventListener,
            {capture: true} // See [Drag Outside] in `Handler.js`
        );
    }
}

function mountSingleDOMEventListener(scope, nativeEventName, listener, opt) {
    scope.mounted[nativeEventName] = listener;
    scope.listenerOpts[nativeEventName] = opt;
    addEventListener(scope.domTarget, eventNameFix(nativeEventName), listener, opt);
}

function unmountDOMEventListeners(scope) {
    var mounted = scope.mounted;
    for (var nativeEventName in mounted) {
        if (mounted.hasOwnProperty(nativeEventName)) {
            removeEventListener(
                scope.domTarget, eventNameFix(nativeEventName), mounted[nativeEventName],
                scope.listenerOpts[nativeEventName]
            );
        }
    }
    scope.mounted = {};
}

/**
 * See [Drag Outside] in `Handler.js`.
 * @implement
 * @param {boolean} isPointerCapturing Should never be `null`/`undefined`.
 *        `true`: start to capture pointer if it is not capturing.
 *        `false`: end the capture if it is capturing.
 */
function togglePointerCapture(instance, isPointerCapturing) {
    instance._mayPointerCapture = null;

    if (globalEventSupported && (instance._pointerCapturing ^ isPointerCapturing)) {
        instance._pointerCapturing = isPointerCapturing;

        var globalHandlerScope = instance._globalHandlerScope;
        isPointerCapturing
            ? mountGlobalDOMEventListeners(instance, globalHandlerScope)
            : unmountDOMEventListeners(globalHandlerScope);
    }
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
    this.listenerOpts = {};

    this.touchTimer = null;
    this.touching = false;
}

/**
 * @public
 * @class
 */
function HandlerDomProxy(dom, painterRoot) {
    Eventful.call(this);

    this.dom = dom;
    this.painterRoot = painterRoot;

    this._localHandlerScope = new DOMHandlerScope(dom, localDOMHandlers);

    if (globalEventSupported) {
        this._globalHandlerScope = new DOMHandlerScope(document, globalDOMHandlers);
    }

    /**
     * @type {boolean}
     */
    this._pointerCapturing = false;
    /**
     * @type {Array.<number>} [x, y] or null.
     */
    this._mayPointerCapture = null;

    mountLocalDOMEventListeners(this, this._localHandlerScope);
}

var handlerDomProxyProto = HandlerDomProxy.prototype;

handlerDomProxyProto.dispose = function () {
    unmountDOMEventListeners(this._localHandlerScope);
    if (globalEventSupported) {
        unmountDOMEventListeners(this._globalHandlerScope);
    }
};

handlerDomProxyProto.setCursor = function (cursorStyle) {
    this.dom.style && (this.dom.style.cursor = cursorStyle || 'default');
};


zrUtil.mixin(HandlerDomProxy, Eventful);

export default HandlerDomProxy;
