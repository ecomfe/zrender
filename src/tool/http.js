/**
 * @module zrender/tool/http
 */
define(function(require) {
    /**
     * @typedef {Object} IHTTPGetOption
     * @property {string} url
     * @property {Function} onsuccess
     * @property {Function} [onerror]
     */

    /**
     * HTTP Get
     * @param {string|IHTTPGetOption} url
     * @param {Function} onsuccess
     * @param {Function} [onerror]
     * @param {Object} [opts] 额外参数
     */
    function get(url, onsuccess, onerror, opts) {
        if (typeof(url) === 'object') {
            var obj = url;
            url = obj.url;
            onsuccess = obj.onsuccess;
            onerror = obj.onerror;
            opts = obj;
        } else {
            if (typeof(onerror) === 'object') {
                opts = onerror;
            }
        }
        /* jshint ignore:start */
        var xhr = window.XMLHttpRequest
            ? new XMLHttpRequest()
            : new ActiveXObject('Microsoft.XMLHTTP');
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                    onsuccess && onsuccess(xhr.responseText);
                } else {
                    onerror && onerror();
                }
                xhr.onreadystatechange = new Function();
                xhr = null;
            }
        };

        xhr.send(null);
        /* jshint ignore:end */
    }

    return {
        get: get
    };
});