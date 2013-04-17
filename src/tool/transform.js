/**
 * zrender : 为shaper提供平移，旋转等变换
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * author : lang(shenyi01@baidu.com)
 * 
 * 暂时没用到
 * 下面的代码因为都是函数形式，无法用到modShape里，有待斟酌
 * 这样就需要每次refresh的时候updateTransform了
 */
define(
	function(require){
		var Matrix = require('./matrix'),
            Vector = require('./vector');

        var Transform = {
        	_dirtyTransform : true,
            

            // // 平移变换
            // translate : function(pos){
            //     if( ! this.position){
            //         this.position = [0, 0];
            //     }
            //     this.position[0] = pos[0];
            //     this.position[1] = pos[1];

            //     this._dirtyTransform = true;
            // },
            // // 旋转变换
            // rotate : function(angle){
            //     this.rotation = angle;

            //     this._dirtyTransform = true;
            // },
            // // 缩放变换
            // scale : function(v){
            //     if( ! this.position){
            //         this.position = [0, 0];
            //     }
            //     this.scalation

            //     this._dirtyTransform = true;
            // },
            // transform : function(m){
            // 	if( typeof m === "undefined"){
	           //  	if( this._dirtyTransform){
	           //  		return this._updateTransorm();
	           //  	}else{
	           //  		return this._transform;
	           //  	}	
            // 	}else{
            // 		this._transform = m;
            // 	}
            // },
            updateTransform : function(){
                var _transform = Matrix.identity();
                if( this.scalation){
                    _transform = Matrix.scale( _transform, this.scalation );
                }
                if( this.rotation ){
                    _transform = Matrix.rotate( _transform, this.rotation );
                }
                if( this.position)
                    _transform = Matrix.translate(_transform, this.position);
                this._transform = _transform;

                this._dirtyTransform = false;
                return _transform;
            }
        }
        return Transform;
	}
)