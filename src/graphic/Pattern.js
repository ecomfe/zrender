define(function (require) {

    var Pattern = function (image, repeat) {
        this.image = image;
        this.repeat = repeat;
    };

    Pattern.prototype.type = 'pattern';

    Pattern.prototype.getCanvasPattern = function (ctx) {

        return this._canvasPattern
            || (this._canvasPattern = ctx.createPattern(this.image, this.repeat));
    };

    return Pattern;
});