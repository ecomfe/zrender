var zr; // 全局可用zrender对象
var domCode = document.getElementById('sidebar-code');
var domGraphic = document.getElementById('graphic');
var domMain = document.getElementById('main');
var domMessage = document.getElementById('wrong-message');
var iconResize = document.getElementById('icon-resize');
var needRefresh = false;

function autoResize() {
    if (iconResize.className == 'icon-resize-full') {
        focusCode();
        iconResize.className = 'icon-resize-small';
    }
    else {
        focusGraphic();
        iconResize.className = 'icon-resize-full';
    }
}

function focusCode() {
    domCode.className = 'span8 ani';
    domGraphic.className = 'span4 ani';
}

function focusGraphic() {
    domCode.className = 'span4 ani';
    domGraphic.className = 'span8 ani';
    if (needRefresh) {
        refresh();
    }
}

var editor = CodeMirror.fromTextArea(
    document.getElementById("code"),
    { lineNumbers: true }
);
editor.setOption("theme", 'monokai');
editor.on('change', function(){needRefresh = true;});

function refresh(isBtnRefresh){
    needRefresh = false;
    if (isBtnRefresh) {
        focusGraphic();
    }
    (new Function(editor.doc.getValue()))();
}

function QueryString() {
    var name,value,i;
    var str = location.href;
    var num = str.indexOf("?")
    str = str.substr(num+1);
    var arrtmp = str.split("&");
    for(i = 0;i < arrtmp.length;i++){
        num = arrtmp[i].indexOf("=");
        if(num > 0){
            name = arrtmp[i].substring(0, num);
            value = arrtmp[i].substr(num + 1);
            this[name] = value;
        }
    }
}

require.config({
    paths: {
        'js': '../asset/js/esl/js'
    },
    packages: [
        {
            name: 'zrender',
            location: '../../src',
            main: 'zrender'
        }
    ]
});

require(
    ['zrender/zrender'],
    function(zrender) {
        zr = zrender.init(document.getElementById('main'));
        var request=new QueryString();
        if (request.code) {
            editor.doc.setValue(
                "zr.clear()\n" +
                decodeURIComponent(request.code)
            );
        }
        refresh();
    }
)