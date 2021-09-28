import { map } from '../core/util';

export type SVGVNodeAttrs = [string, string | number | undefined | boolean][];

type SVGVNodeAttrsMap = Record<string, string | number | undefined | boolean>
export interface SVGVNode {
    tag: string,
    attrs: SVGVNodeAttrsMap,
    children?: SVGVNode[],
    text?: string

    // For patching
    elm?: Node
    key: string
};
export function createVNode(
    tag: string,
    key: string,
    attrs?: SVGVNodeAttrs,
    children?: SVGVNode[],
    text?: string
): SVGVNode {
    const attrsMap: SVGVNodeAttrsMap = {};
    if (attrs) {
        for (let i = 0; i < attrs.length; i++) {
            attrsMap[attrs[i][0]] = attrs[i][1];
        }
    }
    return {
        tag,
        attrs: attrsMap,
        children,
        text,
        key
    };
}

function createElementOpen(name: string, attrs?: SVGVNodeAttrsMap) {
    const attrsStr: string[] = [];
    if (attrs) {
        // eslint-disable-next-line
        for (let key in attrs) {
            const val = attrs[key];
            let part = key;
            if (val != null) {
                part += `="${val}"`;
            }
            attrsStr.push(part);
        }
    }
    return `<${name} ${attrsStr.join(' ')}>`;
}

function createElementClose(name: string) {
    return `</${name}>`;
}

export function vNodeToString(el: SVGVNode, opts?: {
    newline?: boolean
}) {
    opts = opts || {};
    const S = opts.newline ? '\n' : '';
    function convertElToString(el: SVGVNode): string {
        const {children, tag, attrs} = el;
        return createElementOpen(tag, attrs)
            + (el.text || '')
            + (children ? `${S}${map(children, child => convertElToString(child)).join(S)}${S}` : '')
            + createElementClose(tag);
    }
    return convertElToString(el);
}