define({
    /**
     * @param {Object} rect
     * @param {number} rect.x
     * @param {number} rect.y
     * @param {number} rect.width
     * @param {number} rect.height
     * @param {number} x
     * @param {number} y
     * @return {boolean}
     */
    contain: function (rect, x, y) {
        return x >= rect.x
            && x <= (rect.x + rect.width)
            && y >= rect.y
            && y <= (rect.y + rect.height);
    }
});