if (typeof require !== 'undefined') {
    require.config({
        baseUrl: '../../',
        paths: {
            'zrender': './'
        },
        urlArgs: '_v_=' + (+new Date())
    });
}

if (typeof requireES !== 'undefined') {
    requireES.config({
        baseUrl: '../../',
        paths: {
            'zrender': './'
        },
        urlArgs: '_v_=' + (+new Date())
    });
}