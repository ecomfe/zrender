define(
    function() {
        var ArrayCtor = typeof Float32Array === 'undefined'
            ? Array
            : Float32Array;
        /**
         * 二维向量类
         * @exports zrender/tool/vector
         */
        var vector = {
            /**
             * 创建一个向量
             * @param {number} [x=0]
             * @param {number} [y=0]
             * @return {Float32Array|Array.<number>}
             */
            create : function(x, y) {
                var out = new ArrayCtor(2);
                out[0] = x || 0;
                out[1] = y || 0;
                return out;
            },
            /**
             * 复制一个向量
             * @return {Float32Array|Array.<number>} out
             * @return {Float32Array|Array.<number>} v
             */
            copy : function(out, v) {
                out[0] = v[0];
                out[1] = v[1];
                return out;
            },
            /**
             * 设置向量的两个项
             * @return {Float32Array|Array.<number>} out
             * @param {number} x
             * @param {number} y
             */
            set : function(out, a, b) {
                out[0] = a;
                out[1] = b;
                return out;
            },
            /**
             * 向量相加
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} v1
             * @param {Float32Array|Array.<number>} v2
             */
            add : function(out, v1, v2) {
                out[0] = v1[0] + v2[0];
                out[1] = v1[1] + v2[1];
                return out;
            },
            /**
             * 向量缩放后相加
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} v1
             * @param {Float32Array|Array.<number>} v2
             * @param {number} a
             */
            scaleAndAdd : function(out, v1, v2, a) {
                out[0] = v1[0] + v2[0] * a;
                out[1] = v1[1] + v2[1] * a;
                return out;
            },
            /**
             * 向量相减
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} v1
             * @param {Float32Array|Array.<number>} v2
             */
            sub : function(out, v1, v2) {
                out[0] = v1[0] - v2[0];
                out[1] = v1[1] - v2[1];
                return out;
            },
            /**
             * 向量长度
             * @param {Float32Array|Array.<number>} v
             * @return {number}
             */
            len : function(v) {
                return Math.sqrt(this.lenSquare(v));
            },
            /**
             * 向量长度平方
             * @param {Float32Array|Array.<number>} v
             * @return {number}
             */
            lenSquare : function(v) {
                return v[0] * v[0] + v[1] * v[1];
            },
            /**
             * 向量乘法
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} v1
             * @param {Float32Array|Array.<number>} v2
             */
            mul : function(out, v1, v2) {
                out[0] = v1[0] * v2[0];
                out[1] = v1[1] * v2[1];
                return out;
            },
            /**
             * 向量除法
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} v1
             * @param {Float32Array|Array.<number>} v2
             */
            div : function(out, v1, v2) {
                out[0] = v1[0] / v2[0];
                out[1] = v1[1] / v2[1];
                return out;
            },
            /**
             * 向量点乘
             * @param {Float32Array|Array.<number>} v1
             * @param {Float32Array|Array.<number>} v2
             * @return {number}
             */
            dot : function(v1, v2) {
                return v1[0] * v2[0] + v1[1] * v2[1];
            },
            /**
             * 向量缩放
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} v
             * @param {number} s
             */
            scale : function(out, v, s) {
                out[0] = v[0] * s;
                out[1] = v[1] * s;
                return out;
            },
            /**
             * 向量归一化
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} v1
             */
            normalize : function(out, v) {
                var d = vector.length(v);
                if(d === 0){
                    out[0] = 0;
                    out[1] = 0;
                }else{
                    out[0] = v[0]/d;
                    out[1] = v[1]/d;
                }
                return out;
            },
            /**
             * 计算向量间距离
             * @param {Float32Array|Array.<number>} v1
             * @param {Float32Array|Array.<number>} v2
             * @return {number}
             */
            distance : function(v1, v2) {
                return Math.sqrt(
                    (v1[0] - v2[0]) * (v1[0] - v2[0]) +
                    (v1[1] - v2[1]) * (v1[1] - v2[1])
                );
            },
            /**
             * 求负向量
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} v
             */
            negate : function(out, v) {
                out[0] = -v[0];
                out[1] = -v[1];
            },
            /**
             * 计算两个点的中间点
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} v1
             * @param {Float32Array|Array.<number>} v2
             */
            middle : function(out, v1, v2) {
                out[0] = (v1[0] + v2[0]) / 2;
                out[1] = (v1[1] + v2[1]) / 2;
                return out;
            },
            /**
             * 矩阵左乘向量
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} v
             * @param {Float32Array|Array.<number>} m
             */
            applyTransform: function(out, v, m) {
                var x = v[0];
                var y = v[1];
                out[0] = m[0] * x + m[2] * y + m[4];
                out[1] = m[1] * x + m[3] * y + m[5];
                return out;
            }
        };

        vector.dist = vector.distance;

        return vector;
    }
);