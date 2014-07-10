define(function() {

    function Handler(action, context) {
        this.action = action;
        this.context = context;
    }

    var notifier = {
        /**
         * Trigger event
         * @param  {string} name
         */
        trigger : function(name) {
            if (! this.hasOwnProperty('__handlers__')) {
                return;
            }
            if (!this.__handlers__.hasOwnProperty(name)) {
                return;
            }

            var hdls = this.__handlers__[name];
            var l = hdls.length, i = -1, args = arguments;
            // Optimize from backbone
            switch (args.length) {
                case 1: 
                    while (++i < l)
                        hdls[i].action.call(hdls[i].context);
                    return;
                case 2:
                    while (++i < l)
                        hdls[i].action.call(hdls[i].context, args[1]);
                    return;
                case 3:
                    while (++i < l)
                        hdls[i].action.call(hdls[i].context, args[1], args[2]);
                    return;
                case 4:
                    while (++i < l)
                        hdls[i].action.call(hdls[i].context, args[1], args[2], args[3]);
                    return;
                case 5:
                    while (++i < l)
                        hdls[i].action.call(hdls[i].context, args[1], args[2], args[3], args[4]);
                    return;
                default:
                    while (++i < l)
                        hdls[i].action.apply(hdls[i].context, Array.prototype.slice.call(args, 1));
                    return;
            }
        },
        /**
         * Register event handler
         * @param  {string} name
         * @param  {Function} action
         * @param  {Object} [context]
         * @chainable
         */
        on : function(name, action, context) {
            if (!name || !action) {
                return;
            }
            var handlers = this.__handlers__ || (this.__handlers__={});
            if (! handlers[name]) {
                handlers[name] = [];
            } else {
                if (this.has(name, action)) {
                    return;
                }   
            }
            var handler = new Handler(action, context || this);
            handlers[name].push(handler);

            return this;
        },

        /**
         * Register event, event will only be triggered once and then removed
         * @param  {string} name
         * @param  {Function} action
         * @param  {Object} [context]
         * @chainable
         */
        once : function(name, action, context) {
            if (!name || !action) {
                return;
            }
            var self = this;
            function wrapper() {
                self.off(name, wrapper);
                action.apply(this, arguments);
            }
            return this.on(name, wrapper, context);
        },

        /**
         * Alias of on('success')
         * @param  {Function} action
         * @param  {Object} [context]
         * @chainable
         */
        success : function(action, context) {
            return this.once('success', action, context);
        },

        /**
         * Alias of on('error')
         * @param  {Function} action
         * @param  {Object} [context]
         * @chainable
         */
        error : function(action, context) {
            return this.once('error', action, context);
        },

        /**
         * Alias of on('success')
         * @param  {Function} action
         * @param  {Object} [context]
         * @chainable
         */
        off : function(name, action) {
            
            var handlers = this.__handlers__ || (this.__handlers__={});

            if (!action) {
                handlers[name] = [];
                return;
            }
            if (handlers[name]) {
                var hdls = handlers[name];
                var retains = [];
                for (var i = 0; i < hdls.length; i++) {
                    if (action && hdls[i].action !== action) {
                        retains.push(hdls[i]);
                    }
                }
                handlers[name] = retains;
            } 

            return this;
        }
    }
    
    return notifier;
});