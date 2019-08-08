(function () {

    var baseUrl = window.AMD_BASE_URL || '../';
    var sourceMap = window.AMD_ENABLE_SOURCE_MAP;
    // `true` by default for debugging.
    sourceMap == null && (sourceMap = true);

    // Set default renderer in dev mode from hash.
    var matchResult = location.href.match(/[?&]__RENDERER__=(canvas|svg)(&|$)/);
    if (matchResult) {
        window.__ZRENDER__DEFAULT__RENDERER__ = matchResult[1];
    }

    if (typeof require !== 'undefined') {
        require.config({
            baseUrl: baseUrl,
            paths: {
                'zrender': 'dist/zrender',
                'data': 'test/data'
            }
            // urlArgs will prevent break point on init in debug tool.
            // urlArgs: '_v_=' + (+new Date())
        });
    }

    if (typeof requireES !== 'undefined') {
        requireES.config({
            baseUrl: baseUrl,
            paths: {
                'zrender': './',
                'data': 'test/data'
            },
            sourceMap: sourceMap
            // urlArgs: '_v_=' + (+new Date()),
        });
    }

})();