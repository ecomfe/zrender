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

    var guid = require('../core/guid');
    var util = require('../core/util');

    var Transformable = require('../mixin/Transformable');
    var Eventful = require('../mixin/Eventful');

    /**
     * @alias module:zrender/graphic/Group
     * @constructor
     * @extends module:zrender/mixin/Transformable
     * @extends module:zrender/mixin/Eventful
     */
    var Group = function (options) {

        options = options || {};

        /**
         * Group id
         * @type {string}
         */
        this.id = options.id || guid();

        for (var key in options) {
            this[key] = options[key];
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

        // Mixin
        Transformable.call(this);
        Eventful.call(this);
    };

    Group.prototype = {

        constructor: Group,

        /**
         * @type {string}
         */
        type: 'group',
        /**
         * 是否忽略该 Group 及其所有子节点
         * @type {boolean}
         * @default false
         */
        ignore: false,

        /**
         * 复制并返回一份新的包含所有儿子节点的数组
         * @return {Array.<module:zrender/graphic/Group|module:zrender/graphic/Displayable>}
         */
        children: function () {
            return this._children.slice();
        },

        /**
         * 获取指定 index 的儿子节点
         * @param  {number} idx
         * @return {module:zrender/graphic/Group|module:zrender/graphic/Displayable}
         */
        childAt: function (idx) {
            return this._children[idx];
        },

        /**
         * 添加子节点，可以是Shape或者Group
         * @param {module:zrender/graphic/Group|module:zrender/graphic/Displayable} child
         */
        // TODO Type Check
        addElement: function (child) {
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

            if (this.__storage && this.__storage !== child.__storage) {
                
                this.__storage.addToMap(child);

                if (child instanceof Group) {
                    child.addChildrenToStorage(this.__storage);
                }
            }
        },

        /**
         * 移除子节点
         * @param {module:zrender/graphic/Group|module:zrender/graphic/Displayable} child
         */
        // TODO Type Check
        delElement: function (child) {
            var idx = util.indexOf(this._children, child);

            if (idx >= 0) {
                this._children.splice(idx, 1);
            }
            child.parent = null;

            if (this.__storage) {
                
                this.__storage.delFromMap(child.id);

                if (child instanceof Group) {
                    child.delChildrenFromStorage(this.__storage);
                }
            }
        },

        /**
         * 移除所有子节点
         */
        clearChildren: function () {
            for (var i = 0; i < this._children.length; i++) {
                var child = this._children[i];
                if (this.__storage) {
                    this.__storage.delFromMap(child.id);
                    if (child instanceof Group) {
                        child.delChildrenFromStorage(this.__storage);
                    }
                }
            }
            this._children.length = 0;
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
            // PENDING
            if (this.__zr) {
                this.__zr.refreshNextFrame();
            }
        },

        animate: function (path, loop) {
            if (this.__zr) {
                return this.__zr.animate(this, path, loop);
            }
        }
    };

    util.merge(Group.prototype, Transformable.prototype, true);
    util.merge(Group.prototype, Eventful.prototype, true);

    return Group;
});