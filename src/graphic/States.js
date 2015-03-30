/**
 * States machine for managing graphic states
 */

define(function (require) {

    /**
     * @typedef {Object} IGraphicState
     * @property {number} [zlevel]
     * @property {number} [z]
     * @property {Array.<number>} {position}
     * @property {Array.<number>|number} {rotation}
     * @property {Array.<number>} {scale}
     * @property {Object} style
     *
     * @property {Function} onenter
     * @property {Function} onleave
     * @property {Function} ontransition
     * @property {Array.<IGraphicStateTransition|string>} transition
     *           Transition object or a string descriptor like '* 30 0 Linear'
     */

    var zrUtil = require('../core/util');
    var zrLog = require('../core/log');
    var Style = require('./Style');

    var vecCopy = function (v1, v2) {
        for (var i = 0; i < v2.length; v2++) {
            v1[i] = v2[i];
        }
    };

    var normalizeRotation = function (rot) {
        if (typeof(rot) == 'number') {
            return [rot, 0, 0];
        }
        else if (rot instanceof Array) {
            if (rot.length < 3) {
                rot[1] = rot[2] = 0;
            }
            return rot;
        }
        else {
            return [0, 0, 0];
        }
    };

    var transitionProperties = ['position', 'rotation', 'scale', 'style'];
    /**
     * @module zrender/graphic/States~TransitionObject
     */
    var TransitionObject = function (opts) {
        if (typeof opts == 'string') {
            this._fromStr(opts);
        }
        else if (opts) {
            opts.property && (this.property = opts.property);
            opts.duration != null && (this.duration = opts.duration);
            opts.easing && (this.easing = opts.easing);
            opts.delay && (this.delay = opts.delay);
        }
        if (this.property !== '*') {
            this.property = this.property.split(',');
        }
        else {
            this.property = transitionProperties;
        }
    };

    TransitionObject.prototype = {

        constructor: TransitionObject,
        
        /**
         * List of all transition properties. Splitted by comma. Must not have spaces in the string.
         * e.g. 'position,style.color'. '*' will match all the valid properties.
         * @type {string}
         * @default *
         */
        property: '*',

        /**
         * @type {string}
         * @default 'Linear'
         */
        easing: 'Linear',

        /**
         * @type {number}
         * @default 'number'
         */
        duration: 500,

        /**
         * @type {number}
         */
        delay: 0,

        _fromStr: function (str) {
            var arr = str.split(/\s+/g);
            this.property = arr[0];
            this.duration = +arr[1];
            this.delay = +arr[2];
            this.easing = arr[3];
        }
    };


    /**
     * @alias module:zrender/graphic/States
     */
    var GraphicStates = function (opts) {

        opts = opts || {};

        this._states = {};

        /**
         * Target element
         * @type {zrender/graphic/Displayable|zrender/graphic/Group}
         */
        this._el = opts.el;

        this._subStates = [];

        this._transitionAnimators = [];

        if (opts.defaultState) {
            this._defaultState = defaultState;
        }

        var optsStates = opts.states;
        if (optsStates) {
            for (var name in optsStates) {
                var state = optsStates[name];
                this._addState(name, state);
            }
        }

        this.setState(this._defaultState);
    };

    GraphicStates.prototype = {

        constructor: GraphicStates,

        /**
         * All other state will be extended from default state
         * @type {string}
         * @private
         */
        _defaultState: 'normal',

        /**
         * Current state
         * @type {string}
         * @private
         */
        _currentState: '',

        /**
         * If in transiting
         * @type {boolean}
         * @private
         */
        _transiting: '',

        el: function () {
            return this._el;
        },

        _addState: function (name, state) {
            this._states[name] = state;

            if (state.transition) {
                state.transition = new TransitionObject(state.transition);
            }

            // Extend from default state
            if (name !== this._defaultState) {
                this._extendFromDefault(state);
            }
            else {
                var el = this._el;
                var stateStyle = state.style;
                if (stateStyle && el) {
                    var elStyle = el.style;
                    // Extend el original style to default state
                    for (var name in elStyle) {
                        if (elStyle.hasOwnProperty(name)) {
                            stateStyle[name] = elStyle[name];
                        }
                    }
                }
                for (var name in this._states) {
                    this._extendFromDefault(this._states[name]);
                }
            }
        },

        _extendFromDefault: function (state) {
            var defaultState = this._states[this._defaultState];
            if (defaultState && state !== defaultState) {
                for (var name in defaultState) {
                    if (
                        defaultState.hasOwnProperty(name)
                        && ! state.hasOwnProperty(name)
                    ) {
                        state[name] = defaultState[name];
                    }
                }
            }
        },

        setState: function (name, silent) {
            if (name === this._currentState
                && !this._transiting
            ) {
                return;
            }

            var state = this._states[name];

            if (state) {
                this._stopTransition();

                if (! silent) {
                    var prevState = this._states[this._currentState];
                    if (prevState) {
                        prevState.onleave && prevState.onleave.call(this);
                    }

                    state.onenter && state.onenter.call(this);   
                }

                this._currentState = name;

                if (this._el) {
                    var el = this._el;

                    // Setting attributes
                    if (state.zlevel != null) {
                        el.zlevel = state.zlevel;
                    }
                    if (state.z != null) {
                        el.z = state.z;
                    }

                    // SRT
                    state.position && vecCopy(el.position, state.position);
                    state.scale && vecCopy(el.scale, state.scale);

                    var stateRotation = state.rotation;
                    if (stateRotation != null) {
                        state.rotation = normalizeRotation(state.rotation);
                        if (typeof el.rotation == 'number') {
                            el.rotation = stateRotation;
                        }
                        else {
                            vecCopy(el.rotation, state.rotation);
                        }
                    }

                    // Style
                    if (state.style) {
                        var defaultState = this._states[this._defaultState];
                        el.style = new Style();
                        if (defaultState) {
                            el.style.extendFrom(defaultState.style);
                        }
                        if (
                            // Not default state
                            name != this._defaultState
                            // Not extended from default state in _extendFromDefault method
                            && defaultState.style !== state.style
                        ) {
                            el.style.extendFrom(state.style, true);
                        }
                    }

                    el.dirty();
                }
            }

            for (var i = 0; i < this._subStates.length; i++) {
                this._subStates.setState(name);
            }
        },

        getState: function () {
            return this._currentState;
        },

        transitionState: function (target, done) {
            if (
                target === this._currentState
                && ! this._transiting
            ) {
                return;
            }

            var state = this._states[target];
            var styleReg = /$style\./;
            var self = this;

            if (state) {

                self._stopTransition();

                var el = self._el;

                if (state.transition && el && el.__zr) {// El can be animated
                    var transitionCfg = state.transition;
                    var property = transitionCfg.property;

                    var styleAnimated = false;
                    var animatingCount = 0;
                    var done = function () {
                        animatingCount--;
                        if (animatingCount === 0) {
                            self.setState(target);
                            done && done();
                        }
                        self._transiting = false;
                    }
                    for (var i = 0; i < property.length; i++) {
                        var propName = property[i];

                        if (propName === 'rotation' && ('rotation' in state)) {
                            state[propName] = normalizeRotation(state[propName]);
                            el[propName] = normalizeRotation(el[propName]);
                        }
                        // Animating all the properties in style
                        if (propName === 'style') {
                            if (state.style) {
                                for (var name in state.style) {
                                    animatingCount += self._animProp(
                                        state, name, transitionCfg, true, done
                                    );
                                }
                            }
                            styleAnimated = true;
                        }
                        // Animating particular property in style
                        else if (propName.match(styleReg) && ! styleAnimated && state.style) {
                            // remove 'style.' prefix
                            propName = propName.slice(6);
                            animatingCount += self._animProp(
                                state, propName, transitionCfg, true, done
                            );
                        }
                        else {
                            animatingCount += self._animProp(
                                state, propName, transitionCfg, false, done
                            );
                        }
                    }
                    // No transition properties
                    if (animatingCount === 0) {
                        self.setState(target);
                        done && done();
                    }
                    else {
                        self._transiting = true;
                    }
                }
                else {
                    self.setState(target);
                    done && done();
                }
            }

            for (var i = 0; i < self._subStates.length; i++) {
                self._subStates.transitionState(target);
            }
        },

        /**
         * Do transition animation of particular property
         * @param {Object} state
         * @param {string} property
         * @param {string} transitionCfg
         * @param {boolean} inStyle
         * @param {Function} done
         * @private
         */
        _animProp: function (state, property, transitionCfg, inStyle, done) {
            var el = this._el;
            var stateStyle = state.style;
            var elStyle = el.style;
            var availableProp = inStyle
                // Assume state has style here
                ? stateStyle.hasOwnProperty(property) && elStyle && (property in elStyle)
                : state.hasOwnProperty(property) && (property in el);
            var transitionAnimators = this._transitionAnimators;
            if (availableProp) {
                var obj = {};
                if (inStyle) {
                    if (stateStyle[property] === elStyle[property]) {
                        return 0;
                    }
                    obj[property] = stateStyle[property];
                }
                else {
                    if (stateStyle[property] === elStyle[property]) {
                        return 0;
                    }
                    obj[property] = stateStyle[property];
                }

                obj[property] = inStyle ? state.style[property] : state[property];
                var animator = el.animate(inStyle ? 'style' : '')
                    .when(transitionCfg.duration, obj)
                    .delay(transitionCfg.dealy)
                    .done(function () {
                        var idx = zrUtil.indexOf(transitionAnimators, 1);
                        if (idx > 0) {
                            transitionAnimators.splice(idx, 1);
                        }
                        done();
                    })
                    .start(transitionCfg.easing);
                transitionAnimators.push(animator);

                return 1;
            }
            return 0;
        },

        _stopTransition: function () {
            var transitionAnimators = this._transitionAnimators;
            for (var i = 0; i < transitionAnimators.length; i++) {
                transitionAnimators[i].stop();
            }
            transitionAnimators.length = 0;
            this._transiting = false;
        },

        addSubStates: function (states) {
            this._subStates.push(states);
        },

        removeSubStates: function (states) {
            var idx = zrUtil.indexOf(this._subStates, states);
            if (idx >= 0) {
                this._subStates.splice(states, 1);
            }
        }
    }

    return GraphicStates;
});