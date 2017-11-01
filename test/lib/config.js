(function () {

    var baseUrl = window.AMD_BASE_URL || '../';
    var sourceMap = window.AMD_ENABLE_SOURCE_MAP;
    // `true` by default for debugging.
    sourceMap == null && (sourceMap === true);

    if (typeof require !== 'undefined') {
        require.config({
            baseUrl: baseUrl,
            paths: {
                'zrender': 'dist/zrender',
                'data': 'test/data'
            },
            urlArgs: '_v_=' + (+new Date())
        });
    }

    if (typeof requireES !== 'undefined') {
        requireES.config({
            baseUrl: baseUrl,
            paths: {
                'zrender': './',
                'data': 'test/data'
            },
            urlArgs: '_v_=' + (+new Date()),
            sourceMap: sourceMap
        });
    }

})();