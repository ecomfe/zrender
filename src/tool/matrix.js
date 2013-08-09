/**
 * zrender: 3x2矩阵操作类
 *
 * author: lang(shenyi01@baidu.com)
 * code from mat2d in http://glmatrix.net/
 */

define(
    function() {

        var matrix = {
            create : function() {
                return [1, 0,
                        0, 1,
                        0, 0];
            },
            identity : function(out) {
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 1;
                out[4] = 0;
                out[5] = 0;
            },
            mul : function(out, m1, m2) {
               out[0] = m1[0] * m2[0] + m1[2] * m2[1];
               out[1] = m1[1] * m2[0] + m1[3] * m2[1];
               out[2] = m1[0] * m2[2] + m1[2] * m2[3];
               out[3] = m1[1] * m2[2] + m1[3] * m2[3];
               out[4] = m1[0] * m2[4] + m1[2] * m2[5] + m1[4];
               out[5] = m1[1] * m2[4] + m1[3] * m2[5] + m1[5];
               return out;
            },

            translate : function(out, a, v) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                out[4] = a[4] + v[0];
                out[5] = a[5] + v[1];
                return out;
            },
            rotate : function(out, a, rad) {
                var aa = a[0], ac = a[2], atx = a[4];
                var ab = a[1], ad = a[3], aty = a[5];
                var st = Math.sin(rad);
                var ct = Math.cos(rad);

                out[0] = aa*ct + ab*st;
                out[1] = -aa*st + ab*ct;
                out[2] = ac*ct + ad*st;
                out[3] = -ac*st + ct*ad;
                out[4] = ct*atx + st*aty;
                out[5] = ct*aty - st*atx;
                return out;
            },
            scale : function(out, a, v) {
                var vx = v[0], vy = v[1];
                out[0] = a[0] * vx;
                out[1] = a[1] * vy;
                out[2] = a[2] * vx;
                out[3] = a[3] * vy;
                out[4] = a[4] * vx;
                out[5] = a[5] * vy;
                return out;
            },
            /**
             * 求逆矩阵
             */
            invert : function(out, a) {
            
                var aa = a[0], ac = a[2], atx = a[4];
                var ab = a[1], ad = a[3], aty = a[5];

                var det = aa * ad - ab * ac;
                if(!det){
                    return null;
                }
                det = 1.0 / det;

                out[0] = ad * det;
                out[1] = -ab * det;
                out[2] = -ac * det;
                out[3] = aa * det;
                out[4] = (ac * aty - ad * atx) * det;
                out[5] = (ab * atx - aa * aty) * det;
                return out;
            },

            /**
             * 矩阵左乘向量
             */
            mulVector : function(out, a, v) {
                var aa = a[0], ac = a[2], atx = a[4];
                var ab = a[1], ad = a[3], aty = a[5];

                out[0] = v[0] * aa + v[1] * ac + atx;
                out[1] = v[0] * ab + v[1] * ad + aty;

                return out;
            }
        };

        return matrix;
    }
);