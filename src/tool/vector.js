/**
 * zrender: 向量操作类
 *
 * author : lang(shenyi01@baidu.com)
 */
define(
    function() {
        var ArrayCtor
            = typeof Float32Array === 'undefined'
            ? Array
            : Float32Array;
        var vector = {
            create : function(x, y) {
                var out = new ArrayCtor(2);
                out[0] = x || 0;
                out[1] = y || 0;
                return out;
            },
            copy : function(out, v) {
                out[0] = v[0];
                out[1] = v[1];
            },
            set : function(out, a, b) {
                out[0] = a;
                out[1] = b;
            },
            add : function(out, v1, v2) {
                out[0] = v1[0] + v2[0];
                out[1] = v1[1] + v2[1];
                return out;
            },
            scaleAndAdd : function(out, v1, v2, a) {
                out[0] = v1[0] + v2[0] * a;
                out[1] = v1[1] + v2[1] * a;
                return out;
            },
            sub : function(out, v1, v2) {
                out[0] = v1[0] - v2[0];
                out[1] = v1[1] - v2[1];
                return out;
            },
            length : function(v) {
                return Math.sqrt(this.lengthSquare(v));
            },
            lengthSquare : function(v) {
                return v[0] * v[0] + v[1] * v[1];
            },
            mul : function(out, v1, v2) {
                out[0] = v1[0] * v2[0];
                out[1] = v1[1] * v2[1];
                return out;
            },
            dot : function(v1, v2) {
                return v1[0] * v2[0] + v1[1] * v2[1];
            },
            scale : function(out, v, s) {
                out[0] = v[0] * s;
                out[1] = v[1] * s;
                return out;
            },
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
            distance : function(v1, v2) {
                return Math.sqrt(
                    (v1[0] - v2[0]) * (v1[0] - v2[0]) +
                    (v1[1] - v2[1]) * (v1[1] - v2[1])
                );
            },
            negate : function(out, v) {
                out[0] = -v[0];
                out[1] = -v[1];
            },
            middle : function(out, v1, v2) {
                out[0] = (v1[0] + v2[0])/2;
                out[1] = (v1[1] + v2[1])/2;
                return out;
            }
        };

        return vector;
    }
);