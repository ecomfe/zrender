/**
 * Utilities for mouse or touch events.
 */

import Eventful from '../mixin/Eventful';
import env from './env';
import {buildTransformer} from './fourPointsTransform';

var isDomLevel2 = (typeof window !== 'undefined') && !!window.addEventListener;

var MOUSE_EVENT_REG = /^(?:mouse|pointer|contextmenu|drag|drop)|click/;
var EVENT_SAVED_PROP = '___zrEVENTSAVED';
var _calcOut = [];

/**
 * Get the `zrX` and `zrY`, which are relative to the top-left of
 * the input `el`.
 * CSS transform (2D & 3D) is supported.
 *
 * The strategy to fetch the coords:
 * + If `calculate` is not set as `true`, users of this method should
 * ensure that `el` is the same or the same size & location as `e.target`.
 * Otherwise the result coords are probably not expected. Because we
 * firstly try to get coords from e.offsetX/e.offsetY.
 * + If `calculate` is set as `true`, the input `el` can be any element
 * and we force to calculate the coords based on `el`.
 * + The input `el` should be positionable (not position:static).
 *
 * The force `calculate` can be used in case like:
 * When mousemove event triggered on ec tooltip, `e.target` is not `el`(zr painter.dom).
 *
 * @param {HTMLElement} el DOM element.
 * @param {Event} e Mouse event or touch event.
 * @param {Object} out Get `out.zrX` and `out.zrY` as the result.
 * @param {boolean} [calculate=false] Whether to force calculate
 *        the coordinates but not use ones provided by browser.
 */
export function clientToLocal(el, e, out, calculate) {
    out = out || {};

    // According to the W3C Working Draft, offsetX and offsetY should be relative
    // to the padding edge of the target element. The only browser using this convention
    // is IE. Webkit uses the border edge, Opera uses the content edge, and FireFox does
    // not support the properties.
    // (see http://www.jacklmoore.com/notes/mouse-position/)
    // In zr painter.dom, padding edge equals to border edge.

    if (calculate || !env.canvasSupported) {
        calculateZrXY(el, e, out);
    }
    // Caution: In FireFox, layerX/layerY Mouse position relative to the closest positioned
    // ancestor element, so we should make sure el is positioned (e.g., not position:static).
    // BTW1, Webkit don't return the same results as FF in non-simple cases (like add
    // zoom-factor, overflow / opacity layers, transforms ...)
    // BTW2, (ev.offsetY || ev.pageY - $(ev.target).offset().top) is not correct in preserve-3d.
    // <https://bugs.jquery.com/ticket/8523#comment:14>
    // BTW3, In ff, offsetX/offsetY is always 0.
    else if (env.browser.firefox && e.layerX != null && e.layerX !== e.offsetX) {
        out.zrX = e.layerX;
        out.zrY = e.layerY;
    }
    // For IE6+, chrome, safari, opera. (When will ff support offsetX?)
    else if (e.offsetX != null) {
        out.zrX = e.offsetX;
        out.zrY = e.offsetY;
    }
    // For some other device, e.g., IOS safari.
    else {
        calculateZrXY(el, e, out);
    }

    return out;
}

function calculateZrXY(el, e, out) {
    // BlackBerry 5, iOS 3 (original iPhone) don't have getBoundingRect.
    if (el.getBoundingClientRect && env.domSupported) {
        var ex = e.clientX;
        var ey = e.clientY;

        if (el.nodeName.toUpperCase() === 'CANVAS') {
            // Original approach, which do not support CSS transform.
            // marker can not be locationed in a canvas container
            // (getBoundingClientRect is always 0). We do not support
            // that input a pre-created canvas to zr while using css
            // transform in iOS.
            var box = el.getBoundingClientRect();
            out.zrX = ex - box.left;
            out.zrY = ey - box.top;
            return;
        }
        else {
            var saved = el[EVENT_SAVED_PROP] || (el[EVENT_SAVED_PROP] = {});
            var transformer = preparePointerTransformer(prepareCoordMarkers(el, saved), saved);
            if (transformer) {
                transformer(_calcOut, ex, ey);
                out.zrX = _calcOut[0];
                out.zrY = _calcOut[1];
                return;
            }
        }
    }
    out.zrX = out.zrY = 0;
}

function prepareCoordMarkers(el, saved) {
    var markers = saved.markers;
    if (markers) {
        return markers;
    }

    markers = saved.markers = [];
    var propLR = ['left', 'right'];
    var propTB = ['top', 'bottom'];

    for (var i = 0; i < 4; i++) {
        var marker = document.createElement('div');
        var stl = marker.style;
        var idxLR = i % 2;
        var idxTB = (i >> 1) % 2;
        stl.cssText = [
            'position:absolute',
            'visibility: hidden',
            'padding: 0',
            'margin: 0',
            'border-width: 0',
            'width:0',
            'height:0',
            // 'width: 5px',
            // 'height: 5px',
            propLR[idxLR] + ':0',
            propTB[idxTB] + ':0',
            propLR[1 - idxLR] + ':auto',
            propTB[1 - idxTB] + ':auto',
            ''
        ].join('!important;');
        el.appendChild(marker);
        markers.push(marker);
    }

    return markers;
}

function preparePointerTransformer(markers, saved) {
    var transformer = saved.transformer;
    var oldSrcCoords = saved.srcCoords;
    var useOld = true;
    var srcCoords = [];
    var destCoords = [];

    for (var i = 0; i < 4; i++) {
        var rect = markers[i].getBoundingClientRect();
        var ii = 2 * i;
        var x = rect.left;
        var y = rect.top;
        srcCoords.push(x, y);
        useOld &= oldSrcCoords && x === oldSrcCoords[ii] && y === oldSrcCoords[ii + 1];
        destCoords.push(markers[i].offsetLeft, markers[i].offsetTop);
    }

    // Cache to avoid time consuming of `buildTransformer`.
    return useOld
        ? transformer
        : (
            saved.srcCoords = srcCoords,
            saved.transformer = buildTransformer(srcCoords, destCoords)
        );
}

/**
 * Find native event compat for legency IE.
 * Should be called at the begining of a native event listener.
 *
 * @param {Event} [e] Mouse event or touch event or pointer event.
 *        For lagency IE, we use `window.event` is used.
 * @return {Event} The native event.
 */
export function getNativeEvent(e) {
    return e || window.event;
}

/**
 * Normalize the coordinates of the input event.
 *
 * Get the `e.zrX` and `e.zrY`, which are relative to the top-left of
 * the input `el`.
 * Get `e.zrDelta` if using mouse wheel.
 * Get `e.which`, see the comment inside this function.
 *
 * Do not calculate repeatly if `zrX` and `zrY` already exist.
 *
 * Notice: see comments in `clientToLocal`. check the relationship
 * between the result coords and the parameters `el` and `calculate`.
 *
 * @param {HTMLElement} el DOM element.
 * @param {Event} [e] See `getNativeEvent`.
 * @param {boolean} [calculate=false] Whether to force calculate
 *        the coordinates but not use ones provided by browser.
 * @return {UIEvent} The normalized native UIEvent.
 */
export function normalizeEvent(el, e, calculate) {

    e = getNativeEvent(e);

    if (e.zrX != null) {
        return e;
    }

    var eventType = e.type;
    var isTouch = eventType && eventType.indexOf('touch') >= 0;

    if (!isTouch) {
        clientToLocal(el, e, e, calculate);
        e.zrDelta = (e.wheelDelta) ? e.wheelDelta / 120 : -(e.detail || 0) / 3;
    }
    else {
        var touch = eventType !== 'touchend'
            ? e.targetTouches[0]
            : e.changedTouches[0];
        touch && clientToLocal(el, touch, e, calculate);
    }

    // Add which for click: 1 === left; 2 === middle; 3 === right; otherwise: 0;
    // See jQuery: https://github.com/jquery/jquery/blob/master/src/event.js
    // If e.which has been defined, it may be readonly,
    // see: https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/which
    var button = e.button;
    if (e.which == null && button !== undefined && MOUSE_EVENT_REG.test(e.type)) {
        e.which = (button & 1 ? 1 : (button & 2 ? 3 : (button & 4 ? 2 : 0)));
    }
    // [Caution]: `e.which` from browser is not always reliable. For example,
    // when press left button and `mousemove (pointermove)` in Edge, the `e.which`
    // is 65536 and the `e.button` is -1. But the `mouseup (pointerup)` and
    // `mousedown (pointerdown)` is the same as Chrome does.

    return e;
}

/**
 * @param {HTMLElement} el
 * @param {string} name
 * @param {Function} handler
 * @param {Object|boolean} opt If boolean, means `opt.capture`
 * @param {boolean} [opt.capture=false]
 * @param {boolean} [opt.passive=false]
 */
export function addEventListener(el, name, handler, opt) {
    if (isDomLevel2) {
        // Reproduct the console warning:
        // [Violation] Added non-passive event listener to a scroll-blocking <some> event.
        // Consider marking event handler as 'passive' to make the page more responsive.
        // Just set console log level: verbose in chrome dev tool.
        // then the warning log will be printed when addEventListener called.
        // See https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
        // We have not yet found a neat way to using passive. Because in zrender the dom event
        // listener delegate all of the upper events of element. Some of those events need
        // to prevent default. For example, the feature `preventDefaultMouseMove` of echarts.
        // Before passive can be adopted, these issues should be considered:
        // (1) Whether and how a zrender user specifies an event listener passive. And by default,
        // passive or not.
        // (2) How to tread that some zrender event listener is passive, and some is not. If
        // we use other way but not preventDefault of mousewheel and touchmove, browser
        // compatibility should be handled.

        // var opts = (env.passiveSupported && name === 'mousewheel')
        //     ? {passive: true}
        //     // By default, the third param of el.addEventListener is `capture: false`.
        //     : void 0;
        // el.addEventListener(name, handler /* , opts */);
        el.addEventListener(name, handler, opt);
    }
    else {
        // For simplicity, do not implement `setCapture` for IE9-.
        el.attachEvent('on' + name, handler);
    }
}

/**
 * Parameter are the same as `addEventListener`.
 *
 * Notice that if a listener is registered twice, one with capture and one without,
 * remove each one separately. Removal of a capturing listener does not affect a
 * non-capturing version of the same listener, and vice versa.
 */
export function removeEventListener(el, name, handler, opt) {
    if (isDomLevel2) {
        el.removeEventListener(name, handler, opt);
    }
    else {
        el.detachEvent('on' + name, handler);
    }
}

/**
 * preventDefault and stopPropagation.
 * Notice: do not use this method in zrender. It can only be
 * used by upper applications if necessary.
 *
 * @param {Event} e A mouse or touch event.
 */
export var stop = isDomLevel2
    ? function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.cancelBubble = true;
    }
    : function (e) {
        e.returnValue = false;
        e.cancelBubble = true;
    };

/**
 * This method only works for mouseup and mousedown. The functionality is restricted
 * for fault tolerance, See the `e.which` compatibility above.
 *
 * @param {MouseEvent} e
 * @return {boolean}
 */
export function isMiddleOrRightButtonOnMouseUpDown(e) {
    return e.which === 2 || e.which === 3;
}

/**
 * To be removed.
 * @deprecated
 */
export function notLeftMouse(e) {
    // If e.which is undefined, considered as left mouse event.
    return e.which > 1;
}


// For backward compatibility
export {Eventful as Dispatcher};
