define(function(require) {

    var requestAnimationFrame= (typeof window !== 'undefined' &&
                                    (window.requestAnimationFrame
                                    || window.msRequestAnimationFrame
                                    || window.mozRequestAnimationFrame
                                    || window.webkitRequestAnimationFrame))
                                || function (func) {
                                    setTimeout(func, 16);
                                };
    //当在Vuejs及IE环境下初始化时报TypeCall Error.
    return function(fn){
        requestAnimationFrame.call(window,fn);
    };
});
