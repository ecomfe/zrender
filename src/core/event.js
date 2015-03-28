/**
 * 事件辅助类
 * @module zrender/core/event
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 */
define(function(require) {

    'use strict';

    var Eventful = require('../mixin/Eventful');

    /**
    * 提取鼠标（手指）x坐标
    * @memberOf module:zrender/core/event
    * @param  {Event} e 事件.
    * @return {number} 鼠标（手指）x坐标.
    */
    function getX(e) {
        return e.zrenderX || e.offsetX
               || e.layerX || e.clientX || 0;
    }

    /**
    * 提取鼠标y坐标
    * @memberOf module:zrender/core/event
    * @param  {Event} e 事件.
    * @return {number} 鼠标（手指）y坐标.
    */
    function getY(e) {
        return e.zrenderY || e.offsetY
               || e.layerY || e.clientY || 0;
    }

    /**
    * 提取鼠标滚轮变化
    * @memberOf module:zrender/core/event
    * @param  {Event} e 事件.
    * @return {number} 滚轮变化，正值说明滚轮是向上滚动，如果是负值说明滚轮是向下滚动
    */
    function getDelta(e) {
        return e.zrenderDelta != null && e.zrenderDelta
               || e.wheelDelta != null && e.wheelDelta
               || e.detail != null && -e.detail;
    }

    /**
     * 停止冒泡和阻止默认行为
     * @memberOf module:zrender/core/event
     * @method
     * @param {Event} e : event对象
     */
    var stop = typeof window.addEventListener === 'function'
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
        getX : getX,
        getY : getY,
        getDelta : getDelta,
        stop : stop,
        // 做向上兼容
        Dispatcher : Eventful
    };
});
