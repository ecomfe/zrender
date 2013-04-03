/*
 * zrender
 * Copyright 2012 Baidu Inc. All rights reserved.
 * 
 * desc:    zrender是一个Canvas绘图类库，mvc封装实现数据驱动绘图，图形事件封装
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 * 
 * shape级特性：
 * hoverable : 可悬浮响应，默认为true
 * clickable : 可点击响应，默认为false
 * draggable  : 可拖拽响应，默认为false
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
        
        return self;
    }
); 