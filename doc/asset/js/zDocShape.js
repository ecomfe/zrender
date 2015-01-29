description = description || {};
description.shape = [
    {
        name: 'Group',
        des: '组',
        value: [
            ['id', '{string}', '基础属性，必须，图形唯一标识，详见<a href="#shape.base.id">id</a>'],
            ['position', '{array=}', '样式属性，默认为[0, 0]，绘图坐标原点平移，详见<a href="#shape.base.position">position</a>'],
            ['rotation', '{array=}', '样式属性，默认为[0, 0, 0]，shape绕自身旋转的角度，详见<a href="#shape.base.rotation">rotation</a>'],
            ['scale', '{array=}', '样式属性，默认为[1, 1], shape纵横缩放比例，详见<a href="#shape.base.scale">scale</a>'],
        ],
        content: [
            {
                name : 'id',
                des : '必须，{string}，图形唯一标识，可通过zrender实例方法<a href="#zrenderInstance.newShapeId">newShapeId</a>生成'
            },
            {
                name : 'position',
                des : '默认为[0, 0]，默认绘图坐标原点在左上角，绘图坐标原点平移,可传数组长度为2的数组，数组各值定义如下',
                value : [
                    ['{各异}', '{number}','横坐标'],
                    ['{各异}', '{number}','纵坐标']
                ],
                cantry : true
            },
            {
                name : 'rotation',
                des : '默认为0，group旋转的角度，不被position影响，可传数组长度为3的数组，数组各值定义如下',
                value : [
                    ['{各异}', '{number}','旋转角度，单位弧度'],
                    ['{各异}', '{number=}','默认为0，旋转中心横坐标，单位px'],
                    ['{各异}', '{number=}','默认为0，旋转中心纵坐标，单位px']
                ],
                cantry : true
            },
            {
                name : 'scale',
                des : '默认为[1, 1], group纵横缩放比例，不被position影响，可传数组长度为4的数组，数组各值定义如下',
                value : [
                    ['{各异}', '{number}','横向缩放比例，>1放大，<1缩小'],
                    ['{各异}', '{number}','纵向缩放比例，>1放大，<1缩小'],
                    ['{各异}', '{number=}','默认为0，缩放中心横坐标，单位px'],
                    ['{各异}', '{number=}','默认为0，缩放中心纵坐标，单位px']
                ],
                cantry : true
            },
            {
                name: 'addChild',
                des: '添加子节点',
                params: [
                    ['child', '{Shape|Group}', '子节点，可以是一个 shape 或者 group']
                ]
            },
            {
                name: 'removeChild',
                des: '移除子节点',
                params: [
                    ['child', '{Shape|Group}', '子节点，可以是一个 shape 或者 group']
                ]
            },
            {
                name: 'each',
                des: '遍历所有子节点',
                params: [
                    ['cb', '{Function}', '回调函数'],
                    ['context', '{Object}', '可选，调用回调的context']
                ]
            },
            {
                name: 'iterate',
                des: '深度遍历所有子孙节点',
                params: [
                    ['cb', '{Function}', '回调函数'],
                    ['context', '{Object}', '可选，调用回调的context']
                ]
            }
        ]
    },
    {
        name : 'base',
        plus : true,
        des : 'shape基类，如无特殊说明base下属性和方法为所有图形通用',
        value : [
            ['shape', '{string}', '基础属性，必须，shape类标识，详见<a href="#shape.base.shape">shape</a>'],
            ['id', '{string}', '基础属性，必须，图形唯一标识，详见<a href="#shape.base.id">id</a>'],
            ['zlevel', '{number=}', '基础属性，默认为0，z层level，决定绘画在哪层canvas中，详见<a href="#shape.base.zlevel">zlevel</a>'],
            ['invisible', '{boolean=}', '基础属性，默认为false，是否可见，详见<a href="#shape.base.invisible">invisible</a>'],
            ['style', '{Object}', '样式属性，必须，默认状态样式属性，详见<a href="#shape.base.style">style</a>'],
            ['highlightStyle', '{Object=}', '样式属性，默认同style，高亮状态样式属性，详见<a href="#shape.base.highlightStyle">highlightStyle</a>'],
            ['position', '{array=}', '样式属性，默认为[0, 0]，绘图坐标原点平移，详见<a href="#shape.base.position">position</a>'],
            ['rotation', '{array=}', '样式属性，默认为[0, 0, 0]，shape绕自身旋转的角度，详见<a href="#shape.base.rotation">rotation</a>'],
            ['scale', '{array=}', '样式属性，默认为[1, 1], shape纵横缩放比例，详见<a href="#shape.base.scale">scale</a>'],
            ['hoverable', '{boolean=}', '交互属性，默认为true，可悬浮响应，详见<a href="#shape.base.hoverable">hoverable</a>'],
            ['clickable', '{boolean=}', '交互属性，默认为false，可点击响应，详见<a href="#shape.base.clickable">clickable</a>'],
            ['draggable', '{boolean=}', '交互属性，默认为false，可拖拽响应，详见<a href="#shape.base.draggable">draggable</a>'],
            ['onbrush', '{Function=}', '事件属性，默认为null，当前图形被刷画时回调，可用于实现自定义绘画，详见<a href="#shape.base.onbrush">onbrush</a>'],
            ['ondrift', '{Function=}', '事件属性，默认为null，，详见<a href="#shape.base.ondrift">ondrift</a>'],
            ['onclick', '{Function=}', '事件属性，默认为null，，详见<a href="#shape.base.onclick">onclick</a>'],
            ['onmousewheel', '{Function=}', '事件属性，默认为null，当前图形上鼠标滚轮触发，详见<a href="#shape.base.onmousewheel">onmousewheel</a>'],
            ['onmousemove', '{Function=}', '事件属性，默认为null，当前图上形鼠标（或手指）移动触发，详见<a href="#shape.base.onmousemove">onmousemove</a>'],
            ['onmouseover', '{Function=}', '事件属性，默认为null，鼠标（或手指）移动到当前图形上触发，详见<a href="#shape.base.onmouseover">onmouseover</a>'],
            ['onmouseout', '{Function=}', '事件属性，默认为null，鼠标（或手指）从当前图形移开，详见<a href="#shape.base.onmouseout">onmouseout</a>'],
            ['onmousedown', '{Function=}', '事件属性，默认为null，鼠标按钮（或手指）按下，详见<a href="#shape.base.onmousedown">onmousedown</a>'],
            ['onmouseup', '{Function=}', '事件属性，默认为null，鼠标按钮（或手指）松开，详见<a href="#shape.base.onmouseup">onmouseup</a>'],
            ['ondragstart', '{Function=}', '事件属性，默认为null，开始拖拽时触发，详见<a href="#shape.base.ondragstart">ondragstart</a>'],
            ['ondragend', '{Function=}', '事件属性，默认为null，拖拽完毕时触发，详见<a href="#shape.base.ondragend">ondragend</a>'],
            ['ondragenter', '{Function=}', '事件属性，默认为null，拖拽图形元素进入目标图形元素时触发，详见<a href="#shape.base.ondragenter">ondragenter</a>'],
            ['ondragover', '{Function=}', '事件属性，默认为null，拽图形元素在目标图形元素上移动时触发，详见<a href="#shape.base.ondragover">ondragover</a>'],
            ['ondragleave', '{Function=}', '事件属性，默认为null，拖拽图形元素离开目标图形元素时触发，详见<a href="#shape.base.ondragleave">ondragleave</a>'],
            ['ondrop', '{Function=}', '事件属性，默认为null，拖拽图形元素放在目标图形元素内时触发，详见<a href="#shape.base.ondrop">ondrop</a>']
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
                name : 'z',
                des : '默认为0，{number}，z值，跟zlevel一样影响shape绘制的前后顺序，z值大的shape会覆盖在z值小的上面，但是并不会创建新的canvas，所以优先级低于zlevel，而且频繁改动的开销比zlevel小很多。'
            },
            {
                name : 'zlevel',
                des : '默认为0，{number}，z层level，决定绘画在哪层canvas中，数值越大离用户越近，正如css中zlevel的作用一样，你可以定义把不同的shape分别放在不同的层中，这不仅实现了视觉上的上下覆盖，更重要的是当图形元素发生变化后的refresh将局限在发生了变化的图形层中，这在你利用zrender做各种动画效果时将十分有用，性能自然也更加出色~ 读<a href="example/artist.html" target="_blank">artist</a>源码，理解分层的用意和好处。'
            },
            {
                name : 'ignore',
                des : '默认为false，{boolean}，true时元素（及其子元素）会被忽略，不被绘制，也不会触发鼠标事件。'
            },
            {
                name : 'invisible',
                des : '默认为false（可见），{boolean}，决定图形元素默认状态是否可见，但是仍然能触发鼠标事件。',
                pre : (function(){
var TextShape = require('zrender/shape/Text');
zr.addShape(new TextShape({
    style : {
        x : 20,
        y : 20,
        color : 'red' ,
        text : 'Find the circle! '
    }
}));
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    invisible : true,
    style : {
        x : 400,
        y : 200,
        r : 100,
        color : 'red' ,
        text : 'Wonderful! '
    }
}));
zr.render();
                        }).toString().slice(13, -10),
                        cantry : true
                    },
            {
                name : 'style',
                des : '默认状态样式属性，提供丰富统一的样式控制，各个图形差异见shape下各类型。',
                value : [
                    ['brushType', '{string=}', '默认为"fill"，绘画方式，fill(填充) | stroke(描边) | both(填充+描边)'],
                    ['color', '{color=}', '默认为"#000"，填充颜色，支持rgba'],
                    ['strokeColor', '{color=}', '默认为"#000"，描边颜色（轮廓），支持rgba'],
                    ['lineWidth', '{number=}', '默认为1，线条宽度，描边下有效'],
                    ['lineCap', '{string=}','默认为butt，线帽样式。butt | round | square'],
                    ['lineJoin', '{string=}','默认为miter，线段连接样式。miter | round | bevel'],
                    ['miterLimit' , '{number=}','默认为10，最大斜接长度，仅当lineJoin为miter时生效'],
                    ['opacity', '{number=}', '默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加'],
                    ['shadowBlur', '{number=}', '默认为0，阴影模糊度，大于0有效'],
                    ['shadowColor', '{color=}', '默认为"#000"，阴影色彩，支持rgba'],
                    ['shadowOffsetX', '{number=}', '默认为0，阴影横向偏移，正值往右，负值往左'],
                    ['shadowOffsetY', '{number=}', '默认为0，阴影纵向偏移，正值往下，负值往上'],
                    ['text', '{string=}', '默认为null，附加文本'],
                    ['textFont', '{string=}', '默认为null，附加文本文字样式，eg:"bold 18px verdana"'],
                    ['textPosition', '{string=}', '默认为top，线型默认为end，附加文本位置。inside | left | right | top | bottom | start | end | specific，其中start end为线型（如line, polyline）特有'],
                    ['textAlign', '{string=}', '默认根据textPosition自动设置，附加文本水平对齐。start | end | left | right | center'],
                    ['textBaseline', '{string=}', '默认根据textPosition自动设置，附加文本垂直对齐。top | bottom | middle | alphabetic | hanging | ideographic '],
                    ['textX', '{number=}', '当textPosition为specific时有效，指定附件文本横坐标'],
                    ['textY', '{number=}', '当textPosition为specific时有效，指定附件文本纵坐标'],
                    ['textColor', '{color=}', '默认根据textPosition自动设置，图形<a href="#shape.text">text</a>无此项，默认策略如下，附加文本颜色，textPosition == "inside" ? "#fff" : color']
                ],
                pre : (function(){
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            },
            {
                name : 'highlightStyle',
                des : '默认同<a href="#shape.base.style">style</a>，高亮状态样式属性，可设置属性同<a href="#shape.base.style">style</a>，所有在hover层上显示（<a href="#zrenderInstance.addHoverShape">addHoverShape</a>）的图形均使用此属性。可以通过定义highlightStyle实现个性化的hover交互。',
                pre : (function(){
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
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
var RectangleShape = require('zrender/shape/Rectangle');
zr.addShape(new RectangleShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
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
var RectangleShape = require('zrender/shape/Rectangle');
zr.addShape(new RectangleShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
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
var RectangleShape = require('zrender/shape/Rectangle');
zr.addShape(new RectangleShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            },
            {
                name : 'hoverable',
                des : '默认为true，可悬浮响应，默认悬浮响应为高亮显示，可在<a href="#shape.base.ondrift">onbrush</a>中捕获并阻塞高亮绘画',
                pre : (function(){
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            },
            {
                name : 'clickable',
                des : '默认为false，可点击响应，可在onclick中捕获并阻塞全局click响应',
                pre : (function(){
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style : {
        x : 200,
        y : 200,
        r : 80,
        color : 'red',
        text : 'Click silent!',
        textPosition : 'inside'
    }
}));
zr.addShape(new CircleShape({
    clickable : true,
    style : {
        x : 400,
        y : 200,
        r : 80,
        color : 'red',
        text : 'Clickable!',
        textPosition : 'inside'
    }
}));
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
                }).toString().slice(13, -10),
                cantry : true
            },
            {
                name : 'draggable',
                des : '默认为false，可拖拽响应，默认拖拽响应改变图形位置，可在ondrift中捕获并阻塞默认拖拽行为',
                pre : (function(){
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style : {
        x : 200,
        y : 200,
        r : 80,
        color : 'red',
        text : 'Stillness !',
        textPosition : 'inside'
    }
}));
zr.addShape(new CircleShape({
    draggable : true,
    style : {
        x : 400,
        y : 200,
        r : 80,
        color : 'red',
        text : 'Draggable!',
        textPosition : 'inside'
    }
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            },
            {
                name : 'onbrush',
                des : '默认为null，当前图形被刷画时回调，可用于实现自定义绘画等，回传参数和有效返回值见下',
                params : [
                    ['context', '{2D Context}','当前canvas 2D context，可以直接用原生方法实现自定义绘画'],
                    ['shape', '{Object}','当前shape'],
                    ['isHighlight', '{boolean}','是否高亮状态']
                ],
                res : [
                    'true | false ', '{boolean}','回调返回，true（不执行默认绘画）| false（执行默认绘画）<br/> 无返回值，等同返回false'
                ],
                pre : (function(){
var block = true;
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style : {
        x : 400, y : 200, r : 80, color : 'red',
        text : 'Hover & click!',
        textPosition : 'inside'
    },
    highlightStyle : { r : 100, color : 'green' },
    clickable : true,
    onbrush : function(context, isHighlight) {
        if (isHighlight) {
            // 绘画高亮状态时刻（鼠标悬浮)
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
}));
zr.render();
                }).toString().slice(13, -10),
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
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style : {
        x : 400,
        y : 200,
        r : 80,
        color : 'red',
        text : 'Drag horizontal only!',
        textPosition : 'inside'
    },
    draggable : true,
    ondrift : function(dx, dy) {
        this.style.x += dx;
        zr.modShape(this.id, this);
        zr.refresh();
        return true;
    }
}));
zr.render();
                }).toString().slice(13, -10),
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
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
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
}));
zr.addShape(new CircleShape({
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
}));
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
                }).toString().slice(13, -10),
                cantry : true
            },
            {
                name : 'ondblclick',
                des : '默认为null，当前图形双击响应，回传参数和有效返回值见下',
                params : [
                    ['eventPacket', '{Object}','事件包，结构如下'],
                    ['eventPacket.type', '{string}','事件类型为EVENT.DBLCLICK'],
                    ['eventPacket.event', '{event}','原始dom事件对象'],
                    ['eventPacket.target', '{Object}','当前图形shape对象']
                ],
                res : [
                    'true | false ', '{boolean}','回调返回，true（阻塞全局zrender事件）| false（不阻塞全局zrender事件）<br/> 无返回值，等同返回false'
                ],
                pre : (function(){
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style : {
        x : 200,
        y : 200,
        r : 80,
        color : 'red',
        text : 'dblclick and block!',
        textPosition : 'inside'
    },
    clickable : true,
    ondblclick : function() {
        alert('dblclick on red shape!')
        return true;    // 阻塞全局zrender事件
    }
}));
zr.addShape(new CircleShape({
    style : {
        x : 400,
        y : 200,
        r : 80,
        color : 'green',
        text : 'dblclick!',
        textPosition : 'inside'
    },
    clickable : true,
    ondblclick : function() {
        alert('dblclick on green shape!')
    }
}));
zr.render();

var config = require('zrender/config');
zr.on(config.EVENT.DBLCLICK, function(params) {
    if (params.target) {
        alert('Global catch! Double Click on shape!');
    }
    else {
        alert('Global catch! None shape, but i catch you!');
    }
});
                }).toString().slice(13, -10),
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
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
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
var shapeId = require('zrender/tool/guid')();
var TextShape = require('zrender/shape/Text');
zr.addShape(new TextShape({
    id : shapeId,
    style : { x : 10, y : 10}
}));
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style : {
        x : 400, y : 200, r : 100,  color : 'red',
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
}));
zr.render();

var config = require('zrender/config');
zr.on(config.EVENT.MOUSEMOVE, function(params) {
    var zrEvent = require('zrender/tool/event');
    var event = params.event;
    zr.modShape(
        shapeId,
        {
            style : {
                text : 'Global catch! mousemove on ('  + zrEvent.getX(event)  + ', ' + zrEvent.getY(event) + ')'
            }
        }
    );
    zr.refresh();
});
                }).toString().slice(13, -10),
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
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style : {
        x : 200, y : 200, r : 100, color : 'red',
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
}));

zr.addShape(new CircleShape({
    hoverable : false,
    style : {
        x : 400, y : 200, r : 100, color : 'green',
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
}));

zr.render();

function _update(shape, text) {
    shape.style.text = text;
    zr.modShape(shape.id, shape);
    zr.refresh();
}
                }).toString().slice(13, -10),
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
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style : { x : 200, y : 200, r : 60, color : 'red'},
    _name : 'red',
    draggable : true,
    ondragstart : _update,
    ondragend : _update,
    ondragenter : _update,
    ondragover : _update,
    ondragleave : _update,
    ondrop : _update
}));

zr.addShape(new CircleShape({
    style : { x : 400, y : 200, r : 60, color : 'green'},
    _name : 'green',
    draggable : true,
    ondragstart : _update,
    ondragend : _update,
    ondragenter : _update,
    ondragover : _update,
    ondragleave : _update,
    ondrop : _update
}));

zr.render();

function _update(params) {
    var shape = params.target;
    var dragged = params.dragged;
    shape.style.text = 'Catch your!' + (dragged ? dragged._name : '') + ' ' + params.type;
    zr.modShape(shape.id, shape);
    zr.refresh();
}
                }).toString().slice(13, -10),
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
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style : {
        x : 100,
        y : 100,
        r : 50,
        color : 'rgba(135, 206, 250, 0.8)',          // rgba supported
        text :'circle',
        textPosition :'inside'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
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
var EllipseShape = require('zrender/shape/Ellipse');
zr.addShape(new EllipseShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
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
var SectorShape = require('zrender/shape/Sector');
zr.addShape(new SectorShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
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
var RingShape = require('zrender/shape/Ring');
zr.addShape(new RingShape({
    style : {
        x : 200,
        y : 200,
        r : 100,
        r0 : 50,
        color : 'rgba(135, 206, 250, 0.8)',
        text:'ring'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
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
var RectangleShape = require('zrender/shape/Rectangle');
zr.addShape(new RectangleShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
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
                    ['pointList', '{Array}','必须，多边形各个顶角坐标，单位px'],
                    ['lineType', '{string}','默认为solid，线条类型，solid | dashed | dotted']
                ],
                pre : (function(){
// 多边形
var PolygonShape = require('zrender/shape/Polygon');
zr.addShape(new PolygonShape({
    style : {
        pointList : [[310, 120], [360, 120], [348, 230], [250, 340], [146, 200]],
        color : 'rgba(135, 206, 250, 0.8)',
        text:'polygon',
        textPosition:'inside'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            }
        ]
    },
    {
        name : 'isogon',
        plus : true,
        des : 'shape类：正n(n>=3)边形，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
        content : [
            {
                name : 'style',
                des : '正n边形特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                value : [
                    ['x', '{number}', '必须，正n边形外接圆心横坐标，单位px'],
                    ['y', '{number}', '必须，正n边形外接圆心纵坐标，单位px'],
                    ['r', '{number}', '必须，正n边形外接圆半径，单位px'],
                    ['n', '{number}', '必须，n>=3指明边数']
                ],
                pre : (function(){
// 正n边形
var IsogonShape = require('zrender/shape/Isogon');
zr.addShape(new IsogonShape({
    style : {
        x : 200,
        y : 200,
        r : 70,
        n : 5,
        color : 'rgba(135, 206, 250, 0.8)',
        text:'isogon',
        textPosition:'inside'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            }
        ]
    },
    {
        name : 'star',
        plus : true,
        des : 'shape类：n角星，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
        content : [
            {
                name : 'style',
                des : 'n角星特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                value : [
                    ['x', '{number}', '必须，n角星外接圆心横坐标，单位px'],
                    ['y', '{number}', '必须，n角星外接圆心纵坐标，单位px'],
                    ['r', '{number}', '必须，n角星外接圆半径，单位px'],
                    ['r0', '{number=}', '可选，n角星内部顶点（凹点）的外接圆半径，单位px，如果不指定此参数，则自动计算：取相隔外部顶点连线的交点作内部顶点'],
                    ['n', '{number}', '必须，指明几角星']
                ],
                pre : (function(){
// n角星
var StarShape = require('zrender/shape/Star');
zr.addShape(new StarShape({
    style : {
        x : 200,
        y : 200,
        r : 70,
        n : 4,
        color : 'rgba(135, 206, 250, 0.8)',
        text:'star',
        textPosition:'inside'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
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
var PathShape = require('zrender/shape/Path');
zr.addShape(new PathShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            }
        ]
    },
    {
        name : 'heart',
        plus : true,
        des : 'shape类：心形，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
        content : [
            {
                name : 'style',
                des : '路径特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                value : [
                    ['x', '{number}','必须，心形内部尖端横坐标，单位px'],
                    ['y', '{number}','必须，心形内部尖端纵坐标，单位px'],
                    ['a', '{number}','必须，心形横宽（中轴线到水平边缘最宽处距离），单位px'],
                    ['b', '{number}','必须，心形纵高（内尖到外尖距离），单位px']
                ],
                pre : (function(){
// 心形
var HeartShape = require('zrender/shape/Heart');
zr.addShape(new HeartShape({
    style : {
        x : 100,
        y : 100,
        a : 50,
        b : 70,
        color : 'rgba(135, 206, 250, 0.8)',
        text:'heart',
        textPosition:'inside',
        textColor : 'red'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            }
        ]
    },
    {
        name : 'droplet',
        plus : true,
        des : 'shape类：水滴，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
        content : [
            {
                name : 'style',
                des : '路径特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                value : [
                    ['x', '{number}','必须，水滴中心横坐标，单位px'],
                    ['y', '{number}','必须，水滴中心纵坐标，单位px'],
                    ['a', '{number}','必须，水滴横宽（中心到水平边缘最宽处距离），单位px'],
                    ['b', '{number}','必须，水滴纵高（中心到尖端距离），单位px']
                ],
                pre : (function(){
// 水滴
var DropletShape = require('zrender/shape/Droplet');
zr.addShape(new DropletShape({
    style : {
        x : 100,
        y : 100,
        a : 50,
        b : 60,
        color : 'rgba(135, 206, 250, 0.8)',
        text:'droplet',
        textPosition:'inside',
        textColor : 'red'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
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
                    ['xEnd', '{number}','必须，终点横坐标，单位px'],
                    ['yEnd', '{number}','必须，终点纵坐标，单位px'],
                    ['lineType', '{string}','默认为solid，线条类型，solid | dashed | dotted']
                ],
                pre : (function(){
// 直线
var LineShape = require('zrender/shape/Line');
zr.addShape(new LineShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            }
        ]
    },
    {
        name : 'polyline',
        plus : true,
        des : 'shape类：折线，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
        content : [
            {
                name : 'style',
                des : '折线特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                value : [
                    ['pointList', '{Array}','必须，多边形各个顶角坐标，单位px'],
                    ['lineType', '{string}','默认为solid，线条类型，solid | dashed | dotted']
                ],
                pre : (function(){
// 折线
var PolylineShape = require('zrender/shape/Polyline');
zr.addShape(new PolylineShape({
    style : {
        pointList : [[310, 120], [620, 190], [328, 260], [250, 340], [146, 200]],
        strokeColor : 'rgba(135, 206, 250, 0.8)',   // == color
        lineWidth : 5,
        lineCap : 'round',
        lineType : 'dashed',
        lineJoin : 'miter',
        miterLimit : 50,
        text:'polyline',
        textPosition:'end'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            }
        ]
    },
    {
        name : 'beziercurve',
        plus : true,
        des : 'shape类：贝塞尔曲线，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
        content : [
            {
                name : 'style',
                des : '贝塞尔曲线特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                value : [
                    ['xStart', '{number}','必须，起点横坐标，单位px'],
                    ['yStart', '{number}','必须，起点纵坐标，单位px'],
                    ['cpX1', '{number}','必须，第一个关联点横坐标，单位px'],
                    ['cpY1', '{number}','必须，第一个关联点纵坐标，单位px'],
                    ['cpX2', '{number=}','可选，第二个关联点横坐标  缺省即为二次贝塞尔曲线，单位px'],
                    ['cpY2', '{number=}','可选，第二个关联点纵坐标，单位px'],
                    ['xEnd', '{number}','必须，终点横坐标，单位px'],
                    ['yEnd', '{number}','必须，终点纵坐标，单位px']
                ],
                pre : (function(){
// 贝塞尔曲线
var BezierCurveShape = require('zrender/shape/BezierCurve');
zr.addShape(new BezierCurveShape({
    style : {
        xStart : 100,
        yStart : 100,
        cpX1 : 300,
        cpY1 : 100,
        cpX2 : 100,
        cpY2 : 300,
        xEnd : 300,
        yEnd : 300,
        strokeColor : 'rgba(135, 206, 250, 0.8)',   // == color
        lineWidth : 5,
        lineCap : 'round',
        text:'beziercurve',
        textPosition:'end'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            }
        ]
    },
    {
        name : 'rose',
        plus : true,
        des : 'shape类：玫瑰线，积分线，谨慎大量使用，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
        content : [
            {
                name : 'style',
                des : '玫瑰线特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                value : [
                    ['x', '{number}', '必须，圆心的横坐标，单位px'],
                    ['y', '{number}', '必须，圆心的纵坐标，单位px'],
                    ['r', '{Array<number>}', '必须，每个线条的最大长度，单位px'],
                    ['k', '{number}', '必须，决定花瓣数量，当n为1时，奇数即为花瓣数，偶数时花瓣数量翻倍'],
                    ['n', '{number=}', '默认为1，必须为整数，与k共同决定花瓣的数量']
                ],
                pre : (function(){
// 玫瑰线
var RoseShape = require('zrender/shape/Rose');
zr.addShape(new RoseShape({
    style : {
        x : 200,
        y : 200,
        r : [15,25,35],
        k : 4,
        strokeColor : 'rgba(135, 206, 250, 0.8)',   // == color
        lineWidth : 2,
        text:'rose'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            }
        ]
    },
    {
        name : 'trochoid',
        plus : true,
        des : 'shape类：旋轮曲线，积分线，谨慎大量使用，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
        content : [
            {
                name : 'style',
                des : '旋轮曲线特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                value : [
                    ['x', '{number}', '必须，圆心的横坐标，单位px'],
                    ['y', '{number}', '必须，圆心的纵坐标，单位px'],
                    ['r', '{number}', '必须，必须，固定圆半径 内旋曲线时必须大于转动圆半径，单位px'],
                    ['r0', '{number}', '必须，转动圆半径'],
                    ['d', '{number}', '必须，点到内部转动圆的距离，等于r时曲线为摆线'],
                    ['location', '{string}', '可选，默认为 in（内旋），可设为out（外旋）']
                ],
                pre : (function(){
// 旋轮曲线
var TrochoidShape = require('zrender/shape/Trochoid');
zr.addShape(new TrochoidShape({
    style : {
        x : 200,
        y : 200,
        r : 50,
        r0 : 30,
        d : 30,
        location : 'in', // 'out
        strokeColor : 'rgba(135, 206, 250, 0.8)',   // == color
        lineWidth : 2,
        text:'trochoid'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
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
var TextShape = require('zrender/shape/Text');
zr.addShape(new TextShape({
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
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            }
        ]
    },
    {
        name : 'image',
        plus : true,
        des : 'shape类：图片，属性继承<a href="#shape.base">base</a>，特有样式属性见下',
        content : [
            {
                name : 'style',
                des : '路径特有样式属性，对highlightStyle同样有效。通用样式见<a href="#shape.base.style">base.style</a>。',
                value : [
                    ['x', '{number}','必须，左上角横坐标，单位px'],
                    ['y', '{number}','必须，左上角纵坐标，单位px'],
                    ['width', '{number}','可选，宽度，单位px'],
                    ['height', '{number}','可选，高度，单位px'],
                    ['sx', '{number}','可选，从图片中裁剪的起始x，单位px'],
                    ['sy', '{number}','可选，从图片中裁剪的起始y，单位px'],
                    ['sWidth', '{number}','可选，从图片中裁剪的宽度，单位px'],
                    ['sHeight', '{number}','可选，从图片中裁剪的高度，单位px'],
                    ['image', '{string | Image}','必须，图片url或者图片对象']
                ],
                pre : (function(){
// 图片
var ImageShape = require('zrender/shape/Image');
zr.addShape(new ImageShape({
    style : {
        x : 100,
        y : 100,
        image : "../asset/ico/favicon.png",
        width : 20,
        height : 20,
        color : 'rgba(135, 206, 250, 0.8)',
        text:'image',
        textColor : 'red'
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
                cantry : true
            }
        ]
    }
];