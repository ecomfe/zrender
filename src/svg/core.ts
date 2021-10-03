import { keys, map } from '../core/util';

export type CSSSelectorVNode = Record<string, string>
export type CSSAnimationVNode = Record<string, Record<string, string>>

export const SVGNS = 'http://www.w3.org/2000/svg';
export const XLINKNS = 'http://www.w3.org/1999/xlink';
export const XMLNS = 'http://www.w3.org/2000/xmlns/';

export function createElement(name: string) {
    return document.createElementNS(SVGNS, name);
}


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

export function getCssString(
    selectorNodes: Record<string, CSSSelectorVNode>,
    animationNodes: Record<string, CSSAnimationVNode>,
    opts?: {
        newline?: boolean
    }
) {
    opts = opts || {};
    const S = opts.newline ? '\n' : '';
    const bracketBegin = ` {${S}`;
    const bracketEnd = `${S}}`;
    const selectors = map(keys(selectorNodes), className => {
        return className + bracketBegin + map(keys(selectorNodes[className]), attrName => {
            return `${attrName}:${selectorNodes[className][attrName]};`;
        }).join(S) + bracketEnd;
    }).join(S);
    const animations = map(keys(animationNodes), (animationName) => {
        return `@keyframes ${animationName}${bracketBegin}` + map(keys(animationNodes[animationName]), percent => {
            return percent + bracketBegin + map(keys(animationNodes[animationName][percent]), attrName => {
                return `${attrName}:${animationNodes[animationName][percent][attrName]};`;
            }).join(S) + bracketEnd;
        }).join(S) + bracketEnd;
    }).join(S);

    if (!selectors && !animations) {
        return '';
    }

    return ['<![CDATA[', selectors, animations, ']]>'].join(S);
}