description = description || {};
description.animation = [
    {
        name : 'animation',
        plus : true,
        des : '动画，animation/animation，查看<a href="example/slice.html" target="_blank">slice</a>源码',
        value : [
            ['start', '{Function}','开始动画调度器，查看<a href="#animation.animation.start">start</a>'],
            ['stop', '{Function}','停止动画调度器，查看<a href="#animation.animation.stop">stop</a>'],
            ['animate', '{Function}','创建一个animate对象,，查看<a href="#animation.animation.animate">animatie</a>']
        ],
        content : [
            {
                name : 'start',
                des : '开始动画调度器',
                params : [],
                res : ['deffer', '{Object}', '动画的Deferred对象，支持链式调用'],
                pre : (function(){
var Animation = require('zrender/animation/animation');
var animation = new Animation;
animation.start();
                }).toString().slice(13, -10)
            },
            {
                name : 'stop',
                des : '停止动画调度器',
                params : [],
                res : ['deffer', '{Object}', '动画的Deferred对象，支持链式调用'],
                pre : (function(){
var Animation = require('zrender/animation/animation');
var animation = new Animation;
animation.start();
animation.stop();
                }).toString().slice(13, -10)
            },
            {
                name : 'animate',
                des : '创建一个animate对象, animate对象有三个方法，使用when方法设置帧，start方法开始动画, \
                        如果动画循环，可以使用stop停止动画，如果动画不循环，done方法则是动画完成的回调，',
                params : [
                    ['target', '{Object}','必须，赋予动画的对象'],
                    ['loop', '{boolean=}', "可选，动画是否循环，默认为false"],
                    ['getter', '{Function=}', '可选，获取target属性值的getter, 接受target, propName两个属性'],
                    ['setter', '{Function=}', '可选，设置target属性值的setter, 接受target, propName, value三个属性']
                ],
                res : ['deffer', '{Object}', '动画的Deferred对象，支持链式调用'],
                pre : (function(){
var Animation = require('zrender/animation/animation');
var animation = new Animation,
    target = (function(){
        var properties = {
            x : 0,
            y : 0
        }
        return {
            get : function(key){
                return properties[key];
            },
            set : function(key, value){
                properties[key] = value;   
            }
        }
    })()
var getter = function(target, key){
    return target.get(key);
}
var setter = function(target, key, value){
    target.set(key, value);
}
animation.animate( target, getter, setter )
    .when(1000, {
        x : 10
    })
    .when(2000, {
        y : 20
    })
    .done(function(){
        target.set("x", 0)
        target.set("y", 0)
    })
    .start()
                }).toString().slice(13, -10),
                cantry : false
            }
        ]
    },
    {
        name : 'easing',
        plus : true,
        des : '动画，animation/easing，见下，或参考<a href="http://easings.net/zh-cn" target="_blank">easings.net</a>',
        content : [
            {
                name : 'Linear',
                des : '线性变化',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比'],
                pre : (function(){
var width = zr.getWidth();
var height = zr.getHeight() - 30;
var shapList = [];
var n = 13;
var CircleShape = require('zrender/shape/Circle');
for (var i = 0; i < n; i++) {
    shapList.push(new CircleShape({
        id : require('zrender/tool/guid')(),
        style : {
            x : 10, y : height/n * i + 30, r : 10,
            color : _getRandomColor()
        }
    }));
}
function _getRandomColor() {
    return 'rgba(' + Math.round(Math.random() * 256) + ',' + Math.round(Math.random() * 256) + ','  + Math.round(Math.random() * 256) + ', 0.8)'
}
var easingEffect = [
    'Linear',
    'QuadraticIn', 'QuadraticOut', 'QuadraticInOut',
    'CubicIn', 'CubicOut', 'CubicInOut',
    'QuarticIn', 'QuarticOut', 'QuarticInOut', 
    'QuinticIn', 'QuinticOut', 'QuinticInOut'
]
for (var i = 0; i < n; i++) {
    zr.addShape(shapList[i]);
    zr.animate(shapList[i].id, "style", true)
        .when(2000, {
            x : width - 50
        })
        .when(4000, {
            x : 50
        })
        .start(easingEffect[i]);
}
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            },
            {
                name : 'QuadraticIn',
                des : '二次方的缓动（t^2），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'QuadraticOut',
                des : '二次方的缓动（t^2），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'QuadraticInOut',
                des : '二次方的缓动（t^2），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'CubicIn',
                des : '三次方的缓动（t^3），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'CubicOut',
                des : '三次方的缓动（t^3），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'CubicInOut',
                des : '三次方的缓动（t^3），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'QuarticIn',
                des : '四次方的缓动（t^4），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'QuarticOut',
                des : '四次方的缓动（t^4），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'QuarticInOut',
                des : '四次方的缓动（t^4），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'QuinticIn',
                des : '五次方的缓动（t^5），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'QuinticOut',
                des : '五次方的缓动（t^5），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'QuinticInOut',
                des : '五次方的缓动（t^5），例子见<a href="#animation.easing.Linear">Linear</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'SinusoidalIn',
                des : '正弦曲线的缓动（sin(t)）',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比'],
                pre : (function(){
var width = zr.getWidth();
var height = zr.getHeight() - 30;
var shapList = [];
var n = 10;
var CircleShape = require('zrender/shape/Circle');
for (var i = 0; i < n; i++) {
    shapList.push(new CircleShape({
        id : require('zrender/tool/guid')(),
        style : {
            x : 10, y : height/n * i + 30, r : 10,
            color : _getRandomColor()
        }
    }));
}
function _getRandomColor() {
    return 'rgba(' 
            + Math.round(Math.random() * 256) + ',' 
            + Math.round(Math.random() * 256) + ',' 
            + Math.round(Math.random() * 256) + ', 0.8)'
}
var easingEffect = [
    'Linear', 'SinusoidalIn', 'SinusoidalOut', 'SinusoidalInOut', 
    'ExponentialIn', 'ExponentialOut', 'ExponentialInOut', 
    'CircularIn', 'CircularOut', 'CircularInOut'
]
for (var i = 0; i < n; i++) {
    zr.addShape(shapList[i]);
    zr.animate(shapList[i].id, "style", true)
        .when(2000, {
            x : width - 50
        })
        .when(4000, {
            x : 50
        })
        .start(easingEffect[i]);
}
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            },
            {
                name : 'SinusoidalOut',
                des : '正弦曲线的缓动（sin(t)），例子见<a href="#animation.easing.SinusoidalIn">SinusoidalIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'SinusoidalInOut',
                des : '正弦曲线的缓动（sin(t)），例子见<a href="#animation.easing.SinusoidalIn">SinusoidalIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'ExponentialIn',
                des : '指数曲线的缓动（2^t），例子见<a href="#animation.easing.SinusoidalIn">SinusoidalIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'ExponentialOut',
                des : '指数曲线的缓动（2^t），例子见<a href="#animation.easing.SinusoidalIn">SinusoidalIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'ExponentialInOut',
                des : '指数曲线的缓动（2^t），例子见<a href="#animation.easing.SinusoidalIn">SinusoidalIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'CircularIn',
                des : '圆形曲线的缓动（sqrt(1-t^2)），例子见<a href="#animation.easing.SinusoidalIn">SinusoidalIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'CircularOut',
                des : '圆形曲线的缓动（sqrt(1-t^2)），例子见<a href="#animation.easing.SinusoidalIn">SinusoidalIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'CircularInOut',
                des : '圆形曲线的缓动（sqrt(1-t^2)），例子见<a href="#animation.easing.SinusoidalIn">SinusoidalIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'ElasticIn',
                des : '创建类似于弹簧在停止前来回振荡的动画',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比'],
                pre : (function(){
var width = zr.getWidth();
var height = zr.getHeight() - 30;
var shapList = [];
var n = 10;
var CircleShape = require('zrender/shape/Circle');
for (var i = 0; i < n; i++) {
    shapList.push(new CircleShape({
        id : require('zrender/tool/guid')(),
        style : {
            x : 10, y : height/n * i + 30, r : 10,
            color : _getRandomColor()
        }
    }));
}
function _getRandomColor() {
    return 'rgba(' + Math.round(Math.random() * 256) + ','  + Math.round(Math.random() * 256) + ','  + Math.round(Math.random() * 256) + ', 0.8)'
}
var easingEffect = [
    'Linear',
    'ElasticIn', 'ElasticOut', 'ElasticInOut', 
    'BackIn', 'BackOut', 'BackInOut', 
    'BounceIn', 'BounceOut', 'BounceInOut'
]
for (var i = 0; i < n; i++) {
    zr.addShape(shapList[i]);
    zr.animate(shapList[i].id, "style", true)
        .when(2000, {
            x : width - 50
        })
        .when(4000, {
            x : 50
        })
        .start(easingEffect[i]);
}
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            },
            {
                name : 'ElasticOut',
                des : '创建类似于弹簧在停止前来回振荡的动画，例子见<a href="#animation.easing.ElasticIn">ElasticIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'ElasticInOut',
                des : '创建类似于弹簧在停止前来回振荡的动画，例子见<a href="#animation.easing.ElasticIn">ElasticIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'BackIn',
                des : '在某一动画开始沿指示的路径进行动画处理前稍稍收回该动画的移动，例子见<a href="#animation.easing.ElasticIn">ElasticIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'BackOut',
                des : '在某一动画开始沿指示的路径进行动画处理前稍稍收回该动画的移动，例子见<a href="#animation.easing.ElasticIn">ElasticIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'BackInOut',
                des : '在某一动画开始沿指示的路径进行动画处理前稍稍收回该动画的移动，例子见<a href="#animation.easing.ElasticIn">ElasticIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'BounceIn',
                des : '创建弹跳效果，例子见<a href="#animation.easing.ElasticIn">ElasticIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'BounceOut',
                des : '创建弹跳效果，例子见<a href="#animation.easing.ElasticIn">ElasticIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            },
            {
                name : 'BounceInOut',
                des : '创建弹跳效果，例子见<a href="#animation.easing.ElasticIn">ElasticIn</a>.',
                params : [
                    ['k', '{number}','时间百分比']
                ],
                res : ['percent', '{number}', '进度百分比']
            }
        ]
    }
];