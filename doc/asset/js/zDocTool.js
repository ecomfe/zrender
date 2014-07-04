description = description || {};
description.tool = [
    {
        name: 'area',
        plus: true,
        des: '图形空间辅助类，位于tool/area',
        value: [
            ['isInside', '{Function}', '包含判断'],
            ['isOutside', '{Function}', '!isInside'],
            ['getTextWidth', '{Function}', '计算单行文本宽度']
        ],
        content: [
            {
                name: 'isInside',
                des: '区域包含判断',
                params: [
                    ['zoneType', '{string}', '图形类别，如：circle，rectangle，见shape.*'],
                    ['area', '{Object}', '目标区域描述格式同各shape.style，如<a href="#shape.circle.style">circle.style</a>'],
                    ['x', '{number}', '横坐标'],
                    ['y', '{number}', '纵坐标']
                ],
                res: ['isIn', '{boolean}', '点(x,y)是否包含在区域area里']
            },
            {
                name: 'isOutside',
                des: '区域不包含判断，等同于!isInside，参数同<a href="#tool.area.isInside">isInside</a>',
                params: [
                    ['zoneType', '{string}', '图形类别，如：circle，rectangle，见shape.*'],
                    ['area', '{Object}', '目标区域描述格式同各shape.style，如<a href="#shape.circle.style">circle.style</a>'],
                    ['x', '{number}', '横坐标'],
                    ['y', '{number}', '纵坐标']
                ],
                res: ['isOut', '{boolean}', '点(x,y)是否不包含在区域area里']
            },
            {
                name: 'getTextWidth',
                des: '计算单行文本宽度',
                params: [
                    ['text', '{string}', '待测文本'],
                    ['textFont', '{string=}', '文本样式，eg:"bold 18px verdana"']
                ],
                res: ['width', '{number}', '文本在指定样式下的宽度'],
                pre: (function() {
var zrArea = require('zrender/tool/area');
var TextShape = require('zrender/shape/Text');
var textShape = new TextShape({
    style : {
        x : 100, y : 100,
        text: 'zrender',
        textFont: 'bold 18px verdana'
    }
});
zr.addShape(textShape);
zr.addShape(new TextShape({
    id: require('zrender/tool/guid')(),
    style: {
        x: 20, y: 20,
        text : textShape.style.text
               + ' width = '
               + zrArea.getTextWidth(
                   textShape.style.text,
                   textShape.style.textFont
               )
    }
}));
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            }
        ]
    },
    {
        name: 'event',
        plus: true,
        des: '事件辅助类，位于tool/event',
        content: [
            {
                name: 'getX',
                des: '获取事件横坐标，使用例子见<a href="#shape.base.onmousemove">onmousemove</a>',
                params: [
                    ['e', '{event}', '必须，dom事件，tip：响应函数回调参数<a href="#zrenderInstance.eventPacket">eventPacket</a>中包含event。']
                ],
                res: ['x', '{number}', '鼠标（手指）x坐标']
            },
            {
                name: 'getY',
                des: '获取事件纵坐标，使用例子见<a href="#shape.base.onmousemove">onmousemove</a>',
                params: [
                    ['e', '{event}', '必须，dom事件，tip：响应函数回调参数<a href="#zrenderInstance.eventPacket">eventPacket</a>中包含event。']
                ],
                res: ['y', '{number}', '鼠标（手指）y坐标']
            },
            {
                name: 'getDelta',
                des: '鼠标滚轮变化，使用例子见<a href="#shape.base.onmousewheel">onmousewheel</a>',
                params: [
                    ['e', '{event}', '必须，dom事件，tip：响应函数回调参数<a href="#zrenderInstance.eventPacket">eventPacket</a>中包含event。']
                ],
                res: ['detail', '{number}', '滚轮变化，正值说明滚轮是向上滚动，如果是负值说明滚轮是向下滚动']
            },
            {
                name: 'stop',
                des: '停止冒泡和阻止默认行为，使用例子见<a href="#shape.base.onmousewheel">onmousewheel</a>',
                params: [
                    ['e', '{event}', '必须，dom事件，tip：响应函数回调参数<a href="#zrenderInstance.eventPacket">eventPacket</a>中包含event。']
                ],
                res: ['无', '无', '无']
            },
            {
                name: 'Dispatcher',
                des: '事件分发器（类）',
                value: [
                    ['one', '{Function}', '单次触发绑定，dispatch后销毁'],
                    ['bind', '{Function}', '事件绑定'],
                    ['unbind', '{Function}', '事件解绑定'],
                    ['dispatch', '{Function}', '事件分发']
                ],
                pre: (function() {
var myMessageCenter = {}; // 添加消息中心的事件分发器特性
var zrEvent = require('zrender/tool/event');
zrEvent.Dispatcher.call(myMessageCenter);
myMessageCenter.bind(
    'MY_MESSAGE',

function(eventPacket) {
    alert('get it! '
        + eventPacket.type + ' '
        + eventPacket.event + ' '
        + eventPacket.message
    );
});

myMessageCenter.dispatch(
    'MY_MESSAGE',       // event type
    'event',            // should be the event
    { message: 'hi~' }  // any you want~
);
                }).toString().slice(13, -10),
                cantry: true
            }
        ]
    },
    {
        name: 'color',
        plus: true,
        des: '图形空间辅助类，位于tool/color',
        value: [
            ['getColor', '{Function}', '获取色板颜色'],
            ['customPalette', '{Function}', '自定义调色板'],
            ['resetPalette', '{Function}', '重置调色板'],
            ['getHighlightColor', '{Function}', '获取默认高亮颜色'],
            ['customHighlight', '{Function}', '自定义默认高亮颜色'],
            ['resetHighlight', '{Function}', '重置默认高亮颜色'],
            ['getRadialGradient', '{Function}', '径向渐变'],
            ['getLinearGradient', '{Function}', '线性渐变'],
            ['getStepColors', '{Function}', '获取两种颜色之间渐变颜色数组'],
            ['getGradientColors', '{Function}', '获取颜色之间渐变颜色数组'],
            ['reverse', '{Function}', '颜色翻转'],
            ['mix', '{Function}', '颜色混合'],
            ['lift', '{Function}', '颜色升降'],
            ['alpha', '{Function}', '设置颜色的透明度'],
            ['trim', '{Function}', '清除空格'],
            ['random', '{Function}', '随机颜色'],
            ['toRGB ', '{Function}', '转为RGB格式'],
            ['toRGBA', '{Function}', '转为RGBA格式'],
            ['toHex ', '{Function}', '转为#RRGGBB格式'],
            ['toHSL ', '{Function}', '转为HSL格式'],
            ['toHSLA', '{Function}', '转为HSLA格式'],
            ['toHSB ', '{Function}', '转为HSB格式'],
            ['toHSBA', '{Function}', '转为HSBA格式'],
            ['toHSV ', '{Function}', '转为HSV格式'],
            ['toHSVA', '{Function}', '转为HSVA格式'],
            ['toName', '{Function}', '转为颜色名字'],
            ['toColor', '{Function}', '颜色值数组转为指定格式颜色'],
            ['toArray', '{Function}', '返回颜色值数组']
        ],
        content: [
            {
                name: 'getColor',
                des: '获取色板颜色',
                params: [
                    ['idx', '{number}', '色板位置'],
                    ['userPalete', '{Array=}', '自定义色板，为空则用默认色板']
                ],
                res: ['color', '{color}', '颜色'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var colorIdx = 0;
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style: {
        x: 200, y: 200, r : 50,
        color : zrColor.getColor(colorIdx++)
    },
    clickable : true,
    onclick : function(params) {
        var target = params.target;
        zr.modShape(target.id, {style: {color : zrColor.getColor(colorIdx++)}});
        zr.refresh();
    }
}));
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'customPalette',
                des: '自定义调色板',
                params: [
                    ['userPalete', '{Array}', '自定义色板']
                ],
                res: ['color', '{color}', '颜色'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
zrColor.customPalette(['red', 'green', 'blue'])
var colorIdx = 0;
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style: {
        x: 200, y: 200, r : 50,
        color : zrColor.getColor(colorIdx++)
    },
    clickable : true,
    onclick : function(params) {
        var target = params.target;
        zr.modShape(target.id, {style: {color : zrColor.getColor(colorIdx++)}});
        zr.refresh();
    }
}));
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'resetPalette',
                des: '重置调色板',
                params: []
            },
            {
                name: 'getHighlightColor',
                des: '获取默认高亮颜色',
                params: [],
                res: ['color', '{color}', '颜色']
            },
            {
                name: 'customHighlight',
                des: '自定义默认高亮颜色',
                params: [
                    ['userPalete', '{color}', '自定义高亮颜色']
                ],
                res: ['color', '{color}', '颜色'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
zrColor.customHighlight('red')
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style: {
        x: 200, y: 200, r : 50,
        color : 'green'
    }
}));
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'resetHighlight',
                des: '重置默认高亮颜色',
                params: []
            },
            {
                name: 'getRadialGradient',
                des: '径向渐变',
                params: [
                    ['x0', '{number}', '渐变起点'],
                    ['y0', '{number}', '渐变起点'],
                    ['r0', '{number}', '渐变起点'],
                    ['x1', '{number}', '渐变终点'],
                    ['y1', '{number}', '渐变终点'],
                    ['r1', '{number}', '渐变终点'],
                    ['colorList', '{Array}', '偏移颜色列表']
                ],
                res: ['color', '{color}', '径向渐变颜色'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style: {
        x: 200, y: 200, r : 50,
        color : zrColor.getRadialGradient(
            200, 200, 0, 200, 200, 50,
            [[0, 'yellow'], [0.8, 'red'], [1,'lightgreen']]
        )
    },
    draggable : true
}));
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'getLinearGradient',
                des: '线性渐变。（注意：excanvas的渐变坐标并不是全局的，所以多shape共享渐变的设置在IE8-下会有差异。同时，excanvas并不支持strokeColor为渐变类型，请谨慎使用。）',
                params: [
                    ['x0', '{number}', '渐变起点'],
                    ['y0', '{number}', '渐变起点'],
                    ['x1', '{number}', '渐变终点'],
                    ['y1', '{number}', '渐变终点'],
                    ['colorList', '{Array}', '偏移颜色列表']
                ],
                res: ['color', '{color}', '颜色'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var width = zr.getWidth();
var height = zr.getHeight();
var RectangleShape = require('zrender/shape/Rectangle');
zr.addShape(new RectangleShape({
    style: {
        x: 0, y: 0, width : width, height : height,
        color : zrColor.getLinearGradient(
            0, 0, width, 0,
            [[0, 'yellow'],[0.5, 'red'],[1,'lightgreen']]
        )
    }
}));
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'getStepColors',
                des: '获取两种颜色之间渐变颜色数组',
                params: [
                    ['start', '{color}', '起始颜色'],
                    ['end', '{color}', '结束颜色'],
                    ['step', '{number}', '渐变级数']
                ],
                res: ['colorArray', '{Array}', '颜色数组'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var width = zr.getWidth();
var height = zr.getHeight();
var colorList = zrColor.getStepColors('red', 'lightgreen', 10);
var w = Math.round(width / colorList.length);
var RectangleShape = require('zrender/shape/Rectangle');
for (var i = 0, l = colorList.length; i < l; i++) {
    zr.addShape(new RectangleShape({
        style: {
            x: w * i, y: 0, width : w, height : height,
            color : colorList[i]
        }
    }));
}
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'getGradientColors',
                des: '获取颜色之间渐变颜色数组',
                params: [
                    ['colors', '{Array}', '颜色组'],
                    ['step', '{number=}', '渐变级数，默认20']
                ],
                res: ['colorArray', '{Array}', '颜色数组'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var width = zr.getWidth();
var height = zr.getHeight();
var colorList = zrColor.getGradientColors(
    ['red', 'yellow', 'lightblue']
);
var w = Math.round(width / colorList.length);
var RectangleShape = require('zrender/shape/Rectangle');
for (var i = 0, l = colorList.length; i < l; i++) {
    zr.addShape(new RectangleShape({
        style: {
            x: w * i, y: 0, width : w, height : height,
            color : colorList[i]
        }
    }));
}
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'reverse',
                des: '颜色翻转，[255-r,255-g,255-b]',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{color}', '翻转颜色'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var width = zr.getWidth();
var height = zr.getHeight();
var colorList = zrColor.getStepColors('red', 'lightgreen', 10);
var w = Math.round(width / colorList.length);
var RectangleShape = require('zrender/shape/Rectangle');
for (var i = 0, l = colorList.length; i < l; i++) {
    zr.addShape(new RectangleShape({
        style: {
            x: w * i, y: 0, width : w, height : height,
            color : colorList[i]
        },
        clickable : true,
        onclick : function(params) {
            var target  = params.target;
            zr.modShape(
                target.id,
                {style: {color: zrColor.reverse(target.style.color)}}
            );
            zr.refresh();
        }
    }));
}
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'mix',
                des: '简单两种颜色混合',
                params: [
                    ['color1', '{color}', '第一种颜色'],
                    ['color2', '{color}', '第二种颜色'],
                    ['weight', '{color}', '混合权重[0-1]']
                ],
                res: ['color', '{color}', '结果色,rgb(r,g,b)或rgba(r,g,b,a)'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style: { x: 100, y: 200, r: 30, color: zrColor.random(), text: 'drag me' },
    _x: 100,
    draggable: true
}));
zr.addShape(new CircleShape({
    style: { x: 300, y: 200, r: 30, color: zrColor.random(), text: 'drag me' },
    _x: 300,
    draggable: true
}));
zr.addShape(new CircleShape({
    style: { x: 200, y: 200, r: 50, brushType: 'both', color: '#ccc', strokeColor: '#ccc', text: 'here'},
    ondrop: function(params) {
        var target = params.target;
        var dragged = params.dragged;
        zr.modShape(
            target.id,
            {style: {color: zrColor.mix(target.style.color, dragged.style.color)}}
        );
        zr.modShape(
            dragged.id,
            {
                position: [0, 0],
                style: { x: dragged._x, y: 200, color: zrColor.random()}
            }
        );
        zr.refresh();
    }
}));
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'lift',
                des: '颜色加深或减淡，当level>0加深，当level<0减淡',
                params: [
                    ['color', '{color}', '颜色'],
                    ['level', '{number}', '升降程度,取值区间[-1,1]']
                ],
                res: ['color', '{color}', '加深或减淡后颜色值'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style : {
        x : 400, y : 200,  r : 100,
        color : zrColor.random(),
        text : 'mousewheel',
        textPosition : 'inside'
    },
    onmousewheel : function(params) {
        var zrEvent = require('zrender/tool/event');
        var shape = params.target;

        var event = params.event;
        var delta = zrEvent.getDelta(event);
        delta = delta > 0 ? 0.1 : (-0.1);
        shape.style.color = zrColor.lift(shape.style.color, delta)

        zr.modShape(shape.id, shape);
        zr.refresh();
        zrEvent.stop(event);
    }
}));
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'alpha',
                des: '设置颜色透明度',
                params: [
                    ['color', '{color}', '颜色'],
                    ['alpha', '{number}', '透明度,区间[0,1]']
                ],
                res: ['color', '{color}', '颜色'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var alpha = 0.5;
var CircleShape = require('zrender/shape/Circle');
zr.addShape(new CircleShape({
    style : {
        x : 400, y : 200,  r : 100,
        color : zrColor.random(),
        text : 'mousewheel',
        textPosition : 'inside'
    },
    onmousewheel : function(params) {
        var zrEvent = require('zrender/tool/event');
        var shape = params.target;

        var event = params.event;
        var delta = zrEvent.getDelta(event);
        alpha += delta > 0 ? 0.1 : (-0.1);
        shape.style.color = zrColor.alpha(shape.style.color, alpha)
        console.log(shape.style.color)
        zr.modShape(shape.id, shape);
        zr.refresh();
        zrEvent.stop(event);
    }
}));
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'trim',
                des: '移除颜色中多余空格',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{color}', '无空格颜色'],
                cantry: false
            },
            {
                name: 'random',
                des: '随机颜色，例子见<a href="#tool.color.mix">mix</a>',
                params: [],
                res: ['color', '{color}', '颜色值，#rrggbb格式'],
                cantry: false
            },
            {
                name: 'toRGBA',
                des: '转换为rgba格式的颜色',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{color}', 'rgba颜色，rgba(r,g,b,a)'],
                cantry: false
            },
            {
                name: 'toRGB',
                des: '转换为rgb格式的颜色',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{color}', 'rgb颜色，rgb(r,g,b)'],
                cantry: false
            },
            {
                name: 'toHex',
                des: '转换为16进制颜色',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{color}', '16进制颜色，#rrggbb格式'],
                cantry: false
            },
            {
                name: 'toHSVA',
                des: '转换为HSVA颜色',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{color}', 'HSVA颜色，hsva(h,s,v,a)'],
                cantry: false
            },
            {
                name: 'toHSV',
                des: '转换为HSV颜色',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{color}', 'HSV颜色，hsv(h,s,v)'],
                cantry: false
            },
            {
                name: 'toHSBA',
                des: '转换为HSBA颜色',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{color}', 'HSBA颜色，hsba(h,s,b,a)'],
                cantry: false
            },
            {
                name: 'toHSB',
                des: '转换为HSB颜色',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{color}', 'HSB颜色，hsb(h,s,b)'],
                cantry: false
            },
            {
                name: 'toHSLA',
                des: '转换为HSLA颜色',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{color}', 'HSLA颜色，hsla(h,s,l,a)'],
                cantry: false
            },
            {
                name: 'toHSL',
                des: '转换为HSL颜色',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{color}', 'HSL颜色，hsl(h,s,l)'],
                cantry: false
            },
            {
                name: 'toName',
                des: '转换颜色名，非命名颜色则返回null',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['color', '{string}', '颜色名'],
                cantry: false
            },
            {
                name: 'toColor',
                des: '颜色值数组转为指定格式颜色',
                params: [
                    ['data', '{Array}', '颜色值数组'],
                    ['format', '{string}', '格式,默认rgb']
                ],
                res: ['color', '{color}', '颜色'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var width = zr.getWidth();
var height = zr.getHeight();
var w = Math.round(width / 10);
var h = Math.round(height / 3);
var RectangleShape = require('zrender/shape/Rectangle');
for (var i = 0; i < 10; i++) {
    zr.addShape(new RectangleShape({
        style: {
            x: w * i, y: 0, width : w, height : h,
            color : zrColor.toColor([i * 25, 10, 10])
        }
    }));
}
for (var i = 0; i < 10; i++) {
    zr.addShape(new RectangleShape({
        style: {
            x: w * i, y: h, width : w, height : h,
            color : zrColor.toColor([10, i * 25, 10, 1], 'rgba')
        }
    }));
}
for (var i = 0; i < 10; i++) {
    zr.addShape(new RectangleShape({
        style: {
            x: w * i, y: h * 2, width : w, height : h,
            color : zrColor.toColor([10, 10, i * 25], 'hex')
        }
    }));
}
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'toArray',
                des: '返回颜色值数组，toColor的逆运算',
                params: [
                    ['color', '{color}', '颜色']
                ],
                res: ['data', '{Array}', '颜色值数组'],
                cantry: false
            }
        ]
    }
];