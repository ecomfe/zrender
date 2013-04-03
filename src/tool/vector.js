/**
 * 向量操作类
 * author: lang(shenyi01@baidu.com)
 */
define(
    function(){
       var Vector = {
            add : function(v1, v2){
                return [v1[0]+v2[0], v1[1]+v2[1]];
            },
            sub : function(v1, v2){
                return [v1[0]-v2[0], v1[1]-v2[1]];
            },
            length : function(v){
                return Math.sqrt( this.magSquare(v) );
            },
            lengthSquare : function(v){
                return v[0]*v[0]+v[1]*v[1];
            },
            mul : function(v1, v2){
                return [v1[0]*v2[0], v1[1]*v2[1]];
            },
            dot : function(v1, v2){
                return v1[0]*v2[0]+v1[1]*v2[1];
            },
            scale : function(v, s){
                return [v[0]*s, v[1]*s];
            },
            normalize : function(v){
                var d = Vector.length(v);
                return [ v[0]/d, v[1]/d ];
            },
            distance : function( v1, v2 ){
                return Vector.length( Vector.sub(v1, v2) );
            },
            middle : function(v1, v2){
                return [(v1[0]+v2[0])/2,
                        (v1[1]+v2[1])/2];
            },
            expand : function(v){
                return [v[0], v[1], 1];
            }
        }

        return Vector;
    }
)