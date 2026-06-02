import env from '../core/env';

/* global window */

type RequestAnimationFrameType = typeof window.requestAnimationFrame

let requestAnimationFrame: RequestAnimationFrameType;

requestAnimationFrame = (
    env.hasGlobalWindow
        && (
            // eslint-disable-next-line @echarts-x/ec/no-props-polyfill-uncertain
            (window.requestAnimationFrame && window.requestAnimationFrame.bind(window))
            // https://github.com/ecomfe/zrender/issues/189#issuecomment-224919809
            // eslint-disable-next-line @echarts-x/ec/no-props-polyfill-uncertain
            || ((window as any).msRequestAnimationFrame && (window as any).msRequestAnimationFrame.bind(window))
            || (window as any).mozRequestAnimationFrame
            // @ts-ignore
            || window.webkitRequestAnimationFrame
        )
) || function (func: Parameters<RequestAnimationFrameType>[0]): number {
    return setTimeout(func, 16) as any;
};

export default requestAnimationFrame;
