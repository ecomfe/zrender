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

    var tmpMat = [];

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
        add: function (child) {
            // Validate
            if (!child || child === this || child.parent === this) {
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

            this.__zr && this.__zr.refresh();

            return this;
        },

        /**
         * 移除子节点
         * @param {module:zrender/Element} child
         */
        remove: function (child) {
            var zr = this.__zr;
            var storage = this.__storage;
            var children = this._children;

            var idx = zrUtil.indexOf(children, child);
            if (idx < 0) {
                return;
            }
            children.splice(idx, 1);

            child.parent = null;

            if (storage) {

                storage.delFromMap(child.id);

                if (child instanceof Group) {
                    child.delChildrenFromStorage(storage);
                }
            }

            zr && zr.refresh();

            return this;
        },

        /**
         * 移除所有子节点
         */
        removeAll: function () {
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
                child.parent = null;
            }
            children.length = 0;

            return this;
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
            return this;
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
            return this;
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
            this.__zr && this.__zr.refresh();
            return this;
        },

        /**
         * @return {module:zrender/core/BoundingRect}
         */
        getBoundingRect: function () {
            // TODO Caching
            // TODO Transform
            var rect;
            var tmpRect = new BoundingRect(0, 0, 0, 0);
            var children = this._children;
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (child.ignore || child.invisible) {
                    continue;
                }

                var childRect = child.getBoundingRect();
                var transform = child.getLocalTransform(tmpMat);
                rect = rect || childRect.clone();
                if (transform) {
                    tmpRect.copy(childRect);
                    tmpRect.applyTransform(transform);
                    rect.union(tmpRect);
                }
                else {
                    rect.union(childRect);
                }
            }
            return rect || new BoundingRect(0, 0, 0, 0);
        },

        update: function () {
            this.updateTransform();
            return this;
        }
    };

    zrUtil.inherits(Group, Element);

    return Group;
});