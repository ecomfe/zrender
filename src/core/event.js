/**
 * 事件辅助类
 * @module zrender/core/event
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 */
define(function(require) {

    'use strict';

    var Eventful = require('../mixin/Eventful');

    var isDomLevel2 = !!window.addEventListener;
    /**
     * 如果存在第三方嵌入的一些dom触发的事件，或touch事件，需要转换一下事件坐标
     */
    function normalizeEvent(el, e) {

        e = e || window.event;

        if (e.zrX != null) {
            return e;
        }

        var eventType = e.type;
        var isTouch = eventType && eventType.indexOf('touch') >= 0;

        if (!isTouch) {
            // https://gist.github.com/electricg/4435259
            var mouseX = 0;
            var mouseY = 0;

            if (e.pageX || e.pageY) {
                mouseX = e.pageX;
                mouseY = e.pageY;
            }
            else {
                mouseX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                mouseY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }

            var elLeft = 0;
            var elTop = 0;
            while (el.offsetParent) {
                elLeft += el.offsetLeft;
                elTop += el.offsetTop;

                el = el.offsetParent;
            }


            e.zrX = mouseX - elLeft;
            e.zrY = mouseY - elTop;
            e.zrDelta = (e.wheelDelta) ? e.wheelDelta / 120 : -(e.detail || 0) / 3;
        }
        else {
            var touch = eventType != 'touchend'
                            ? e.targetTouches[0]
                            : e.changedTouches[0];
            if (touch) {
                var rBounding = el.getBoundingClientRect();
                // touch事件坐标是全屏的~
                e.zrX = touch.clientX - rBounding.left;
                e.zrY = touch.clientY - rBounding.top;
            }
        }

        return e;
    }

    function addEventListener(el, name, handler) {
        if (isDomLevel2) {
            el.addEventListener(name, handler);
        }
        else {
            el.attachEvent('on' + name, handler);
        }
    }

    function removeEventListener(el, name, handler) {
        if (isDomLevel2) {
            el.removeEventListener(name, handler);
        }
        else {
            el.detachEvent('on' + name, handler);
        }
    }

    /**
     * 停止冒泡和阻止默认行为
     * @memberOf module:zrender/core/event
     * @method
     * @param {Event} e : event对象
     */
    var stop = isDomLevel2
        ? function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.cancelBubble = true;
        }
        : function (e) {
            e.returnValue = false;
            e.cancelBubble = true;
        };

    return {
        normalizeEvent: normalizeEvent,
        addEventListener: addEventListener,
        removeEventListener: removeEventListener,

        stop: stop,
        // 做向上兼容
        Dispatcher: Eventful
    };
});
