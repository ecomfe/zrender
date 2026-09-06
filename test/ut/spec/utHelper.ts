import { init, ZRenderInitOpt, ZRenderType } from './zrender';

export function createZr(params?: {
    width?: ZRenderInitOpt['width'];
    height?: ZRenderInitOpt['height'];
    renderer?: ZRenderInitOpt['renderer'];
}): ZRenderType {
    params = params || {};
    const el = document.createElement('div');
    el.style.cssText = [
        'visibility:hidden',
        'width:' + (params.width || '500') + 'px',
        'height:' + (params.height || '400') + 'px',
        'position:absolute',
        'bottom:0',
        'right:0'
    ].join(';') + ';';
    Object.defineProperty(el, 'clientWidth', {
        get() {
            return params.width || 500;
        }
    });
    Object.defineProperty(el, 'clientHeight', {
        get() {
            return params.height || 400;
        }
    });
debugger;
    const zr = init(el, {
        renderer: params.renderer || 'canvas'
    });
    return zr;
};

export function g(id: string): HTMLElement {
    init();
    return document.getElementById(id);
}

export function removeEl(el: HTMLElement): void {
    const parent = parentEl(el);
    parent && parent.removeChild(el);
}

export function parentEl(el: HTMLElement): HTMLElement {
    // parentElement for ie.
    return el.parentElement || el.parentNode as HTMLElement;
}

export function getHeadEl(): HTMLElement {
    return document.head
        || document.getElementsByTagName('head')[0]
        || document.documentElement;
}
