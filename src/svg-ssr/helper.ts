export function createElement(name: string, attrs?: ([string, string] | [string])[]) {
    return createElementOpen(name, attrs) + createElementClose(name);
}
export function createElementOpen(name: string, attrs?: ([string, string] | [string])[], selfClose?: boolean) {
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
    return `<${name} ${attrsStr.join(' ')} ${selfClose ? '/>' : '>'}`;
}

export function createElementClose(name: string) {
    return `</${name}>`;
}