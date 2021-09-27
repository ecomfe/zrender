import { map } from '../core/util';

export type SVGElAttrsDef = [string, string | number | undefined][];
export type SVGElDef = {
    tag: string,
    attrs: SVGElAttrsDef,
    children?: SVGElDef[],
    textContent?: string
};

export function createElement(
    tag: string,
    attrs?: SVGElAttrsDef,
    children?: SVGElDef[],
    textContent?: string
): SVGElDef {
    return {
        tag,
        attrs,
        children,
        textContent
    };
}
function createElementOpen(name: string, attrs?: SVGElAttrsDef) {
    const attrsStr: string[] = [];
    if (attrs) {
        for (let i = 0; i < attrs.length; i++) {
            let part = attrs[i][0];
            if (attrs[i][1] != null) {
                part += `="${attrs[i][1]}"`;
            }
            attrsStr.push(part);
        }
    }
    return `<${name} ${attrsStr.join(' ')}>`;
}

function createElementClose(name: string) {
    return `</${name}>`;
}

export function elDefToString(el: SVGElDef, opts?: {
    newline?: boolean
}) {
    opts = opts || {};
    const S = opts.newline ? '\n' : '';
    function convertElToString(el: SVGElDef): string {
        const {children, tag, attrs} = el;
        return createElementOpen(tag, attrs)
            + (el.textContent || '')
            + (children ? `${S}${map(children, child => convertElToString(child)).join(S)}${S}` : '')
            + createElementClose(tag);
    }
    return convertElToString(el);
}