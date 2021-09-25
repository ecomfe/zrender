
export type SVGAttrs = [string, string | number | undefined][];

export function createElement(name: string, attrs?: SVGAttrs, children?: string) {
    return createElementOpen(name, attrs)
        + (children ? `\n${children}\n` : '')
        + createElementClose(name);
}
export function createElementOpen(name: string, attrs?: SVGAttrs) {
    const attrsStr: string[] = [];
    if (attrs) {
        for (let i = 0; i < attrs.length; i++) {
            let part = attrs[i][0];
            if (attrs[i][1]) {
                part += `="${attrs[i][1]}"`;
            }
            attrsStr.push(part);
        }
    }
    return `<${name} ${attrsStr.join(' ')}>`;
}

export function createElementClose(name: string) {
    return `</${name}>`;
}