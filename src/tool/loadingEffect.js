/**
 * zrender : loading特效
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 * 
 * 扩展loading effect： 
 * getBackgroundShape：获取背景图形
 * getTextShape：获取文字
 * define : 定义效果
 * 
 * 内置效果
 * progressBar：进度条
 * dynamicLine：动态线条
 * bubble：气泡
 */
define(
    function(require) {
        var self;
        var _defaultText = 'Loading...'
        var _defaultTextFont = 'normal 20px Arial';
        
        function define(name, fun) {
            self[name] = fun;
        }
        
        function getTextShape(width, height, color, textStyle) {
            var util = require('./util');
            return {
                shape : 'text',
                highlightStyle : util.merge(
                    {
                        x : width / 2,
                        y : height / 2,
                        text : _defaultText,
                        textAlign : 'center',
                        textBaseline : 'middle',
                        textFont : _defaultTextFont,
                        color: color,
                        brushType : 'fill'
                    },
                    textStyle,
                    {'overwrite': true, 'recursive': true}
                )
            };
        }
        
        function getBackgroundShape (width, height, color) {
            return {
                shape : 'rectangle',
                highlightStyle : {
                    x : 0,
                    y : 0,
                    width : width,
                    height : height,
                    brushType : 'fill',
                    color : color
                }
            }
        }
        
        function progressBar(textStyle, canvasSize, addShapeHandle, refreshHandle) {
            var width = canvasSize.width;
            var height = canvasSize.height;
            
            var textShape = getTextShape(
                width, height, '#888' , textStyle || {}
            );
            
            var background = getBackgroundShape(
                width, height, 'rgba(250, 250, 250, 0.8)'
            );
            
            var barShape;
            var pos;
            var len;
            var xStart;
            // 初始化动画元素
            barShape = {
                shape : 'rectangle',
                highlightStyle : {
                    x : width / 3,
                    y : height / 2 - 30,
                    width : 0,
                    height : 15,
                    brushType : 'fill',
                    color :  'rgba(135, 206, 250, 1)'
                }
            };
            
            return setInterval(
                function() {
                    addShapeHandle(background);
                    if (barShape.highlightStyle.width < width / 3) {
                        barShape.highlightStyle.width += 8;
                    }
                    else {
                        barShape.highlightStyle.width = 0;
                    }
                    addShapeHandle(barShape);
                    addShapeHandle(textShape)
                    refreshHandle();
                }, 
                100
            )
        }
         
        function dynamicLine(textStyle, canvasSize, addShapeHandle, refreshHandle) {
            var width = canvasSize.width;
            var height = canvasSize.height;
            
            var hasColor = typeof (textStyle || {}).color != 'undefined';
            var textShape = getTextShape(
                width, height, '#fff' , textStyle || {}
            );
            
            var background = getBackgroundShape(
                width, height, 'rgba(50, 50, 50, 0.8)'
            );
            
            var n = 20;
            var shapeList = [];
            var pos;
            var len;
            var xStart;
            // 初始化动画元素
            for(var i = 0; i < n; i++) {
                xStart = -Math.ceil(Math.random() * 1000);
                len = Math.ceil(Math.random() * 400);
                pos = Math.ceil(Math.random() * 20) + height / 2 - 50;
                shapeList[i] = {
                    shape : 'line',
                    style : {
                        xStart : xStart,
                        yStart : pos,
                        xEnd : xStart + len,
                        yEnd : pos,
                        strokeColor : 'rgba(' 
                                + Math.round(Math.random() * 156 + 100) + ',' 
                                + Math.round(Math.random() * 156 + 100) + ',' 
                                + Math.round(Math.random() * 156 + 100) + ', 1)',
                        lineWidth : 1
                    },
                    animationX : Math.ceil(Math.random() * 50),
                    len : len
                };
            }
            
            return setInterval(
                function() {
                    addShapeHandle(background);
                    var style;
                    for(var i = 0; i < n; i++) {
                        style = shapeList[i].style;
                        
                        if (style.xStart >= width){
                            shapeList[i].len = Math.ceil(Math.random() * 400);
                            shapeList[i].style.xStart = -400;
                            shapeList[i].style.xEnd = -400 + shapeList[i].len;
                            shapeList[i].style.yStart = Math.ceil(Math.random() * 20) 
                                                         + height / 2 - 50;;
                            shapeList[i].style.yEnd = shapeList[i].style.yStart;
                        }
                        shapeList[i].style.xStart += shapeList[i].animationX;
                        shapeList[i].style.xEnd += shapeList[i].animationX;
                        
                        addShapeHandle(shapeList[i]);
                    }
                    if (!hasColor) {
                        textShape.highlightStyle.color = 'rgba(' 
                                + Math.round(Math.random() * 156 + 100) + ',' 
                                + Math.round(Math.random() * 156 + 100) + ',' 
                                + Math.round(Math.random() * 156 + 100) + ', 1)';
                    }
                    addShapeHandle(textShape)
                    refreshHandle();
                }, 
                100
            )
        }
        
        function bubble(textStyle, canvasSize, addShapeHandle, refreshHandle) {
            var util = require('./util');
            var width = canvasSize.width;
            var height = canvasSize.height;
            
            var hasColor = typeof (textStyle || {}).color != 'undefined';
            var textShape = getTextShape(
                width, height, '#888' , textStyle || {}
            );
            
            var background = getBackgroundShape(
                width, height, 'rgba(250,250,250, 0.8)'
            );
            
            var n = 50;
            var shapeList = [];
            
            // 初始化动画元素
            for(var i = 0; i < n; i++) {
                shapeList[i] = {
                    shape : 'circle',
                    style : {
                        x : Math.ceil(Math.random() * width),
                        y : Math.ceil(Math.random() * height),
                        r : Math.ceil(Math.random() * 40),
                        brushType : 'stroke',
                        strokeColor : 'rgba(' 
                                + Math.round(Math.random() * 256) + ',' 
                                + Math.round(Math.random() * 256) + ',' 
                                + Math.round(Math.random() * 256) + ', 0.3)',
                        lineWidth : 3
                    },
                    animationX : Math.ceil(Math.random() * 20),
                    animationY : Math.ceil(Math.random() * 20),
                    hoverable : false
                };
                if (shapeList[i].style.x < 100 
                    || shapeList[i].style.x > (width - 100)
                ) {
                    shapeList[i].style.x = width / 2;    
                }
                if (shapeList[i].style.y < 100 
                    || shapeList[i].style.y > (height - 100)
                ) {
                    shapeList[i].style.y = height / 2;    
                }
            }
            
            return setInterval(
                function () {
                    addShapeHandle(background);
                    var style;
                    for(var i = 0; i < n; i++) {
                        // 可以跳过
                        style = shapeList[i].style;
                        
                        if (style.y - shapeList[i].animationY + style.r <= 0){
                            shapeList[i].style.y = height + style.r;
                            shapeList[i].style.x = Math.ceil(Math.random() * width);
                        }
                        shapeList[i].style.y -= shapeList[i].animationY;
                        
                        addShapeHandle(shapeList[i]);
                    }
                    if (!hasColor) {
                        textShape.highlightStyle.color = 'rgba(' 
                                + Math.round(Math.random() * 256) + ',' 
                                + Math.round(Math.random() * 256) + ',' 
                                + Math.round(Math.random() * 256) + ', 0.8)';
                    }
                    addShapeHandle(textShape)
                    refreshHandle();
                }, 
                100
            )
        }
        
        self = {
            // 这三个方法用于扩展loading effect
            getBackgroundShape : getBackgroundShape,
            getTextShape : getTextShape,
            define : define,
            
            progressBar : progressBar,
            dynamicLine : dynamicLine,
            bubble : bubble
        };
        return self;
    }
);