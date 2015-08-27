/**
 * @module zrender/Element
 */
define(function(require) {
    'use strict';

    var guid = require('./core/guid');
    var Eventful = require('./mixin/Eventful');
    var Transformable = require('./mixin/Transformable');
    var Animatable = require('./mixin/Animatable');
    var zrUtil = require('./core/util');

    /**
     * @alias module:zrender/Element
     * @constructor
     * @extends {module:zrender/mixin/Animatable}
     * @extends {module:zrender/mixin/Transformable}
     * @extends {module:zrender/mixin/Eventful}
     */
    var Element = function (opts) {

        Transformable.call(this, opts);
        Eventful.call(this, opts);
        Animatable.call(this, opts);

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
         * 用于裁剪的路径(shape)，所有 Group 内的路径在绘制时都会被这个路径裁剪
         * 该路径会继承被裁减对象的变换
         * @type {module:zrender/graphic/Path}
         * @see http://www.w3.org/TR/2dcontext/#clipping-region
         * @readOnly
         */
        clipPath: null,

        /**
         * @protected
         */
        attrKV: function (key, value) {
            this[key] = value;
        },

        attr: function (key, value) {
            if (typeof key === 'string') {
                this.attrKV(key, value);
            }
            else if (Object(key) === key) {
                for (var name in key) {
                    this.attrKV(name, key[name]);
                }
            }
            this.__zr.refreshNextFrame();

            return this;
        },

        setClipPath: function (clipPath) {
            this.clipPath = clipPath;
            clipPath
        },

        unsetClipPath: function () {
            this.clipPath.__zr = null;
            this.clipPath = null;
        }
    };

    zrUtil.merge(Element.prototype, Animatable.prototype, true);
    zrUtil.merge(Element.prototype, Transformable.prototype, true);
    zrUtil.merge(Element.prototype, Eventful.prototype, true);

    return Element;
});