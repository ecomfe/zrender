define(function(require) {

    var matrix = require('../../tool/matrix');
    var origin = [0, 0];

    var Transformable = function() {

        if (!this.position) {
            this.position = [0, 0];
        }
        if (typeof(this.rotation) == 'undefined') {
            this.rotation = [0, 0, 0];
        }
        if (!this.scale) {
            this.scale = [1, 1, 0, 0];
        }

        this.needLocalTransform = false;
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