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
var textShape = {
    shape : 'text',
    style : {
        x : 100, y : 100, 
        text: 'zrender', 
        textFont: 'bold 18px verdana'
    }
};
zr.addShape(textShape);
zr.addShape({
    shape: 'text',
    id: zr.newShapeId(),
    style: {
        x: 20, y: 20, 
        text : textShape.style.text 
               + ' width = ' 
               + zrArea.getTextWidth(
                   textShape.style.text,
                   textShape.style.textFont
               )
    }
});
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
            ['getStepColors', '{Function}', '按步长获得颜色梯度数组'],
            ['getGradientColors', '{Function}', '获得颜色梯度数组'],
            ['reverse', '{Function}', '颜色翻转'],
            ['mix', '{Function}', '颜色混合'],
            ['lift', '{Function}', '颜色升降'],
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
            ['toArray', '{Function}', '返回颜色值数组'],
            ['alpha', '{Function}', '设置颜色的透明度']
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
zr.addShape({
    shape: 'circle',
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
});
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
zr.addShape({
    shape: 'circle',
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
});
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
zr.addShape({
    shape: 'circle',
    style: {
        x: 200, y: 200, r : 50, 
        color : 'green'
    }
});
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
zr.addShape({
    shape: 'circle',
    style: {
        x: 200, y: 200, r : 50, 
        color : zrColor.getRadialGradient(
            200, 200, 0, 200, 200, 50, 
            [[0, 'yellow'], [0.8, 'red'], [1,'lightgreen']]
        )
    },
    draggable : true
});
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'getLinearGradient',
                des: '线性渐变',
                params: [
                    ['x0', '{number}', '渐变起点'],
                    ['y0', '{number}', '渐变起点'],
                    ['x1', '{number}', '渐变终点'],
                    ['y1', '{number}', '渐变终点'],
                    ['colorList', '{Array}', '偏移颜色列表'],
                ],
                res: ['color', '{color}', '颜色'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var width = zr.getWidth();
var height = zr.getHeight();
zr.addShape({
    shape: 'rectangle',
    style: {
        x: 0, y: 0, width : width, height : height,
        color : zrColor.getLinearGradient(
            0, 0, width, 0,
            [[0, 'yellow'],[0.5, 'red'],[1,'lightgreen']]
        )
    }
});
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'getStepColors',
                des: '获取颜色带步长的梯度数据',
                params: [
                    ['start', '{color}', '起始颜色'],
                    ['end', '{color}', '结束颜色'],
                    ['step', '{number}', '步长']
                ],
                res: ['colorArray', '{Array}', '颜色数组'],
                pre: (function() {
var zrColor = require('zrender/tool/color');
var width = zr.getWidth();
var height = zr.getHeight();
var colorList = zrColor.getStepColors('red', 'green', 10);
var w = Math.round(width / colorList.length);
for (var i = 0, l = colorList.length; i < l; i++) {
    zr.addShape({
        shape: 'rectangle',
        style: {
            x: w * i, y: 0, width : w, height : height,
            color : colorList[i]
        }
    });   
}
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            },
            {
                name: 'getGradientColors',
                des: '获取颜色梯度数据',
                params: [
                    ['colors', '{Array}', '颜色组'],
                    ['step', '{number=}', '步长，默认20']
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
for (var i = 0, l = colorList.length; i < l; i++) {
    zr.addShape({
        shape: 'rectangle',
        style: {
            x: w * i, y: 0, width : w, height : height,
            color : colorList[i]
        }
    });   
}
zr.render();
                }).toString().slice(13, -10),
                cantry: true
            }
        ]
    }
];