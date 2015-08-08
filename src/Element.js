/**
 * 画布元素基类
 * Base class of all displayable graphic objects
 * @module zrender/Element
 */
define(function(require) {
    'use strict';

    var guid = require('./core/guid');
    var Eventful = require('./mixin/Eventful');
    var Transformable = require('./mixin/Transformable');
    var zrUtil = require('./core/util');

    var Element = function (opts) {

        Transformable.call(this, opts);
        Eventful.call(this, opts);

        /**
         * 画布元素ID
         * @type {string}
         */
        this.id = opts.id || guid();
    };

    Element.prototype = {

        /**
         * 元素类型
         * Element type
         * @type {string}
         */
        type: 'element',
        /**
         * ZRender 实例对象，会在 element 添加到 zrender 实例中后自动赋值
         * ZRender instance will be assigned when element is associated with zrender
         * @name module:/zrender/Element#__zr
         * @type {module:zrender/ZRender}
         */
        __zr: null,

        /**
         * 图形是否忽略，为true时忽略图形的绘制以及事件触发
         * If ignore drawing and events of the element object
         * @name module:/zrender/Element#ignore
         * @type {boolean}
         * @default false
         */
        ignore: false,

        /**
         * 创建一个 Animator
         * @param  {string} path 子属性 path, 例如 'style'
         * @param  {boolean} [loop=false] 是否循环
         * @return {module:zrender/animation/Animation~Animator}
         */
        animate: function (path, loop) {
            if (this.__zr) {
                return this.__zr.animate(this, path, loop);
            }
        },

        // TODO
        animateTo: function (target, time, easing, cb) {

        },

        /**
         * 停止所有动画
         */
        stopAnimation: function () {
            if (this.__zr) {
                this.__zr.stopAnimation(this);
            }
            return this;
        }
    };

    zrUtil.inherits(Element, Transformable);
    zrUtil.inherits(Element, Eventful);

    return Element;
});