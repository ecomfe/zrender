define(function(require) {

    var guid = require('../tool/guid');
    var util = require('../tool/util');

    var Dispatcher = require('../tool/event').Dispatcher;
    var Transformable = require('./mixin/Transformable');

    /**
     * @constructor zrender.shape.Group
     */
    function Group(options) {

        options = options || {};

        this.id = options.id || guid();

        for (var key in options) {
            this[key] = options[key];
        }

        this.type = 'group';

        this.clipShape = null;

        this._children = [];

        this._storage = null;

        this.__dirty = true;

        // Mixin
        Transformable.call(this);
        Dispatcher.call(this);
    }

    Group.prototype.children = function() {
        return this._children.slice();
    };

    Group.prototype.childAt = function(idx) {
        return this._children[idx];
    };

    Group.prototype.addChild = function(child) {
        if (child == this) {
            return;
        }
        
        if (child.parent == this) {
            return;
        }
        if (child.parent) {
            child.parent.removeChild(child);
        }

        this._children.push(child);
        child.parent = this;

        if (this._storage && this._storage !== child._storage) {
            
            this._storage.addToMap(child);

            if (child instanceof Group) {
                child.addChildrenToStorage(this._storage);
            }
        }
    };

    Group.prototype.removeChild = function(child) {
        var idx = util.indexOf(this._children, child);

        this._children.splice(idx, 1);
        child.parent = null;

        if (child._storage) {
            
            this._storage.delFromMap(child.id);

            if (child instanceof Group) {
                child.delChildrenFromStorage(child._storage);
            }
        }
    };

    Group.prototype.each = function(cb, context) {
        var haveContext = !!context;
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            if (haveContext) {
                cb.call(context, child);
            } else {
                cb(child);
            }
        }
    };

    Group.prototype.iterate = function(cb, context) {
        var haveContext = !!context;

        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            if (haveContext) {
                cb.call(context, child);
            } else {
                cb(child);
            }

            if (child.type === 'group') {
                child.iterate(cb, context);
            }
        }
    };

    Group.prototype.addChildrenToStorage = function(storage) {
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            storage.addToMap(child);
            if (child.type === 'group') {
                child.addChildrenToStorage(storage);
            }
        }
    };

    Group.prototype.delChildrenFromStorage = function(storage) {
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            storage.delFromMap(child);
            if (child.type === 'group') {
                child.delChildrenFromStorage(storage);
            }
        }
    };

    util.merge(Group.prototype, Transformable.prototype, true);
    util.merge(Group.prototype, Dispatcher.prototype, true);

    return Group;
});