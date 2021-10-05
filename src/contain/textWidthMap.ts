// Text width map used for environment there is no canvas
// Only common ascii is used for size concern.

// Generated from following code
//
// ctx.font = '12px sans-serif';
// const asciiRange = [32, 126];
// let mapStr = '';
// for (let i = asciiRange[0]; i <= asciiRange[1]; i++) {
//     const char = String.fromCharCode(i);
//     const width = ctx.measureText(char).width;
//     const ratio = Math.round(width / 12 * 100);
//     mapStr += String.fromCharCode(ratio + 20))
// }
// mapStr.replace(/\\/g, '\\\\');

export const OFFSET = 20;
export const SCALE = 100;
export const DEFAULT_FONT_SIZE = 12;
// TODO other basic fonts?
// eslint-disable-next-line
const defaultWidthMapStr = `007LLmW'55;N0500LLLLLLLLLL00NNNLzWW\\\\WQb\\0FWLg\\bWb\\WQ\\WrWWQ000CL5LLFLL0LL**F*gLLLL5F0LF\\FFF5.5N`;

function getMap(mapStr: string): Record<string, number> {
    const map: Record<string, number> = {};
    if (typeof JSON === 'undefined') {
        return map;
    }
    for (let i = 0; i < mapStr.length; i++) {
        const char = String.fromCharCode(i + 32);
        const size = (mapStr.charCodeAt(i) - OFFSET) / SCALE;
        map[char] = size;
    }
    return map;
}

export const DEFAULT_TEXT_WIDTH_MAP = getMap(defaultWidthMapStr);