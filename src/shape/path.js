/*
 * zrender
 * Copyright 2012 Baidu Inc. All rights reserved.
 * 
 * desc:    zrender是一个Canvas绘图类库，mvc封装实现数据驱动绘图，图形事件封装
 * author:  CrossDo (@CrossDo-chenhuaimu@baidu.com)
 * 
 * shape类：路径
 * 可配图形属性：
   {   
       // 基础属性
       shape  : 'path',         // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见
       
       // 样式属性，默认状态样式样式属性
       style  : {
           path          : {string},  // 必须，路径。例如:M 0 0 L 0 10 L 10 10 Z (一个三角形)
                                    //M = moveto
                                    //L = lineto
                                    //H = horizontal lineto
                                    //V = vertical lineto
                                    //C = curveto
                                    //S = smooth curveto
                                    //Q = quadratic Belzier curve
                                    //T = smooth quadratic Belzier curveto
                                    //Z = closepath


           x             : {number},  // 必须，x轴坐标
           y             : {number},  // 必须，y轴坐标


           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效
           
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           
           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本文字样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle | 
                                      // alphabetic | hanging | ideographic 
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // textPosition == 'inside' ? '#fff' : color
       },
       
       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }
       
       // 交互属性，详见shape.Base
       
       // 事件属性，详见shape.Base
   }
        
 */
define(
    function(require) {
        function Path() {
            this.type = 'path';
        }

        
        Path.prototype = {

            _parsePathData : function(data) {
        
              if(!data) {
                  return [];
              }

              // command string
              var cs = data;

              // command chars
              var cc = ['m', 'M', 'l', 'L', 'v', 'V', 'h', 'H', 'z', 'Z', 'c', 'C', 'q', 'Q', 't', 'T', 's', 'S', 'a', 'A'];
              // convert white spaces to commas
              cs = cs.replace(new RegExp('  ', 'g'), ' ');
              cs = cs.replace(new RegExp(' ', 'g'), ',');
              // create pipes so that we can split the data
              for(var n = 0; n < cc.length; n++) {
                  cs = cs.replace(new RegExp(cc[n], 'g'), '|' + cc[n]);
              }
              // create array
              var arr = cs.split('|');
              var ca = [];
              // init context point
              var cpx = 0;
              var cpy = 0;
              for(var n = 1; n < arr.length; n++) {
                  var str = arr[n];
                  var c = str.charAt(0);
                  str = str.slice(1);
                  // remove ,- for consistency
                  str = str.replace(new RegExp(',-', 'g'), '-');
                  // add commas so that it's easy to split
                  str = str.replace(new RegExp('-', 'g'), ',-');
                  str = str.replace(new RegExp('e,-', 'g'), 'e-');
                  var p = str.split(',');
                  if(p.length > 0 && p[0] === '') {
                      p.shift();
                  }
                  // convert strings to floats
                  for(var i = 0; i < p.length; i++) {
                      p[i] = parseFloat(p[i]);
                  }
                  while(p.length > 0) {
                      if(isNaN(p[0]))// case for a trailing comma before next command
                          break;

                      var cmd = null;
                      var points = [];
                      var startX = cpx, startY = cpy;

                      // convert l, H, h, V, and v to L
                      switch (c) {

                          // Note: Keep the lineTo's above the moveTo's in this switch
                          case 'l':
                              cpx += p.shift();
                              cpy += p.shift();
                              cmd = 'L';
                              points.push(cpx, cpy);
                              break;
                          case 'L':
                              cpx = p.shift();
                              cpy = p.shift();
                              points.push(cpx, cpy);
                              break;

                          // Note: lineTo handlers need to be above this point
                          case 'm':
                              cpx += p.shift();
                              cpy += p.shift();
                              cmd = 'M';
                              points.push(cpx, cpy);
                              c = 'l';
                              // subsequent points are treated as relative lineTo
                              break;
                          case 'M':
                              cpx = p.shift();
                              cpy = p.shift();
                              cmd = 'M';
                              points.push(cpx, cpy);
                              c = 'L';
                              // subsequent points are treated as absolute lineTo
                              break;

                          case 'h':
                              cpx += p.shift();
                              cmd = 'L';
                              points.push(cpx, cpy);
                              break;
                          case 'H':
                              cpx = p.shift();
                              cmd = 'L';
                              points.push(cpx, cpy);
                              break;
                          case 'v':
                              cpy += p.shift();
                              cmd = 'L';
                              points.push(cpx, cpy);
                              break;
                          case 'V':
                              cpy = p.shift();
                              cmd = 'L';
                              points.push(cpx, cpy);
                              break;
                          case 'C':
                              points.push(p.shift(), p.shift(), p.shift(), p.shift());
                              cpx = p.shift();
                              cpy = p.shift();
                              points.push(cpx, cpy);
                              break;
                          case 'c':
                              points.push(cpx + p.shift(), cpy + p.shift(), cpx + p.shift(), cpy + p.shift());
                              cpx += p.shift();
                              cpy += p.shift();
                              cmd = 'C';
                              points.push(cpx, cpy);
                              break;
                          case 'S':
                              var ctlPtx = cpx, ctlPty = cpy;
                              var prevCmd = ca[ca.length - 1];
                              if(prevCmd.command === 'C') {
                                  ctlPtx = cpx + (cpx - prevCmd.points[2]);
                                  ctlPty = cpy + (cpy - prevCmd.points[3]);
                              }
                              points.push(ctlPtx, ctlPty, p.shift(), p.shift());
                              cpx = p.shift();
                              cpy = p.shift();
                              cmd = 'C';
                              points.push(cpx, cpy);
                              break;
                          case 's':
                              var ctlPtx = cpx, ctlPty = cpy;
                              var prevCmd = ca[ca.length - 1];
                              if(prevCmd.command === 'C') {
                                  ctlPtx = cpx + (cpx - prevCmd.points[2]);
                                  ctlPty = cpy + (cpy - prevCmd.points[3]);
                              }
                              points.push(ctlPtx, ctlPty, cpx + p.shift(), cpy + p.shift());
                              cpx += p.shift();
                              cpy += p.shift();
                              cmd = 'C';
                              points.push(cpx, cpy);
                              break;
                          case 'Q':
                              points.push(p.shift(), p.shift());
                              cpx = p.shift();
                              cpy = p.shift();
                              points.push(cpx, cpy);
                              break;
                          case 'q':
                              points.push(cpx + p.shift(), cpy + p.shift());
                              cpx += p.shift();
                              cpy += p.shift();
                              cmd = 'Q';
                              points.push(cpx, cpy);
                              break;
                          case 'T':
                              var ctlPtx = cpx, ctlPty = cpy;
                              var prevCmd = ca[ca.length - 1];
                              if(prevCmd.command === 'Q') {
                                  ctlPtx = cpx + (cpx - prevCmd.points[0]);
                                  ctlPty = cpy + (cpy - prevCmd.points[1]);
                              }
                              cpx = p.shift();
                              cpy = p.shift();
                              cmd = 'Q';
                              points.push(ctlPtx, ctlPty, cpx, cpy);
                              break;
                          case 't':
                              var ctlPtx = cpx, ctlPty = cpy;
                              var prevCmd = ca[ca.length - 1];
                              if(prevCmd.command === 'Q') {
                                  ctlPtx = cpx + (cpx - prevCmd.points[0]);
                                  ctlPty = cpy + (cpy - prevCmd.points[1]);
                              }
                              cpx += p.shift();
                              cpy += p.shift();
                              cmd = 'Q';
                              points.push(ctlPtx, ctlPty, cpx, cpy);
                              break;
                        
                      }

                      ca.push({
                          command: cmd || c,
                          points: points
                      });
                  }

                  if(c === 'z' || c === 'Z') {
                      ca.push({
                          command: 'z',
                          points: []
                      });
                  }
              }

              return ca;

            },

            /**
             * 创建路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                var path = style.path;
                
                var pathArray = this._parsePathData(path);

                for(var i = 0; i < pathArray.length; i++) {
                    var c = pathArray[i].command;
                    var p = pathArray[i].points;
                    //平移变换
                    for(var j=0; j<p.length; j++){
                        if(j%2 == 0){
                          p[j] += style.x;
                        }else{
                          p[j] += style.y;
                        }
                    }
                    switch (c) {
                        case 'L':
                            ctx.lineTo(p[0], p[1]);
                            break;
                        case 'M':
                            ctx.moveTo(p[0], p[1]);
                            break;
                        case 'C':
                            ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
                            break;
                        case 'Q':
                            ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
                            break;
                    
                        case 'z':
                            ctx.closePath();
                            break;
                    }
                 }

                return;
            },
            
            /**
             * 附加文本
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             * @depend this.findPoint
             */
            drawText : function(ctx, style) {
                ctx.fillStyle = style.textColor;
                
                var al;         // 文本水平对齐
                var bl;         // 文本垂直对齐
                var tx;         // 文本横坐标
                var ty;         // 文本纵坐标
                var dd = 10;    // 文本与图形间空白间隙


                var rect = this.getRect(style);

                var width =  rect.width;
                var height = rect.height;
                switch (style.textPosition) {
                    case "inside":
                        tx = style.x + width / 2;
                        ty = style.y + height / 2;
                        al = 'center';
                        bl = 'middle';
                        if (style.brushType != 'stroke') {
                            ctx.fillStyle = '#fff';
                        }
                        break;
                    case "left":
                        tx = style.x - dd;
                        ty = style.y + height / 2;
                        al = 'end';
                        bl = 'middle';
                        break;
                    case "right":
                        tx = style.x + dd;
                        ty = style.y + height / 2;
                        al = 'start';
                        bl = 'middle';
                        break;
                    case "bottom":
                        tx = style.x + width / 2;
                        ty = style.y + height + dd;
                        al = 'center';
                        bl = 'top';
                        break;
                    case "top":
                    default:
                        tx = style.x + width / 2;
                        ty = style.y - dd;
                        al = 'center';
                        bl = 'bottom';
                        break;
                }
                
                if (style.textFont) {
                    ctx.font = style.textFont;
                }
                ctx.textAlign = style.textAlign || al;
                ctx.textBaseline = style.textBaseLine || bl;
                
                ctx.fillText(style.text, tx, ty);
            },
            
       
            
            /**
             * 偏移，重载基类方法
             * @param e 实体
             * @param dx 横坐标变化
             * @param dy 纵坐标变化
             */
            drift : function(e, dx, dy){
                 e.style.x += dx;
                 e.style.y += dy;
            },

            /**
             * 获得路径的矩形区域
             * @param {Object} style 样式
             */
            getRect : function(style){
               var rect = new Object();
               rect.x = style.x;
               rect.y = style.y;

               var minX =  Number.MAX_VALUE;
               var maxX =  Number.MIN_VALUE;

               var minY = Number.MAX_VALUE;
               var maxY = Number.MIN_VALUE;

               var pathArray = this._parsePathData(style.path);
               for(var i = 0; i < pathArray.length; i++) {
                    var p = pathArray[i].points;
               
                    for(var j=0; j<p.length; j++){
                        if(j%2 == 0){
                          if(p[j] < minX){
                            minX = p[j];
                          }
                          if(p[j] > maxX){
                            maxX = p[j];
                          }
                        }else{
                          if(p[j] < minY){
                            minY = p[j];
                          }
                          if(p[j] > maxY){
                            maxY = p[j];
                          }
                        }
                    }
               }
               if(minX==Number.MAX_VALUE || maxX ==  Number.MIN_VALUE 
                || minY == Number.MAX_VALUE || maxY == Number.MIN_VALUE){
                  rect.width = 0;
                  rect.height = 0;
               } else {
                  rect.width = maxX - minX + Math.abs(minX);
                  rect.height = maxY - minY + Math.abs(minY);
               }
               
               return rect;
            }
        }
        
        var base = require('./base');
            base.derive(Path);
            
        return Path;
    }
);