/*
 * zrender
 * Copyright 2012 Baidu Inc. All rights reserved.
 * 
 * desc:    zrender是一个Canvas绘图类库，mvc封装实现数据驱动绘图，图形事件封装
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 * 
 * shape级特性：
 * hoverable : 可悬浮响应，默认为true，默认悬浮响应为高亮显示，可在onbrush中捕获改变
 * clickable : 可点击鼠标样式，默认为false，仅影响鼠标hover时图标是否为可点击样式，不阻断点击行为，可在onclick中捕获改变
 * draggable : 可拖拽响应，默认为false，默认拖拽响应改变图形位置，可在ondrift中捕获改变
 * 
 */
define(
    function(require) {    //shape:形状，元件
        var self = {};
        
        var _shapeLibrary = {};     //shape库
        
        /**
         * 定义图形实现
         * @param {Object} name
         * @param {Object} clazz 图形实现
         */
        self.define = function(name, clazz) {
            _shapeLibrary[name] = clazz;
            return self;
        }
        
        /**
         * 获取图形实现 
         * @param {Object} name
         */
        self.get = function(name) {
            return _shapeLibrary[name];
        }    
        
        // 内置图形实例化后注册
        
        var Circle = require('./shape/circle');
        self.define('circle', new Circle());
        
        var Line = require('./shape/line');
        self.define('line', new Line());
        
        var Polygon = require('./shape/polygon');
        self.define('polygon', new Polygon());
        
        var BrokenLine = require('./shape/brokenLine');
        self.define('brokenLine', new BrokenLine());
        
        var Rectangle = require('./shape/rectangle');
        self.define('rectangle', new Rectangle());
        
        var Ring = require('./shape/ring');
        self.define('ring', new Ring());
        
        var Sector = require('./shape/sector');
        self.define('sector', new Sector());
        
        var Text = require('./shape/text');
        self.define('text', new Text());
        
        var Path = require('./shape/path');
        self.define('path', new Path());

        return self;
    }
); 