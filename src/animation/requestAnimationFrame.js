
export default (
    typeof window !== 'undefined'
    && (
        // https://github.com/ecomfe/zrender/issues/189#issuecomment-224919809
        (window.msRequestAnimationFrame && window.msRequestAnimationFrame.bind(window))
        || window.requestAnimationFrame
        || window.mozRequestAnimationFrame
        || window.webkitRequestAnimationFrame
    )
) || function (func) {
    setTimeout(func, 16);
};