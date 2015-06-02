/**
 * @file 宏函数
 * @author hushicai(bluthcy@gmail.com)
 */

(function (global) {
    /**
     * 默认的环境配置
     *
     * @type {Object}
     */
    var DefaultEnv = {};

    /**
     * 环境配置
     *
     * @type {Object}
     */
    var env = DefaultEnv;


    /**
     * 多级属性访问
     *
     * @inner
     * @param {Object} obj 对象
     * @param {string} key 键
     * @return {Object|number} 值
     */
    function accessByDot(obj, key) {
        key = (key || '').split('.');
        while (obj && key.length) {
            obj = obj[key.shift()];
        }
        return obj;
    }

    var macro = {
        /**
         * 更新环境配置
         *
         * @public
         * @param {Object} cfg 环境配置
         */
        setEnv: function (cfg) {
            if (cfg) {
                env = cfg;
            }
        },
        //  ------------------ 宏函数 ---------------------
        isDefined: function (key) {
            return !!accessByDot(env, key);
        },
        isNotDefined: function (key) {
            return !accessByDot(env, key);
        },
        isEqual: function (key, value) {
            return accessByDot(env, key) === value;
        },
        isNotEqual: function (key, value) {
            return accessByDot(env, key) !== value;
        }
    };

    if (typeof exports === 'object' && typeof module === 'object') {
        exports = module.exports = macro;
    }
    else if (typeof define === 'function' && define.amd) {
        define(macro);
    }
})(this);
