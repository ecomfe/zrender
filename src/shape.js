/**
 * zrender: shape仓库
 *
 * @desc zrender是一个轻量级的Canvas类库，MVC封装，数据驱动，提供类Dom事件模型。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(
    function(/*require*/) {
        var self = {};

        var _shapeLibrary = {};     //shape库

        /**
         * 定义图形实现
         * @param {Object} name
         * @param {Object} clazz 图形实现
         */
        self.define = function(name, clazz) {
            _shapeLibrary[name] = clazz;
            return self;
        };

        /**
         * 获取图形实现
         * @param {Object} name
         */
        self.get = function(name) {
            return _shapeLibrary[name];
        };

        return self;
    }
);