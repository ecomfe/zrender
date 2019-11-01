
/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

/**
 * Dependencies: testHelper.js, jquery, caseFrame.css
 */
(function () {

    var testHelper = window.testHelper;

    var CSS_BASE = '.case-frame';
    var SELECTOR_CASES_LIST_CONTAINER = CSS_BASE + ' .cases-list ul';
    var SELECTOR_CASES_ITEM = 'li a';
    var SELECTOR_CONTENT_IFRAME = CSS_BASE + ' .page-content iframe';
    var SELECTOR_RENDERER = CSS_BASE + ' .renderer-selector input';
    var SELECTOR_LISTER_FILTER = CSS_BASE + ' .list-filter';
    var SELECTOR_CURRENT = CSS_BASE + ' .info-panel .current';
    var SELECTOR_DIST = CSS_BASE + ' .dist-selector';

    var HTML = [
        '<div class="cases-list">',
        '    <div class="info-panel">',
        '        <input class="current" />',
        '        <div class="renderer-selector">',
        '            <input type="radio" value="canvas" name="renderer" /> CANVAS ',
        '            <input type="radio" value="svg" name="renderer" /> SVG ',
        '        </div>',
        '        <div class="list-filter"></div>',
        '        <select class="dist-selector">',
        '           <option value="dist"/>zrender/dist</option>',
        '        </select>',
        '    </div>',
        '    <ul></ul>',
        '</div>',
        '<div class="page-content">',
        '    <iframe frameborder="no" border="0" marginwidth="0" marginheight="0"',
        '        hspace="0" vspace="0">',
        '    </iframe>',
        '</div>'
    ].join('');

    var globalOpt;
    var pagePaths;
    var baseURL;
    var listFilters;
    var _storage;

    /**
     * @public
     */
    var caseFrame = window.caseFrame = {};

    /**
     * @public
     * @param {Object} opt
     * @param {HTMLElement} opt.dom
     * @param {Array.<string>} opt.pagePaths Relative paths.
     * @param {string} [opt.baseURL='.']
     * @param {string} [opt.disableRendererSelector]
     * @param {string} [opt.disableDistSelector]
     * @param {Array.<Object} [opt.filters] [{name: 'stream', whiteList: [...]}, ...]
     */
    caseFrame.init = function (opt) {
        renderHTML(opt.dom);

        globalOpt = opt;
        pagePaths = opt.pagePaths.slice();
        baseURL = opt.baseURL || '.';
        listFilters = opt.filters || [];

        testHelper.initURLStorage(updateView);
    };

    function renderHTML(dom) {
        dom.className = 'case-frame';
        dom.innerHTML = HTML;
    }

    function updateView() {
        updateStorage();
        updateRendererSelector();
        updateDistSelector();
        updateListSelectedHint();
        updateListFilter();
        updateList();
        updatePage();
        updatePageHint('short');
    }

    function updateStorage() {
        _storage = testHelper.getAllFromURL();
        var originPagePath = _storage.pagePath;
        // Default value.
        _storage.renderer = _storage.renderer || 'canvas';
        _storage.dist = _storage.dist || 'dist';
        _storage.listFilterName = _storage.listFilterName || null;
        _storage.pageURLSearchParamMap = _storage.pageURLSearchParamMap || {};
        _storage.pageURLHashParamMap = _storage.pageURLHashParamMap || {};
        _storage.pagePathInfo = makeStatePagePathInfo(originPagePath);
        _storage.pagePath = _storage.pagePathInfo.pagePath;

        updatePageURL();
    }

    function updateRendererSelector() {
        var rendererSelectors = document.querySelectorAll(SELECTOR_RENDERER);

        for (var i = 0; i < rendererSelectors.length; i++) {
            var el = rendererSelectors[i];
            el.disabled = !!globalOpt.disableRendererSelector;
            testHelper.off(el, 'click');
            testHelper.on(el, 'click', onClick);
        }

        function onClick(e) {
            testHelper.updateToHash('renderer', e.target.value);
        }

        var renderer = _storage.renderer;

        for (var i = 0; i < rendererSelectors.length; i++) {
            var el = rendererSelectors[i];
            el.checked = el.value === renderer;
        }
    }

    function updateListSelectedHint() {
        var hints = document.querySelectorAll(SELECTOR_CURRENT);
        for (var i = 0; i < hints.length; i++) {
            var hint = hints[i];
            testHelper.off(hint, 'mouseover');
            testHelper.on(hint, 'mouseover', onMouseOver);
            testHelper.off(hint, 'mouseout');
            testHelper.on(hint, 'mouseout', onMouseOut);
        }

        function onMouseOver(e) {
            updatePageHint('full', _storage);
            this.select();
        }

        function onMouseOut(e) {
            updatePageHint('short', _storage);
        }
    }

    function updateDistSelector() {
        var distSelector = document.querySelector(SELECTOR_DIST);

        distSelector.disabled = !!globalOpt.disableDistSelector;

        testHelper.off(distSelector, 'change');
        testHelper.on(distSelector, 'change', function (e) {
            var selector = e.target;
            testHelper.updateToHash('dist', selector.options[selector.selectedIndex].value);
        });

        var dist = _storage.dist;

        var options = distSelector.options;
        for (var i = 0; i < options.length; i++) {
            if (options[i].value === dist) {
                distSelector.selectedIndex = i;
            }
        }
    }

    function updateListFilter() {
        var html = [
            '<select class="dist-selector">',
            '<option value="all">all</option>'
        ];
        for (var i = 0; i < listFilters.length; i++) {
            var name = testHelper.encodeHTML(listFilters[i].name);
            html.push('<option value="' + name + '">' + name + '</option>');
        }
        html.push('</select>');

        var filterContainer = document.querySelector(SELECTOR_LISTER_FILTER);

        filterContainer.innerHTML = 'FILTER: &nbsp;' + html.join('');

        var filterSelector = document.querySelector(SELECTOR_LISTER_FILTER + ' select');

        testHelper.off(filterSelector, 'change');
        testHelper.on(filterSelector, 'change', function (e) {
            var selector = e.target;
            testHelper.updateToHash('listFilterName', selector.options[selector.selectedIndex].value);
        });

        var currentFilterName = _storage.listFilterName;
        var options = filterSelector.options;
        for (var i = 0; i < options.length; i++) {
            if (options[i].value === currentFilterName) {
                filterSelector.selectedIndex = i;
            }
        }
    }

    function makeStatePagePathInfo(pagePath) {
        var index = -1;
        if (pagePath) {
            for (var i = 0; i < pagePaths.length; i++) {
                if (pagePaths[i] === pagePath) {
                    index = i;
                }
            }
        }
        return {index: index, pagePath: pagePath};
    }

    function updateList() {
        var html = [];

        var filter;
        var listFilterName = _storage.listFilterName;
        if (listFilters && listFilterName) {
            for (var i = 0; i < listFilters.length; i++) {
                if (listFilters[i].name === listFilterName) {
                    filter = listFilters[i];
                    break;
                }
            }
        }

        for (var i = 0; i < pagePaths.length; i++) {
            var path = pagePaths[i];

            var whiteList = filter && filter.whiteList;
            if (whiteList) {
                var j = 0;
                for (; j < whiteList.length; j++) {
                    if (path === whiteList[j]) {
                        break;
                    }
                }
                if (j >= whiteList.length) {
                    continue;
                }
            }

            html.push(
                '<li><a href="' + baseURL + '/' + testHelper.encodeHTML(path) + '">'
                + testHelper.encodeHTML(path) + '</a></li>'
            );
        }

        var caseListContainer = document.querySelector(SELECTOR_CASES_LIST_CONTAINER);
        caseListContainer.innerHTML = html.join('');

        let liList = document.querySelectorAll(SELECTOR_CASES_LIST_CONTAINER + ' ' + SELECTOR_CASES_ITEM);
        for (var i = 0; i < liList.length; i++) {
            let liEl = liList[i];
            testHelper.off(liEl, 'click');
            testHelper.on(liEl, 'click', onLiClick);
        }

        function onLiClick(e) {
            testHelper.updateToHash({
                pagePath: e.currentTarget.innerHTML,
                pageURLSearchParamMap: {},
                pageURLHashParamMap: {}
            });
            e.preventDefault();
            return false;
        }
    }

    function updatePage() {
        var pagePathInfo = _storage.pagePathInfo;

        var liList = document.querySelectorAll(SELECTOR_CASES_LIST_CONTAINER + ' li');
        for (var i = 0; i < liList.length; i++) {
            var el = liList[i];
            el.style.background = pagePathInfo.index === i ? 'rgb(170, 224, 245)' : 'none';
        }

        var contentIframe = document.querySelector(SELECTOR_CONTENT_IFRAME);
        contentIframe.onload = handlePageOnLoad;
        var src = makeSrc();
        if (contentIframe.__currentSrc !== src) {
            contentIframe.__currentSrc = src;
            contentIframe.src = src;
        }
    }

    function updatePageURL() {
        _storage.pageURL = _storage.pagePath
            ? _storage.pagePath
                + '?' + [
                    '__RENDERER__=' + _storage.renderer,
                    '__ECDIST__=' + _storage.dist
                ].join('&') + testHelper.makeSearchStorageSegment(_storage.pageURLSearchParamMap)
                + '#' + testHelper.makeHashStorageSegment(_storage.pageURLHashParamMap)
            : '';
    }

    function makeSrc() {
        return _storage.pagePath ? baseURL + '/' + _storage.pageURL : 'about:blank';
    }

    function handlePageOnLoad() {
        var contentWindow = this.contentWindow;
        contentWindow.addEventListener('hashchange', handlePageURLChange.bind(null, contentWindow), true);
        handlePageURLChange(contentWindow);
    }

    function handlePageURLChange(contentWindow) {
        var contentURLStorage = contentWindow.zrTestURLStorage;
        if (!contentURLStorage) {
            return;
        }

        var childHashParams = contentURLStorage.getAllFromHash();
        var childSearchParams = contentURLStorage.getAllFromSearch();
        _storage.pageURLHashParamMap = childHashParams;
        _storage.pageURLSearchParamMap = childSearchParams;

        updatePageURL();

        var contentIframe = document.querySelector(SELECTOR_CONTENT_IFRAME);
        contentIframe.__currentSrc = makeSrc();

        testHelper.updateToHash({
            pageURLHashParamMap: childHashParams,
            pageURLSearchParamMap: childSearchParams
        });
    }

    // type: 'full' or 'short'
    function updatePageHint(type) {
        var pagePathInfo = _storage.pagePathInfo;

        var newValue = !pagePathInfo.pagePath
            ? ''
            : type === 'short'
            ? (pagePathInfo.index !== -1 ? (pagePathInfo.index + 1) + '. ' : '')
                + (pagePathInfo.pagePath || '')
            : testHelper.dir() + '/' + _storage.pageURL;

        var infoPanelCurrent = document.querySelector(SELECTOR_CURRENT);
        infoPanelCurrent.value = newValue;
    }



    // ------------------------------------------------------
    // initCases
    // ------------------------------------------------------

    /**
     * @public
     */
    window.initCases = function () {

        // Init list
        var url = testHelper.dir() + '/';

        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            let DONE = this.DONE || 4;
            if (this.readyState === DONE) {
                let content = request.responseText;
                let statusCode = this.status;
                try {
                    if (statusCode === 200) {
                        var pagePaths = fetchPagePaths(content);
                        if (pagePaths.length) {
                            caseFrame.init({
                                dom: document.getElementById('main'),
                                pagePaths: pagePaths
                            });
                        }
                    }
                    else {
                        renderFailInfo(url);
                    }
                }
                catch (err) {
                    renderFailInfo(url);
                    console.error(err);
                }
            }
        };
        request.open('GET', url, true);
        request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        request.send(null);
    };

    function renderFailInfo(url) {
        url = testHelper.encodeHTML(url);
        document.body.innerHTML = 'Error: This page requires a server that is able to list files when visiting'
            + ' <a target="_blank" href="' + url + '">' + url + '</a>.';
    }

    function fetchPagePaths(content) {
        var pageList = [];

        singleFetch(/"([^"/]*\/)*([^"/]+\.html)\s*"/g);
        singleFetch(/'([^'/]*\/)*([^'/]+\.html)\s*'/g);

        function singleFetch(pattern) {
            var result;
            while ((result = pattern.exec(content)) != null) {
                pageList.push(result[result.length - 1]);
            }
        }

        return pageList;
    }

})();