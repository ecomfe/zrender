/**
 * 动画主控制器
 * @config target 动画对象，可以是数组，如果是数组的话会批量分发onframe等事件
 * @config life(1000) 动画时长
 * @config delay(0) 动画延迟时间
 * @config loop(true) 
 * @config gap(0) 循环的间隔时间
 * @config onframe
 * @config easing(optional)
 * @config ondestroy(optional)
 * @config onrestart(optional)
 */
define(
    function(require){

        var Easing = require("./easing");
        
        var Controller = function(options){

            this._targetPool = options.target || new Object();
            if(this._targetPool.constructor != Array){
                this._targetPool = [this._targetPool];
            }
            
            this._host = null;
            //生命周期
            this._life = options.life || 1000;  
            //延时
            this._delay = options.delay || 0;
            //开始时间
            this._startTime = new Date().getTime()+this._delay;//单位毫秒
            
            //结束时间
            this._endTime = this._startTime + this._life*1000;
            
            //是否循环
            this.loop = typeof(options.loop) == 'undefined' ? false : options.loop;
            
            
            this.easing = options.easing || "Linear";

            this.onframe = options.onframe || null;
            
            this.ondestroy = options.ondestroy || null;
            
            this.onrestart = options.onrestart || null;
        }

        Controller.prototype = {
            step : function(time){
                var percent = (time-this._startTime)/this._life;
                //还没开始
                if(percent < 0){
                    return;
                }
                
                percent = Math.min(percent, 1);

                var easingFunc = typeof(this.easing) == "string" ?
                                    Easing[this.easing] :
                                    this.easing;
                if( typeof easingFunc === "function" ){
                    var schedule = easingFunc(percent);
                }else{
                    var schedule = percent;
                }
                this.fire('frame', schedule);
                
                //结束
                if( percent == 1 ){
                    if(this.loop){
                        this.restart();
                        
                        //重新开始周期
                        this.fire('restart')
                        
                    }else{
                        //动画完成删除这个控制器
                        this._host.remove(this);
                        
                        this.fire('destroy');
                    }
                }
            },
            restart : function(){
                this._startTime = new Date().getTime() + this.loopDelay;
            },
            fire : function(eventType, arg){
                for(var i = 0; i < this._targetPool.length; i++){
                    this['on'+eventType] && this['on'+eventType](this._targetPool[i], arg);
                }
            }
        }
        Controller.prototype.constructor = Controller;

        return Controller;
    }
)