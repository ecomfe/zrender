
export default (
    typeof self !== 'undefined'
    && (
        // https://github.com/ecomfe/zrender/issues/189#issuecomment-224919809
        (self.msRequestAnimationFrame && self.msRequestAnimationFrame.bind(window))
        || self.requestAnimationFrame
        || self.mozRequestAnimationFrame
        || self.webkitRequestAnimationFrame
    )
) || function (func) {
    setTimeout(func, 16);
};
