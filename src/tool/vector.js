/**
 * zrender: 向量操作类
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * author : lang(shenyi01@baidu.com)
 *
 */
define(
    function() {
       var vector = {
            add : function(out, v1, v2) {
                out[0] = v1[0]+v2[0];
                out[1] = v1[1]+v2[1];
                return out;
            },
            sub : function(out, v1, v2) {
                out[0] = v1[0]-v2[0];
                out[1] = v1[1]-v2[1];
                return out;
            },
            length : function(v) {
                return Math.sqrt( this.magSquare(v) );
            },
            lengthSquare : function(v) {
                return v[0]*v[0]+v[1]*v[1];
            },
            mul : function(out, v1, v2) {
                out[0] = v1[0]*v2[0];
                out[1] = v1[1]*v2[1];
                return out;
            },
            dot : function(v1, v2) {
                return v1[0]*v2[0]+v1[1]*v2[1];
            },
            scale : function(out, v, s) {
                out[0] = v[0]*s;
                out[1] = v[1]*s;
                return out;
            },
            normalize : function(out, v) {
                var d = vector.length(v);
                out[0] = v[0]/d;
                out[1] = v[1]/d;
                return out;
            },
            distance : function( v1, v2 ) {
                var out = [];
                return vector.length( vector.sub(out, v1, v2) );
            },
            middle : function(out, v1, v2) {
                out[0] = (v1[0]+v2[0])/2;
                out[1] = (v1[1]+v2[1])/2;
                return out;
            },
            expand : function(v) {
                return [v[0], v[1], 1];
            }
        };

        return vector;
    }
);