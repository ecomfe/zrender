description = description || {};
description.zrender = [
    {
        name: 'init',
        des: '一切从init开始！执行init后将得到zrender实例（文档后续将称之为“ZRender”），实例可用的接口方法见<a href="#zrenderInstance">ZRender</a>',
        params: [
            ['dom', '{HTMLElement}', 'dom对象，偶懒，不帮你做document.getElementById了'],
            ['params', '{Object=}', '个性化参数，如自定义shape集合，带进来就好']
        ],
        res: ['ZRender', '{ZRender}', 'zrender实例，见<a href="#zrenderInstance">ZRender</a>'],
        pre: (function() {
var zrender = require('zrender');
var zr = zrender.init(document.getElementById('main'));
zr.addShape({});
zr.render();
        }).toString().slice(13, -10),
        cantry: false
    },
    {
        name: 'dispose',
        des: 'zrender实例销毁，可以通过zrender.dispose(ZRender)销毁指定ZRender实例，当然也可以直接ZRender.dispose()自己销毁',
        params: [
            ['zi', '{ZRender=}', 'ZRender对象，不传则销毁全部']
        ],
        res: ['self', '{zrender}', '返回自身支持链式调用'],
        pre: (function() {
var zrender = require('zrender');
var zr = zrender.init(document.getElementById('main'));
zr.dispose(); // == zrender.dispose(zr);
        }).toString().slice(13, -10),
        cantry: false
    },
    {
        name: 'getInstance',
        des: '获取zrender实例',
        params: [
            ['id', '{string}', 'ZRender索引，实例唯一标识']
        ],
        res: ['ZRender', '{ZRender}', 'zrender实例，见<a href="#zrenderInstance">ZRender</a>'],
        pre: (function() {
var id = zr.getId();
zz = zrender.getInstance(id); // == zr 
        }).toString().slice(13, -10),
        cantry: false
    },
    {
        name: 'delInstance',
        des: '删除zrender实例，ZRender实例dispose时会自动调用，删除后getInstance则返回undefined，需要注意的是这仅是删除，删除的实例不代表已经dispose了~~这是一个摆脱全局zrender.dispose()自动销毁的后门，take care of yourself~',
        params: [
            ['id', '{string}', 'ZRender索引，实例唯一标识']
        ],
        res: ['self', '{zrender}', '返回自身支持链式调用']
    }
];