/*
 * zrender
 * Copyright 2012 Baidu Inc. All rights reserved.
 * 
 * desc:    zrender是一个Canvas绘图类库，mvc封装实现数据驱动绘图，图形事件封装
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 * 
 * shape级特性：
 * hoverable ： 悬浮响应，默认为true
 * draggable ： 可拖拽，默认为false
 * 
 */
define(
    function(require) {
        /*
         * HTML5 Canvas for Internet Explorer! 
         * Modern browsers like Firefox, Safari, Chrome and Opera support 
         * the HTML5 canvas tag to allow 2D command-based drawing. 
         * ExplorerCanvas brings the same functionality to Internet Explorer. 
         * To use, web developers only need to include a single script tag 
         * in their existing web pages.
         * 
         * https://code.google.com/p/explorercanvas/
         * http://explorercanvas.googlecode.com/svn/trunk/excanvas.js
         */
        require( "js!./lib/excanvas.js" );
        if (document.createElement('canvas').getContext) {
            G_vmlCanvasManager = false;
        }
        
        var self = {};
        var zrender = self;     // 提供MVC内部反向使用静态方法；
        
        var _idx = 0;           //ZRender instance's id
        var _instances = {};    //ZRender实例map索引
        
        /**
         * zrender初始化
         * 不让外部直接new ZRender实例，为啥？不为啥，提供全局可控同时减少全局污染和降低命名冲突的风险！
         * 你想打开？看GOTO-1&GOTO-2
         * 
         * @param {HTMLElement} dom dom对象，偶懒，不帮你做document.getElementById了
         * @param {Object=} params 个性化参数，如自定义shape集合，带进来就好
         * 
         * @return {ZRender} ZRender实例
         */
        self.init = function(dom, params) { 
            var zi = new ZRender(++_idx + '', dom, params || {});
            _instances[_idx] = zi;
            return zi;
        };
        
        /**
         * zrender实例销毁，记在_instances里的索引也会删除了
         * 管生就得管死，可以通过zrender.dispose(zi)销毁指定ZRender实例
         * 当然也可以直接zi.dispose()自己销毁
         * 
         * @param {ZRender=} zi ZRender对象，不传则销毁全部
         */
        self.dispose = function(zi) {
            if (zi) {
                zi.dispose();
            }
            else {
                for (var z in _instances) {
                    _instances[z].dispose();
                }
                _instances = {};
            }
            return self;
        }
        
        /**
         * 获取zrender实例
         * 
         * @param {string} id ZRender对象索引
         */
        self.getInstance = function(id) {
            return _instances[id];
        }
        
        /**
         * 删除zrender实例，ZRender实例dispose时会调用，删除后getInstance则返回undefined
         * ps: 仅是删除，删除的实例不代表已经dispose了~~
         *     这是一个摆脱全局zrender.dispose()自动销毁的后门，take care of yourself~
         * 
         * @param {string} id ZRender对象索引
         */
        self.delInstance = function(id) {
            if (_instances[id]) {
                _instances[id] = null;  //只是对垃圾回收上的友好照顾，不写也大不了~
                delete _instances[id];
            }
            return self;
        }
        
        // 是否异常捕获
        self.catchBrushException = false;
        /**
         * debug日志选项：catchBrushException为true下有效
         * 0 : 不生成debug数据，发布用
         * 1 : 异常抛出，发布用
         * 2 : 控制台输出，调试用
         */
        self.debugMode = 1;
        self.log = function() {
            if (self.debugMode == 0) {
                return;
            }
            else if(self.debugMode == 1) {
                for (var k in arguments) {
                    throw new Error(arguments[k]);
                }
            } 
            else if (self.debugMode > 1) {
                for (var k in arguments) {
                    console.log(arguments[k]);
                }
            }
        
            return self;
        };
        
        /**
         * ZRender接口类，对外可用的所有接口都在这里！！
         * storage（M）、painter（V）、handler（C）为内部私有类，外部接口不可见 
         * 非get接口统一返回self支持链式调用~
         * 
         * @param {string} id 唯一标识
         * @param {HTMLElement} dom dom对象，偶懒，不帮你做document.getElementById
         * @param {Object=} params 个性化参数，如自定义shape集合，带进来就好
         * 
         * @return {ZRender} ZRender实例
         */
        function ZRender(id, dom, params) {
            var self = this;
            
            var shape = require('./shape');
            var shapeLibrary;
            
            if (typeof params.shape == 'undefined') {
                //默认图形库
                shapeLibrary = shape;
            }
            else {
                //自定义图形库，私有化，实例独占
                shapeLibrary = {};
                for (var s in params.shape) {
                    shapeLibrary[s] = params.shape[s];
                }
                shapeLibrary.get = function(name) {
                    return shapeLibrary[name] || shape.get(name);
                }
            }
             
            var storage = new Storage(shapeLibrary);
            var painter = new Painter(dom, storage, shapeLibrary);
            var handler = new Handler(dom, storage, painter, shapeLibrary);
            
            /**
             * 获取实例唯一标识 
             */
            self.getId = function() {
                return id;
            }
            
            /**
             * 添加形状 
             * @param {Object} shape 形状对象，可用属性全集，包含id用于索引，更新，删除等，详见各shape
             */
            self.addShape = function(shape) {
                storage.add(shape);
                return self;
            }
            
            /**
             * 删除形状
             * @param {string} shapeId 形状对象唯一标识
             */
            self.delShape = function(shapeId) {
                storage.del(shapeId);
                return self;
            }
            
            /**
             * 修改形状 
             * @param {string} shapeId 形状对象唯一标识
             * @param {Object} shape 形状对象
             */
            self.modShape = function(shapeId, shape) {
                storage.mod(shapeId, shape);
                return self;
            }
            
            /**
             * 添加额外高亮层显示数据，不稳定层数据，仅对外提供添加方法，无清空修改方法 
             * @param {Object} shape 形状对象
             */
            self.addHoverShape = function(shape) {
                storage.addHover(shape);
                return self;
            }
            
                
            /**
             * 渲染，构建各层Canvas
             * @param {Function} callback  渲染结束后回调函数
             * todo:增加缓动函数
             */
            self.render = function(callback) {
                painter.render(callback);    
                return self;
            }
            
            /**
             * 视图更新
             * @param {Function} callback  视图更新后回调函数
             */
            self.refresh = function(callback) {
                painter.refresh(callback);
                return self;
            }
            
            /**
             * 视图更新
             * @param {Array} shapeList 需要更新的图形元素列表
             * @param {Function} callback  视图更新后回调函数
             */
            self.update = function(shapeList, callback) {
                var shape;
                for (var i = 0, l = shapeList.length; i < l; i++) {
                    shape = shapeList[i];
                    storage.mod(shape.id, shape);
                }
                painter.refresh(callback);
                return self;
            }
            
            /**
             * 默认loading显示
             * @param  {Object} loadingOption 参数
             * {
             *      text:'',                                        //loading话术
             *      //水平安放位置，默认为 'center'，可指定x坐标
             *      x:'center' || 'left' || 'right' || {number},   
             *      //垂直安放位置，默认为'top'，可指定y坐标 
             *      y:'top' || 'bottom' || {number},       
             *          
             *      textStyle:{
             *          fontFamily:'Arial' || {font family},        //文本字体
             *          fontSize:10 || {number},                    //大小
             *          //颜色，默认为'#789'(待定)
             *          color:'#789' || {color}                     
             *      }
             * }
             */
            self.showLoading = function(loadingOption) {
                painter.showLoading(loadingOption);
                return self;
            }
            
            /**
             * loading结束
             */
            self.hideLoading = function() {
                painter.hideLoading();
                return self;
            }
            
            /**
             * 获取形状唯一ID
             * @param {string} [idPrefix] id前缀
             * @return {string} 不重复ID
             */
            self.newShapeId = function(idPrefix) {
                return storage.newShapeId(idPrefix);
            }
            
            /**
             * 获取视图宽度 
             */
            self.getWidth = function() {
                return painter.getWidth();
            }
            
            /**
             * 获取视图高度
             */
            self.getHeight = function() {
                return painter.getHeight();
            }
            
            /**
             * 事件绑定
             * @param {string} event 事件名称
             * @param {Function} eventHandler 响应函数
             */
            self.on = function(eventName, eventHandler) {
                handler.on(eventName, eventHandler);
                return self;
            }
            
            /**
             * 事件解绑定，参数为空则解绑所有自定义事件
             * @param {string} eventName 事件名称
             * @param {Function} eventHandler 响应函数
             */
            self.un = function(eventName, eventHandler) {
                handler.un(eventName, eventHandler);
                return self;
            }
            /**
             * 清除当前ZR实例下所有类图的数据和显示绑定，clear后MVC还在，ZR可用 
             */
            self.clear = function() {
                storage.del();
                painter.clear();
                return self;
            }
            
            /**
             * 释放当前ZR实例和实例下所有类图的数据、显示和事件绑定，dispose后ZR不可用
             */
            self.dispose = function() {
                self.clear();
                self = null;
                
                storage.dispose(); 
                storage = null;
                
                painter.dispose();
                painter = null;
                
                handler.dispose();
                handler = null;
                
                //释放后告诉全局删除对自己的索引，没想到啥好方法
                zrender.delInstance(id);
                
                return;
            }
        }
        
        /**
         * 内容仓库 (M)
         * @param {Object} shape 图形库
         */
        function Storage(shape) {
            var util = require('./tool/util');
            var self = this;
            
            var _idBase = 0;            //图形数据id自增基础
            
            //所有常规形状，id索引的map
            var _elements = {}; 
                    
            //所有形状的z轴方向排列，提高遍历性能，zElements[0]的形状在zElements[1]形状下方
            var _zElements = [];
                    
            //高亮层形状，不稳定，动态增删，数组位置也是z轴方向，靠前显示在下方
            var _hoverElements = [];    
            
            var _maxZlevel = 0;         //最大zlevel
            var _changedZlevel = {};    //有数据改变的zlevel
            
            /**
             * 唯一标识id生成
             * @param {string=} idHead 标识前缀
             */
            function newShapeId(idHead) {
                return (idHead || '') + (++_idBase);
            }
            
            /**
             * 添加 
             * @param {Object} params 参数
             */
            function add(params) {
                //默认&必须的参数
                var e = {
                    'shape': 'circle',                      // 形状
                    'id': params.id || self.newShapeId(),   // 唯一标识
                    'zlevel': 0,                            // z轴位置
                    'draggable': false,                     // draggable可拖拽
                    'clickable': false,                     // clickable可点击鼠标样式
                    'hoverable': true                       // hoverable可悬浮响应
                };
                util.merge(
                    e,
                    params,
                    {
                        'overwrite': true,
                        'recursive': true
                    }
                );
                
                _elements[e.id] = e; 
                _zElements[e.zlevel] = _zElements[e.zlevel] || []
                _zElements[e.zlevel].push(e);
                
                _maxZlevel = Math.max(_maxZlevel,e.zlevel);
                _changedZlevel[e.zlevel] = true;
                
                return self
            }
            
            /**
             * 删除，shapeId不指定则全清空 
             * @param {string=} idx 唯一标识
             */
            function del(shapeId) {
                if (typeof shapeId != 'undefined') {
                    if (_elements[shapeId]) {
                        _changedZlevel[_elements[shapeId].zlevel] = true;
                        var oldList = _zElements[_elements[shapeId].zlevel];
                        var newList = [];
                        for (var i = 0, l = oldList.length; i < l; i++){
                            if (oldList[i].id != shapeId) {
                                newList.push(oldList[i]);
                            }
                        }
                        _zElements[_elements[shapeId].zlevel] = newList;
                        delete _elements[shapeId];
                    }
                }
                else{
                    //不指定shapeId清空
                    _elements = {};
                    _zElements = []; 
                    _hoverElements = []; 
                    _maxZlevel = 0;         //最大zlevel
                    _changedZlevel = {      //有数据改变的zlevel
                        all : true
                    };    
                }
                
                return self;
            }
            
            /**
             * 修改 
             * @param {string} idx 唯一标识
             * @param {Object} params]参数
             */
            function mod(shapeId, params) {
                var e = _elements[shapeId];
                if (e) {
                    _changedZlevel[e.zlevel] = true;
                    util.merge(
                        e,
                        params,
                        {
                            'overwrite': true,
                            'recursive': true
                        }
                    );
                    _changedZlevel[e.zlevel] = true;
                    _maxZlevel = Math.max(_maxZlevel,e.zlevel);
                }
                
                return self;
            }
            
            /**
             * 常规形状位置漂移，形状自身定义漂移函数
             * @param {string} idx 形状唯一标识
             * 
             */
            function drift(shapeId, dx, dy) {
                var e = _elements[shapeId];
                
                if (!e.ondrift //ondrift
                    //有onbrush并且调用执行返回false或undefined则继续
                    || (e.ondrift && !e.ondrift(e, dx, dy))  
                ) {
                    if (zrender.catchBrushException) {
                        try {
                            shape.get(e.shape).drift(e, dx, dy);    
                        }
                        catch(error) {
                            zrender.log(error, 'drift error of ' + e.shape, e);
                        }
                    }
                    else {
                        shape.get(e.shape).drift(e, dx, dy);
                    }
                }
                
                _changedZlevel[e.zlevel] = true;
                
                return self;
            }
            
            /**
             * 添加高亮层数据 
             * @param {Object} params 参数
             */
            function addHover(params) {
                _hoverElements.push(params); 
                return self;
            }
            
            /**
             * 删除高亮层数据 
             */
            function delHover() {
                _hoverElements = [];
                return self;
            }
            
            /**
             * 遍历迭代器
             * @param {Function} fun 迭代回调函数，return true终止迭代 
             * @param {Object=} option 迭代参数，缺省为仅降序遍历常规形状
             *     hover : true 是否迭代高亮层数据
             *     normal : 'down' | 'up' | 'free' 是否迭代常规数据，迭代时是否指定及z轴顺序
             */
            function iterShape(fun, option) {
                if (!option) {
                    option = {
                        hover: false,
                        normal: 'down'
                    }
                }
             
                if (option.hover) {
                    //高亮层数据遍历
                    for (var i = 0, l = _hoverElements.length; i < l; i++) {
                        if (fun(_hoverElements[i])) {
                            return self;
                        };
                    }
                }
                
                if (typeof option.normal != 'undefined') {
                    //z轴遍历: 'down' | 'up' | 'free'
                    switch (option.normal) {
                        case 'down':
                            //降序遍历，高层优先
                            var zlist;
                            for (var l = _zElements.length - 1; l >= 0; l--) {
                                zlist = _zElements[l];
                                if (zlist) {
                                    for (var k = zlist.length - 1; k >= 0; k-- ) {
                                        if(fun(zlist[k])) {
                                            return self;
                                        };
                                    }
                                }
                            }
                            break;
                        case 'up':
                            //升序遍历，底层优先
                            var zlist;
                            for (var i = 0, l = _zElements.length; i < l; i++) {
                                zlist = _zElements[i];
                                if (zlist) {
                                    for (var k = 0, length = zlist.length; 
                                        k < length; 
                                        k++ 
                                    ) {
                                        if(fun(zlist[k])) {
                                            return self;
                                        };
                                    }
                                }
                            }
                            break;
                        case 'free':
                        default:
                            //无序遍历
                            for (var i in _elements) {
                                if (fun(_elements[i])) {
                                    return self;
                                };
                            }
                            break;
                    }
                }
                
                return self;
            }
            
            function getMaxZlevel() {
                return _maxZlevel;
            }
            
            function getChangedZlevel() {
                return _changedZlevel;
            }
            
            function clearChangedZlevel() {
                _changedZlevel = {};
                return self;
            }
            
            function setChangedZlevle(level){
                _changedZlevel[level] = true;
                return self;
            }
            /**
             * 释放 
             */
            function dispose() {
                _elements = null;
                _zElements = null;
                _hoverElements = null;
                self = null;
                
                return;
            }
            
            self.newShapeId = newShapeId;
            self.add = add;
            self.del = del;
            self.addHover = addHover;
            self.delHover = delHover;
            self.mod = mod;
            self.drift = drift;
            self.iterShape = iterShape;
            self.getMaxZlevel = getMaxZlevel;
            self.getChangedZlevel = getChangedZlevel;
            self.clearChangedZlevel = clearChangedZlevel;
            self.setChangedZlevle = setChangedZlevle;
            self.dispose = dispose;
        }
        
        /**
         * 绘图类 (V)
         * @param {HTMLElement} root 绘图区域
         * @param {storage} storage Storage实例
         * @param {Object} shape 图形库
         */
        function Painter(root, storage, shape) {
            var self = this;
            
            var _domList = {};              //canvas dom元素
            var _ctxList = {};              //canvas 2D context对象，与domList对应
            
            var _maxZlevel = 0;             //最大zlevel，缓存记录
            
            var _domRoot = document.createElement('div');
            // 避免页面选中的尴尬
            _domRoot.onselectstart = function(){return false};
            
            //宽，缓存记录
            var _width;  
            //高，缓存记录
            var _height;
            
            function _getWidth() {
                var stl = root.currentStyle 
                          || document.defaultView.getComputedStyle(root);
                          
                return root.clientWidth
                       - stl.paddingLeft.replace(/\D/g,'')         // 请原谅我这比较粗暴
                       - stl.paddingRight.replace(/\D/g,'');
            }
            
            function _getHeight(){
                var stl = root.currentStyle 
                          || document.defaultView.getComputedStyle(root);
                          
                return root.clientHeight
                       - stl.paddingTop.replace(/\D/g,'')           // 请原谅我这比较粗暴
                       - stl.paddingBottom.replace(/\D/g,'');
            }
            
            function _init() {
                _domRoot.innerHTML = '';
                root.innerHTML = '';
                
                _width = _getWidth();
                _height = _getHeight();
                
                //没append呢，原谅我这样写，清晰~ 
                _domRoot.style.position = 'relative';
                _domRoot.style.overflow = 'hidden';
                _domRoot.style.width = _width + 'px';
                _domRoot.style.height = _height + 'px';
        
                root.appendChild(_domRoot);
                
                _domList = {};
                _ctxList = {};
                
                _maxZlevel = storage.getMaxZlevel();
                
                //创建各层canvas
                //背景
                _domList['bg'] = _createDom('bg','div');
                _domRoot.appendChild(_domList['bg']);
                
                //实体
                for (var i = 0; i <= _maxZlevel; i++) {
                    _domList[i] = _createDom(i,'canvas');
                    _domRoot.appendChild(_domList[i]);
                    if (G_vmlCanvasManager) {
                        G_vmlCanvasManager.initElement(_domList[i]);
                    }
                    _ctxList[i] = _domList[i].getContext('2d');
                }
                
                //高亮
                _domList['hover'] = _createDom('hover','canvas');
                _domList['hover'].id = '_zrender_hover_';
                _domRoot.appendChild(_domList['hover']);
                if (G_vmlCanvasManager) {
                    G_vmlCanvasManager.initElement(_domList['hover']);
                }
                _ctxList['hover'] = _domList['hover'].getContext('2d');
            }
            
            /**
             * 检查_maxZlevel是否变大，如是则同步创建需要的Canvas 
             */
            function _syncMaxZlevelCanvase(){
                var curMaxZlevel = storage.getMaxZlevel()
                if (_maxZlevel < curMaxZlevel) {
                    //实体
                    for (var i = _maxZlevel + 1; i <= curMaxZlevel; i++) {
                        _domList[i] = _createDom(i,'canvas');
                        _domRoot.insertBefore(_domList[i], _domList['hover']);
                        if (G_vmlCanvasManager) {
                            G_vmlCanvasManager.initElement(_domList[i]);
                        }
                        _ctxList[i] = _domList[i].getContext('2d');
                    }
                    _maxZlevel = curMaxZlevel;
                }
            }
            
            /**
             * 创建dom
             * @param {string} id dom id 待用
             * @param {string} type : dom type， such as canvas, div etc. 
             */
            function _createDom(id, type) {
                var newDom = document.createElement(type);
                //没append呢，请原谅我这样写，清晰~
                newDom.style.position = 'absolute';
                newDom.style.width = _width + 'px';
                newDom.style.height = _height + 'px';
                newDom.setAttribute('width', _width);
                newDom.setAttribute('height', _height);
                //id不作为索引用，避免可能造成的重名，定义为私有属性
                newDom.setAttribute('data-id', id);     
                return newDom;
            };
            
            /**
             * 刷画图形
             * @param {Object} changedZlevel 需要更新的zlevel索引
             */
            function _brush(changedZlevel) {
                return function(e){
                    if ((changedZlevel.all || changedZlevel[e.zlevel])
                        && !e.invisible
                    ) {
                        var ctx = _ctxList[e.zlevel];
                        if (ctx) {
                            if (!e.onbrush //没有onbrush
                                //有onbrush并且调用执行返回false或undefined则继续粉刷
                                || (e.onbrush && !e.onbrush(ctx, e, false))  
                            ) { 
                                
                                if (zrender.catchBrushException) {
                                    try {
                                        shape.get(e.shape).brush(ctx, e, false); 
                                    }
                                    catch(error) {
                                        zrender.log(
                                            error, 
                                            'brush error of ' + e.shape, 
                                            e
                                        );
                                    }
                                }
                                else {
                                    shape.get(e.shape).brush(ctx, e, false); 
                                }   
                                
                            }
                        } 
                        else {
                            zrender.log(
                                'can not find the specific zlevel canvas!'
                            );
                        }
                    }
                }
            }
            
            /**
             * 鼠标悬浮刷画 
             */
            function _brushHover(e) {
                var ctx = _ctxList['hover'];
                if (!e.onbrush //没有onbrush
                    //有onbrush并且调用执行返回false或undefined则继续粉刷
                    || (e.onbrush && !e.onbrush(ctx, e, true))
                ) {
                    
                    if (zrender.catchBrushException) {
                        try {
                            shape.get(e.shape).brush(ctx, e, true); 
                        }
                        catch(error) {
                            zrender.log(
                                error, 'hoverBrush error of ' + e.shape, e
                            );
                        }
                    }
                    else {
                        shape.get(e.shape).brush(ctx, e, true); 
                    }  
                    
                }
            }
            
            /**
             * 首次绘图，创建各种dom和context
             * @param {Function=} callback 绘画结束后的回调函数
             */
            function render(callback) {
                if (isLoading()) {
                    hideLoading();
                }
                //检查_maxZlevel是否变大，如是则同步创建需要的Canvas
                _syncMaxZlevelCanvase();
                
                //升序遍历，shape上的zlevel指定绘画图层的z轴层叠
                storage.iterShape(
                    _brush({ all : true }), 
                    { normal: 'up' }
                );
                
                //update到最新则清空标志位
                storage.clearChangedZlevel();
                
                if (typeof callback == 'function') {
                    callback();
                }    
                
                return self;
            }
            
            /**
             * 刷新
             * @param {Function=} callback 刷新结束后的回调函数
             */
            function refresh(callback) {
                //检查_maxZlevel是否变大，如是则同步创建需要的Canvas
                _syncMaxZlevelCanvase();
                
                //仅更新有修改的canvas
                var changedZlevel = storage.getChangedZlevel();
                //擦除有修改的canvas
                if (changedZlevel.all){
                    clear();
                }
                else {
                    for (var k in changedZlevel) {
                        if (_ctxList[k]) {
                            _ctxList[k].clearRect(0, 0, _width, _height);                            
                        }
                    }
                }
                //重绘内容，升序遍历，shape上的zlevel指定绘画图层的z轴层叠
                storage.iterShape(
                    _brush(changedZlevel),
                    { normal: 'up'}
                );
                
                //update到最新则清空标志位
                storage.clearChangedZlevel();
                
                if (typeof callback == 'function') {
                    callback();
                }
                
                return self;
            }
            
            /**
             * 清除hover层外所有内容 
             */
            function clear() {
                for (var k in _ctxList) {
                    if (k == 'hover') {
                        continue;
                    }
                    _ctxList[k].clearRect(0, 0, _width, _height);
                }
                return self;
            }
            
            /**
             * 刷新hover层
             */
            function refreshHover() {
                clearHover();
                
                storage.iterShape(_brushHover, { hover: true });
                
                storage.delHover();
                
                return self;
            }
            
            /**
             * 清除hover层所有内容 
             */
            function clearHover() {
                _ctxList 
                && _ctxList['hover'] 
                && _ctxList['hover'].clearRect(0, 0, _width, _height);
                
                return self;
            }
            
            /**
             * 显示loading，目前仅支持文字显示
             * @param {Object} loadingOption 选项
             * @param {string | function} loadingOption.effect 特效
             *      支持特效依赖tool/loadingEffect，可传入自定义特效function
             * @param {Object} loadingOption.textStyle 文字样式，同shape/text.style
             * 
             * 乱来的，待重写
             */
            function showLoading(loadingOption) {
                var effect = require('./tool/loadingEffect');
                
                clearInterval(self.loadingTimer);
                loadingOption = loadingOption || {};
                
                var loadingEffect;
                if (typeof loadingOption.effect == 'function') {
                    loadingEffect = loadingOption.effect;
                } 
                else if (typeof effect[loadingOption.effect] == 'function'){
                    loadingEffect = effect[loadingOption.effect];
                } else {
                    loadingEffect = effect['progressBar'];
                }
                
                self.loadingTimer = loadingEffect(
                    loadingOption.textStyle,
                    {
                        width : _width,
                        height : _height
                    },
                    storage.addHover,
                    refreshHover
                );
                
                self.loading = true;
                return self;
            }
            
            /**
             * loading结束 
             * 乱来的，待重写
             */
            function hideLoading() {
                clearInterval(self.loadingTimer);
                self.loading = false;
                clearHover();
                return self;
            }
            
            /**
             * loading结束判断 
             */
            function isLoading() {
                return self.loading;
            }
            
            /**
             * 获取绘图区域宽度 
             */
            function getWidth() {
                return _width;
            }
            
            /**
             * 获取绘图区域高度 
             */
            function getHeight() {
                return _height;
            }
            
            /**
             * 区域大小变化后重绘 
             */
            function resize() {
                var width;
                var height;
                var dom;
                
                _domRoot.style.display = 'none';
                
                width = _getWidth();
                height = _getHeight();
                
                _domRoot.style.display = '';
                
                //优化没有实际改变的resize
                if (_width != width || height != _height){
                    _width = width;
                    _height = height;
                    
                    _domRoot.style.width = _width + 'px';
                    _domRoot.style.height = _height + 'px';
                    
                    for (var i in _domList) {
                        dom = _domList[i];
                        dom.setAttribute('width', _width);
                        dom.setAttribute('height', _height);
                        dom.style.width = _width + 'px';
                        dom.style.height = _height + 'px';
                    }
                    
                    storage.setChangedZlevle('all');
                    refresh();
                }
                
                return self;
            }
            
            /**
             * 释放 
             */
            function dispose() {
                clearInterval(self.loadingTimer);
                root.innerHTML = '';
                
                root = null;
                storage = null;
                shape = null;
            
                _domRoot = null;
                _domList = null;
                _ctxList = null;
                
                self = null;
                
                return;
            }
            
            self.render = render;
            self.refresh = refresh;
            self.showLoading = showLoading;
            self.hideLoading = hideLoading;
            self.isLoading = isLoading;
            self.clear = clear;
            self.refreshHover = refreshHover;
            self.clearHover = clearHover;
            self.getWidth = getWidth;
            self.getHeight = getHeight;
            self.resize = resize;
            self.dispose = dispose;
            
            _init();
        }
        
        /**
         * 控制类 (C)
         * @param {HTMLElement} root 绘图区域
         * @param {storage} storage Storage实例
         * @param {painter} painter Painter实例
         * @param {Object} shape 图形库
         * 
         * 分发事件支持详见config.EVENT
         */
        function Handler(root, storage, painter, shape) {
            var config = require('./config');
            //添加事件分发器特性
            var eventTool = require('./tool/event');
            eventTool.Dispatcher.call(this);
            
            var self = this;
            
            //常用函数加速
            var getX = eventTool.getX;
            var getY = eventTool.getY;
            
            //各种事件标识的私有变量
            var _event;                         //原生dom事件
            var _hasfound = false;              //是否找到hover图形元素
            var _lastHover = null;              //最后一个hover图形元素
            var _draggingTarget = null;         //当前被拖拽的图形元素
            var _isMouseDown = false;
            var _isDragging = false;
            var _lastTouchMoment;
            
            var _lastX = 0;
            var _lastY = 0;
            var _mouseX = 0;
            var _mouseY = 0;
            
            /**
             * 初始化，事件绑定，支持的所有事件都由如下原生事件计算得来
             */
            function _init() {
                if (window.addEventListener) {
                    window.addEventListener('resize', _resizeHandler);
                    
                    root.addEventListener('click', _clickHandler);
                    root.addEventListener('mousewheel', _mouseWheelHandler);
                    root.addEventListener('mousemove', _mouseMoveHandler);
                    root.addEventListener('mousedown', _mouseDownHandler);
                    root.addEventListener('mouseup', _mouseUpHandler);
                    
                    // mobile支持
                    root.addEventListener('touchstart', _touchStartHandler);
                    root.addEventListener('touchmove', _touchMoveHandler);
                    root.addEventListener('touchend', _touchEndHandler);
                } 
                else {
                    window.attachEvent('onresize', _resizeHandler);
                    
                    root.attachEvent('onclick', _clickHandler);
                    root.attachEvent('onmousewheel', _mouseWheelHandler);
                    root.attachEvent('onmousemove', _mouseMoveHandler);
                    root.attachEvent('onmousedown', _mouseDownHandler);
                    root.attachEvent('onmouseup', _mouseUpHandler);
                }
            }

            /**
             * 窗口大小改变响应函数
             * @param {event} event dom事件对象 
             */
            function _resizeHandler(event) {
                _event = event || window.event;
                _lastHover = null;
                _isMouseDown = false;
                //分发config.EVENT.RESIZE事件，global
                self.dispatch(config.EVENT.RESIZE, _event);
            };
            
            /**
             * 点击数据
             * @param {event} event dom事件对象 
             */
            function _clickHandler(event) {
                _event = _zrenderEventFixed(event);
                //分发config.EVENT.CLICK事件
                _dispatchAgency(_lastHover, config.EVENT.CLICK);
            };
            
            /**
             * 鼠标滚轮响应函数
             * @param {event} event dom事件对象 
             */
            function _mouseWheelHandler(event) {
                _event = _zrenderEventFixed(event);;
                //分发config.EVENT.MOUSEWHEEL事件
                _dispatchAgency(_lastHover, config.EVENT.MOUSEWHEEL);
                if (_lastHover && _lastHover.hoverable) {
                    //滚轮事件可能改变了图形数据，在某图形上滚动滚轮后需要需要更新图形
                    storage.addHover(_lastHover);
                    painter.refreshHover();
                }
            }
            
            /**
             * 鼠标（手指）移动响应函数
             * @param {event} event dom事件对象 
             */
            function _mouseMoveHandler(event) {
                if (painter.isLoading()) {
                    return;
                }
                _event = _zrenderEventFixed(event);;
                _lastX = _mouseX;
                _lastY = _mouseY;
                _mouseX = getX(_event);
                _mouseY = getY(_event);
                 
                // 可能出现config.EVENT.DRAGSTART事件
                // 避免手抖点击误认为拖拽
                //if (_mouseX - _lastX > 1 || _mouseY - _lastY > 1) {
                    _dragStartHandler();    
                //}
                
                _hasfound = false;
                storage.iterShape(_findHover, { normal: 'down'});
                
                //找到的在迭代函数里做了处理，没找到得在迭代完后处理
                if (!_hasfound) {    
                    //过滤首次拖拽产生的mouseout和dragLeave
                    if (!_draggingTarget        
                        || (_lastHover && _lastHover.id != _draggingTarget.id)
                    ) {
                        //可能出现config.EVENT.MOUSEOUT事件
                        _mouseOutHandler();
                        
                        //可能出现config.EVENT.DRAGLEAVE事件
                        _dragLeaveHandler();    
                    }
                    
                    _lastHover = null;
                    storage.delHover();
                    painter.clearHover();
                }
                //如果存在拖拽中元素，被拖拽的图形元素最后addHover
                if (_draggingTarget) {
                    storage.drift(
                        _draggingTarget.id, 
                        _mouseX - _lastX, 
                        _mouseY - _lastY
                    );
                    storage.addHover(_draggingTarget);
                }
                
                //分发config.EVENT.MOUSEMOVE事件
                _dispatchAgency(_lastHover, config.EVENT.MOUSEMOVE);
                
                if (_draggingTarget || _hasfound) {
                    painter.refreshHover();      
                }
                
                if (_draggingTarget || (_hasfound && _lastHover.draggable)) {
                    root.style.cursor = 'move';                
                } 
                else if (_hasfound && _lastHover.clickable) {
                    root.style.cursor = 'pointer';
                }
                else {
                    root.style.cursor = 'default';
                }  
            }
            
            /**
             * 鼠标在某个图形元素上移动
             */
            function _mouseOverHandler() {
                //分发config.EVENT.MOUSEOVER事件
                _dispatchAgency(_lastHover, config.EVENT.MOUSEOVER);
            }
            
            /**
             * 鼠标离开某个图形元素
             */
            function _mouseOutHandler() {
                //分发config.EVENT.MOUSEOUT事件
                _dispatchAgency(_lastHover, config.EVENT.MOUSEOUT);
            }
            
            /**
             * 鼠标（手指）按下响应函数
             * @param {event} event dom事件对象 
             */
            function _mouseDownHandler(event) {
                _event = _zrenderEventFixed(event);
                _isMouseDown = true;
                //分发config.EVENT.MOUSEDOWN事件
                _dispatchAgency(_lastHover, config.EVENT.MOUSEDOWN);
            }
            
            /**
             * 鼠标（手指）抬起响应函数
             * @param {event} event dom事件对象 
             */
            function _mouseUpHandler(event) {
                _event = _zrenderEventFixed(event);
                root.style.cursor = 'default';
                _isMouseDown = false;
                
                //分发config.EVENT.MOUSEUP事件
                _dispatchAgency(_lastHover, config.EVENT.MOUSEUP);
                _dropHandler();
                _dragEndHandler();
            }
            
            /**
             * Touch开始响应函数
             * @param {event} event dom事件对象 
             */
            function _touchStartHandler(event) {
                eventTool.stop(event);// 阻止浏览器默认事件，重要
                _event = _zrenderEventFixed(event, true);
                _lastTouchMoment = new Date();
                _mouseDownHandler(_event);    
            }
            
            /**
             * Touch移动响应函数
             * @param {event} event dom事件对象 
             */
            function _touchMoveHandler(event) {
                eventTool.stop(event);// 阻止浏览器默认事件，重要
                _event = _zrenderEventFixed(event, true);
                _mouseMoveHandler(_event);
            }
            
            /**
             * Touch结束响应函数
             * @param {event} event dom事件对象 
             */
            function _touchEndHandler(event) {
                eventTool.stop(event);// 阻止浏览器默认事件，重要
                _event = _zrenderEventFixed(event, true); 
                _mouseUpHandler(_event);
                painter.clearHover();

                if (new Date() - _lastTouchMoment 
                    < config.EVENT.touchClickDelay
                ) {
                    _lastHover = null;
                    _mouseX = _event.zrenderX;
                    _mouseY = _event.zrenderY;
                    // touch有指尖错觉，四向尝试，让touch上的点击更好触发事件
                    storage.iterShape(_findHover, { normal: 'down'});
                    if (!_lastHover) {
                        _mouseX += 10;
                        storage.iterShape(_findHover, { normal: 'down'});
                    }
                    if (!_lastHover) {
                        _mouseX -= 20;
                        storage.iterShape(_findHover, { normal: 'down'});
                    }
                    if (!_lastHover) {
                        _mouseX += 10;
                        _mouseY += 10;
                        storage.iterShape(_findHover, { normal: 'down'});
                    }
                    if (!_lastHover) {
                        _mouseY -= 20;
                        storage.iterShape(_findHover, { normal: 'down'});
                    }
                    if (_lastHover) {
                        _event.zrenderX = _mouseX;
                        _event.zrenderY = _mouseY;
                    }
                    _clickHandler(_event);
                }
            }
            
            /**
             * 拖拽开始
             */
            function _dragStartHandler() {
                if (_isMouseDown 
                    && _lastHover 
                    && _lastHover.draggable 
                    && !_draggingTarget
                ) {
                    _draggingTarget = _lastHover;  
                    _isDragging = true;
                    
                    _draggingTarget.invisible = true;
                    storage.mod(_draggingTarget.id,_draggingTarget);
                    
                    //分发config.EVENT.DRAGSTART事件
                    _dispatchAgency(
                        _draggingTarget, 
                        config.EVENT.DRAGSTART
                    );
                    painter.refresh();
                }
            }
            
            /**
             * 拖拽进入目标元素
             */
            function _dragEnterHandler() {
                if (_draggingTarget) {
                    //分发config.EVENT.DRAGENTER事件
                    _dispatchAgency(
                        _lastHover, 
                        config.EVENT.DRAGENTER,
                        _draggingTarget
                    );
                }
            }
            
            /**
             * 拖拽在目标元素上移动
             */
            function _dragOverHandler() {
                if (_draggingTarget) {
                    //分发config.EVENT.DRAGOVER事件
                    _dispatchAgency(
                        _lastHover, 
                        config.EVENT.DRAGOVER,
                        _draggingTarget
                    );
                }
            }
            
            /**
             * 拖拽离开目标元素
             */
            function _dragLeaveHandler() {
                if (_draggingTarget) {
                    //分发config.EVENT.DRAGLEAVE事件
                    _dispatchAgency(
                        _lastHover, 
                        config.EVENT.DRAGLEAVE,
                        _draggingTarget
                    );
                }
            }
            
            /**
             * 拖拽在目标元素上完成
             */
            function _dropHandler() {
                if (_draggingTarget) {
                    _draggingTarget.invisible = false;
                    storage.mod(_draggingTarget.id,_draggingTarget);
                    painter.refresh();
                    //分发config.EVENT.DROP事件
                    _dispatchAgency(
                        _lastHover, 
                        config.EVENT.DROP,
                        _draggingTarget
                    );
                }
            }
            
            /**
             * 拖拽结束
             */
            function _dragEndHandler() {
                if (_draggingTarget) {
                    //分发config.EVENT.DRAGEND事件
                    _dispatchAgency(
                        _draggingTarget, 
                        config.EVENT.DRAGEND
                    );
                }
                _isDragging = false;
                _draggingTarget = null;
            }
            
            /**
             * 事件分发代理
             * @param {Object} targetShape 目标图形元素
             * @param {string} eventName 事件名称
             * @param {Object=} draggedShape 拖拽事件特有，当前被拖拽图形元素
             */
            function _dispatchAgency(targetShape, eventName, draggedShape) {
                var eventHandler = 'on' + eventName;
                var eventPacket = {
                    type : eventName, 
                    event : _event, 
                    target : targetShape
                };
                
                if (draggedShape) {
                    eventPacket.dragged = draggedShape;
                }
                
                if (targetShape) {
                    //“不存在shape级事件”或“存在shape级事件但事件回调返回非true”
                    if (!targetShape[eventHandler]            
                        || !targetShape[eventHandler](eventPacket)  
                    ) {
                        self.dispatch(
                            eventName, 
                            _event, 
                            eventPacket
                        );
                    }
                } 
                else if (!draggedShape) {         
                    //无hover目标，无拖拽对象，原生事件分发
                    self.dispatch(eventName, _event);
                }
            }
            
            /**
             * 迭代函数，查找hover到的图形元素并即时做些事件分发
             * @param {Object} e 图形元素
             */
            function _findHover(e) {
                if (_draggingTarget && _draggingTarget.id == e.id) { 
                    //迭代到当前拖拽的图形上
                    return false;
                }
                
                //打酱油的路过，啥都不响应的shape~
                if (!e.hoverable && !e.onclick
                    && !e.onmousemove && !e.onmouseover && !e.onmouseout     
                    && !e.onmousedown && !e.onmouseup
                    && !e.draggable
                    && !e.ondragenter && !e.ondragover && !e.ondragleave 
                    && !e.ondrop
                ) {
                    return false;
                }
                
                var shapeInstance = shape.get(e.shape);
                if (shapeInstance.isCover 
                    && shapeInstance.isCover(e, _mouseX, _mouseY)
                ) {
                    if (e.hoverable) {
                        storage.addHover(e);
                    }
                    
                    if (_lastHover != e) {
                        _mouseOutHandler();
                    
                        //可能出现config.EVENT.DRAGLEAVE事件
                        _dragLeaveHandler();
                        
                        _lastHover = e;
                        
                        //可能出现config.EVENT.DRAGENTER事件
                        _dragEnterHandler();
                    }
                    _mouseOverHandler();
                    
                    //可能出现config.EVENT.DRAGOVER
                    _dragOverHandler();
                        
                    _hasfound = true;
                    
                    return true;    //找到则中断迭代查找
                }
                
                return false;
            }
            
            // 如果存在第三方嵌入的一些dom触发的事件，需要转换一下事件坐标
            function _zrenderEventFixed(event, isTouch) {
                if (!isTouch) {
                    _event = event || window.event;
                    // Todo： 这个硬编码找时间改
                    var target = _event.target || _event.toElement;
                    if (target && target.id != '_zrender_hover_') {
                        _event.zrenderX = _event.x - root.offsetLeft;
                        _event.zrenderY = _event.y - root.offsetTop;
                    }    
                }
                else {
                    _event = event;
                    var touch = _event.type != 'touchend'
                                ? _event.targetTouches[0]
                                : _event.changedTouches[0];
                    if (touch) {
                        // 会有bug
                        _event.zrenderX = touch.clientX - root.offsetLeft 
                                          + document.body.scrollLeft;
                        _event.zrenderY = touch.clientY - root.offsetTop 
                                          + document.body.scrollTop;
                    }
                }
                
                return _event
            }
            /**
             * 自定义事件绑定 
             * @param {string} eventName 事件名称，resize，hover，drag，etc~
             * @param {Function} handler 响应函数
             */
            function on(eventName, handler) {
                self.bind(eventName, handler);
                
                return self;
            }
            
            /**
             * 自定义事件解绑 
             * @param {string} event 事件名称，resize，hover，drag，etc~
             * @param {Function} handler 响应函数
             */
            function un(eventName, handler) {
                self.unbind(eventName, handler);
                return self;
            }
            
            /**
             * 比较不可控，先不开放了~
             * 触发原生dom事件，用于自定义元素在顶层截获事件后触发zrender行为 
             * @param {string} event 事件名称，resize，hover，drag，etc~
             * @param {event=} event event dom事件对象 
            function trigger(eventName, event) {
                switch (eventName) {
                    case config.EVENT.RESIZE :
                        _resizeHandler(event);
                        break;
                    case config.EVENT.CLICK :
                        _clickHandler(event);
                        break;
                    case config.EVENT.MOUSEWHEEL :
                        _mouseWheelHandler(event);
                        break;
                    case config.EVENT.MOUSEMOVE :
                        _mouseMoveHandler(event);
                        break;
                    case config.EVENT.MOUSEDOWN :
                        _mouseDownHandler(event);
                        break;
                    case config.EVENT.MOUSEUP :
                        _mouseUpHandleru(event);
                        break;
                }
            }
             */
            
            /**
             * 释放 
             */
            function dispose() {
                if (window.removeEventListener) {
                    window.removeEventListener('resize', _resizeHandler);
                    
                    root.removeEventListener('click', _clickHandler);
                    root.removeEventListener('mousewheel', _mouseWheelHandler);
                    root.removeEventListener('mousemove', _mouseMoveHandler);
                    root.removeEventListener('mousedown', _mouseDownHandler);
                    root.removeEventListener('mouseup', _mouseUpHandler);
                }
                else {
                    window.detachEvent('onresize', _resizeHandler);
                    
                    root.detachEvent('click', _clickHandler);
                    root.detachEvent('onmousewheel', _mouseWheelHandler);
                    root.detachEvent('onmousemove', _mouseMoveHandler);
                    root.detachEvent('onmousedown', _mouseDownHandler);
                    root.detachEvent('onmouseup', _mouseUpHandler);
                }
                
                root = null;
                storage = null;
                painter  = null;
                shape = null;
                
                un();
                
                self = null;
                
                return;
            }
            
            self.on = on;
            self.un = un;
            // self.trigger = trigger;
            self.dispose = dispose;
            
            _init();
        }
        
        return self;
    }
);