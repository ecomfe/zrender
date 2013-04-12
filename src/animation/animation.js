/**
 * 动画主类, 调度和管理所有动画控制器
 * 
 * @author lang( shenyi01@baidu.com )
 * 
 * @class : Animation
 * @config : stage(optional) 绘制类, 需要提供update接口 
 * @config : fps(optional) 帧率, 是自动更新动画的时候需要提供
 * @config : onframe(optional)
 * @method : add
 * @method : remove
 * @method : update
 * @method : start
 * @method : stop
 */
define(
    function(require){
        var Controller = require("./controller");

        var Animation = function(options){

            options = options || {};

            this.stage = options.stage || {};

            this.fps = options.fps || 50;

            this.onframe = options.onframe || new Function;

            // private properties
            this._controllerPool = [];

            this._timer = null;
        }

        Animation.prototype = {
            add : function(controller){
                controller._host = this;
                this._controllerPool.push(controller);
            },
            remove : function(controller){
                var idx = this._controllerPool.indexOf(controller);
                if( idx >= 0){
                    controller._host = null;
                    this._controllerPool.splice( idx, 1);
                }
            },
            update : function(){
                var time = new Date().getTime(),
                    cp = this._controllerPool;

                for(var i = 0; i < cp.length; i++){
                    cp[i].step( time );
                }
                if( this.stage && this.stage.update && this._controllerPool.length >0 ){
                    this.stage.update();
                }

                this.onframe();
            },
            // 启用start函数之后每个1000/fps事件就会刷新
            // 也可以不使用animation的start函数
            // 手动每一帧去调用update函数更新状态
            start : function(){
                if( this._timer){
                    clearInterval( this._timer );
                }
                var self = this;
                this._timer = setInterval( function(){
                    self.update();
                }, 1000/this.fps)
            },
            animate : function( target, getter, setter ){
                var deferred = new Deferred( target, getter, setter),
                    self = this;

                deferred.controllerCreated = function(controller){
                    self.add( controller );
                }
                return deferred;
            }
        }
        Animation.prototype.constructor = Animation;

        function _defaultGetter(target, key){
            return target[key];
        }
        function _defaultSetter(target, key, value){
            target[key] = value;
        }
        // 递归做插值
        function _interpolate(prevValue, nextValue, percent, target, propName, getter, setter){
             // 遍历数组做插值
            if( prevValue.constructor === Array &&
                nextValue.constructor === Array &&
                prevValue.length === nextValue.length)
            {
                var len = prevValue.length;
                for(var i = 0; i < len; i++){
                    // target[propName] 作为新的target,
                    // i 作为新的propName递归进行插值
                    _interpolate( prevValue[i], nextValue[i], percent, getter(target, propName), i, getter, setter);
                }
            }
            else{
                var prevValue = parseInt( prevValue ),
                    nextValue = parseInt( nextValue );
                if( !isNaN(prevValue) && ! isNaN(nextValue) ){
                    var value = (nextValue-prevValue)*percent+prevValue;
                    setter(target, propName, value);
                }
            }
        }
        function Deferred( target, getter, setter ){

            this.controllerCreated = new Function;

            this._tracks = {};
            this._target = target;

            this._getter = getter || _defaultGetter;
            this._setter = setter || _defaultSetter;

            this._controllerCount = 0;
        }

        Deferred.prototype = {
            when : function(time /* ms */, props, easing){
                for(var propName in props){
                    if( ! this._tracks[ propName ] ){
                        this._tracks[ propName ] = [];
                        // 初始状态 
                        this._tracks[ propName ].push({
                            time : 0,
                            value : this._getter( this._target, propName )
                        })
                    }
                    this._tracks[ propName ].push({
                        time : time,
                        value : props[ propName ],
                        easing : easing
                    })
                }
                return this;
            },
            start : function(){
                var self = this;
                for(var propName in this._tracks){
                        delay = 0,
                        track = this._tracks[ propName ];
                    for(var i = 0; i < track.length-1; i++){
                        var now = track[i],
                            next = track[i+1];

                        var controller = new Controller({
                            target : self._target,
                            life : next.time - now.time,
                            delay : delay,
                            loop : false,
                            gap : 0,
                            easing : next.easing,
                            onframe : (function(now, next, propName){
                                return function(target, schedule){
                                    _interpolate( now.value, next.value, schedule, target, propName, self._getter, self._setter );
                                }
                            }) (now, next, propName),
                            ondestroy : function(){
                                self._controllerCount--;
                                if( self._controllerCount === 0){
                                    // 所有动画完成
                                    self._done && self._done();
                                }
                            }
                        })
                        this._controllerCount++;
                        delay = next.time;

                        self.controllerCreated( controller );
                    }
                }
                return this;
            },
            done : function(func){
                this._done = func;
                this.start();
            }
        }

        return Animation;
    }
)
