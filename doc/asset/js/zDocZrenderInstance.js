description = description || {};
description.zrenderInstance = [
    {
        name: 'getId',
        des: '获取实例唯一标识',
        params: [],
        res: ['id', '{string}', 'ZRender索引，实例唯一标识']
    },
    {
        name: 'addShape',
        des: '添加形状到根节点',
        params: [
            ['shape', '{Object}', '详见各<a href="#shape">shape</a>']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        pre: (function() {
var CircleShape = require('zrender/shape/Circle');
var shapeId = require('zrender/tool/guid')();
// maybe is '123456'
zr.addShape(new CircleShape({ // add a shape with id '123456'
    id: shapeId,
    style: {
        x: 100,
        y: 100,
        r: 50,
        color: 'red'
    },
    clickable: true,
    onclick: function() {
        zr.modShape(shapeId, {
            style: {
                color: 'green'
            }
            });
        // modify the '123456' shape's color to be green
        zr.refresh();
    }
}));
zr.render();
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'delShape',
        des: '从根节点删除图形',
        params: [
            ['shapeId', '{string}', '形状对象唯一标识']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        pre: (function() {
var CircleShape = require('zrender/shape/Circle');
var shapeId = require('zrender/tool/guid')();
// maybe is '123456'
zr.addShape(new CircleShape({ // add a shape with id '123456'
    id: shapeId,
    style: {
        x: 100,
        y: 100,
        r: 50,
        color: 'red'
    },
    clickable: true,
    onclick: function() {
        zr.delShape(shapeId);
        // delete the '123456' shape
        zr.refresh();
    }
}));
zr.render();
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'modShape',
        des: '修改形状，使用例子查看<a href="#addShape">addShape</a>',
        params: [
            ['shapeId', '{string}', '形状对象唯一标识'],
            ['shape', '{Object}', '可选，形状对象，包含需要修改的属性，与原对象进行merge合并']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        cantry: false
    },
    {
        name: 'addGroup',
        des: '添加组到根节点',
        params: [
            ['group', '{Group}', '组对象']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        cantry: true
    },
    {
        name: 'modGroup',
        des: '修改组',
        params: [
            ['groupId', '{string}', '组对象唯一标识'],
            ['group', '{Object}', '可选，组对象，包含需要修改的属性，与原对象进行merge合并']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        cantry: true
    },
    {
        name: 'delGroup',
        des: '从根节点删除组',
        params: [
            ['groupId', '{string}', '组对象唯一标识']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        cantry: true
    },
    {
        name: 'addHoverShape',
        des: '添加额外高亮层显示图形，仅提供添加方法，每次刷新后高亮层图形均被清空，可用于事件触发时动态添加内容',
        params: [
            ['shape', '{Object}', '形状对象，包含需要修改的属性，与原对象进行merge合并']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        pre: (function() {
var CircleShape = require('zrender/shape/Circle');
var TextShape = require('zrender/shape/Text');
zr.addShape(new CircleShape({
    style: {
        x: 100,
        y: 100,
        r: 50,
        color: 'red'
    },
    onmouseover: function(param) {
        zr.addHoverShape(new TextShape({
            style: {
                x: 80,
                y: 30,
                color: 'red',
                text: 'Hello~'
            }
        }));
    }
}));
zr.render();
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'render',
        des: '渲染，完成添加图形后调用需要render才能触发绘画。',
        params: [
            ['callback', '{Function}', '渲染结束后回调函数']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        pre: (function() {
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style: {
        x: 100,
        y: 100,
        r: 50,
        color: 'red'
    }
}));
zr.render(function() {
    alert('render finished');
});
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'refresh',
        des: '视图更新，修改图形后调用refresh才能触发更新。考虑到性能和效率，并没有在图形对象被修改后立即更新，特别是在需要大批量修改图形的场景下，显式的由使用方在合适的时机调用refresh会更加高效。',
        params: [
            ['callback', '{Function}', '更新结束后回调函数']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        pre: (function() {
var shapeId = require('zrender/tool/guid')();
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    id: shapeId,
    style: {
        x: 400,
        y: 100,
        r: 50,
        color: 'red'
    },
    clickable: true,
    onclick: function() {
        zr.modShape(shapeId, {
            style: {
                color: 'green'
            }
        });
        // modify the '123456' shape's color to be green
        zr.refresh(function() {
            alert('refresh finished')
        });
    }
}));
zr.render();
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'refreshNextFrame',
        des: '标记下一帧做绘制',
        params: [],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        cantry: true
    },
    {
        name: 'update',
        des: '视图更新，除了refresh，当你需要批量更新图形形状，同时希望更新完后立即更新视图，可以用update',
        params: [
            ['shapeList', '{Array}', '需要更新的图形列表，shapeId将从每一个数组元素中查找以匹配需要修改的图形形状'],
            ['callback', '{Function}', '更新结束后回调函数']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        pre: (function() {
var CircleShape = require('zrender/shape/Circle');
var shapeList = [];
var shape;
for (var i = 0; i < 10; i++) {
    shape = new CircleShape({
        id: require('zrender/tool/guid')(),
        style: {
            x: Math.round(Math.random() * 500),
            y: Math.round(Math.random() * 300),
            r: Math.round(Math.random() * 50),
            color: 'red'
        }
    });
    zr.addShape(shape);
    shapeList.push(shape);
}
zr.render();

setTimeout(function() {
    for (var i = 0; i < 10; i++) {
        shapeList[i].style.color = 'green';
    }
    zr.update(shapeList, function() {
        alert('update finished')
    })
}, 1000);
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'resize',
        des: '重新计算绘图区域大小，画布大小在初始化时默认为init方法所传的dom节点大小（填满），后续dom节点大小的改变并不影响画布大小，当需要更新画布大小时可以使用这个方法。',
        params: [],
        res: ['self', '{ZRender}', '返回自身支持链式调用']
    },
    {
        name: 'animate',
        des: '创建一个animate对象, animate对象有三个方法，使用when方法设置帧，start方法开始动画，如果动画循环，可以使用stop停止动画，如果动画不循环，done方法则是动画完成的回调，查看<a href="example/slice.html" target="_blank">slice</a>源码',
        params: [
            ['shapeId', '{string}', '形状对象唯一标识'],
            ['path', '{string=}', '需要添加动画的属性获取路径，可以通过a.b.c来获取深层的属形'],
            ['loop', "{boolean=}", '动画是否循环']
        ],
        res: ['deffer', '{Object}', '动画的Deferred对象，支持链式调用，详见<a href="#animation.animation">animation</a>'],
        pre: (function() {
var CircleShape = require('zrender/shape/Circle');
var circle = new CircleShape({
    id: require('zrender/tool/guid')(),
    position: [100, 100],
    rotation: [0, 0, 0],
    scale: [1, 1],
    style: {
        x: 0,
        y: 0,
        r: 50,
        brushType: 'both',
        color: 'rgba(220, 20, 60, 0.8)',
        strokeColor: "rgba(220, 20, 60, 0.8)",
        lineWidth: 5,
        text: 'circle',
        textPosition: 'inside'
    },
    draggable: true
});
zr.addShape(circle);
zr.render();

zr.animate(circle.id, "", true)
    .when(1000, {
        position: [200, 0]
    })
    .when(2000, {
        position: [200, 200]
    }, "BounceIn")
    .when(3000, {
        position: [0, 200]
    })
    .when(4000, {
        position: [100, 100]
    }).start();
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'showLoading',
        des: 'loading显示',
        params: [
            ['loadingOption', '{Object}', 'loading参数，见下'],
            ['loadingOption.effect', '{Object=}', 'loading效果选项，效果各异。'],
            ['loadingOption.progress ', '{number=}', '指定当前进度。[0~1],部分效果有。'],
            ['loadingOption.textStyle', '{Object}', '文本样式，见下'],
            ['-.textStyle.text', '{string}', 'loading话术'],
            ['-.textStyle.x', '{string | number}', '水平安放位置，可指定x坐标'],
            ['-.textStyle.y', '{string | number}', '垂直安放位置，可指定y坐标'],
            ['-.textStyle.textFont', '{string}', '字体，默认为 "normal 20px Arial"'],
            ['-.textStyle.color', '{color}', '字体颜色，效果各异']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        pre: (function() {
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style: {x: 100, y: 100, r: 50, color: 'red'}
}));
zr.render();
require([
    'zrender/loadingEffect/Bar',
    'zrender/loadingEffect/Bubble',
    'zrender/loadingEffect/DynamicLine',
    'zrender/loadingEffect/Ring',
    'zrender/loadingEffect/Spin',
    'zrender/loadingEffect/Whirling'
    ],
    function(BarEffect,BubbleEffect,DynamicLineEffect,RingEffect,Spineffect,WhirlingEffect){
        var effectList = [
            new BarEffect(),
            new RingEffect(),
            //progress : [0~1],
            //effect : { // x,y,r0,r,color,textFont,textColor,timeInterval,n}
            new WhirlingEffect(),
            //effect : { // x,y,r,colorIn,colorOut,colorWhirl,timeInterval}
            new DynamicLineEffect(),
            //effect : { // lineWidth,color,timeInterval,n : 50}
            new BubbleEffect(),
            //effect : { // lineWidth,color,brushType,timeInterval,n}
            new Spineffect()
            //effect : { // x,y,r0,r,color,timeInterval,n}
        ];
        var curIdx = 0;
        zr.on('click', switchEffect);
        function switchEffect() {
            zr.showLoading(effectList[curIdx++ % effectList.length]);
        }
        switchEffect();
    }
)
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'hideLoading',
        des: 'loading显示',
        params: [],
        res: ['self', '{ZRender}', '返回自身支持链式调用']
    },
    {
        name: 'getWidth',
        des: '获取视图宽度',
        params: [],
        res: ['width', '{number}', '视图宽度'],
        pre: (function() {
alert(zr.getWidth());
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'getHeight',
        des: '获取视图高度',
        params: [],
        res: ['height', '{number}', '视图高度'],
        pre: (function() {
alert(zr.getHeight());
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'toDataURL',
        des: 'base64图片导出',
        params: [
            ['type', '{string}', '图片类型image/png，image/jpeg'],
            ['args', '{any}', '附加参数']
        ],
        res: ['res', '{string}', 'base64图片编码'],
        cantry: false
    },
    {
        name: 'on',
        des: '全局事件绑定',
        params: [
            ['eventName', '{string}', '事件名称，支持事件见<a href="#event">EVENT</a>'],
            ['eventHandler', '{Function}', '响应函数']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        pre: (function() {
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    clickable : true,
    style: {
        x: 100,
        y: 100,
        r: 50,
        color: 'red'
    }
}));
zr.render();

var config = require('zrender/config');
zr.on(
    config.EVENT.CLICK,
    function(params) {
        if (params.target) {
            alert('Click on shape!');
        }
        else {
            alert('None shape, but i catch you!');
        }
    }
);
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'un',
        des: '全局事件解绑定，参数为空则解绑所有自定义事件',
        params: [
            ['eventName', '{string}', '事件名称，支持事件见<a href="#zrenderInstance.event">EVENT</a>'],
            ['eventHandler', '{Function}', '响应函数']
        ],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        pre: (function() {
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    clickable : true,
    style: {
        x: 100,
        y: 100,
        r: 50,
        color: 'red'
    }
}));
zr.render();

var config = require('zrender/config');
zr.on(config.EVENT.CLICK, function(params) {
    if (params.target) {
        alert('Click on shape!');
    }
    else {
        alert('None shape, but i catch you and unbind all customer event handle');
        zr.un();
    }
});
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'clear',
        des: '清除当前ZRender下所有类图的数据和显示，clear后MVC和已绑定事件均还在在，ZRender可用',
        params: [],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        pre: (function() {
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    clickable : true,
    style: {
        x: 400,
        y: 200,
        r: 30,
        color: 'red',
        text: 'Click me to clear or click empty space to add!'
    }
}));
zr.render();

var config = require('zrender/config');
zr.on(config.EVENT.CLICK, function(params) {
    if (params.target) {
        zr.clear();
    }
    else {
        zr.addShape(new CircleShape({
            clickable : true,
            style: {
                x: Math.round(Math.random() * 500),
                y: Math.round(Math.random() * 300),
                r: Math.round(Math.random() * 50),
                color: 'red',
                text: 'try click again!'
            }
        }));
        zr.refresh();
    }
});
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'dispose',
        des: '释放当前ZR实例（删除包括dom，数据、显示和事件绑定），dispose后ZR不可用',
        params: [],
        res: ['self', '{ZRender}', '返回自身支持链式调用'],
        pre: (function() {
var shapeId = require('zrender/tool/guid')();
var t = 5;
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    id: shapeId,
    zlevel: 1,
    style: {
        x: 400, y: 200, r: 30, color: 'red',
        text: 'Dispose in 5s'
    }
}));
zr.render();

var config = require('zrender/config');
zr.on(config.EVENT.CLICK, function(params) {
    zr.addShape(new CircleShape({
        style: {
            x: Math.round(Math.random() * 500),
            y: Math.round(Math.random() * 300),
            r: Math.random() * 50,
            color: 'green',
            text: 'Alive!'
        }
    }));
    zr.refresh();
});

var ticket = setInterval(
    function() {
        if (--t == 0) {
            clearInterval(ticket);
            zr.dispose();
        }
        else {
            zr.modShape(
                shapeId,
                { style: { text: 'Dispose in' + t + ' s' }}
            );
            zr.refresh();
        }
    },
    1000
);
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'EVENT',
        des: '事件列表，位于config.EVENT，可通过<a href="zrenderInstance.on">on</a>绑定并响应下列事件。这是实例级全局事件响应（下称全局事件），响应优先级低于图形级事件（查看<a href="#shape.base.onclick">shape.base.on*</a>）并可以被图形级事件响应阻塞。回传参数见<a href="#zrenderInstance.eventPacket">eventPacket</a>',
        value: [
            ['RESIZE', '{string}', '窗口大小变化'],
            ['CLICK', '{string}', '鼠标按钮被（手指）按下，事件对象（eventPacket.target）是：目标图形元素或空'],
            ['MOUSEWHEEL', '{string}', '鼠标滚轮变化，事件对象（eventPacket.target）是：目标图形元素或空'],
            ['MOUSEMOVE', '{string}', '鼠标（手指）被移动，事件对象（eventPacket.target）是：目标图形元素或空'],
            ['MOUSEOVER', '{string}', '鼠标移到某图形元素之上，事件对象（eventPacket.target）是：目标图形元素'],
            ['MOUSEOUT', '{string}', '鼠标从某图形元素移开，事件对象（eventPacket.target）是：目标图形元素'],
            ['MOUSEDOWN', '{string}', '鼠标按钮（手指）被按下，事件对象（eventPacket.target）是：目标图形元素或空'],
            ['MOUSEUP', '{string}', '鼠标按键（手指）被松开，事件对象（eventPacket.target）是：目标图形元素或空'],
            ['DRAGSTART', '{string}', '开始拖拽时触发，一次成功元素拖拽的行为事件过程是：dragstart –> dragenter –> dragover [-> dragleave] –> drop –> dragend，事件对象（eventPacket.target）是：被拖拽图形元素'],
            ['DRAGEND', '{string}', '拖拽完毕时触发（在drop之后触发），事件对象（eventPacket.target）是：被拖拽图形元素'],
            ['DRAGENTER', '{string}', '拖拽图形元素进入目标图形元素时触发，事件对象（eventPacket.target）是：拖拽进入的目标图形元素，拖拽对象（eventPacket.dragged）是：被拖拽图形元素'],
            ['DRAGOVER', '{string}', '拖拽图形元素在目标图形元素上移动时触发，事件对象（eventPacket.target）是：拖拽目标图形元素，拖拽对象（eventPacket.dragged）是：被拖拽图形元素'],
            ['DRAGLEAVE', '{string}', '拖拽图形元素离开目标图形元素时触发，事件对象（eventPacket.target）是：拖拽离开的目标图形元素，拖拽对象（eventPacket.dragged）是：被拖拽图形元素'],
            ['DROP', '{string}', '拖拽图形元素放在目标图形元素内时触发，事件对象（eventPacket.target）是：拖拽目标图形元素，拖拽对象（eventPacket.dragged）是：被拖拽图形元素']
        ],
        pre: (function() {
var TextShape = require('zrender/shape/Text');
var logText = new TextShape({
    id: require('zrender/tool/guid')(),
    style: {x: 20, y: 20}
});
zr.addShape(logText);
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style: { x: 200, y: 200, r: 80, color: 'red' },
    clickable: true, draggable: true,
    _text: 'red'
}));
zr.addShape(new CircleShape({
    style: { x: 400, y: 200, r: 80, color: 'green' },
    clickable: true, draggable: true,
    _text: 'green'
}));
zr.render();
var config = require('zrender/config');
zr.on(config.EVENT.CLICK, _eventHandler);
zr.on(config.EVENT.MOUSEWHEEL, _eventHandler);
zr.on(config.EVENT.MOUSEOVER, _eventHandler);
zr.on(config.EVENT.MOUSEOUT, _eventHandler);
zr.on(config.EVENT.MOUSEDOWN, _eventHandler);
zr.on(config.EVENT.MOUSEUP, _eventHandler);
zr.on(config.EVENT.DRAGSTART, _eventHandler);
zr.on(config.EVENT.DRAGEND, _eventHandler);
zr.on(config.EVENT.DRAGENTER, _eventHandler);
zr.on(config.EVENT.DRAGOVER, _eventHandler);
zr.on(config.EVENT.DRAGLEAVE, _eventHandler);
zr.on(config.EVENT.DROP, _eventHandler);
function _eventHandler(params) {
    var text = params.type;
    if (params.target) { text += ' target : ' + params.target._text; }
    if (params.dragged) { text += ' dragged : ' + params.dragged._text; }
    zr.modShape(logText.id,{style:{text:text}});
    zr.refresh();console.log(text);
};
        }).toString().slice(13, -10),
        cantry: true
    },
    {
        name: 'eventPacket',
        des: '事件响应回传eventPacket {Object} 结构如下',
        value: [
            ['type', '{string}', '事件类型，如EVENT.CLICK'],
            ['event', '{event}', '原始dom事件对象'],
            ['target', '{Object=}', '当前图形shape对象'],
            ['dragged', '{Object=}', '当前被拖拽的图形shape对象']
        ],
        cantry : false
    }
];