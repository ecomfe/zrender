// Return true to cancel bubble
export type EventCallback<Ctx, Impl> = (
    this: CbThis<Ctx, Impl>, ...args: any[]
) => boolean | void
export type EventQuery = string | Object

type CbThis<Ctx, Impl> = unknown extends Ctx ? Impl : Ctx;

type EventHandler<Ctx, Impl> = {
    h: EventCallback<Ctx, Impl>
    ctx: CbThis<Ctx, Impl>
    query: EventQuery

    callAtLast: boolean
}

export interface EventProcessor {
    normalizeQuery?: (query: EventQuery) => EventQuery
    filter?: (eventType: string, query: EventQuery) => boolean
    afterTrigger?: (eventType: string) => void
}

/**
 * Event dispatcher.
 * @param eventProcessor The object eventProcessor is the scope when
 *        `eventProcessor.xxx` called.
 * @param eventProcessor.normalizeQuery
 *        param: {string|Object} Raw query.
 *        return: {string|Object} Normalized query.
 * @param eventProcessor.filter Event will be dispatched only
 *        if it returns `true`.
 *        param: {string} eventType
 *        param: {string|Object} query
 *        return: {boolean}
 * @param eventProcessor.afterTrigger Called after all handlers called.
 *        param: {string} eventType
 */
export default class Eventful {
    private _$handlers: {[key: string]: EventHandler<any, any>[]} = {}

    private _$eventProcessor: EventProcessor

    constructor(eventProcessors?: EventProcessor) {
        this._$eventProcessor = eventProcessors || null;
    }

    on<Ctx>(event: string, handler: EventCallback<Ctx, this>, context?: Ctx): this
    on<Ctx>(event: string, query: EventQuery, handler: EventCallback<Ctx, this>, context?: Ctx): this
    /**
     * Bind a handler.
     *
     * @param event The event name.
     * @param Condition used on event filter.
     * @param handler The event handler.
     * @param context
     */
    on<Ctx>(
        event: string,
        query: EventQuery | EventCallback<Ctx, this>,
        handler?: EventCallback<Ctx, this> | Ctx,
        context?: Ctx
    ): this {
        const _h = this._$handlers;

        if (typeof query === 'function') {
            context = handler as Ctx;
            handler = query as EventCallback<Ctx, this>;
            query = null;
        }

        if (!handler || !event) {
            return this;
        }

        const eventProcessor = this._$eventProcessor;
        if (query != null && eventProcessor && eventProcessor.normalizeQuery) {
            query = eventProcessor.normalizeQuery(query);
        }

        if (!_h[event]) {
            _h[event] = [];
        }

        for (let i = 0; i < _h[event].length; i++) {
            if (_h[event][i].h === handler) {
                return this;
            }
        }

        const wrap: EventHandler<Ctx, this> = {
            h: handler as EventCallback<Ctx, this>,
            query: query,
            ctx: (context || this) as CbThis<Ctx, this>,
            // FIXME
            // Do not publish this feature util it is proved that it makes sense.
            callAtLast: (handler as any).zrEventfulCallAtLast
        };

        const lastIndex = _h[event].length - 1;
        const lastWrap = _h[event][lastIndex];
        (lastWrap && lastWrap.callAtLast)
            ? _h[event].splice(lastIndex, 0, wrap)
            : _h[event].push(wrap);

        return this;
    }

    /**
     * Whether any handler has bound.
     */
    isSilent(eventName: string): boolean {
        const _h = this._$handlers;
        return !_h[eventName] || !_h[eventName].length;
    }

    /**
     * Unbind a event.
     *
     * @param eventType The event name.
     *        If no `event` input, "off" all listeners.
     * @param handler The event handler.
     *        If no `handler` input, "off" all listeners of the `event`.
     */
    off(eventType?: string, handler?: Function): this {
        const _h = this._$handlers;

        if (!eventType) {
            this._$handlers = {};
            return this;
        }

        if (handler) {
            if (_h[eventType]) {
                const newList = [];
                for (let i = 0, l = _h[eventType].length; i < l; i++) {
                    if (_h[eventType][i].h !== handler) {
                        newList.push(_h[eventType][i]);
                    }
                }
                _h[eventType] = newList;
            }

            if (_h[eventType] && _h[eventType].length === 0) {
                delete _h[eventType];
            }
        }
        else {
            delete _h[eventType];
        }

        return this;
    }

    /**
     * Dispatch a event.
     *
     * @param {string} eventType The event name.
     */
    trigger(eventType: string, ...args: any[]): this {
        const _h = this._$handlers[eventType];
        const eventProcessor = this._$eventProcessor;

        if (_h) {
            const argLen = args.length;

            const len = _h.length;
            for (let i = 0; i < len; i++) {
                const hItem = _h[i];
                if (eventProcessor
                    && eventProcessor.filter
                    && hItem.query != null
                    && !eventProcessor.filter(eventType, hItem.query)
                ) {
                    i++;
                    continue;
                }

                // Optimize advise from backbone
                switch (argLen) {
                    case 0:
                        hItem.h.call(hItem.ctx);
                        break;
                    case 1:
                        hItem.h.call(hItem.ctx, args[0]);
                        break;
                    case 2:
                        hItem.h.call(hItem.ctx, args[0], args[1]);
                        break;
                    default:
                        // have more than 2 given arguments
                        hItem.h.apply(hItem.ctx, args);
                        break;
                }
            }
        }

        eventProcessor && eventProcessor.afterTrigger
            && eventProcessor.afterTrigger(eventType);

        return this;
    }

    /**
     * Dispatch a event with context, which is specified at the last parameter.
     *
     * @param {string} type The event name.
     */
    triggerWithContext(type: string) {
        const _h = this._$handlers[type];
        const eventProcessor = this._$eventProcessor;

        if (_h) {
            const args: any = arguments;
            const argLen = args.length;
            const ctx = args[argLen - 1];

            const len = _h.length;
            for (let i = 0; i < len;) {
                const hItem = _h[i];
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
                    case 0:
                        hItem.h.call(ctx);
                        break;
                    case 1:
                        hItem.h.call(ctx, args[0]);
                        break;
                    case 2:
                        hItem.h.call(ctx, args[0], args[1]);
                        break;
                    default:
                        // have more than 2 given arguments
                        hItem.h.apply(ctx, args.slice(1, argLen - 1));
                        break;
                }
            }
        }

        eventProcessor && eventProcessor.afterTrigger
            && eventProcessor.afterTrigger(type);

        return this;
    }

}
