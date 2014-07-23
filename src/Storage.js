/**
 * Storage内容仓库模块
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         errorrik (errorrik@gmail.com)
 */


define(
    function (require) {

        'use strict';

        var util = require('./tool/util');

        var Group = require('./shape/Group');

        var defaultIterateOption = {
            hover: false,
            normal: 'down',
            update: false
        };

        function shapeCompareFunc(a, b) {
            if (a.zlevel == b.zlevel) {
                return a.__renderidx - b.__renderidx;
            }
            return a.zlevel - b.zlevel;
        }
        /**
         * 内容仓库 (M)
         * 
         */
        function Storage() {
            // 所有常规形状，id索引的map
            this._elements = {};

            // 高亮层形状，不稳定，动态增删，数组位置也是z轴方向，靠前显示在下方
            this._hoverElements = [];

            this._roots = [];

            this._shapeList = [];

            this._shapeListOffset = 0;
        }

        /**
         * 遍历迭代器
         * 
         * @param {Function} fun 迭代回调函数，return true终止迭代
         * @param {Object=} option 迭代参数，缺省为仅降序遍历常规形状
         *     hover : true 是否迭代高亮层数据
         *     normal : 'down' | 'up' 是否迭代常规数据，迭代时是否指定及z轴顺序
         *     update : false 是否更新shapeList
         */
        Storage.prototype.iterShape = function (fun, option) {
            if (!option) {
                option = defaultIterateOption;
            }

            if (option.hover) {
                //高亮层数据遍历
                for (var i = 0, l = this._hoverElements.length; i < l; i++) {
                    var el = this._hoverElements[i];
                    el.updateTransform();
                    if (fun(el)) {
                        return this;
                    }
                }
            }

            if (option.update) {
                this.updateShapeList();
            }

            //遍历: 'down' | 'up'
            switch (option.normal) {
                case 'down':
                    // 降序遍历，高层优先
                    var l = this._shapeList.length;
                    while (l--) {
                        if (fun(this._shapeList[l])) {
                            return this;
                        }
                    }
                    break;
                // case 'up':
                default:
                    //升序遍历，底层优先
                    for (var i = 0, l = this._shapeList.length; i < l; i++) {
                        if (fun(this._shapeList[i])) {
                            return this;
                        }
                    }
                    break;
            }

            return this;
        };

        Storage.prototype.getHoverShapes = function(update) {
            if (update) {
                for (var i = 0, l = this._hoverElements.length; i < l; i++) {
                    this._hoverElements[i].updateTransform();
                }
            }
            return this._hoverElements;
        };

        Storage.prototype.getShapeList = function(update) {
            if (update) {
                this.updateShapeList();
            }
            return this._shapeList;
        };


        Storage.prototype.updateShapeList = function() {
            this._shapeListOffset = 0;
            for (var i = 0, len = this._roots.length; i < len; i++) {
                var root = this._roots[i];
                this._updateAndAddShape(root);
            }
            this._shapeList.length = this._shapeListOffset;

            for (var i = 0, len = this._shapeList.length; i < len; i++) {
                this._shapeList[i].__renderidx = i;
            }

            this._shapeList.sort(shapeCompareFunc);
        };

        Storage.prototype._updateAndAddShape = function(el) {
            
            el.updateTransform();

            if (el.type == 'group') {
                
                if (el.clipShape) {
                    // clipShape 的变换是基于 group 的变换
                    el.clipShape.parent = el;
                    el.clipShape.updateTransform();

                    var startClipShape = el._children[0];
                    if (startClipShape) {
                        startClipShape.__startClip = el.clipShape;
                    }
                }

                for (var i = 0; i < el._children.length; i++) {
                    var child = el._children[i];

                    // Force to mark as dirty if group is dirty
                    child.__dirty = el.__dirty || el.__dirty;

                    this._updateAndAddShape(child);
                }

                if (el.clipShape) {
                    var stopClipShape = this._shapeList[this._shapeListOffset - 1];
                    if (stopClipShape) {
                        stopClipShape.__stopClip = true;
                    }
                }
            } else {
                this._shapeList[this._shapeListOffset++] = el;
            }
        };

        /**
         * 修改
         * 
         * @param {string} idx 唯一标识
         * @param {Object} [params] 参数
         */
        Storage.prototype.mod = function (elId, params) {
            var el = this._elements[elId];
            if (el) {
                if (!(el instanceof Group)) {
                    el.style.__rect = null;
                }
                el.__dirty = true;

                if (params) {
                    // 如果第二个参数直接使用 shape
                    // parent, _storage, __startClip 三个属性会有循环引用
                    // 主要为了向 1.x 版本兼容，2.x 版本不建议使用第二个参数
                    if (params.parent || params._storage || params.__startClip) {
                        var target = {};
                        for (var name in params) {
                            if (
                                name == 'parent'
                                || name == '_storage'
                                || name == '__startClip'
                            ) {
                                continue;
                            }
                            if (params.hasOwnProperty(name)) {
                                target[name] = params[name];
                            }
                        }
                        util.merge(el, target, true);
                    } else {
                        util.merge(el, params, true);
                    }
                }
            }

            return this;
        };

        /**
         * 常规形状位置漂移，形状自身定义漂移函数
         * 
         * @param {string} idx 形状唯一标识
         */
        Storage.prototype.drift = function (shapeId, dx, dy) {
            var shape = this._elements[shapeId];
            if (shape) {
                shape.needTransform = true;
                if (!shape.ondrift //ondrift
                    //有onbrush并且调用执行返回false或undefined则继续
                    || (shape.ondrift && !shape.ondrift(dx, dy))
                ) {
                    shape.drift(dx, dy);
                }
            }

            return this;
        };

        /**
         * 添加高亮层数据
         * 
         * @param {Object} params 参数
         */
        Storage.prototype.addHover = function (shape) {
            shape.updateNeedTransform();
            this._hoverElements.push(shape);
            return this;
        };

        /**
         * 删除高亮层数据
         */
        Storage.prototype.delHover = function () {
            this._hoverElements = [];
            return this;
        };

        Storage.prototype.hasHoverShape = function () {
            return this._hoverElements.length > 0;
        };

        /**
         * 添加到根节点
         * 
         * @param {Shape|Group} el 参数
         */
        Storage.prototype.addRoot = function (el) {
            if (el instanceof Group) {
                el.addChildrenToStorage(this);
            }

            this.addToMap(el);
            this._roots.push(el);
        };

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
                this._hoverElements = [];
                this._roots = [];

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
            } else {
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

        /**
         * 添加
         * 
         * @param {Shape|Group} el 参数
         */
        Storage.prototype.addToMap = function (el) {
            if (el instanceof Group) {
                el._storage = this;
            } else {
                el.style.__rect = null;
            }

            this._elements[el.id] = el;

            return this;
        };

        /**
         * 根据指定的elId获取相应的shape属性
         * 
         * @param {string=} idx 唯一标识
         */
        Storage.prototype.get = function (elId) {
            return this._elements[elId];
        };

        /**
         * 删除，elId不指定则全清空
         * 
         * @param {string} idx 唯一标识
         */
        Storage.prototype.delFromMap = function (elId) {
            var el = this._elements[elId];
            if (el) {
                delete this._elements[elId];

                if (el instanceof Group) {
                    el._storage = null;
                }
            }

            return this;
        };


        /**
         * 释放
         */
        Storage.prototype.dispose = function () {
            this._elements = 
            this._renderList = 
            this._roots =
            this._hoverElements = null;
        };

        return Storage;
    }
);
