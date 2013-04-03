/**
 * 事件辅助类 
 * getX：获取事件横坐标
 * getY：或者事件纵坐标
 * getDelta：或者鼠标滚轮变化
 * stop：停止事件传播
 * Dispatcher：事件分发器
 */
define(
    function(require) {
        /**
        * 提取鼠标x坐标
        * @param  {event} e 鼠标事件.
        * @return {number} 鼠标x坐标.
        */
        function getX(e) {
            return e.zrenderX != undefined && e.zrenderX
                   || e.offsetX != undefined && e.offsetX 
                   || e.layerX != undefined && e.layerX 
                   || e.clientX != undefined && e.clientX;
        };
    
        /**
        * 提取鼠标y坐标
        * @param  {event} e 鼠标事件.
        * @return {number} 鼠标y坐标.
        */
        function getY(e) {
            return e.zrenderY != undefined && e.zrenderY
                   ||e.offsetY != undefined && e.offsetY 
                   || e.layerY != undefined && e.layerY 
                   || e.clientY != undefined && e.clientY;
        };
    
        /**
        * 提取鼠标滚轮变化
        * @param  {event} e 鼠标事件.
        * @return {number} 滚轮变化，正值说明滚轮是向上滚动，如果是负值说明滚轮是向下滚动
        */
        function getDelta(e) {
            return e.wheelDelta != undefined && e.wheelDelta 
                   || e.detail != undefined && -e.detail;
        };
        
        /**
         * 停止传播 
         * @param {Object} e : event对象
         */
        function stop(e) {
            if (e.preventDefault) {
                e.preventDefault();
                e.stopPropagation();
            } 
            else {
                e.returnValue = false;
            }
        }
        
        /**
         * 事件分发器 
         */
        function Dispatcher() {
            var _self = this;
            var _h = {};
            
            /**
             * 单次触发，dispatch后销毁 
             * @param {string} event 事件字符串
             * @param {function} handler 响应函数
             */
            function one(event, handler) {
                if(!handler || !event) {
                    return _self;
                }
        
                if(!_h[event]) {
                    _h[event] = [];
                }
    
                _h[event].push({
                    h : handler,
                    one : true
                });
        
                return _self;
            }
            
            /**
             * 事件绑定
             * @param {string} event 事件字符串
             * @param {function} handler : 响应函数
             */
            function bind(event, handler) {
                if(!handler || !event) {
                    return _self;
                }
        
                if(!_h[event]) {
                    _h[event] = [];
                }
    
                _h[event].push({
                    h : handler,
                    one : false
                });
        
                return _self;
            }
            
            /**
             * 事件解绑定
             * @param {string} event 事件字符串
             * @param {function} handler : 响应函数
             */
            function unbind(event, handler) {
                if(!event) {
                    _h = {};
                    return _self;
                }
        
                if(handler) {
                    if(_h[event]) {
                        var newList = [];
                        for (var i = 0, l = _h[event].length; i < l; i++) {
                            if (_h[event][i]['h'] != handler) {
                                newList.push(_h[event][i]);
                            }
                        }
                        _h[event] = newList;
                    }
    
                    if(_h[event] && _h[event].length == 0) {
                        delete _h[event];
                    }
                } 
                else {
                    delete _h[event];
                }
        
                return _self;
            }
            
            /**
             * 事件分发
             * @param {string} type : 事件类型
             * @param {Object} event : event对象
             * @param {Object} [attachment] : 附加信息
             */
            function dispatch(type, event, attachment) {
                if(_h[type]) {
                    var newList = [];
                    var eventPacket = attachment || {};
                    eventPacket.type = type;
                    eventPacket.event = event;
                    //eventPacket._target = self;
                    for (var i = 0, l = _h[type].length; i < l; i++) {
                        _h[type][i]['h'](eventPacket);
                        if (!_h[type][i]['one']) {
                            newList.push(_h[type][i]);
                        }
                    }
                    
                    if (newList.length != _h[type].length) {
                        _h[type] = newList;    
                    }
                }
        
                return _self;
            }
            
            _self.one = one;
            _self.bind = bind;
            _self.unbind = unbind;
            _self.dispatch = dispatch;
        };
        
        return {
            getX : getX,
            getY : getY,
            getDelta : getDelta,
            stop : stop,
            Dispatcher : Dispatcher
        }
    }
);