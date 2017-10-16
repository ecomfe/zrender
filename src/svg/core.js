
var svgURI = 'http://www.w3.org/2000/svg';

export function createElement(name) {
    return document.createElementNS(svgURI, name);
}