/**
 * Storage内容仓库模块
 * @module zrender/Storage
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 * @author errorrik (errorrik@gmail.com)
 * @author pissang (https://github.com/pissang/)
 */
define(function (require) {

    'use strict';

    var util = require('./core/util');

    var Group = require('./graphic/Group');

    function shapeCompareFunc(a, b) {
        if (a.zlevel == b.zlevel) {
            if (a.z == b.z) {
                return a.__renderidx - b.__renderidx;
            }
            return a.z - b.z;
        }
        return a.zlevel - b.zlevel;
    }
    /**
     * 内容仓库 (M)
     * @alias module:zrender/Storage
     * @constructor
     */
    var Storage = function () {
        // 所有常规形状，id索引的map
        this._elements = {};

        this._roots = [];

        this._displayableList = [];

        this._displayableListLen = 0;
    };

    /**
     * 返回所有图形的绘制队列
     * @param  {boolean} [update=false] 是否在返回前更新该数组
     * 详见{@link module:zrender/graphic/Displayable.prototype.updateDisplayableList}
     * @return {Array.<module:zrender/graphic/Displayable>}
     */
    Storage.prototype.getDisplayableList = function (update) {
        if (update) {
            this.updateDisplayableList();
        }
        return this._displayableList;
    };

    /**
     * 更新图形的绘制队列。
     * 每次绘制前都会调用，该方法会先深度优先遍历整个树，更新所有Group和Shape的变换并且把所有可见的Shape保存到数组中，
     * 最后根据绘制的优先级（zlevel > z > 插入顺序）排序得到绘制队列
     */
    Storage.prototype.updateDisplayableList = function () {
        this._displayableListLen = 0;
        for (var i = 0, len = this._roots.length; i < len; i++) {
            var root = this._roots[i];
            this._updateAndAddDisplayable(root);
        }
        this._displayableList.length = this._displayableListLen;

        for (var i = 0, len = this._displayableList.length; i < len; i++) {
            this._displayableList[i].__renderidx = i;
        }

        this._displayableList.sort(shapeCompareFunc);
    };

    Storage.prototype._updateAndAddDisplayable = function (el, clipShapes) {
        
        if (el.ignore) {
            return;
        }

        el.updateTransform();

        if (el.type == 'group') {
            
            if (el.clipShape) {
                // clipShape 的变换是基于 group 的变换
                el.clipShape.parent = el;
                el.clipShape.updateTransform();

                // PENDING 效率影响
                if (clipShapes) {
                    clipShapes = clipShapes.slice();
                    clipShapes.push(el.clipShape);
                } else {
                    clipShapes = [el.clipShape];
                }
            }

            for (var i = 0; i < el._children.length; i++) {
                var child = el._children[i];

                // Force to mark as dirty if group is dirty
                child.__dirty = el.__dirty || child.__dirty;

                this._updateAndAddDisplayable(child, clipShapes);
            }

            // Mark group clean here
            el.__dirty = false;
            
        }
        else {
            el.__clipShapes = clipShapes;

            this._displayableList[this._displayableListLen++] = el;
        }
    };

    /**
     * 修改图形(Shape)或者组(Group)
     * 
     * @param {string|module:zrender/graphic/Displayable|module:zrender/graphic/Group} el
     * @param {Object} [params] 参数
     */
    Storage.prototype.mod = function (el, params) {
        if (typeof (el) === 'string') {
            el = this._elements[el];
        }
        if (el) {

            el.dirty();

            if (params) {
                // 如果第二个参数直接使用 shape
                // parent, __storage, __clipShapes, __zr 四个属性会有循环引用
                // 主要为了向 1.x 版本兼容，2.x 版本不建议使用第二个参数
                if (params.parent || params.__storage || params.__clipShapes) {
                    var target = {};
                    for (var name in params) {
                        if (
                            name === 'parent'
                            || name === '__storage'
                            || name === '__clipShapes'
                            || name === '__storage'
                        ) {
                            continue;
                        }
                        if (params.hasOwnProperty(name)) {
                            target[name] = params[name];
                        }
                    }
                    util.merge(el, target, true);
                }
                else {
                    util.merge(el, params, true);
                }
            }
        }

        return this;
    };

    /**
     * 移动指定的图形(Shape)或者组(Group)的位置
     * @param {string} elId 形状唯一标识
     * @param {number} dx
     * @param {number} dy
     */
    Storage.prototype.drift = function (elId, dx, dy) {
        var el = this._elements[elId];
        if (el) {
            el.needTransform = true;
            if (el.draggable === 'horizontal') {
                dy = 0;
            }
            else if (el.draggable === 'vertical') {
                dx = 0;
            }
            if (!el.ondrift // ondrift
                // 有onbrush并且调用执行返回false或undefined则继续
                || (el.ondrift && !el.ondrift(dx, dy))
            ) {
                el.drift(dx, dy);
            }
        }

        return this;
    };

    /**
     * 添加图形(Shape)或者组(Group)到根节点
     * @param {module:zrender/shape/Shape|module:zrender/graphic/Group} el
     */
    Storage.prototype.addRoot = function (el) {
        // Element has been added
        if (this._elements[el.id]) {
            return;
        }

        if (el instanceof Group) {
            el.addChildrenToStorage(this);
        }

        this.addToMap(el);
        this._roots.push(el);
    };

    /**
     * 删除指定的图形(Shape)或者组(Group)
     * @param {string|Array.<string>} [elId] 如果为空清空整个Storage
     */
    Storage.prototype.delRoot = function (elId) {
        if (typeof(elId) == 'undefined') {
            // 不指定elId清空
            for (var i = 0; i < this._roots.length; i++) {
                var root = this._roots[i];
                if (root instanceof Group) {
                    root.delChildrenFromStorage(this);
                }
            }

            this._elements = {};
            this._roots = [];
            this._displayableList = [];
            this._displayableListLen = 0;

            return;
        }

        if (elId instanceof Array) {
            for (var i = 0, l = elId.length; i < l; i++) {
                this.delRoot(elId[i]);
            }
            return;
        }

        var el;
        if (typeof(elId) == 'string') {
            el = this._elements[elId];
        }
        else {
            el = elId;
        }

        var idx = util.indexOf(this._roots, el);
        if (idx >= 0) {
            this.delFromMap(el.id);
            this._roots.splice(idx, 1);
            if (el instanceof Group) {
                el.delChildrenFromStorage(this);
            }
        }
    };

    Storage.prototype.addToMap = function (el) {
        if (el instanceof Group) {
            el.__storage = this;
        }
        el.dirty();

        this._elements[el.id] = el;

        return this;
    };

    Storage.prototype.get = function (elId) {
        return this._elements[elId];
    };

    Storage.prototype.delFromMap = function (elId) {
        var el = this._elements[elId];
        if (el) {
            delete this._elements[elId];

            if (el instanceof Group) {
                el.__storage = null;
            }
        }

        return this;
    };

    /**
     * 清空并且释放Storage
     */
    Storage.prototype.dispose = function () {
        this._elements = 
        this._renderList = 
        this._roots = null;
    };

    return Storage;
});
