declare const wx: {
    getSystemInfoSync: Function
};

class Browser {
    firefox = false
    ie = false
    edge = false
    newEdge = false
    weChat = false
    version: string | number
}

class Env {
    browser = new Browser()
    node = false
    wxa = false
    worker = false

    canvasSupported = false
    svgSupported = false
    touchEventsSupported = false
    pointerEventsSupported = false
    domSupported = false
}

const env = new Env();

if (typeof wx === 'object' && typeof wx.getSystemInfoSync === 'function') {
    env.wxa = true;
    env.canvasSupported = true;
    env.touchEventsSupported = true;
}
else if (typeof document === 'undefined' && typeof self !== 'undefined') {
    // In worker
    env.worker = true;
    env.canvasSupported = true;
}
else if (typeof navigator === 'undefined') {
    // In node
    env.node = true;
    env.canvasSupported = true;
    env.svgSupported = true;
}
else {
    detect(navigator.userAgent, env);
}

// Zepto.js
// (c) 2010-2013 Thomas Fuchs
// Zepto.js may be freely distributed under the MIT license.

function detect(ua: string, env: Env) {
    const browser = env.browser;
    const firefox = ua.match(/Firefox\/([\d.]+)/);
    const ie = ua.match(/MSIE\s([\d.]+)/)
        // IE 11 Trident/7.0; rv:11.0
        || ua.match(/Trident\/.+?rv:(([\d.]+))/);
    const edge = ua.match(/Edge?\/([\d.]+)/); // IE 12 and 12+

    const weChat = (/micromessenger/i).test(ua);

    if (firefox) {
        browser.firefox = true;
        browser.version = firefox[1];
    }
    if (ie) {
        browser.ie = true;
        browser.version = ie[1];
    }

    if (edge) {
        browser.edge = true;
        browser.version = edge[1];
        browser.newEdge = +edge[1].split('.')[0] > 18; 
    }

    // It is difficult to detect WeChat in Win Phone precisely, because ua can
    // not be set on win phone. So we do not consider Win Phone.
    if (weChat) {
        browser.weChat = true;
    }

    env.canvasSupported = !!(document && document.createElement('canvas').getContext);
    env.svgSupported = typeof SVGRect !== 'undefined';
    env.touchEventsSupported = 'ontouchstart' in window && !browser.ie && !browser.edge;
    env.pointerEventsSupported = 'onpointerdown' in window
        && (browser.edge || (browser.ie && +browser.version >= 11));
    env.domSupported = typeof document !== 'undefined';
}


export default env;
