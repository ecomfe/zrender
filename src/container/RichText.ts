import { PatternObject } from '../graphic/Pattern'
import { LinearGradientObject } from '../graphic/LinearGradient'
import { RadialGradientObject } from '../graphic/RadialGradient'
import { TextAlign, TextVerticalAlign, ImageLike, Dictionary } from '../core/types'

export class RichTextStyleOption {

    // TODO Text is assigned inside zrender
    text?: string
    // TODO Text not support PatternObject | LinearGradientObject | RadialGradientObject yet.
    textFill?: string | PatternObject | LinearGradientObject | RadialGradientObject
    textStroke?: string | PatternObject | LinearGradientObject | RadialGradientObject
    /**
     * textStroke may be set as some color as a default
     * value in upper applicaion, where the default value
     * of textStrokeWidth should be 0 to make sure that
     * user can choose to do not use text stroke.
     */
    textStrokeWidth?: number

    /**
     * If `fontSize` or `fontFamily` exists, `font` will be reset by
     * `fontSize`, `fontStyle`, `fontWeight`, `fontFamily`.
     * So do not visit it directly in upper application (like echarts),
     * but use `contain/text#makeFont` instead.
     */
    font?: string
    /**
     * The same as font. Use font please.
     * @deprecated
     */
    textFont?: string

    /**
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontStyle?: string
    /**
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontWeight?: string
    /**
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontFamily?: string
    /**
     * It helps merging respectively, rather than parsing an entire font string.
     * Should be 12 but not '12px'.
     * @type {number}
     */
    fontSize?: number

    textAlign?: TextAlign
    textVerticalAlign?: TextVerticalAlign

    textLineHeight?: number
    textWidth?: number | string
    /**
     * Only for textBackground.
     */
    textHeight?: number
    /**
     * Reserved for special functinality, like 'hr'.
     */
    textTag?: string

    textShadowColor?: string
    textShadowBlur?: number
    textShadowOffsetX?: number
    textShadowOffsetY?: number

    textBackgroundColor?: string | {
        image: ImageLike | string
    }

    /**
     * Can be `2` or `[2, 4]` or `[2, 3, 4, 5]`
     */
    textPadding?: number | number[]

    textBorderColor?: string
    textBorderWidth?: number
    textBorderRadius?: number | number[]

    textBoxShadowColor?: string
    textBoxShadowBlur?: number
    textBoxShadowOffsetX?: number
    textBoxShadowOffsetY?: number

    /**
     * Text styles for rich text.
     */
    // rich?: Dictionary<TextStyleOption>

    // truncate?: {
    //     outerWidth?: number
    //     outerHeight?: number
    //     ellipsis?: string
    //     placeholder?: string
    //     minChar?: number
    // }
}