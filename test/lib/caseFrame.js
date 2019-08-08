
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

        window.addEventListener('hashchange', updateView, true);

        updateView();
    };

    function renderHTML(dom) {
        dom.className = 'case-frame';
        dom.innerHTML = HTML;
    }

    function updateRendererSelector() {
        var rendererSelectors = document.querySelectorAll(SELECTOR_RENDERER);

        for (var i = 0; i < rendererSelectors.length; i++) {
            var el = rendererSelectors[i];
            el.disabled = !!globalOpt.disableRendererSelector;
            testHelper.off(el, 'click');
            testHelper.on(el, 'click', function (e) {
                setState('renderer', e.target.value);
            });
        }

        var renderer = getState('renderer');

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
            testHelper.on(hint, 'mouseover', function (e) {
                updatePageHint('full');
                this.select();
            });
            testHelper.off(hint, 'mouseout');
            testHelper.on(hint, 'mouseout', function (e) {
                updatePageHint('short');
            });
        }
    }

    function updateDistSelector() {
        var distSelector = document.querySelector(SELECTOR_DIST);

        distSelector.disabled = !!globalOpt.disableDistSelector;

        testHelper.off(distSelector, 'change');
        testHelper.on(distSelector, 'change', function (e) {
            var selector = e.target;
            setState('dist', selector.options[selector.selectedIndex].value);
        });

        var dist = getState('dist');

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
            setState('listFilterName', selector.options[selector.selectedIndex].value);
        });

        var currentFilterName = getState('listFilterName');
        var options = filterSelector.options;
        for (var i = 0; i < options.length; i++) {
            if (options[i].value === currentFilterName) {
                filterSelector.selectedIndex = i;
            }
        }
    }

    // prop: renderer, dist, pagePath
    function getState(prop) {
        return stateGetters[prop](getCurrentPageURL());
    }

    var stateGetters = {
        // 'canvas', 'svg'
        renderer: function (pageURL) {
            var matchResult = (pageURL || '').match(/[?&]__RENDERER__=(canvas|svg)(&|$)/);
            return matchResult && matchResult[1] || 'canvas';
        },
        // 'dist', 'webpack', 'webpackold'
        dist: function (pageURL) {
            var matchResult = (pageURL || '').match(
                /[?&]__ECDIST__=(webpack-req-ec|webpack-req-eclibec|webpackold-req-ec|webpackold-req-eclibec)(&|$)/
            );
            return matchResult && matchResult[1] || 'dist';
        },
        listFilterName: function (pageURL) {
            var matchResult = (pageURL || '').match(/[?&]__FILTER__=([a-zA-Z0-9_-]*)(&|$)/);
            return matchResult && matchResult[1] || null;
        },
        // {index, pagePath} or null
        pagePathInfo: getStatePagePathInfo,
        pagePath: function (pageURL) {
            return getStatePagePathInfo(pageURL).pagePath;
        }
    };

    function getStatePagePathInfo(pageURL) {
        var matchResult = (pageURL || '').match(/^[^?&]*/);
        var pagePath = matchResult && matchResult[0];
        var index;
        if (pagePath) {
            for (var i = 0; i < pagePaths.length; i++) {
                if (pagePaths[i] === pagePath) {
                    index = i;
                }
            }
        }
        return {index: index, pagePath: pagePath};
    }

    function setState(prop, value) {
        var curr = {
            renderer: getState('renderer'),
            dist: getState('dist'),
            pagePath: getState('pagePath'),
            listFilterName: getState('listFilterName')
        };
        curr[prop] = value;

        var newPageURL = makePageURL(curr);

        location.hash = '#' + encodeURIComponent(newPageURL);
    }

    function makePageURL(curr) {
        return curr.pagePath + '?' + [
            '__RENDERER__=' + curr.renderer,
            '__ECDIST__=' + curr.dist,
            '__FILTER__=' + curr.listFilterName
        ].join('&');
    }

    function updateView() {
        updateRendererSelector();
        updateDistSelector();
        updateListSelectedHint();
        updateListFilter();
        updateList();
        updatePage();
        updatePageHint('short');
    }

    function getCurrentPageURL() {
        return decodeURIComponent(
            (location.hash || '').replace(/^#/, '')
        );
    }

    function updateList() {
        var html = [];

        var filter;
        var listFilterName = getState('listFilterName');
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
            testHelper.on(liEl, 'click', function (e) {
                setState('pagePath', e.currentTarget.innerHTML);
                e.preventDefault();
                return false;
            });
        }
    }

    function updatePage() {
        var pageURL = getCurrentPageURL();
        var pagePathInfo = getState('pagePathInfo');

        var liList = document.querySelectorAll(SELECTOR_CASES_LIST_CONTAINER + ' li');
        for (var i = 0; i < liList.length; i++) {
            var el = liList[i];
            el.style.background = pagePathInfo.index === i ? 'rgb(170, 224, 245)' : 'none';
        }

        var src = pagePathInfo.pagePath ? baseURL + '/' + pageURL : 'about:blank';
        var contentIframe = document.querySelector(SELECTOR_CONTENT_IFRAME);
        contentIframe.src = src;
    }

    // type: 'full' or 'short'
    function updatePageHint(type) {
        var pagePathInfo = getState('pagePathInfo');

        var newValue = !pagePathInfo.pagePath
            ? ''
            : type === 'short'
            ? (pagePathInfo.index != null ? (pagePathInfo.index + 1) + '. ' : '')
                + (pagePathInfo.pagePath || '')
            : testHelper.dir() + '/' + pagePathInfo.pagePath;

        var infoPanelCurrent = document.querySelector(SELECTOR_CURRENT);
        infoPanelCurrent.value = newValue;
    }


    // ----------------------------------------------------------------
    // testHelper
    // ----------------------------------------------------------------

    var testHelper = {

        on: function (el, eventType, listener) {
            var listeners = el.__listeners || (el.__listeners = []);
            listeners.push(listener);
            el.addEventListener(eventType, listener, true);
        },

        off: function (el, eventType) {
            var listeners = el.__listeners;
            if (listeners) {
                for (var i = 0; i < listeners.length; i++) {
                    var listener = listeners[i];
                    el.removeEventListener(eventType, listener);
                }
            }
        },

        encodeHTML: function (source) {
            return String(source)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        dir: function () {
            return location.origin + testHelper.resolve(location.pathname, '..');
        },

        // Nodejs `path.resolve`.
        resolve: function () {
            var resolvedPath = '';
            var resolvedAbsolute;

            for (var i = arguments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
                var path = arguments[i];
                if (path) {
                    resolvedPath = path + '/' + resolvedPath;
                    resolvedAbsolute = path[0] === '/';
                }
            }

            if (!resolvedAbsolute) {
                throw new Error('At least one absolute path should be input.');
            }

            // Normalize the path
            resolvedPath = testHelper._normalizePathArray(resolvedPath.split('/'), false).join('/');

            return '/' + resolvedPath;
        },

        // resolves . and .. elements in a path array with directory names there
        // must be no slashes or device names (c:\) in the array
        // (so also no leading and trailing slashes - it does not distinguish
        // relative and absolute paths)
        _normalizePathArray: function (parts, allowAboveRoot) {
            var res = [];
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];

                // ignore empty parts
                if (!p || p === '.') {
                    continue;
                }

                if (p === '..') {
                    if (res.length && res[res.length - 1] !== '..') {
                        res.pop();
                    }
                    else if (allowAboveRoot) {
                        res.push('..');
                    }
                }
                else {
                    res.push(p);
                }
            }

            return res;
        }
    };


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