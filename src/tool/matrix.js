/**
 * zrender : 3x3矩阵操作类
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * author: lang(shenyi01@baidu.com)
 * 
 * Code is mainly from gl-matrix
 */

define(
	function(require){

		var matrix = {
			create : function(){
				return [1, 0, 
						0, 1, 
						0, 0];
			},
			identity : function(out){
				out[0] = 1;
				out[1] = 0;
				out[2] = 0;
				out[3] = 1;
				out[4] = 0;
				out[5] = 0;
			},
			/**
			 * Multiplication of 3x2 matrix
			 *	a	c	e
			 *	b	d	f
			 *	0	0	1
			 */
			mul : function(out, m1, m2){
			   out[0] = m1[0] * m2[0] + m1[2] * m2[1];
			   out[1] = m1[1] * m2[0] + m1[3] * m2[1];
			   out[2] = m1[0] * m2[2] + m1[2] * m2[3];
			   out[3] = m1[1] * m2[2] + m1[3] * m2[3];
			   out[4] = m1[0] * m2[4] + m1[2] * m2[5] + m1[4];
			   out[5] = m1[1] * m2[4] + m1[3] * m2[5] + m1[5];
			   return out;
			},

			translate : function(out, a, v){
				out[0] = a[0];
			    out[1] = a[1];
			    out[2] = a[2];
			    out[3] = a[3];
			    out[4] = a[4] + v[0];
			    out[5] = a[5] + v[1];
			    return out;	
			},
			rotate : function(out, a, rad){
				var aa = a[0],
			        ab = a[1],
			        ac = a[2],
			        ad = a[3],
			        atx = a[4],
			        aty = a[5],
			        st = Math.sin(rad),
			        ct = Math.cos(rad);

			    out[0] = aa*ct + ab*st;
			    out[1] = -aa*st + ab*ct;
			    out[2] = ac*ct + ad*st;
			    out[3] = -ac*st + ct*ad;
			    out[4] = ct*atx + st*aty;
			    out[5] = ct*aty - st*atx;
			    return out;
			},
			scale : function(out, a, v){
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
 			 * http://code.google.com/p/webglsamples/source/browse/tdl/math.js
			 */
			inverse : function(out, m){
				var t00 = m[1*3+1] * m[2*3+2] - m[1*3+2] * m[2*3+1],
					t10 = m[0*3+1] * m[2*3+2] - m[0*3+2] * m[2*3+1],
					t20 = m[0*3+1] * m[1*3+2] - m[0*3+2] * m[1*3+1],
				d = 1.0 / (m[0*3+0] * t00 - m[1*3+0] * t10 + m[2*3+0] * t20);
				out[0] = d * t00;
				out[1] = -d * t10;
				out[2] = d * t20;
				out[3] = -d * (m[1*3+0] * m[2*3+2] - m[1*3+2] * m[2*3+0]);
				out[4] = d * (m[0*3+0] * m[2*3+2] - m[0*3+2] * m[2*3+0]);
				out[5] = -d * (m[0*3+0] * m[1*3+2] - m[0*3+2] * m[1*3+0]);
				out[6] = d * (m[1*3+0] * m[2*3+1] - m[1*3+1] * m[2*3+0]);
				out[7] = -d * (m[0*3+0] * m[2*3+1] - m[0*3+1] * m[2*3+0]);
				out[8] = d * (m[0*3+0] * m[1*3+1] - m[0*3+1] * m[1*3+0]);

				return out;
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
			mulVector : function(out, m, v){
				for(var i =0; i < 3; i++){
					out[i] = v[0]*m[i]+v[1]*m[i+3]+v[2]*m[i+6];
				}
				return out;
			}
		}

		return matrix;
	}
)