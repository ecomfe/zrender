import { map } from '../core/util';

export type SVGVNodeAttrs = Record<string, string | number | undefined | boolean>
export interface SVGVNode {
    tag: string,
    attrs: SVGVNodeAttrs,
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
    return {
        tag,
        attrs: attrs || {},
        children,
        text,
        key
    };
}

function createElementOpen(name: string, attrs?: SVGVNodeAttrs) {
    const attrsStr: string[] = [];
    if (attrs) {
        // eslint-disable-next-line
        for (let key in attrs) {
            const val = attrs[key];
            let part = key;
            // Same with the logic in patch.
            if (val === false) {
                continue;
            }
            else if (val !== true && val != null) {
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