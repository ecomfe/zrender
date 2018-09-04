/**
 * Event Mixin
 * @module zrender/mixin/Eventful
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *         pissang (https://www.github.com/pissang)
 */

var arrySlice = Array.prototype.slice;

/**
 * Event dispatcher.
 *
 * @alias module:zrender/mixin/Eventful
 * @constructor
 * @param {Object} [eventProcessor] The object eventProcessor is the scope when
 *        `eventProcessor.xxx` called.
 * @param {Function} [eventProcessor.normalizeQuery]
 *        param: {string|Object} Raw query.
 *        return: {string|Object} Normalized query.
 * @param {Function} [eventProcessor.filter] Event will be dispatched only
 *        if it returns `true`.
 *        param: {string} eventType
 *        param: {string|Object} query
 *        return: {boolean}
 * @param {Function} [eventProcessor.afterTrigger] Call after all handlers called.
 *        param: {string} eventType
 */
var Eventful = function (eventProcessor) {
    this._$handlers = {};
    this._$eventProcessor = eventProcessor;
};

Eventful.prototype = {

    constructor: Eventful,

    /**
     * The handler can only be triggered once, then removed.
     *
     * @param {string} event The event name.
     * @param {string|Object} [query] Condition used on event filter.
     * @param {Function} handler The event handler.
     * @param {Object} context
     */
    one: function (event, query, handler, context) {
        var _h = this._$handlers;

        if (typeof query === 'function') {
            context = handler;
            handler = query;
            query = null;
        }

        if (!handler || !event) {
            return this;
        }

        query = normalizeQuery(this, query);

        if (!_h[event]) {
            _h[event] = [];
        }

        for (var i = 0; i < _h[event].length; i++) {
            if (_h[event][i].h === handler) {
                return this;
            }
        }

        _h[event].push({
            h: handler,
            one: true,
            query: query,
            ctx: context || this
        });

        return this;
    },

    /**
     * Bind a handler.
     *
     * @param {string} event The event name.
     * @param {string|Object} [query] Condition used on event filter.
     * @param {Function} handler The event handler.
     * @param {Object} [context]
     */
    on: function (event, query, handler, context) {
        var _h = this._$handlers;

        if (typeof query === 'function') {
            context = handler;
            handler = query;
            query = null;
        }

        if (!handler || !event) {
            return this;
        }

        query = normalizeQuery(this, query);

        if (!_h[event]) {
            _h[event] = [];
        }

        for (var i = 0; i < _h[event].length; i++) {
            if (_h[event][i].h === handler) {
                return this;
            }
        }

        _h[event].push({
            h: handler,
            one: false,
            query: query,
            ctx: context || this
        });

        return this;
    },

    /**
     * Whether any handler has bound.
     *
     * @param  {string}  event
     * @return {boolean}
     */
    isSilent: function (event) {
        var _h = this._$handlers;
        return _h[event] && _h[event].length;
    },

    /**
     * Unbind a event.
     *
     * @param {string} event The event name.
     * @param {Function} [handler] The event handler.
     */
    off: function (event, handler) {
        var _h = this._$handlers;

        if (!event) {
            this._$handlers = {};
            return this;
        }

        if (handler) {
            if (_h[event]) {
                var newList = [];
                for (var i = 0, l = _h[event].length; i < l; i++) {
                    if (_h[event][i].h !== handler) {
                        newList.push(_h[event][i]);
                    }
                }
                _h[event] = newList;
            }

            if (_h[event] && _h[event].length === 0) {
                delete _h[event];
            }
        }
        else {
            delete _h[event];
        }

        return this;
    },

    /**
     * Dispatch a event.
     *
     * @param {string} type The event name.
     */
    trigger: function (type) {
        var _h = this._$handlers[type];
        var eventProcessor = this._$eventProcessor;

        if (_h) {
            var args = arguments;
            var argLen = args.length;

            if (argLen > 3) {
                args = arrySlice.call(args, 1);
            }

            var len = _h.length;
            for (var i = 0; i < len;) {
                var hItem = _h[i];
                if (eventProcessor
                    && eventProcessor.filter
                    && hItem.query != null
                    && !eventProcessor.filter(type, hItem.query)
                ) {
                    i++;
                    continue;
                }

                // Optimize advise from backbone
                switch (argLen) {
                    case 1:
                        hItem.h.call(hItem.ctx);
                        break;
                    case 2:
                        hItem.h.call(hItem.ctx, args[1]);
                        break;
                    case 3:
                        hItem.h.call(hItem.ctx, args[1], args[2]);
                        break;
                    default:
                        // have more than 2 given arguments
                        hItem.h.apply(hItem.ctx, args);
                        break;
                }

                if (hItem.one) {
                    _h.splice(i, 1);
                    len--;
                }
                else {
                    i++;
                }
            }
        }

        eventProcessor && eventProcessor.afterTrigger
            && eventProcessor.afterTrigger(type);

        return this;
    },

    /**
     * Dispatch a event with context, which is specified at the last parameter.
     *
     * @param {string} type The event name.
     */
    triggerWithContext: function (type) {
        var _h = this._$handlers[type];
        var eventProcessor = this._$eventProcessor;

        if (_h) {
            var args = arguments;
            var argLen = args.length;

            if (argLen > 4) {
                args = arrySlice.call(args, 1, args.length - 1);
            }
            var ctx = args[args.length - 1];

            var len = _h.length;
            for (var i = 0; i < len;) {
                var hItem = _h[i];
                if (eventProcessor
                    && eventProcessor.filter
                    && hItem.query != null
                    && !eventProcessor.filter(type, hItem.query)
                ) {
                    i++;
                    continue;
                }

                // Optimize advise from backbone
                switch (argLen) {
                    case 1:
                        hItem.h.call(ctx);
                        break;
                    case 2:
                        hItem.h.call(ctx, args[1]);
                        break;
                    case 3:
                        hItem.h.call(ctx, args[1], args[2]);
                        break;
                    default:
                        // have more than 2 given arguments
                        hItem.h.apply(ctx, args);
                        break;
                }

                if (hItem.one) {
                    _h.splice(i, 1);
                    len--;
                }
                else {
                    i++;
                }
            }
        }

        eventProcessor && eventProcessor.afterTrigger
            && eventProcessor.afterTrigger(type);

        return this;
    }
};

function normalizeQuery(host, query) {
    var eventProcessor = host._$eventProcessor;
    if (query != null && eventProcessor && eventProcessor.normalizeQuery) {
        query = eventProcessor.normalizeQuery(query);
    }
    return query;
}

// ----------------------
// The events in zrender
// ----------------------

/**
 * @event module:zrender/mixin/Eventful#onclick
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#onmouseover
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#onmouseout
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#onmousemove
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#onmousewheel
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#onmousedown
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#onmouseup
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#ondrag
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#ondragstart
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#ondragend
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#ondragenter
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#ondragleave
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#ondragover
 * @type {Function}
 * @default null
 */
/**
 * @event module:zrender/mixin/Eventful#ondrop
 * @type {Function}
 * @default null
 */

export default Eventful;