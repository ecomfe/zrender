define(function (require) {

    /**
     * @param {Array.<Object>} colorStops
     */
    var Gradient = function (colorStops) {

        this.id = Gradient.prototype.__nextId++;

        this.colorStops = colorStops || [];

    };

    Gradient.prototype = {

        // Next gradient uid
        __nextId: 0,

        constructor: Gradient,

        addColorStop: function (offset, color) {
            this.colorStops.push({

                offset: offset,

                color: color
            });
        }
    };

    return Gradient;
});