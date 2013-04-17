(function(navZrender, navZrenderInstance, navShape, navTool, navAnimation, main){
    var description = {
        zrender : [
            {
                name : 'init',
                des : '一切从init开始！执行init后将得到zrender实例（文档后续将称之为“ZRender”），实例可用的接口方法见<a href="#zrenderInstance">ZRender</a>',
                params : [
                    ['dom', '{HTMLElement}','dom对象，偶懒，不帮你做document.getElementById了'],
                    ['params', '{Object=}','个性化参数，如自定义shape集合，带进来就好']
                ],
                res : ['ZRender', '{ZRender}', 'zrender实例，见<a href="#zrenderInstance">ZRender</a>'],
                pre :   " var zrender = require('zrender/zrender');" 
                    + "\n var zr = zrender.init(document.getElementById('main'));"
                    + "\n zr.addShape(...);"
                    + "\n zr.render();"
            },
            {
                name : 'dispose',
                des : 'zrender实例销毁，可以通过zrender.dispose(ZRender)销毁指定ZRender实例，当然也可以直接ZRender.dispose()自己销毁',
                params : [
                    ['zi', '{ZRender=}','ZRender对象，不传则销毁全部']
                ],
                res : ['self', '{zrender}', '返回自身支持链式调用'],
                pre :   " var zrender = require('zrender/zrender');" 
                    + "\n var zr = zrender.init(document.getElementById('main'));"
                    + "\n zr.dispose(); // == zrender.dispose(zr);"
            },
            {
                name : 'getInstance',
                des : '获取zrender实例',
                params : [
                    ['id', '{string}','ZRender索引，实例唯一标识']
                ],
                res : ['ZRender', '{ZRender}', 'zrender实例，见<a href="#zrenderInstance">ZRender</a>'],
                pre :   " var id = zr.getId();" 
                    + "\n zz = zrender.getInstance(id); // == zr "
            },
            {
                name : 'delInstance',
                des : '删除zrender实例，ZRender实例dispose时会自动调用，删除后getInstance则返回undefined，需要注意的是这仅是删除，删除的实例不代表已经dispose了~~这是一个摆脱全局zrender.dispose()自动销毁的后门，take care of yourself~',
                params : [
                    ['id', '{string}','ZRender索引，实例唯一标识']
                ],
                res : ['self', '{zrender}', '返回自身支持链式调用']
            },
            {
                name : 'catchBrushException',
                des : 'canvas绘图时是否使用异常捕获',
                value : [
                    [true, '{boolean}', '默认，发布用'],
                    [false, '{boolean}', '不使用try catch，可以在控制台上看到错误行，调试用']
                ]
            },
            {
                name : 'debugMode',
                des : 'debug日志选项，{number}，catchBrushException为true下有效，有效取值有<br>0 : 不生成debug数据，发布用<br>1 : 异常抛出，调试用<br>2 : 控制台输出，调试用'
            },
            {
                name : 'log',
                des : '根据debugMode设置会有不同的日志输出',
                params : [
                    ['arguments', '{Any}','日志内容']
                ],
                res : ['self', '{zrender}', '返回自身支持链式调用']
            }
        ],
        zrenderInstance : [
            {
                name : 'getId',
                des : '获取实例唯一标识',
                params : [],
                res : ['id', '{string}','ZRender索引，实例唯一标识']
            },
            {
                name : 'addShape',
                des : '添加图形形状',
                params : [
                    ['shape', '{Object}','形状对象，可用属性全集，建议创建并记录shape id可用于索引，更新，删除等，详见各<a href="#shape">shape</a>']
                ],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
var shapeId = zr.newShapeId();                                    // maybe is '123456'
zr.addShape({                                                     // add a shape with id '123456' 
     shape : 'circle',
     id : shapeId,
     style : { x : 100, y : 100, r : 50, color : 'red' },
     clickable : true,
     onclick : function() {
         zr.modShape(shapeId, { style : { color : 'green' } });    // modify the '123456' shape's color to be green 
         zr.refresh();
     }
 });
 zr.render(); 
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'delShape',
                des : '删除图形形状',
                params : [
                    ['shapeId', '{string}','形状对象唯一标识']
                ],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
var shapeId = zr.newShapeId();                                    // maybe is '123456'
zr.addShape({                                                     // add a shape with id '123456' 
    shape : 'circle',
    id : shapeId,
    style : { x : 100, y : 100, r : 50, color : 'red' },
    clickable : true,
    onclick : function() {
        zr.delShape(shapeId);                                     // delete the '123456' shape
        zr.refresh();
    }
});
zr.render(); 
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'modShape',
                des : '修改形状，使用例子查看<a href="#addShape">addShape</a>',
                params : [
                    ['shapeId', '{string}','形状对象唯一标识'],
                    ['shape', '{Object}','形状对象，包含需要修改的属性，与原对象进行merge合并']
                ],
                res : ['self', '{ZRender}', '返回自身支持链式调用']
            },
            {
                name : 'addHoverShape',
                des : '添加额外高亮层显示图形，仅提供添加方法，每次刷新后高亮层图形均被清空，可用于事件触发时动态添加内容',
                params : [
                    ['shape', '{Object}','形状对象，包含需要修改的属性，与原对象进行merge合并']
                ],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { x : 100, y : 100, r : 50, color : 'red' },
    onmouseover : function(param){
        zr.addHoverShape({
            shape : 'text',
            style : { x : 80, y : 30, color : 'red', text : 'Hello~' }
        });
    }
});
zr.render();                    
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'render',
                des : '渲染，完成添加图形后调用需要render才能触发绘画。',
                params : [
                    ['callback', '{Function}','渲染结束后回调函数']
                ],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { x : 100, y : 100, r : 50, color : 'red' }
});
zr.render(function(){
    alert('render finished');
});                    
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'refresh',
                des : '视图更新，修改图形后调用refresh才能触发更新。考虑到性能和效率，并没有在图形对象被修改后立即更新，特别是在需要大批量修改图形的场景下，显式的由使用方在合适的时机调用refresh会更加高效。',
                params : [
                    ['callback', '{Function}','更新结束后回调函数']
                ],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
var shapeId = zr.newShapeId(); 
zr.addShape({                  
    shape : 'circle',
    id : shapeId,
    style : { x : 400, y : 100, r : 50, color : 'red' },
    clickable : true,
    onclick : function() {
         zr.modShape(shapeId, { style : { color : 'green' } });    // modify the '123456' shape's color to be green 
         zr.refresh(function(){
            alert('refresh finished')
         });
     }
});
zr.render();
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'update',
                des : '视图更新，除了refresh，当你需要批量更新图形形状，同时希望更新完后立即更新视图，可以用update',
                params : [
                    ['shapeList', '{Array}', '需要更新的图形列表，shapeId将从每一个数组元素中查找以匹配需要修改的图形形状'],
                    ['callback', '{Function}','更新结束后回调函数']
                ],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
var shapeList = [];
var shape;
for (var i = 0; i < 10; i++){
    shape = {                  
        shape : 'circle',
        id : zr.newShapeId(),
        style : { 
            x : Math.round(Math.random()*500), 
            y : Math.round(Math.random()*300), 
            r : Math.round(Math.random()*50),
            color : 'red' 
        }
    };
    zr.addShape(shape);
    shapeList.push(shape);
}
zr.render();

setTimeout(function(){
    for (var i = 0; i < 10; i++){
        shapeList[i].style.color = 'green';
    } 
    zr.update(
        shapeList, 
        function() { alert('update finished') }
    )
}, 1000);
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'animate',
                des : '创建一个animate对象, animate对象有三个方法，使用when方法设置帧，start方法开始动画，如果动画循环，可以使用stop停止动画，如果动画不循环，done方法则是动画完成的回调，查看<a href="example/slice.html" target="_blank">slice</a>源码',
                params : [
                    ['shapeId', '{string}', '形状对象唯一标识'],
                    ['path', '{string=}', '需要添加动画的属性获取路径，可以通过a.b.c来获取深层的属形'],
                    ['loop', "{boolean=}", '动画是否循环']
                ],
                res : ['deffer', '{Object}', '动画的Deferred对象，支持链式调用，详见<a href="#animation.animation">animation</a>'],
                pre : (function(){
var circle = {
    shape : 'circle',
    id : zr.newShapeId(),
    position : [100, 100],
    rotation : [0, 0, 0],
    scale : [1, 1],
    style : {
        x : 0,
        y : 0,
        r : 50,
        brushType : 'both',
        color : 'rgba(220, 20, 60, 0.8)',
        strokeColor : "rgba(220, 20, 60, 0.8)",   
        lineWidth : 5,
        text :'circle',
        textPosition :'inside'
    },
    draggable : true
}
zr.addShape( circle );
zr.render();

zr.animate( circle.id, "", true )
    .when(1000, {
        position : [200, 0]
    })
    .when(2000, {
        position : [200, 200]
    }, "BounceIn")
    .when(3000, {
        position : [0, 200]
    })
    .when(4000, {
        position : [100, 100]
    })
    .start();
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'showLoading',
                des : 'loading显示',
                params : [
                    ['loadingOption', '{Object}', 'loading参数，见下'],
                    ['loadingOption.effect', '{string | Function}', 'loading效果，当前内置效果有"progressBar"（默认） | "dynamicLine" | "bubble"，详见<a href="tool.loadingEffect">tool.loadingEffect</a>可自定义效果函数，如有动态效果，需返回setInterval ID'],
                    ['loadingOption.textStyle', '{Object}', '文本样式，见下'],
                    ['-.textStyle.text', '{string}', 'loading话术'],
                    ['-.textStyle.x', '{string | number}', '水平安放位置，可指定x坐标'],
                    ['-.textStyle.y', '{string | number}', '垂直安放位置，可指定y坐标'],
                    ['-.textStyle.textFont', '{string}', '字体，默认为 "normal 20px Arial"'],
                    ['-.textStyle.color', '{color}', '字体颜色，效果各异']
                ],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { x : 100, y : 100, r : 50, color : 'red' }
});
zr.render();
zr.showLoading({
    effect : 'progressBar', // 'dynamicLine' | 'bubble'
    textStyle : {
        text : '装载中...',
        color : 'green'
    }
})
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'hideLoading',
                des : 'loading显示',
                params : [],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
zr.showLoading({
    effect : 'progressBar', // 'dynamicLine' | 'bubble'
    textStyle : {
        text : '装载中...',
        color : 'green'
    }
});
setTimeout(function() {
    zr.hideLoading();
    zr.addShape({
        shape : 'circle',
        style : { x : 100, y : 100, r : 50, color : 'red' }
    });
    zr.refresh();
}, 4000);
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'newShapeId',
                des : '生成形状唯一ID',
                params : [
                    ['idPrefix', '{string=}', 'id前缀']
                ],
                res : ['shapeId', '{string}', '可用不重复id'],
                pre : (function(){
var idList = [];
for (var i = 0; i < 10; i++) {
    idList.push(zr.newShapeId('myShape'))
}
alert(idList.join('\n'));
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'getWidth',
                des : '获取视图宽度',
                params : [],
                res : ['width', '{number}', '视图宽度'],
                pre : (function(){
alert(zr.getWidth());
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'getHeight',
                des : '获取视图高度',
                params : [],
                res : ['height', '{number}', '视图高度'],
                pre : (function(){
alert(zr.getHeight());
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'on',
                des : '全局事件绑定',
                params : [
                    ['eventName', '{string}', '事件名称，支持事件见<a href="#event">EVENT</a>'],
                    ['eventHandler', '{Function}', '响应函数']
                ],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { x : 100, y : 100, r : 50, color : 'red' }
});
zr.render();

var config = require('zrender/config');
zr.on(config.EVENT.CLICK, function(params) {
    if (params.target) {
        alert('Click on shape!');    
    }
    else {
        alert('None shape, but i catch you!');
    }
});
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'un',
                des : '全局事件解绑定，参数为空则解绑所有自定义事件',
                params : [
                    ['eventName', '{string}', '事件名称，支持事件见<a href="#zrenderInstance.event">EVENT</a>'],
                    ['eventHandler', '{Function}', '响应函数']
                ],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { x : 100, y : 100, r : 50, color : 'red' }
});
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
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'clear',
                des : '清除当前ZRender下所有类图的数据和显示，clear后MVC和已绑定事件均还在在，ZRender可用',
                params : [],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { 
        x : 400, 
        y : 200, 
        r : 30, 
        color : 'red' ,
        text : 'Click me to clear or click empty space to add!'
    }
});
zr.render();

var config = require('zrender/config');
zr.on(config.EVENT.CLICK, function(params) {
    if (params.target) {
        zr.clear();  
    }
    else {
        zr.addShape({
            shape : 'circle',
            style : { 
                x : Math.round(Math.random()*500), 
                y : Math.round(Math.random()*300), 
                r : Math.round(Math.random()*50), 
                color : 'red', 
                text : 'try click again!'
            }
        });
        zr.refresh();
    }
});
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'dispose',
                des : '释放当前ZR实例（删除包括dom，数据、显示和事件绑定），dispose后ZR不可用',
                params : [],
                res : ['self', '{ZRender}', '返回自身支持链式调用'],
                pre : (function(){
var shapeId = zr.newShapeId(); 
var t = 5;
zr.addShape({                  
    shape : 'circle',
    id : shapeId,
    zlevel : 1,
    style : { 
        x : 400, 
        y : 200, 
        r : 30, 
        color : 'red' ,
        text : 'Dispose in 5s'
    }
});
zr.render();

var config = require('zrender/config');
zr.on(config.EVENT.CLICK, function(params) {
    zr.addShape({                  
        shape : 'circle',
        style : { 
            x : Math.round(Math.random()*500), 
            y : Math.round(Math.random()*300), 
            r : Math.round(Math.random()*50), 
            color : 'green' ,
            text : 'Alive!'
        }
    });
    zr.refresh();
});

var ticket = setInterval(function() {
    if (--t == 0) {
        clearInterval(ticket);
        zr.dispose();
    }
    else {
        zr.modShape(shapeId, {
            style : {
                text : 'Dispose in' + t + ' s'
            }
        });
        zr.refresh();
    }
}, 1000);
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'EVENT',
                des : '事件列表，位于config.EVENT，可通过<a href="zrenderInstance.on">on</a>绑定并响应下列事件。这是实例级全局事件响应（下称全局事件），响应优先级低于图形级事件（查看<a href="#shape.base.onclick">shape.base.on*</a>）并可以被图形级事件响应阻塞。回传参数见<a href="#zrenderInstance.eventPacket">eventPacket</a>',
                value : [
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
                pre : (function(){
var logText = {
    shape : 'text',
    id : zr.newShapeId(),
    style : {x : 20, y : 20}
}
zr.addShape(logText);
zr.addShape({
    shape : 'circle',
    style : { x : 200, y : 200, r : 80, color : 'red' },
    clickable : true,
    draggable : true,
    _text : 'red circle'
});
zr.addShape({
    shape : 'circle',
    style : { x : 400, y : 200, r : 80, color : 'green' },
    clickable : true,
    draggable : true,
    _text : 'green circle'
});
zr.render();

var config = require('zrender/config');
zr.on(config.EVENT.RESIZE,      _eventHandler);
zr.on(config.EVENT.CLICK,       _eventHandler);
zr.on(config.EVENT.MOUSEWHEEL,  _eventHandler);
//zr.on(config.EVENT.MOUSEMOVE,   _eventHandler);
zr.on(config.EVENT.MOUSEOVER,   _eventHandler);
zr.on(config.EVENT.MOUSEOUT,    _eventHandler);
zr.on(config.EVENT.MOUSEDOWN,   _eventHandler);
zr.on(config.EVENT.MOUSEUP,     _eventHandler);
zr.on(config.EVENT.DRAGSTART,   _eventHandler);
zr.on(config.EVENT.DRAGEND,     _eventHandler);
zr.on(config.EVENT.DRAGENTER,   _eventHandler);
zr.on(config.EVENT.DRAGOVER,    _eventHandler);
zr.on(config.EVENT.DRAGLEAVE,   _eventHandler);
zr.on(config.EVENT.DROP,        _eventHandler);
            
function _eventHandler(params) {
    var text = params.type;
    if (params.target) {
        text += ' target : ' + params.target._text;
    }
    if (params.dragged) {
        text += ' dragged : ' + params.dragged._text;
    }
    console.log(text)
};
                }).toString().slice(12, -10),
                cantry : true
            },
            {
                name : 'eventPacket',
                des : '事件响应回传eventPacket {Object} 结构如下',
                value : [
                    ['type', '{string}','事件类型，如EVENT.CLICK'],
                    ['event', '{event}','原始dom事件对象'],
                    ['target', '{Object=}','当前图形shape对象'],
                    ['dragged', '{Object=}','当前被拖拽的图形shape对象']
                ]
            }
        ],
        shape : [
            {
                name : 'base',
                plus : true,
                des : 'shape基类，如无特殊说明base下属性和方法为所有图形通用',
                value : [
                    ['shape', '{string}', '基础属性，必须，shape类标识，详见<a href="#shape.base.shape">shape</a>'],
                    ['id', '{string}', '基础属性，必须，图形唯一标识，详见<a href="#shape.base.id">id</a>'],
                    ['zlevel', '{number}', '基础属性，默认为0，z层level，决定绘画在哪层canvas中，详见<a href="#shape.base.zlevel">zlevel</a>'],
                    ['invisible', '{boolean}', '基础属性，默认为false，是否可见，详见<a href="#shape.base.invisible">invisible</a>'],
                    ['style', '{Object}', '样式属性，必须，默认状态样式属性，详见<a href="#shape.base.style">style</a>'],
                    ['highlightStyle', '{Object}', '样式属性，默认同style，高亮状态样式属性，详见<a href="#shape.base.highlightStyle">highlightStyle</a>'],
                    ['position', '{array}', '样式属性，默认为[0, 0]，绘图坐标原点平移，详见<a href="#shape.base.position">position</a>'],
                    ['rotation', '{number}', '样式属性，默认为0，shape绕自身旋转的角度，详见<a href="#shape.base.rotation">rotation</a>'],
                    ['scale', '{array}', '样式属性，默认为[1, 1], shape纵横缩放比例，详见<a href="#shape.base.scale">scale</a>'],
                    ['hoverable', '{boolean}', '交互属性，默认为true，可悬浮响应，详见<a href="#shape.base.hoverable">hoverable</a>'],
                    ['clickable', '{boolean}', '交互属性，默认为false，可点击响应，详见<a href="#shape.base.clickable">clickable</a>'],
                    ['draggable', '{boolean}', '交互属性，默认为false，可拖拽响应，详见<a href="#shape.base.draggable">draggable</a>'],
                    ['onbrush', '{Function}', '事件属性，默认为null，当前图形被刷画时回调，可用于实现自定义绘画，详见<a href="#shape.base.onbrush">onbrush</a>'],
                    ['ondrift', '{Function}', '事件属性，默认为null，，详见<a href="#shape.base.ondrift">ondrift</a>'],
                    ['onclick', '{Function}', '事件属性，默认为null，，详见<a href="#shape.base.onclick">onclick</a>'],
                    ['onmousewheel', '{Function}', '事件属性，默认为null，当前图形上鼠标滚轮触发，详见<a href="#shape.base.onmousewheel">onmousewheel</a>'],
                    ['onmousemove', '{Function}', '事件属性，默认为null，当前图上形鼠标（或手指）移动触发，详见<a href="#shape.base.onmousemove">onmousemove</a>'],
                    ['onmouseover', '{Function}', '事件属性，默认为null，鼠标（或手指）移动到当前图形上触发，详见<a href="#shape.base.onmouseover">onmouseover</a>'],
                    ['onmouseout', '{Function}', '事件属性，默认为null，鼠标（或手指）从当前图形移开，详见<a href="#shape.base.onmouseout">onmouseout</a>'],
                    ['onmousedown', '{Function}', '事件属性，默认为null，鼠标按钮（或手指）按下，详见<a href="#shape.base.onmousedown">onmousedown</a>'],
                    ['onmouseup', '{Function}', '事件属性，默认为null，鼠标按钮（或手指）松开，详见<a href="#shape.base.onmouseup">onmouseup</a>'],
                    ['ondragstart', '{Function}', '事件属性，默认为null，开始拖拽时触发，详见<a href="#shape.base.ondragstart">ondragstart</a>'],
                    ['ondragend', '{Function}', '事件属性，默认为null，拖拽完毕时触发，详见<a href="#shape.base.ondragend">ondragend</a>'],
                    ['ondragenter', '{Function}', '事件属性，默认为null，拖拽图形元素进入目标图形元素时触发，详见<a href="#shape.base.ondragenter">ondragenter</a>'],
                    ['ondragover', '{Function}', '事件属性，默认为null，拽图形元素在目标图形元素上移动时触发，详见<a href="#shape.base.ondragover">ondragover</a>'],
                    ['ondragleave', '{Function}', '事件属性，默认为null，拖拽图形元素离开目标图形元素时触发，详见<a href="#shape.base.ondragleave">ondragleave</a>'],
                    ['ondrop', '{Function}', '事件属性，默认为null，拖拽图形元素放在目标图形元素内时触发，详见<a href="#shape.base.ondrop">ondrop</a>']
                ],
                content : [
                    {
                        name : 'shape',
                        des : '必须，{string}，shape类标识，需要显式指定，说明当前图形类型，如"circle", "sector", "polygon"等，详见shape下各类型'
                    },
                    {
                        name : 'id',
                        des : '必须，{string}，图形唯一标识，可通过zrender实例方法<a href="#zrenderInstance.newShapeId">newShapeId</a>生成'
                    },
                    {
                        name : 'zlevel',
                        des : '默认为0，{number}，z层level，决定绘画在哪层canvas中，数值越大离用户越近，正如css中zlevel的作用一样，你可以定义把不同的shape分别放在不同的层中，这不仅实现了视觉上的上下覆盖，更重要的是当图形元素发生变化后的refresh将局限在发生了变化的图形层中，这在你利用zrender做各种动画效果时将十分有用，性能自然也更加出色~ 读<a href="example/artist.html" target="_blank">artist</a>源码，理解分层的用意和好处。'
                    },
                    {
                        name : 'invisible',
                        des : '默认为false（可见），{boolean}，决定图形元素默认状态是否可见。虽然简单，但很有用。',
                        pre : (function(){
zr.addShape({
    shape : 'text',
    style : { 
        x : 20, 
        y : 20, 
        color : 'red' ,
        text : 'Find the circle! '
    }
});
zr.addShape({
    shape : 'circle',
    invisible : true,
    style : { 
        x : 400, 
        y : 200, 
        r : 100, 
        color : 'red' ,
        text : 'Wonderful! '
    }
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'style',
                        des : '默认状态样式属性，提供丰富统一的样式控制，各个图形差异见shape下各类型。',
                        value : [
                            ['brushType', '{string}', '默认为"fill"，绘画方式，fill(填充) | stroke(描边) | both(填充+描边)'],
                            ['color', '{color}', '默认为"#000"，填充颜色，支持rgba'],
                            ['strokeColor', '{color}', '默认为"#000"，描边颜色（轮廓），支持rgba'],
                            ['lineWidth', '{number}', '默认为1，线条宽度，描边下有效'],
                            ['opacity', '{number}', '默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加'],
                            ['shadowBlur', '{number}', '默认为0，阴影模糊度，大于0有效'],
                            ['shadowColor', '{color}', '默认为"#000"，阴影色彩，支持rgba'],
                            ['shadowOffsetX', '{number}', '默认为0，阴影横向偏移，正值往右，负值往左'],
                            ['shadowOffsetY', '{number}', '默认为0，阴影纵向偏移，正值往下，负值往上'],
                            ['text', '{string}', '默认为null，附加文本'],
                            ['textFont', '{string}', '默认为null，附加文本文字样式，eg:"bold 18px verdana"'],
                            ['textPosition', '{string}', '默认为top，线型默认为end，附加文本位置。inside | left | right | top | bottom | start | end，其中start end为线型（如line，brokenline）特有'],
                            ['textAlign', '{string}', '默认根据textPosition自动设置，附加文本水平对齐。start | end | left | right | center'],
                            ['textBaseline', '{string}', '默认根据textPosition自动设置，附加文本垂直对齐。top | bottom | middle | alphabetic | hanging | ideographic '],
                            ['textColor', '{color}', '默认根据textPosition自动设置，图形<a href="#shape.text">text</a>无此项，默认策略如下，附加文本颜色，textPosition == "inside" ? "#fff" : color']
                        ],
                        pre : (function(){
zr.addShape({
    shape : 'circle',
    style : {
        x : 200,
        y : 200,
        r : 100,
        color : 'rgba(220, 20, 60, 0.8)',          // rgba supported
        shadowBlur : 5,
        shadowColor : '#666',
        shadowOffsetX : 25,
        shadowOffsetY : -25,
        text :'circle',
        textFont : 'bold 25px verdana',
        textPosition :'inside',
        textAlign : 'left',
        textBaseline : 'top',
        textColor : 'yellow'
    },
    draggable : true
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'highlightStyle',
                        des : '默认同<a href="#shape.base.style">style</a>，高亮状态样式属性，可设置属性同<a href="#shape.base.style">style</a>，所有在hover层上显示（<a href="#zrenderInstance.addHoverShape">addHoverShape</a>）的图形均使用此属性。可以通过定义highlightStyle实现个性化的hover交互。',
                        pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { 
        x : 400, 
        y : 200, 
        r : 30, 
        color : 'red' ,
        text : 'Come on! Bigger! '
    },
    highlightStyle : {
        r : 80,
        color : 'green'
    }
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'position',
                        des : '默认为[0, 0]，默认绘图坐标原点在左上角，绘图坐标原点平移,可传数组长度为2的数组，数组各值定义如下',
                        value : [
                            ['{各异}', '{number}','横坐标'],
                            ['{各异}', '{number}','纵坐标']
                        ],
                        pre : (function(){
var origin = 10;
zr.addShape({
    shape : 'rectangle',
    style : { 
        x : 10, 
        y : 10, 
        width : 150,
        height : 30, 
        color : 'red' ,
        text : 'Click to position!',
        textPosition : 'inside'
    },
    position : [origin, origin],
    draggable : true,
    clickable : true,
    onclick : function(params) {
        origin += 10;
        zr.modShape(params.target.id, {position : [origin, origin]});
        zr.refresh();
    }
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'rotation',
                        des : '默认为0，shape旋转的角度，不被position影响，可传数组长度为3的数组，数组各值定义如下',
                        value : [
                            ['{各异}', '{number}','旋转角度，单位弧度'],
                            ['{各异}', '{number=}','默认为0，旋转中心横坐标，单位px'],
                            ['{各异}', '{number=}','默认为0，旋转中心纵坐标，单位px']
                        ],
                        pre : (function(){
var tenDeg = Math.PI / 18;
var origin = tenDeg;
zr.addShape({
    shape : 'rectangle',
    style : { 
        x : 100, 
        y : 100, 
        width : 160,
        height : 40, 
        color : 'red' ,
        text : 'Click to rotation!',
        textPosition : 'inside'
    },
    rotation : [tenDeg, 180, 120],
    draggable : true,
    clickable : true,
    onclick : function(params) {
        origin += tenDeg;
        zr.modShape(params.target.id, {rotation : [origin, 180, 120]});
        zr.refresh();
    }
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'scale',
                        des : '默认为[1, 1], shape纵横缩放比例，不被position影响，可传数组长度为4的数组，数组各值定义如下',
                        value : [
                            ['{各异}', '{number}','横向缩放比例，>1放大，<1缩小'],
                            ['{各异}', '{number}','纵向缩放比例，>1放大，<1缩小'],
                            ['{各异}', '{number=}','默认为0，缩放中心横坐标，单位px'],
                            ['{各异}', '{number=}','默认为0，缩放中心纵坐标，单位px']
                        ],
                        pre : (function(){
var origin = 1.1;
zr.addShape({
    shape : 'rectangle',
    style : { 
        x : 100, 
        y : 100, 
        width : 160,
        height : 40, 
        color : 'red' ,
        text : 'Click to scale!',
        textPosition : 'inside'
    },
    scale : [origin, origin, 180, 120],
    draggable : true,
    clickable : true,
    onclick : function(params) {
        origin += 0.1;
        zr.modShape(params.target.id, {scale : [origin, origin, 180, 120]});
        zr.refresh();
    }
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'hoverable',
                        des : '默认为true，可悬浮响应，默认悬浮响应为高亮显示，可在<a href="#shape.base.ondrift">onbrush</a>中捕获并阻塞高亮绘画',
                        pre : (function(){
zr.addShape({
    shape : 'circle',
    hoverable : false,
    style : { 
        x : 200, 
        y : 200, 
        r : 100, 
        color : 'red',
        text : 'Hover silent! Click to change!',
        textPosition : 'inside'
    },
    highlightStyle : {
        color : 'green'
    },
    clickable : true,
    onclick : function(params) {
        var target = params.target;
        var curHoverableState = !target.hoverable;
        zr.modShape(
            target.id, 
            {
                hoverable : curHoverableState,
                style : {
                    text : (curHoverableState ? 'Hoverable!' : 'Hover silent!') + ' Click to change!'
                }
            }
        );
        zr.refresh();
    }
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'clickable',
                        des : '默认为false，可点击响应，可在onclick中捕获并阻塞全局click响应',
                        pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { 
        x : 200, 
        y : 200, 
        r : 80, 
        color : 'red',
        text : 'Click silent!',
        textPosition : 'inside'
    }
});
zr.addShape({
    shape : 'circle',
    clickable : true,
    style : { 
        x : 400, 
        y : 200, 
        r : 80, 
        color : 'red',
        text : 'Clickable!',
        textPosition : 'inside'
    }
});
zr.render();
var config = require('zrender/config');
zr.on(config.EVENT.CLICK, function(params) {
    if (params.target) {
        alert('Click on shape!');    
    }
    else {
        alert('None shape, but i catch you!');
    }
});
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'draggable',
                        des : '默认为false，可拖拽响应，默认拖拽响应改变图形位置，可在ondrift中捕获并阻塞默认拖拽行为',
                        pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { 
        x : 200, 
        y : 200, 
        r : 80, 
        color : 'red',
        text : 'Stillness !',
        textPosition : 'inside'
    }
});
zr.addShape({
    shape : 'circle',
    draggable : true,
    style : { 
        x : 400, 
        y : 200, 
        r : 80, 
        color : 'red',
        text : 'Draggable!',
        textPosition : 'inside'
    }
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'onbrush',
                        des : '默认为null，当前图形被刷画时回调，可用于实现自定义绘画等，回传参数和有效返回值见下',
                        params : [
                            ['context', '{2D Context}','当前canvas context'],
                            ['shape', '{Object}','当前shape'],
                            ['isHighlight', '{boolean}','是否高亮状态']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（不执行默认绘画）| false（执行默认绘画）<br/> 无返回值，等同返回false'
                        ],
                        pre : (function(){
var block = true;
zr.addShape({
    shape : 'circle',
    style : { 
        x : 400, 
        y : 200, 
        r : 80, 
        color : 'red',
        text : 'Hover & click!',
        textPosition : 'inside'
    },
    highlightStyle : {
        r : 100,
        color : 'green'
    },
    clickable : true,
    onbrush : function(context, shape, isHighlight) {
        if (isHighlight) {
            // 绘画高亮状态时刻（鼠标悬浮），context为hover层的canvas 2D context，可以直接用原生方法实现自定义绘画
            context.fillText("捕获高亮时刻，" + (block ? "" : "不") + "阻塞默认高亮绘画，点击改变" , 100, 100);
            return block;    // 返回true可以阻塞默认高亮显示
        }
        else {
            // 绘画默认状态时刻
        }
    },
    onclick : function() {
        block = !block;
    }

});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'ondrift',
                        des : '默认为null，当前图形被拖拽改变位置时回调，可用于限制拖拽范围等，回传参数和有效返回值见下',
                        params : [
                            ['shape', '{Object}','当前shape'],
                            ['dx', '{number}','x方向变化值'],
                            ['dy', '{number}','y方向变化']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（不执行默认拖拽计算）| false（执行默认拖拽计算）<br/> 无返回值，等同返回false'
                        ],
                        pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { 
        x : 400, 
        y : 200, 
        r : 80, 
        color : 'red',
        text : 'Drag horizontal only!',
        textPosition : 'inside'
    },
    draggable : true,
    ondrift : function(shape, dx, dy) {
        shape.style.x += dx;
        zr.modShape(shape.id, shape);
        zr.refresh();
        return true;
    }
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'onclick',
                        des : '默认为null，当前图形点击响应，回传参数和有效返回值见下',
                        params : [
                            ['eventPacket', '{Object}','事件包，结构如下'],
                            ['eventPacket.type', '{string}','事件类型为EVENT.CLICK'],
                            ['eventPacket.event', '{event}','原始dom事件对象'],
                            ['eventPacket.target', '{Object}','当前图形shape对象']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（不阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ],
                        pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { 
        x : 200, 
        y : 200, 
        r : 80, 
        color : 'red',
        text : 'click and block!',
        textPosition : 'inside'
    },
    clickable : true,
    onclick : function() {
        alert('click on red shape!')
        return true;    // 阻塞全局zrender事件
    }
});
zr.addShape({
    shape : 'circle',
    style : { 
        x : 400, 
        y : 200, 
        r : 80, 
        color : 'green',
        text : 'click!',
        textPosition : 'inside'
    },
    clickable : true,
    onclick : function() {
        alert('click on green shape!')
    }
});
zr.render();

var config = require('zrender/config');
zr.on(config.EVENT.CLICK, function(params) {
    if (params.target) {
        alert('Global catch! Click on shape!');    
    }
    else {
        alert('Global catch! None shape, but i catch you!');
    }
});
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'onmousewheel',
                        des : '默认为null，当前图形上鼠标滚轮触发，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.MOUSEWHEEL']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ],
                        pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { 
        x : 400, 
        y : 200, 
        r : 100, 
        color : 'red',
        text : 'mousewheel',
        textPosition : 'inside'
    },
    onmousewheel : function(params) {
        var zrEvent = require('zrender/tool/event');
        var shape = params.target;
            
        var event = params.event;
        var delta = zrEvent.getDelta(event);
        delta = delta > 0 ? 3 : (-3);
        shape.style.r += delta;
        shape.style.r = shape.style.r < 5 ? 5 : shape.style.r;
        
        zr.modShape(shape.id, shape);
        zr.refresh();
        zrEvent.stop(event);
    }
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'onmousemove',
                        des : '默认为null，当前图上形鼠标（或手指）移动触发，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.MOUSEMOVE']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ],
                        pre : (function(){
var shapeId = zr.newShapeId();                                    
zr.addShape({                                                     
    shape : 'text',
    id : shapeId,
    style : { x : 10, y : 10}
});                            
zr.addShape({
    shape : 'circle',
    style : { 
        x : 400, 
        y : 200, 
        r : 100, 
        color : 'red',
        text : 'mousemove',
        textPosition : 'inside'
    },
    onmousemove : function(params) {
        var shape = params.target;
            
        shape.style.text = 'Catch your mousemove!';
        
        zr.modShape(shape.id, shape);
        zr.refresh();
        return true;
    }
});
zr.render();

var config = require('zrender/config');
zr.on(config.EVENT.MOUSEMOVE, function(params) {
    var zrEvent = require('zrender/tool/event');        
    var event = params.event;
    zr.modShape(
        shapeId, 
        {
            style : {
                text : 'Global catch! mousemove on (' 
                       + zrEvent.getX(event) 
                       + ', '
                       + zrEvent.getY(event) + ')'
            }
        }
    );
    zr.refresh();
});
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'onmouseover',
                        des : '默认为null，鼠标（或手指）移动到当前图形上触发，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.MOUSEOVER']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ],
                        pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { 
        x : 200, 
        y : 200, 
        r : 100, 
        color : 'red',
        text : 'Mouse over & out!',
        textFont : 'bold 18px Arial',
        textPosition : 'inside'
    },
    onmouseover : function(params) {
        _update(params.target, 'Catch your! over!');
    },
    onmouseout : function(params) {
        _update(params.target, 'Catch your! out!');
    }
});

zr.addShape({
    shape : 'circle',
    hoverable : false,
    style : { 
        x : 400, 
        y : 200, 
        r : 100, 
        color : 'green',
        text : 'Mouse down & up!',
        textFont : 'bold 18px Arial',
        textPosition : 'inside'
    },
    onmousedown : function(params) {
        _update(params.target, 'Catch your! down!');
    },
    onmouseup : function(params) {
        _update(params.target, 'Catch your! up!');
    }
});

zr.render();

function _update(shape, text) {
    shape.style.text = text;
    zr.modShape(shape.id, shape);
    zr.refresh();
}
                        }).toString().slice(12, -10),
                        cantry : true
                    },
                    {
                        name : 'onmouseout',
                        des : '默认为null，鼠标（或手指）从当前图形移开，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下，使用例子查看<a href="#shape.base.onmouseover">onmouseover</a>',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.MOUSEOUT']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ]                        
                    },
                    {
                        name : 'onmousedown',
                        des : '默认为null，鼠标按钮（或手指）按下，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下，使用例子查看<a href="#shape.base.onmouseover">onmouseover</a>',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.MOUSEDOWN']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ]
                    },
                    {
                        name : 'onmouseup',
                        des : '默认为null，鼠标按钮（或手指）松开，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下，使用例子查看<a href="#shape.base.onmouseover">onmouseover</a>',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.MOUSEUP']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ]
                    },
                    {
                        name : 'ondragstart',
                        des : '默认为null，开始拖拽时触发，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下，',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.DRAGSTART']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ],
                        pre : (function(){
zr.addShape({
    shape : 'circle',
    style : { x : 200, y : 200, r : 60, color : 'red'},
    _name : 'red',
    draggable : true,
    ondragstart : function(params) {
        _update(params.target, 'Catch your! start!');
    },
    ondragend : function(params) {
        _update(params.target, 'Catch your! end!');
    },
    ondragenter : function(params) {
        _update(params.target, 'Catch your!' + params.dragged._name + ' enter!');
    },
    ondragover : function(params) {
        _update(params.target, 'Catch your!' + params.dragged._name + ' over!');
    },
    ondragleave : function(params) {
        _update(params.target, 'Catch your!' + params.dragged._name + ' leave!');
    },
    ondrop : function(params) {
        _update(params.target, 'Catch your!' + params.dragged._name + ' drop!');
    }
});

zr.addShape({
    shape : 'circle',    
    style : { x : 400, y : 200, r : 60, color : 'green'},
    _name : 'green',
    draggable : true,
    ondragstart : function(params) {
        _update(params.target, 'Catch your! start!');
    },
    ondragend : function(params) {
        _update(params.target, 'Catch your! end!');
    },
    ondragenter : function(params) {
        _update(params.target, 'Catch your!' + params.dragged._name + ' enter!');
    },
    ondragover : function(params) {
        _update(params.target, 'Catch your!' + params.dragged._name + ' over!');
    },
    ondragleave : function(params) {
        _update(params.target, 'Catch your!' + params.dragged._name + ' leave!');
    },
    ondrop : function(params) {
        _update(params.target, 'Catch your!' + params.dragged._name + ' drop!');
    }
});

zr.render();

function _update(shape, text) {
    shape.style.text = text;
    zr.modShape(shape.id, shape);
    zr.refresh();
}
                        }).toString().slice(12, -10),
                        cantry : true 
                    },
                    {
                        name : 'ondragend',
                        des : '默认为null，拖拽完毕时触发，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下，使用例子查看<a href="#shape.base.ondragstart">ondragstart</a>',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.DRAGEND']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ]
                    },
                    {
                        name : 'ondragenter',
                        des : '默认为null，拖拽图形元素进入目标图形元素时触发，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下，使用例子查看<a href="#shape.base.ondragstart">ondragstart</a>',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.DRAGENTER'],
                            ['eventPacket.target', '{Object}','目标图形元素shape对象'],
                            ['eventPacket.dragged', '{Object}','拖拽图形元素shape对象']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ]
                    },
                    {
                        name : 'ondragover',
                        des : '默认为null，拖拽图形元素在目标图形元素上移动时触发，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下，使用例子查看<a href="#shape.base.ondragstart">ondragstart</a>',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.DRAGOVER'],
                            ['eventPacket.target', '{Object}','目标图形元素shape对象'],
                            ['eventPacket.dragged', '{Object}','拖拽图形元素shape对象']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ]
                    },
                    {
                        name : 'ondragenter',
                        des : '默认为null，拖拽图形元素进入目标图形元素时触发，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下，使用例子查看<a href="#shape.base.ondragstart">ondragstart</a>',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.DRAGENTER'],
                            ['eventPacket.target', '{Object}','目标图形元素shape对象'],
                            ['eventPacket.dragged', '{Object}','拖拽图形元素shape对象']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ]
                    },
                    {
                        name : 'ondragleave',
                        des : '默认为null，拖拽图形元素离开目标图形元素时触发，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下，使用例子查看<a href="#shape.base.ondragstart">ondragstart</a>',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.DRAGLEAVE'],
                            ['eventPacket.target', '{Object}','目标图形元素shape对象'],
                            ['eventPacket.dragged', '{Object}','拖拽图形元素shape对象']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ]
                    },
                    {
                        name : 'ondrop',
                        des : '默认为null，拖拽图形元素放在目标图形元素内时触发，回传参数格式见<a href="#zrenderInstance.eventPacket">eventPacket</a>，参数差异和有效返回值见下，使用例子查看<a href="#shape.base.ondragstart">ondragstart</a>',
                        params : [
                            ['eventPacket.type', '{string}','事件类型为EVENT.DRAG'],
                            ['eventPacket.target', '{Object}','目标图形元素shape对象'],
                            ['eventPacket.dragged', '{Object}','拖拽图形元素shape对象']
                        ],
                        res : [
                            'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                        ]
                    }
                ]
            },
            {
                name : 'circle',
                plus : true,
                des : 'shape类：圆形，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
                content : [
                    {
                        name : 'style',
                        des : '圆形特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                        value : [
                            ['x', '{number}','必须，圆心横坐标，单位px'],
                            ['y', '{number}','必须，圆心纵坐标，单位px'],
                            ['r', '{number}','必须，圆半径，单位px']
                        ],
                        pre : (function(){
// 圆形
zr.addShape({
    shape : 'circle',
    style : {
        x : 100,
        y : 100,
        r : 50,
        color : 'rgba(135, 206, 250, 0.8)',          // rgba supported
        text :'circle',
        textPosition :'inside'
    },
    draggable : true
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    }
                ]
            },
            {
                name : 'ellipse',
                plus : true,
                des : 'shape类：椭圆，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
                content : [
                    {
                        name : 'style',
                        des : '椭圆特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                        value : [
                            ['x', '{number}','必须，圆心横坐标，单位px'],
                            ['y', '{number}','必须，圆心纵坐标，单位px'],
                            ['a', '{number', '必须，椭圆横轴半径'],
                            ['b', '{number', '必须，椭圆纵轴半径']
                        ],
                        pre : (function(){
// 椭圆
zr.addShape({
    shape : 'ellipse',
    style : {
        x : 200,
        y : 200,
        a : 100,
        b : 50,
        color : 'rgba(135, 206, 250, 0.8)',          // rgba supported
        text :'ellipse',
        textPosition :'inside'
    },
    draggable : true
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    }
                ]
            },
            {
                name : 'sector',
                plus : true,
                des : 'shape类：扇形，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
                content : [
                    {
                        name : 'style',
                        des : '扇形特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                        value : [
                            ['x', '{number}','必须，圆心横坐标，单位px'],
                            ['y', '{number}','必须，圆心纵坐标，单位px'],
                            ['r0', '{number=}','默认为0，内圆半径，单位px'],
                            ['r', '{number}','必须，外圆半径，单位px'],
                            ['startAngle', '{number}','必须，起始角度[0, 360)，单位度'],
                            ['endAngle', '{number}','必须，起始角度(0, 360]，单位度']
                        ],
                        pre : (function(){
// 扇形
zr.addShape({
    shape : 'sector',
    style : {
        x : 200,
        y : 200,
        r : 100,
        r0 : 50,
        startAngle : 30,
        endAngle : 90,
        color : 'rgba(135, 206, 250, 0.8)',
        text:'sector',
        textPosition:'inside'
    },
    draggable : true
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    }
                ]
            },
            {
                name : 'ring',
                plus : true,
                des : 'shape类：圆环，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
                content : [
                    {
                        name : 'style',
                        des : '圆环特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                        value : [
                            ['x', '{number}','必须，圆心横坐标，单位px'],
                            ['y', '{number}','必须，圆心纵坐标，单位px'],
                            ['r0', '{number}','必须，内圆半径，单位px'],
                            ['r', '{number}','必须，外圆半径，单位px']
                        ],
                        pre : (function(){
// 圆环
zr.addShape({
    shape : 'ring',
    style : {
        x : 200,
        y : 200,
        r : 100,
        r0 : 50,
        color : 'rgba(135, 206, 250, 0.8)',
        text:'ring',
        textPosition:'inside'
    },
    draggable : true
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    }
                ]
            },
            {
                name : 'rectangle',
                plus : true,
                des : 'shape类：矩形，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
                content : [
                    {
                        name : 'style',
                        des : '矩形特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                        value : [
                            ['x', '{number}','必须，左上角横坐标，单位px'],
                            ['y', '{number}','必须，左上角纵坐标，单位px'],
                            ['width', '{number}','必须，宽度，单位px'],
                            ['height', '{number}','必须，高度，单位px']
                        ],
                        pre : (function(){
// 矩形
zr.addShape({
    shape : 'rectangle',
    style : {
        x : 100,
        y : 100,
        width : 100,
        height : 50,
        color : 'rgba(135, 206, 250, 0.8)',
        text:'rectangle',
        textPosition:'inside'
    },
    draggable : true
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    }
                ]
            },
            {
                name : 'polygon',
                plus : true,
                des : 'shape类：多边形，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
                content : [
                    {
                        name : 'style',
                        des : '多边形特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                        value : [
                            ['pointList', '{Array}','必须，多边形各个顶角坐标，单位px']
                        ],
                        pre : (function(){
// 多边形
zr.addShape({
    shape : 'polygon',
    style : {
        pointList : [[310, 120], [360, 120], [348, 230], [250, 340], [146, 200]],
        color : 'rgba(135, 206, 250, 0.8)',
        text:'polygon',
        textPosition:'inside'
    },
    draggable : true
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    }
                ]
            },
            {
                name : 'path',
                plus : true,
                des : 'shape类：路径，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
                content : [
                    {
                        name : 'style',
                        des : '路径特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                        value : [
                            ['x', '{number}','必须，横坐标，单位px'],
                            ['y', '{number}','必须，纵坐标，单位px'],
                            ['path', '{string}','必须，路径。M = moveto | L = lineto | H = horizontal lineto | V = vertical lineto | C = curveto | S = smooth curveto | Q = quadratic Belzier curve | T = smooth quadratic Belzier curveto | Z = closepath']
                        ],
                        pre : (function(){
// 路径
zr.addShape({
    shape : 'path',
    style : {
        x : 100,
        y : 100,
        path : 'M 0 0 L -100 100 L 100 100 Z',
        color : 'rgba(135, 206, 250, 0.8)',
        text:'path',
        textPosition:'inside',
        textColor : 'red'
    },
    draggable : true
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    }
                ]
            },
            {
                name : 'line',
                plus : true,
                des : 'shape类：直线，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
                content : [
                    {
                        name : 'style',
                        des : '直线特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                        value : [
                            ['xStart', '{number}','必须，起点横坐标，单位px'],
                            ['yStart', '{number}','必须，起点纵坐标，单位px'],
                            ['xEnd', '{number=}','必须，终点横坐标，单位px'],
                            ['yEnd', '{number}','必须，终点纵坐标，单位px'],
                            ['lineType', '{string}','默认为solid，线条类型，solid | dashed | dotted'],
                            ['lineCap', '{string}','默认为butt，线帽样式。butt | round | square']
                        ],
                        pre : (function(){
// 直线
zr.addShape({
    shape : 'line',
    style : {
        xStart : 100,
        yStart : 100,
        xEnd : 400,
        yEnd : 300,
        strokeColor : 'rgba(135, 206, 250, 0.8)',   // == color
        lineWidth : 5,
        lineCap : 'round',
        lineType : 'dashed',
        text:'line',
        textPosition:'end'
    },
    draggable : true
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    }
                ]
            },
            {
                name : 'brokenLine',
                plus : true,
                des : 'shape类：折线，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
                content : [
                    {
                        name : 'style',
                        des : '折线特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                        value : [
                            ['pointList', '{Array}','必须，多边形各个顶角坐标，单位px'],
                            ['lineType', '{string}','默认为solid，线条类型，solid | dashed | dotted'],
                            ['lineCap', '{string}','默认为butt，线帽样式。butt | round | square'],
                            ['lineJoin', '{string}','默认为miter，线段连接样式。miter | round | bevel'],
                            ['miterLimit' , '{number}','默认为10，最大斜接长度，仅当lineJoin为miter时生效']
                        ],
                        pre : (function(){
// 折线
zr.addShape({
    shape : 'brokenLine',
    style : {
        pointList : [[310, 120], [620, 190], [328, 260], [250, 340], [146, 200]],
        strokeColor : 'rgba(135, 206, 250, 0.8)',   // == color
        lineWidth : 5,
        lineCap : 'round',
        lineType : 'dashed',
        lineJoin : 'miter',
        miterLimit : 50,
        text:'brokenLine',
        textPosition:'end'
    },
    draggable : true
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    }
                ]
            },
            {
                name : 'text',
                plus : true,
                des : 'shape类：文字，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
                content : [
                    {
                        name : 'style',
                        des : '文字特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。其中textPosition，textColor无效',
                        value : [
                            ['x', '{number}','必须，横坐标，单位px'],
                            ['y', '{number}','必须，纵坐标，单位px'],
                            ['maxWidth' , '{number}','默认为null，文本最大宽度，超出最大宽度自适应缩小']
                        ],
                        pre : (function(){
// 文字
zr.addShape({
    shape : 'text',
    style : {
       x : 200,
       y : 100,
       brushType : 'both',
       color : 'rgba(30, 144, 255, 0.8)',
       strokeColor : 'rgba(255, 0, 0, 0.5)',
       lineWidth : 8,
       text : 'Baidu',
       textFont : 'bold 80px Arial',
       shadowColor : 'rgba(255, 250, 0, 0.5)',
       shadowOffsetX : 5,
       shadowOffsetY : 5,
       shadowBlur : 5
    },
    draggable : true
});
zr.render();
                        }).toString().slice(12, -10),
                        cantry : true
                    }
                ]
            }
        ],
        tool : [
            {
                name : 'area',
                plus : true,
                des : '图形空间辅助类，位于tool/area',
                value : [
                    ['isInside', '{Function}','包含判断'],
                    ['isOutside', '{Function}','!isInside']
                ],
                content : [
                    {
                        name : 'isInside',
                        des : '区域包含判断',
                        params : [
                            ['zoneType', '{string}','图形类别，如：circle，rectangle，见shape.*'],
                            ['area', '{Object}', '目标区域描述格式同各shape.style，如<a href="#shape.circle.style">circle.style</a>'],
                            ['x', '{number}', '横坐标'],
                            ['y', '{number}', '纵坐标']
                        ],
                        res : ['isIn', '{boolean}', '点(x,y)是否包含在区域area里']
                    },
                    {
                        name : 'isOutside',
                        des : '区域不包含判断，等同于!isInside，参数同<a href="#tool.area.isInside">isInside</a>',
                        params : [
                            ['zoneType', '{string}','图形类别，如：circle，rectangle，见shape.*'],
                            ['area', '{Object}', '目标区域描述格式同各shape.style，如<a href="#shape.circle.style">circle.style</a>'],
                            ['x', '{number}', '横坐标'],
                            ['y', '{number}', '纵坐标']
                        ],
                        res : ['isOut', '{boolean}', '点(x,y)是否不包含在区域area里']
                    }
                ]
            },
            {
                name : 'event',
                plus : true,
                des : '事件辅助类，位于tool/event',
                content : [
                    {
                        name : 'getX',
                        des : '获取事件横坐标，使用例子见<a href="#shape.base.onmousemove">onmousemove</a>',
                        params : [
                            ['e', '{event}','必须，dom事件，tip：响应函数回调参数<a href="#zrenderInstance.eventPacket">eventPacket</a>中包含event。']
                        ],
                        res : ['x', '{number}', '鼠标（手指）x坐标']
                    },
                    {
                        name : 'getY',
                        des : '获取事件纵坐标，使用例子见<a href="#shape.base.onmousemove">onmousemove</a>',
                        params : [
                            ['e', '{event}','必须，dom事件，tip：响应函数回调参数<a href="#zrenderInstance.eventPacket">eventPacket</a>中包含event。']
                        ],
                        res : ['y', '{number}', '鼠标（手指）y坐标']
                    },
                    {
                        name : 'getDelta',
                        des : '鼠标滚轮变化，使用例子见<a href="#shape.base.onmousewheel">onmousewheel</a>',
                        params : [
                            ['e', '{event}','必须，dom事件，tip：响应函数回调参数<a href="#zrenderInstance.eventPacket">eventPacket</a>中包含event。']
                        ],
                        res : ['detail', '{number}', '滚轮变化，正值说明滚轮是向上滚动，如果是负值说明滚轮是向下滚动']
                    },
                    {
                        name : 'stop',
                        des : '停止冒泡和阻止默认行为，使用例子见<a href="#shape.base.onmousewheel">onmousewheel</a>',
                        params : [
                            ['e', '{event}','必须，dom事件，tip：响应函数回调参数<a href="#zrenderInstance.eventPacket">eventPacket</a>中包含event。']
                        ],
                        res : ['无', '无', '无']
                    },
                    {
                        name : 'Dispatcher',
                        des : '事件分发器（类）',
                        value : [
                            ['one', '{Function}','单次触发绑定，dispatch后销毁'],
                            ['bind', '{Function}','事件绑定'],
                            ['unbind', '{Function}','事件解绑定'],
                            ['dispatch', '{Function}','事件分发']
                        ],
                        pre : (function(){
var myMessageCenter = {};   // 添加消息中心的事件分发器特性
var zrEvent = require('zrender/tool/event');
zrEvent.Dispatcher.call(myMessageCenter);
myMessageCenter.bind(
    'MY_MESSAGE', 
    function (eventPacket) { 
        alert('get it! ' + eventPacket.type + ' ' + eventPacket.event + ' ' + eventPacket.message); 
    }
);
myMessageCenter.dispatch(
    'MY_MESSAGE',           // event type
    'event',                // should be the event
    {message : 'hi~'}       // any you want~
)
                        }).toString().slice(12, -10),
                        cantry : true
                    }
                ]
            }
        ],
        
        // 动画相关
        animation : [
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

                        }).toString().slice(12, -10)
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
                        }).toString().slice(12, -10)
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
                        }).toString().slice(12, -10)
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
for (var i = 0; i < n; i++) {
    shapList.push({
        shape : 'circle',
        id : zr.newShapeId(),
        style : {
            x : 10, y : height/n * i + 30, r : 10,
            color : _getRandomColor()
        }
    })
}
function _getRandomColor() {
    return 'rgba(' 
            + Math.round(Math.random() * 256) + ',' 
            + Math.round(Math.random() * 256) + ',' 
            + Math.round(Math.random() * 256) + ', 0.8)'
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
        }, easingEffect[i])
        .when(4000, {
            x : 50
        }, easingEffect[i])
        .start();
}
zr.render();
                        }).toString().slice(12, -10),
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
for (var i = 0; i < n; i++) {
    shapList.push({
        shape : 'circle',
        id : zr.newShapeId(),
        style : {
            x : 10, y : height / n * i + 30, r : 10, color : _getRandomColor()
        }
    })
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
        }, easingEffect[i])
        .when(4000, {
            x : 50
        }, easingEffect[i])
        .start();
}
zr.render();
                        }).toString().slice(12, -10),
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
for (var i = 0; i < n; i++) {
    shapList.push({
        shape : 'circle',
        id : zr.newShapeId(),
        style : {
            x : 10,
            y : height/n * i + 30,
            r : 10,
            color : _getRandomColor()
        }
    })
}
function _getRandomColor() {
    return 'rgba(' 
            + Math.round(Math.random() * 256) + ',' 
            + Math.round(Math.random() * 256) + ',' 
            + Math.round(Math.random() * 256) + ', 0.8)'
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
        }, easingEffect[i])
        .when(4000, {
            x : 50
        }, easingEffect[i])
        .start();
}
zr.render();
                        }).toString().slice(12, -10),
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
        ]
    };
    
    function build(part, name, navDom) {
        var navHtml = [];
        var item;
        for (var i = 0, l = part.length; i < l; i++) {
            item = part[i];
            navHtml.push(buildNav(name, item, true));
            mainHtml.push(buildContent(name, item));
            if (item.content) {
                var item2;
                navHtml.push('<ul class="nav nav-list">');
                for (var j = 0, k = item.content.length; j < k; j++) {
                    item2 = item.content[j];
                    navHtml.push(buildNav(name + '.' + item.name, item2, false));
                    mainHtml.push(buildContent(name + '.' + item.name,item2));
                }
                navHtml.push('</ul>');
            }
        }
        navDom.innerHTML = navHtml.join('');
    }

    function buildNav(arHead, item, needIcon) {
        return  '<li>'
                + (item.plus ? '<i class="icon-minus"></i>' : '')
                + '<a href="#'
                + (arHead + '.' + item.name)
                + '">'
                + (needIcon ? '<i class="icon-chevron-right"></i>' : '')
                + item.name 
                + (typeof item.params != 'undefined' ? ' ()' : '')
                + '</a></li>';        
    }
    
    function buildContent(arHead, item) {
        var params = item.params || item.value;
        var isFunction = typeof item.params != 'undefined';
        var paramsContent = [];
        if (params) {
            var mainTableTemplate = '<table class="table table-hover">'
                               +            '<tr class="head">'
                               +                '<th>'
                               +                  '{th}'
                               +                 '</th>'
                               +                '<th>类型</th>'
                               +                '<th>描述</th>'
                               +            '</tr>';
            var mainParamsTemplate = 
                '<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>';
            paramsContent.push(
                mainTableTemplate.replace(/{th}/, (isFunction ? '参数' : '属性'))
            );
            if (params.length > 0) {
                for (var i = 0, l = params.length; i < l; i++) {
                    paramsContent.push(
                        mainParamsTemplate.replace(/{a}/, params[i][0])
                                          .replace(/{b}/, params[i][1])
                                          .replace(/{c}/, params[i][2])
                    )
                }
            }
            else {
                paramsContent.push(
                    mainParamsTemplate.replace(/{a}/, '空')
                                      .replace(/{b}/, '无')
                                      .replace(/{c}/, '无')
                )
            }
            
            if (item.res) {
                params = item.res;
                paramsContent.push(
                    '<tr class="head"><th>返回值</th><th>类型</th><th>描述</th></tr>'
                );
                paramsContent.push(
                    mainParamsTemplate.replace(/{a}/, params[0])
                                      .replace(/{b}/, params[1])
                                      .replace(/{c}/, params[2])
                )
                
            }
            paramsContent.push('</table>');
        }
        
        if (item.pre) {
            paramsContent.push('<pre>');
            paramsContent.push(item.pre);
            paramsContent.push('</pre>');
            if (item.cantry) {
                paramsContent.push('<a href="example/demo.html?code=' 
                                + encodeURIComponent(item.pre)
                                + '" target="_blank">try this &raquo;</a>');
            }
        }
        
        return '<div class="section" id="'
               + (arHead + '.' + item.name)
               + '"><h2>'
               + item.name
               + (isFunction ? ' ( )' : '')
               + '</h2><p>'
               + item.des
               + '</p>'
               + paramsContent.join('')
               +'</div>';
    }
    
    var mainHtml = ['<p style="margin:10px 0 -30px 0"><a href="mailto:kener.linfeng@gmail.com"></i> Any feedback or question ? &raquo;</a></p>'];
    var contentHeadTemplate = '<div class="page-header" id="{anchor}"><h1>{name}</h1>{des}</div>';
        
    //-- zrender全局属性&静态方法
    mainHtml.push(
        contentHeadTemplate.replace(/{name}/g, 'zrender')
                           .replace(/{anchor}/g, 'zrender')
                           .replace(/{des}/g, 'zrender全局属性&静态方法')
    );
    build(description.zrender, 'zrender', navZrender);

    //-- zrender实例方法
    mainHtml.push(
        contentHeadTemplate.replace(/{name}/g, 'ZRender')
                           .replace(/{anchor}/g, 'zrenderInstance')
                           .replace(/{des}/g, 'zrender实例方法')
    );
    build(description.zrenderInstance, 'zrenderInstance', navZrenderInstance);

    //-- shape属性&实例方法
    mainHtml.push(
        contentHeadTemplate.replace(/{name}/g, 'Shape')
                           .replace(/{anchor}/g, 'shape')
                           .replace(/{des}/g, '图形实体')
    );
    build(description.shape, 'shape', navShape);
   
    //-- tool工具及脚手架
    mainHtml.push(
        contentHeadTemplate.replace(/{name}/g, 'tool')
                           .replace(/{anchor}/g, 'tool')
                           .replace(/{des}/g, 'tool工具及脚手架')
    );
    build(description.tool, 'tool', navTool);
  
    //-- animation
    mainHtml.push(
        contentHeadTemplate.replace(/{name}/g, 'animation')
                           .replace(/{anchor}/g, 'animation')
                           .replace(/{des}/g, '动画相关，动画及缓动函数')
    );
    build(description.animation, 'animation', navAnimation);
    
    //-- 内容
    main.innerHTML = mainHtml.join('');
})(
    document.getElementById('nav-zrender'),
    document.getElementById('nav-zrender-instance'),
    document.getElementById('nav-shape'),
    document.getElementById('nav-tool'),
    document.getElementById('nav-animation'),
    document.getElementById('main')
)
