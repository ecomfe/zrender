/**
 * 动画主类, 调度和管理所有动画控制器
 *
 * @author pissang(https://github.com/pissang)
 *
 * @class : Animation
 * @config : stage(optional) 绘制类, 需要提供update接口
 * @config : onframe(optional)
 * @method : add
 * @method : remove
 * @method : update
 * @method : start
 * @method : stop
 */
define(
    function(require) {
        
        'use strict';

        var Clip = require('./Clip');
        var color = require('../tool/color');
        var util = require('../tool/util');
        var Dispatcher = require('../tool/event').Dispatcher;

        var requestAnimationFrame = window.requestAnimationFrame
                                    || window.msRequestAnimationFrame
                                    || window.mozRequestAnimationFrame
                                    || window.webkitRequestAnimationFrame
                                    || function(func){setTimeout(func, 16);};

        var arraySlice = Array.prototype.slice;

        function Animation(options) {

            options = options || {};

            this.stage = options.stage || {};

            this.onframe = options.onframe || function() {};

            // private properties
            this._clips = [];

            this._running = false;

            this._time = 0;

            Dispatcher.call(this);
        }

        Animation.prototype = {
            add : function(clip) {
                this._clips.push(clip);
            },
            remove : function(clip) {
                var idx = util.indexOf(this._clips, clip);
                if (idx >= 0) {
                    this._clips.splice(idx, 1);
                }
            },
            update : function() {

                var time = new Date().getTime();
                var delta = time - this._time;
                var clips = this._clips;
                var len = clips.length;

                var deferredEvents = [];
                var deferredClips = [];
                for (var i = 0; i < len; i++) {
                    var clip = clips[i];
                    var e = clip.step(time);
                    // Throw out the events need to be called after
                    // stage.update, like destroy
                    if (e) {
                        deferredEvents.push(e);
                        deferredClips.push(clip);
                    }
                }
                if (this.stage.update) {
                    this.stage.update();
                }

                // Remove the finished clip
                for (var i = 0; i < len;) {
                    if (clips[i]._needsRemove) {
                        clips[i] = clips[len-1];
                        clips.pop();
                        len--;
                    } else {
                        i++;
                    }
                }

                len = deferredEvents.length;
                for (var i = 0; i < len; i++) {
                    deferredClips[i].fire(deferredEvents[i]);
                }

                this._time = time;

                this.onframe(delta);

                this.dispatch('frame', delta);
            },
            start : function() {
                var self = this;

                this._running = true;

                function step() {
                    if (self._running) {
                        self.update();
                        requestAnimationFrame(step);
                    }
                }

                this._time = new Date().getTime();
                requestAnimationFrame(step);
            },
            stop : function() {
                this._running = false;
            },
            clear : function() {
                this._clips = [];
            },
            animate : function(target, options) {
                options = options || {};
                var deferred = new Deferred(
                    target,
                    options.loop,
                    options.getter, 
                    options.setter
                );
                deferred.animation = this;
                return deferred;
            },
            constructor: Animation
        };

        util.merge(Animation.prototype, Dispatcher.prototype, true);

        function _defaultGetter(target, key) {
            return target[key];
        }

        function _defaultSetter(target, key, value) {
            target[key] = value;
        }

        function _interpolateNumber(p0, p1, percent) {
            return (p1 - p0) * percent + p0;
        }

        function _interpolateArray(p0, p1, percent, out, arrDim) {
            var len = p0.length;
            if (arrDim == 1) {
                for (var i = 0; i < len; i++) {
                    out[i] = _interpolateNumber(p0[i], p1[i], percent); 
                }
            } else {
                var len2 = p0[0].length;
                for (var i = 0; i < len; i++) {
                    for (var j = 0; j < len2; j++) {
                        out[i][j] = _interpolateNumber(
                            p0[i][j], p1[i][j], percent
                        );
                    }
                }
            }
        }

        function _isArrayLike(data) {
            switch (typeof data) {
                case 'undefined':
                case 'string':
                    return false;
            }
            
            return typeof data.length !== 'undefined';
        }

        function _catmullRomInterpolateArray(
            p0, p1, p2, p3, t, t2, t3, out, arrDim
        ) {
            var len = p0.length;
            if (arrDim == 1) {
                for (var i = 0; i < len; i++) {
                    out[i] = _catmullRomInterpolate(
                        p0[i], p1[i], p2[i], p3[i], t, t2, t3
                    );
                }
            } else {
                var len2 = p0[0].length;
                for (var i = 0; i < len; i++) {
                    for (var j = 0; j < len2; j++) {
                        out[i][j] = _catmullRomInterpolate(
                            p0[i][j], p1[i][j], p2[i][j], p3[i][j],
                            t, t2, t3
                        );
                    }
                }
            }
        }

        function _catmullRomInterpolate(p0, p1, p2, p3, t, t2, t3) {
            var v0 = (p2 - p0) * 0.5;
            var v1 = (p3 - p1) * 0.5;
            return (2 * (p1 - p2) + v0 + v1) * t3 
                    + (- 3 * (p1 - p2) - 2 * v0 - v1) * t2
                    + v0 * t + p1;
        }

        function _cloneValue(value) {
            if (_isArrayLike(value)) {
                var len = value.length;
                if (_isArrayLike(value[0])) {
                    var ret = [];
                    for (var i = 0; i < len; i++) {
                        ret.push(arraySlice.call(value[i]));
                    }
                    return ret;
                } else {
                    return arraySlice.call(value);
                }
            } else {
                return value;
            }
        }

        function rgba2String(rgba) {
            rgba[0] = Math.floor(rgba[0]);
            rgba[1] = Math.floor(rgba[1]);
            rgba[2] = Math.floor(rgba[2]);

            return 'rgba(' + rgba.join(',') + ')';
        }

        function Deferred(target, loop, getter, setter) {
            this._tracks = {};
            this._target = target;

            this._loop = loop || false;

            this._getter = getter || _defaultGetter;
            this._setter = setter || _defaultSetter;

            this._clipCount = 0;

            this._delay = 0;

            this._doneList = [];

            this._onframeList = [];

            this._clipList = [];
        }

        Deferred.prototype = {
            when : function(time /* ms */, props) {
                for (var propName in props) {
                    if (! this._tracks[propName]) {
                        this._tracks[propName] = [];
                        // If time is 0 
                        //  Then props is given initialize value
                        // Else
                        //  Initialize value from current prop value
                        if (time !== 0) {
                            this._tracks[propName].push({
                                time : 0,
                                value : _cloneValue(
                                    this._getter(this._target, propName)
                                )
                            });
                        }
                    }
                    this._tracks[propName].push({
                        time : parseInt(time, 10),
                        value : props[propName]
                    });
                }
                return this;
            },
            during : function(callback) {
                this._onframeList.push(callback);
                return this;
            },
            start : function(easing) {

                var self = this;
                var setter = this._setter;
                var getter = this._getter;
                var onFrameListLen = self._onframeList.length;
                var useSpline = easing === 'spline';

                var ondestroy = function() {
                    self._clipCount--;
                    if (self._clipCount === 0) {
                        // Clear all tracks
                        self._tracks = {};

                        var len = self._doneList.length;
                        for (var i = 0; i < len; i++) {
                            self._doneList[i].call(self);
                        }
                    }
                };

                var createTrackClip = function(keyframes, propName) {
                    var trackLen = keyframes.length;
                    if (!trackLen) {
                        return;
                    }
                    // Guess data type
                    var firstVal = keyframes[0].value;
                    var isValueArray = _isArrayLike(firstVal);
                    var isValueColor = false;

                    // For vertices morphing
                    var arrDim = (
                            isValueArray 
                            && _isArrayLike(firstVal[0])
                        )
                        ? 2 : 1;
                    // Sort keyframe as ascending
                    keyframes.sort(function(a, b) {
                        return a.time - b.time;
                    });
                    var trackMaxTime;
                    if (trackLen) {
                        trackMaxTime = keyframes[trackLen-1].time;
                    }else{
                        return;
                    }
                    // Percents of each keyframe
                    var kfPercents = [];
                    // Value of each keyframe
                    var kfValues = [];
                    for (var i = 0; i < trackLen; i++) {
                        kfPercents.push(keyframes[i].time / trackMaxTime);
                        // Assume value is a color when it is a string
                        var value = keyframes[i].value;
                        if (typeof(value) == 'string') {
                            value = color.toArray(value);
                            if (value.length === 0) {    // Invalid color
                                value[0] = value[1] = value[2] = 0;
                                value[3] = 1;
                            }
                            isValueColor = true;
                        }
                        kfValues.push(value);
                    }

                    // Cache the key of last frame to speed up when 
                    // animation playback is sequency
                    var cacheKey = 0;
                    var cachePercent = 0;
                    var start;
                    var i, w;
                    var p0, p1, p2, p3;


                    if (isValueColor) {
                        var rgba = [0, 0, 0, 0];
                    }

                    var onframe = function(target, percent) {
                        // Find the range keyframes
                        // kf1-----kf2---------current--------kf3
                        // find kf2 and kf3 and do interpolation
                        if (percent < cachePercent) {
                            // Start from next key
                            start = Math.min(cacheKey + 1, trackLen - 1);
                            for (i = start; i >= 0; i--) {
                                if (kfPercents[i] <= percent) {
                                    break;
                                }
                            }
                            i = Math.min(i, trackLen-2);
                        } else {
                            for (i = cacheKey; i < trackLen; i++) {
                                if (kfPercents[i] > percent) {
                                    break;
                                }
                            }
                            i = Math.min(i-1, trackLen-2);
                        }
                        cacheKey = i;
                        cachePercent = percent;

                        var range = (kfPercents[i+1] - kfPercents[i]);
                        if (range === 0) {
                            return;
                        } else {
                            w = (percent - kfPercents[i]) / range;
                        }
                        if (useSpline) {
                            p1 = kfValues[i];
                            p0 = kfValues[i === 0 ? i : i - 1];
                            p2 = kfValues[i > trackLen - 2 ? trackLen - 1 : i + 1];
                            p3 = kfValues[i > trackLen - 3 ? trackLen - 1 : i + 2];
                            if (isValueArray) {
                                _catmullRomInterpolateArray(
                                    p0, p1, p2, p3, w, w*w, w*w*w,
                                    getter(target, propName),
                                    arrDim
                                );
                            } else {
                                var value;
                                if (isValueColor) {
                                    value = _catmullRomInterpolateArray(
                                        p0, p1, p2, p3, w, w*w, w*w*w,
                                        rgba, 1
                                    );
                                    value = rgba2String(rgba);
                                } else {
                                    value = _catmullRomInterpolate(
                                        p0, p1, p2, p3, w, w*w, w*w*w
                                    );
                                }
                                setter(
                                    target,
                                    propName,
                                    value
                                );
                            }
                        } else {
                            if (isValueArray) {
                                _interpolateArray(
                                    kfValues[i], kfValues[i+1], w,
                                    getter(target, propName),
                                    arrDim
                                );
                            } else {
                                var value;
                                if (isValueColor) {
                                    _interpolateArray(
                                        kfValues[i], kfValues[i+1], w,
                                        rgba, 1
                                    );
                                    value = rgba2String(rgba);
                                } else {
                                    value = _interpolateNumber(kfValues[i], kfValues[i+1], w);
                                }
                                setter(
                                    target,
                                    propName,
                                    value
                                );
                            }
                        }

                        for (i = 0; i < onFrameListLen; i++) {
                            self._onframeList[i](target, percent);
                        }
                    };

                    var clip = new Clip({
                        target : self._target,
                        life : trackMaxTime,
                        loop : self._loop,
                        delay : self._delay,
                        onframe : onframe,
                        ondestroy : ondestroy
                    });

                    if (easing && easing !== 'spline') {
                        clip.easing = easing;
                    }
                    self._clipList.push(clip);
                    self._clipCount++;
                    self.animation.add(clip);
                };

                for (var propName in this._tracks) {
                    createTrackClip(this._tracks[propName], propName);
                }
                return this;
            },
            stop : function() {
                for (var i = 0; i < this._clipList.length; i++) {
                    var clip = this._clipList[i];
                    this.animation.remove(clip);
                }
                this._clipList = [];
            },
            delay : function(time){
                this._delay = time;
                return this;
            },
            done : function(func) {
                this._doneList.push(func);
                return this;
            }
        };

        return Animation;
    }
);
