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

var developMode = false;
if (developMode) {
    // for develop
    require.config({
        packages: [
            {
                name: 'zrender',
                location: '../../src',
                main: 'zrender'
            }
        ]
    });
}
else {
    // for echarts online home page
    var fileLocation = './www/js/zrender';
    require.config({
        paths:{ 
            zrender: fileLocation,
            'zrender/shape/Rose': fileLocation,
            'zrender/shape/Trochoid': fileLocation,
            'zrender/shape/Circle': fileLocation,
            'zrender/shape/Sector': fileLocation,
            'zrender/shape/Ring': fileLocation,
            'zrender/shape/Ellipse': fileLocation,
            'zrender/shape/Rectangle': fileLocation,
            'zrender/shape/Text': fileLocation,
            'zrender/shape/Heart': fileLocation,
            'zrender/shape/Droplet': fileLocation,
            'zrender/shape/Line': fileLocation,
            'zrender/shape/Image': fileLocation,
            'zrender/shape/Star': fileLocation,
            'zrender/shape/Isogon': fileLocation,
            'zrender/shape/BezierCurve': fileLocation,
            'zrender/shape/Polyline': fileLocation,
            'zrender/shape/Path': fileLocation,
            'zrender/shape/Polygon': fileLocation
        }
    });
}


require(
    [
        'zrender',
        'zrender/shape/Rose',
        'zrender/shape/Trochoid',
        'zrender/shape/Circle',
        'zrender/shape/Sector',
        'zrender/shape/Ring',
        'zrender/shape/Ellipse',
        'zrender/shape/Rectangle',
        'zrender/shape/Text',
        'zrender/shape/Heart',
        'zrender/shape/Droplet',
        'zrender/shape/Line',
        'zrender/shape/Image',
        'zrender/shape/Star',
        'zrender/shape/Isogon',
        'zrender/shape/BezierCurve',
        'zrender/shape/Polyline',
        'zrender/shape/Path',
        'zrender/shape/Polygon'
    ],
    function(zrender) {
        zr = zrender.init(document.getElementById('main'));
        var request = new QueryString();
        if (request.code) {
            editor.doc.setValue(
                "zr.clear()\n" +
                decodeURIComponent(request.code)
            );
        }
        refresh();
    }
)