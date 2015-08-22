/**
 * Group是一个容器，可以插入子节点，Group的变换也会被应用到子节点上
 * @module zrender/graphic/Group
 * @example
 *     var Group = require('zrender/graphic/Group');
 *     var Circle = require('zrender/graphic/shape/Circle');
 *     var g = new Group();
 *     g.position[0] = 100;
 *     g.position[1] = 100;
 *     g.addChild(new Circle({
 *         style: {
 *             x: 100,
 *             y: 100,
 *             r: 20,
 *         }
 *     }));
 *     zr.addGroup(g);
 */
define(function (require) {

    var zrUtil = require('../core/util');
    var Element = require('../Element');
    var BoundingRect = require('../core/BoundingRect');

    /**
     * @alias module:zrender/graphic/Group
     * @constructor
     * @extends module:zrender/mixin/Transformable
     * @extends module:zrender/mixin/Eventful
     */
    var Group = function (opts) {

        opts = opts || {};

        Element.call(this, opts);

        for (var key in opts) {
            this[key] = opts[key];
        }

        /**
         * 用于裁剪的图形(shape)，所有 Group 内的图形在绘制时都会被这个图形裁剪
         * 该图形会继承Group的变换
         * @type {module:zrender/graphic/Displayable}
         * @see http://www.w3.org/TR/2dcontext/#clipping-region
         */
        this.clipShape = null;

        this._children = [];

        this.__storage = null;

        this.__dirty = true;
    };

    Group.prototype = {

        constructor: Group,

        /**
         * @type {string}
         */
        type: 'group',

        /**
         * 复制并返回一份新的包含所有儿子节点的数组
         * @return {Array.<module:zrender/Element>}
         */
        children: function () {
            return this._children.slice();
        },

        /**
         * 获取指定 index 的儿子节点
         * @param  {number} idx
         * @return {module:zrender/Element}
         */
        childAt: function (idx) {
            return this._children[idx];
        },

        /**
         * 添加子节点
         * @param {module:zrender/Element} child
         */
        // TODO Type Check
        add: function (child) {
            if (child == this) {
                return;
            }

            if (child.parent == this) {
                return;
            }
            if (child.parent) {
                child.parent.removeChild(child);
            }

            this._children.push(child);
            child.parent = this;

            var storage = this.__storage;
            if (storage && storage !== child.__storage) {

                storage.addToMap(child);

                if (child instanceof Group) {
                    child.addChildrenToStorage(storage);
                }
            }

            if (this.__zr) {
                this.__zr.refreshNextFrame();
            }
        },

        /**
         * 移除子节点
         * @param {module:zrender/Element} child
         */
        // TODO Type Check
        remove: function (child) {
            var idx = zrUtil.indexOf(this._children, child);

            if (idx >= 0) {
                this._children.splice(idx, 1);
            }
            child.parent = null;

            var storage = this.__storage;
            if (storage) {

                storage.delFromMap(child.id);

                if (child instanceof Group) {
                    child.delChildrenFromStorage(storage);
                }
            }

            if (this.__zr) {
                this.__zr.refreshNextFrame();
            }
        },

        /**
         * 移除所有子节点
         */
        clear: function () {
            var children = this._children;
            var storage = this.__storage;
            var child;
            var i;
            for (i = 0; i < children.length; i++) {
                child = children[i];
                if (storage) {
                    storage.delFromMap(child.id);
                    if (child instanceof Group) {
                        child.delChildrenFromStorage(storage);
                    }
                }
            }
            children.length = 0;
        },

        /**
         * 遍历所有子节点
         * @param  {Function} cb
         * @param  {}   context
         */
        eachChild: function (cb, context) {
            var haveContext = !!context;
            for (var i = 0; i < this._children.length; i++) {
                var child = this._children[i];
                if (haveContext) {
                    cb.call(context, child);
                } else {
                    cb(child);
                }
            }
        },

        /**
         * 深度优先遍历所有子孙节点
         * @param  {Function} cb
         * @param  {}   context
         */
        traverse: function (cb, context) {
            var haveContext = !!context;
            for (var i = 0; i < this._children.length; i++) {
                var child = this._children[i];
                if (haveContext) {
                    cb.call(context, child);
                } else {
                    cb(child);
                }

                if (child.type === 'group') {
                    child.traverse(cb, context);
                }
            }
        },

        addChildrenToStorage: function (storage) {
            for (var i = 0; i < this._children.length; i++) {
                var child = this._children[i];
                storage.addToMap(child);
                if (child instanceof Group) {
                    child.addChildrenToStorage(storage);
                }
            }
        },

        delChildrenFromStorage: function (storage) {
            for (var i = 0; i < this._children.length; i++) {
                var child = this._children[i];
                storage.delFromMap(child.id);
                if (child instanceof Group) {
                    child.delChildrenFromStorage(storage);
                }
            }
        },

        dirty: function () {
            this.__dirty = true;
            if (this.__zr) {
                this.__zr.refreshNextFrame();
            }
        },

        /**
         * 创建一个 Animator
         * @param  {string} path 子属性 path
         * @param  {boolean} [loop=false] 是否循环
         * @return {module:zrender/animation/Animation~Animator}
         */
        animate: function (path, loop) {
            if (this.__zr) {
                return this.__zr.animate(this, path, loop);
            }
        },

        /**
         * 停止所有动画
         */
        stopAnimation: function () {
            if (this.__zr) {
                this.__zr.stopAnimation(this);
            }
            return this;
        },

        /**
         * @return {module:zrender/core/BoundingRect}
         */
        getBoundingRect: function () {
            // TODO Caching
            // TODO Transform
            // var rect = new BoundingRect(-Infinity, -Infinity, Infinity, Infinity);
            // var children = this._children;
            // for (var i = 0; i < children.length; i++) {
            //     var child = children[i];
            //     rect.union(child.getBoundingRect());
            // }
            // return rect;
        },

        update: function () {
            this.updateTransform();
        }
    };

    zrUtil.inherits(Group, Element);

    return Group;
});