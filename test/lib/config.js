(function () {

    var baseUrl = window.AMD_BASE_URL || '../';

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
            urlArgs: '_v_=' + (+new Date())
        });
    }

})();