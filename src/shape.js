/**
 * zrender : shape仓库
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * desc:    zrender是一个轻量级的Canvas类库，MVC封装，数据驱动，提供类Dom事件模型。
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 *  
 */
define(
    function(require) {
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
        
        var Ellipse = require('./shape/ellipse');
        self.define('ellipse', new Ellipse());
        
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

        var Heart = require('./shape/heart');
        self.define('heart', new Heart());
        
        var Droplet = require('./shape/droplet');
        self.define('droplet', new Droplet());
        
        var Path = require('./shape/path');
        self.define('path', new Path());

        var ZImage = require('./shape/image');
        self.define('image', new ZImage() );
        
        return self;
    }
); 