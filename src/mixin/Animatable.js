/**
 * @module zrender/mixin/Animatable
 */
define(function(require) {

    'use strict';

    var Animator = require('../animation/Animator');
    var util = require('../core/util');
    var log = require('../core/log');

    /**
     * @alias modue:zrender/mixin/Animatable
     * @constructor
     */
    var Animatable = function () {

        /**
         * @type {Array.<module:zrender/animation/Animator>}
         * @readOnly
         */
        this.animators = [];
    }

    Animatable.prototype = {

        constructor: Animatable,

        /**
         * 动画
         *
         * @param {string} path 需要添加动画的属性获取路径，可以通过a.b.c来获取深层的属性
         * @param {boolean} [loop] 动画是否循环
         * @return {module:zrender/animation/Animator}
         * @example:
         *     el.animate('style', false)
         *         .when(1000, {x: 10} )
         *         .done(function(){ // Animation done })
         *         .start()
         */
        animate: function (path, loop) {
            var target;
            var animatingShape = false;
            var el = this;
            if (path) {
                var pathSplitted = path.split('.');
                var prop = el;
                // If animating shape
                animatingShape = pathSplitted[0] === 'shape';
                for (var i = 0, l = pathSplitted.length; i < l; i++) {
                    if (!prop) {
                        continue;
                    }
                    prop = prop[pathSplitted[i]];
                }
                if (prop) {
                    target = prop;
                }
            }
            else {
                target = el;
            }

            if (!target) {
                log(
                    'Property "'
                    + path
                    + '" is not existed in element '
                    + el.id
                );
                return;
            }

            var animators = el.animators;

            var animator = new Animator(target, loop);

            animator.during(function (target) {
                el.dirty(animatingShape);
            })
            .done(function () {
                animators.splice(util.indexOf(animators, animator), 1);
            });
            animators.push(animator);

            // If animate after added to the zrender
            if (this.__zr) {
                this.__zr.animation.addAnimator(animator);
            }

            return animator;
        },

        /**
         * 停止动画
         */
        stopAnimation: function () {
            var animators = this.animators;
            var len = animators.length;
            for (var i = 0; i < len; i++) {
                animators[i].stop();
            }
            animators.length = 0;
        },

        /**
         * @param {Object} target
         * @param {number} [time=500] Time in ms
         * @param {string} [easing='linear']
         * @param {number} [delay=0]
         * @param {Function} [callback]
         *
         * @example
         *  // Animate position
         *  el.animateTo({
         *      position: [10, 10]
         *  }, function () { // done })
         *
         *  // Animate shape, style and position in 100ms, delayed 100ms, with cubicOut easing
         *  el.animateTo({
         *      shape: {
         *          width: 500
         *      },
         *      style: {
         *          fill: 'red'
         *      }
         *      position: [10, 10]
         *  }, 100, 100, 'cubicOut', function () { // done })
         */
         // TODO Return animation key
        animateTo: function (target, time, delay, easing, callback) {
            // animateTo(target, time, easing, callback);
            if (typeof delay === 'string') {
                callback = easing;
                easing = delay;
                delay = 0;
            }
            // animateTo(target, time, delay, callback);
            else if (typeof easing === 'function') {
                callback = easing;
                easing = 'linear';
                delay = 0;
            }
            // animateTo(target, time, callback);
            else if (typeof delay === 'function') {
                callback = delay;
            }
            // animateTo(target, callback)
            else if (typeof time === 'function') {
                callback = time;
                time = 500;
            }
            // animateTo(target)
            else if (! time) {
                time = 500;
            }
            // Stop all previous animations
            this.stopAnimation();
            this._animateToShallow('', target, time, delay, easing, callback);

            var animators = this.animators;
            var len = animators.length;
            if (len > 0) {
                animators[len - 1].done(callback);
            }
            else {
                callback && callback();
            }
            for (var i = 0; i < len; i++) {
                animators[i].start(easing);
            }
        },

        /**
         * @param {string} path
         * @param {Object} target
         * @param {number} time
         * @param {number} delay
         * @private
         */
        _animateToShallow: function (path, target, time, delay) {
            var objShallow = {};
            var propertyCount = 0;
            for (var name in target) {
                if (util.isObject(target[name])) {
                    this._animateToShallow(
                        path ? path + '.' + name : name,
                        target[name],
                        time,
                        delay
                    );
                }
                else {
                    objShallow[name] = target[name];
                    propertyCount++;
                }
            }

            if (propertyCount > 0) {
                this.animate(path, false)
                    .when(time, objShallow)
                    .delay(delay || 0)
            }
        }
    }

    return Animatable;
});