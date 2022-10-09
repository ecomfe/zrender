(function () {

    var baseUrl = window.AMD_BASE_URL || '../';
    var sourceMap = window.AMD_ENABLE_SOURCE_MAP;
    // `true` by default for debugging.
    sourceMap == null && (sourceMap = true);

    // Set default renderer in dev mode from hash.
    var rendererMatchResult = location.href.match(/[?&]__RENDERER__=(canvas|svg)(&|$)/);
    if (rendererMatchResult) {
        window.__ZRENDER__DEFAULT__RENDERER__ = rendererMatchResult[1];
    }

    var coarsePointerMatchResult = location.href.match(/[?&]__COARSE__POINTER__=(true|false|auto)(&|$)/);
    if (coarsePointerMatchResult) {
        window.__ZRENDER__DEFAULT__COARSE_POINTER =
            coarsePointerMatchResult[1] === 'true'
                ? true
                : coarsePointerMatchResult[1] === 'false'
                    ? false
                    : 'auto';
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
                'tslib': 'node_modules/tslib/tslib.es6',
                'data': 'test/data'
            },
            sourceMap: sourceMap
            // urlArgs: '_v_=' + (+new Date()),
        });
    }

})();