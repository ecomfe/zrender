var navZrender = document.getElementById('nav-zrender');
var navZrenderInstance = document.getElementById('nav-zrender-instance');
var navShape = document.getElementById('nav-shape');
var navTool = document.getElementById('nav-tool');
var navAnimation = document.getElementById('nav-animation');
var main = document.getElementById('main');

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
                mainHtml.push(buildContent(name + '.' + item.name, item2));
            }
            navHtml.push('</ul>');
        }
    }
    navDom.innerHTML = navHtml.join('');
}

function buildNav(arHead, item, needIcon) {
    return '<li>' + (item.plus ? '<i class="icon-minus"></i>' : '') + '<a href="#' + (arHead + '.' + item.name) + '">' + (needIcon ? '<i class="icon-chevron-right"></i>' : '') + item.name + (typeof item.params != 'undefined' ? ' ()' : '') + '</a></li>';
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
            var le = encodeURIComponent(item.pre).length;
            if (le > 2008) {
              console.log(item.name,le);
            }
            paramsContent.push('<a href="example/demo.html?code=' + encodeURIComponent(item.pre) + '" target="_blank">try this &raquo;</a>');
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

var mainHtml = [
    '<p style="margin:10px 0 -30px 0">' + '<a href="mailto:kener.linfeng@gmail.com">' + 'Any feedback or question ? &raquo;</a>' + '</p>'];
var contentHeadTemplate = '<div class="page-header" id="{anchor}">' + '<h1>{name}</h1>{des}</div>';

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