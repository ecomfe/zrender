/**
 * @module zrender/shape/mixin/Transformable
 */
define(function(require) {

    var matrix = require('../../tool/matrix');
    var origin = [0, 0];

    /**
     * @alias module:zrender/shape/mixin/Transformable
     * @constructor
     */
    var Transformable = function() {

        if (!this.position) {
            /**
             * 平移
             * @type {Array.<number>}
             * @default [0, 0]
             */
            this.position = [0, 0];
        }
        if (typeof(this.rotation) == 'undefined') {
            /**
             * 旋转，可以通过数组二三项指定旋转的原点
             * @type {Array.<number>}
             * @default [0, 0, 0]
             */
            this.rotation = [0, 0, 0];
        }
        if (!this.scale) {
            /**
             * 缩放，可以通过数组三四项指定缩放的原点
             * @type {Array.<number>}
             * @default [1, 1, 0, 0]
             */
            this.scale = [1, 1, 0, 0];
        }

        this.needLocalTransform = false;

        /**
         * 是否有坐标变换
         * @type {boolean}
         * @readOnly
         */
        this.needTransform = false;
    };

    Transformable.prototype = {
        
        constructor: Transformable,

        updateNeedTransform: function() {
            this.needLocalTransform = Math.abs(this.rotation[0]) > 0.0001
                || Math.abs(this.position[0]) > 0.0001
                || Math.abs(this.position[1]) > 0.0001
                || Math.abs(this.scale[0] - 1) > 0.0001
                || Math.abs(this.scale[1] - 1) > 0.0001;
        },

        /**
         * 判断是否需要有坐标变换，更新needTransform属性。
         * 如果有坐标变换, 则从position, rotation, scale以及父节点的transform计算出自身的transform矩阵
         */
        updateTransform: function() {
            
            this.updateNeedTransform();

            if (this.parent) {
                this.needTransform = this.needLocalTransform || this.parent.needTransform;
            } else {
                this.needTransform = this.needLocalTransform;
            }
            
            if (!this.needTransform) {
                return;
            }

            var m = this.transform || matrix.create();
            matrix.identity(m);

            if (this.needLocalTransform) {
                if (this.scale && (this.scale[0] !== 1 || this.scale[1] !== 1)) {
                    origin[0] = -this.scale[2] || 0;
                    origin[1] = -this.scale[3] || 0;
                    if (origin[0] || origin[1]) {
                        matrix.translate(
                            m, m, origin
                        );
                    }
                    matrix.scale(m, m, this.scale);
                    if (origin[0] || origin[1]) {
                        origin[0] = -origin[0];
                        origin[1] = -origin[1];
                        matrix.translate(
                            m, m, origin
                        );
                    }
                }

                if (this.rotation) {
                    if (this.rotation instanceof Array) {
                        if (this.rotation[0] !== 0) {
                            origin[0] = -this.rotation[1] || 0;
                            origin[1] = -this.rotation[2] || 0;
                            if (origin[0] || origin[1]) {
                                matrix.translate(
                                    m, m, origin
                                );
                            }
                            matrix.rotate(m, m, this.rotation[0]);
                            if (origin[0] || origin[1]) {
                                origin[0] = -origin[0];
                                origin[1] = -origin[1];
                                matrix.translate(
                                    m, m, origin
                                );
                            }
                        }
                    }
                    else {
                        if (this.rotation !== 0) {
                            matrix.rotate(m, m, this.rotation);
                        }
                    }
                }

                if (this.position && (this.position[0] !==0 || this.position[1] !== 0)) {
                    matrix.translate(m, m, this.position);
                }
            }

            // 保存这个变换矩阵
            this.transform = m;

            // 应用父节点变换
            if (this.parent && this.parent.needTransform) {
                if (this.needLocalTransform) {
                    matrix.mul(this.transform, this.parent.transform, this.transform);
                } else {
                    matrix.copy(this.transform, this.parent.transform);
                }
            }
        },
        /**
         * 将自己的transform应用到context上
         * @param {Context2D} ctx
         */
        setTransform: function(ctx) {
            if (this.needTransform) {
                var m = this.transform;
                ctx.transform(
                    m[0], m[1],
                    m[2], m[3],
                    m[4], m[5]
                );
            }
        }
    };

    return Transformable;
});