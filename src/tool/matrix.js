/**
 * 3x3矩阵操作类
 * author: lang(shenyi01@baidu.com)
 */
define(
	function(require){

		var Matrix = {
			identity : function(){
				return [1, 0, 
						0, 1, 
						0, 0];
			},
			/**
			 * Multiplication of 3x2 matrix
			 *	a	c	e
			 *	b	d	f
			 *	0	0	1
			 */
			mul : function(m1, m2){
				return [
			      m1[0] * m2[0] + m1[2] * m2[1],
			      m1[1] * m2[0] + m1[3] * m2[1],
			      m1[0] * m2[2] + m1[2] * m2[3],
			      m1[1] * m2[2] + m1[3] * m2[3],
			      m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
			      m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
			   ];
			},

			translate : function(m, v){
				return Matrix.mul([1, 0, 0, 1, v[0], v[1]], m);	
			},

			rotate : function(m, angle){
				var sin = Math.sin(angle),
					cos = Math.cos(angle);
				return Matrix.mul([cos, sin, -sin, cos, 0, 0], m);
			},
			scale : function(m, v){
				return Matrix.mul([v[0], 0, 0, v[1], 0, 0], m);
			},
			/**
			 * 求逆矩阵
 			 * http://code.google.com/p/webglsamples/source/browse/tdl/math.js
			 */
			inverse : function(m){
				var t00 = m[1*3+1] * m[2*3+2] - m[1*3+2] * m[2*3+1],
					t10 = m[0*3+1] * m[2*3+2] - m[0*3+2] * m[2*3+1],
					t20 = m[0*3+1] * m[1*3+2] - m[0*3+2] * m[1*3+1],
					d = 1.0 / (m[0*3+0] * t00 - m[1*3+0] * t10 + m[2*3+0] * t20);
				return [ d * t00, -d * t10, d * t20,
						-d * (m[1*3+0] * m[2*3+2] - m[1*3+2] * m[2*3+0]),
						d * (m[0*3+0] * m[2*3+2] - m[0*3+2] * m[2*3+0]),
						-d * (m[0*3+0] * m[1*3+2] - m[0*3+2] * m[1*3+0]),
						d * (m[1*3+0] * m[2*3+1] - m[1*3+1] * m[2*3+0]),
						-d * (m[0*3+0] * m[2*3+1] - m[0*3+1] * m[2*3+0]),
						d * (m[0*3+0] * m[1*3+1] - m[0*3+1] * m[1*3+0])];
			},

			/**
			 * Expand a 3x2 matrix to 3x3
			 *	a	c	e
			 *	b	d	f
			 *	0	0	1
			 * http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#transformations
			 */
			expand : function(m){
				return [
					m[0], m[1], 0, 
					m[2], m[3], 0, 
					m[4], m[5], 1
				]
			},

			// 矩阵左乘
			mulVector : function(m, v){
				var r = [];
				for(var i =0; i < 3; i++){
					r[i] = v[0]*m[i]+v[1]*m[i+3]+v[2]*m[i+6];
				}
				return r;
			}
		}

		return Matrix;
	}
)