/**
 * 颜色辅助类
 * getColor：获取标准颜色
 * getScaleColor：获取色尺颜色
 * getCableColor：获取可计算提醒颜色
 * reverse：颜色翻转  //Todo
 * mix：颜色混合 //Todo 
 */
define(
    function(require) {
        var _ctx;
        
        //Color palette is an array containing the default colors for the chart's series. When all colors are used, new colors are selected from the start again. Defaults to:
        //默认色板
        var palette = ['#ffa500','#b0c4de','#87cefa','#da70d6','#32cd32','#ff7f50','#ba55d3','#6495ed','#cd5c5c','#ff69b4','#1e90ff','#ff6347','#7b68ee','#00fa9a','#ffd700','#6b8e23','#ff00ff','#3cb371','#b8860b','#40e0d0','#9932cc','#9cf','#9c3','#f9c','#669','#6cc','#cf9','#cc3','#956','#ecd','#87e'];
        var _palette = palette;
        //默认蓝色色尺
        var bluePalette = ['#e0ffff','#cbf3fb','#afeeee','#87cefa','#00bfff','#1e90ff','#6495ed','#4682b4','#4169e1','#0000ff','#0000cd','#00008b'];
        var _bluePalette = bluePalette;
        
        function _initCanvasContext() {
            require( "js!../lib/excanvas.js" );
            if (!_ctx) {
                if (document.createElement('canvas').getContext) {
                    G_vmlCanvasManager = false;
                }
                
                if (G_vmlCanvasManager){
                    _ctx = G_vmlCanvasManager.initElement(
                        document.createElement('div')
                    ).getContext('2d');
                }
                else {
                    _ctx = document.createElement('canvas').getContext('2d');            
                }
            }
        }
        /**
         * 定制全局色板 
         */
        function customPalette(type,customPalete) {
            switch (type) {
                case 'default':
                    palette = customPalete;
                    break;
                case 'blue':
                    bluePalette = customPalete;
                    break;
                default:
                    palette = customPalete;
                    break;
            }
        }
        
        /**
         * 复位默认色板 
         */
        function resetPalette(type) {
            switch (type) {
                case 'default':
                    palette = _palette;
                    break;
                case 'blue':
                    bluePalette = _bluePalette;
                    break;
                default:
                    palette = _palette;
                    break;
            }
        }
        /**
         * 获取标准颜色
         * @param {number} idx : 色板位置
         * @param {array} [customPalete] : 自定义色板
         * 
         * @return {color} 颜色#000000~#ffffff
         */
        function getColor(idx, customPalete) {
            idx = +idx || 0;
            customPalete = customPalete || palette
            return customPalete[idx%customPalete.length]
        }
        
        /**
         * 获取色尺
         * @param {number} idx : 色尺位置
         * @param {string} [paleteType] : 色尺类型，默认bule，自定义色尺用getColor
         * 
         * @return {color} 颜色#000000~#ffffff
         */
        function getScaleColor(idx,paleteType) {
            switch (paleteType) {
                case 'blue':
                    return bluePalette[idx%bluePalette.length];
                default:
                    return bluePalette[idx%bluePalette.length];
            }
        }
        
        /**
         * 高亮颜色 
         */
        function getHighlightColor(){
            return 'rgba(255,255,0,0.5)';
        }
        
        /**
         * 径向渐变
         * @param {Object} ctx Canvas画布
         * @param {Object} x0 渐变起点
         * @param {Object} y0
         * @param {Object} r0
         * @param {Object} x1 渐变终点
         * @param {Object} y1
         * @param {Object} r1
         * @param {Array} colorList 颜色列表
         */
        function getRadialGradient(x0, y0, r0, x1, y1, r1, colorList) {
            _initCanvasContext();
            if (!G_vmlCanvasManager) {
                var gradient = _ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
                for (var i = 0, l = colorList.length; i < l; i++) {
                    gradient.addColorStop(colorList[i][0], colorList[i][1]);
                }
                return gradient;
            }
            else {
                // excanvas渐变支持不太好
                return [colorList[colorList.length-1][1]];
            }
        }
        
        /**
         * 线性渐变
         * @param {Object} ctx Canvas画布
         * @param {Object} x0 渐变起点
         * @param {Object} y0
         * @param {Object} x1 渐变终点
         * @param {Object} y1
         * @param {Array} colorList 颜色列表
         */
        function getLinearGradient(x0, y0, x1, y1, colorList) {
            _initCanvasContext();
            if (!G_vmlCanvasManager) {
                var gradient = _ctx.createLinearGradient(x0, y0, x1, y1);
                for (var i = 0, l = colorList.length; i < l; i++) {
                    gradient.addColorStop(colorList[i][0], colorList[i][1]);
                }
                return gradient;
            }
            else {
                return [colorList[colorList.length-1][1]];
            }
        }
        
        /**
         * 颜色翻转 
         * Todo
         */
        function reverse(color1) {
            return color1;//palette[Math.floor(Math.random()*palette.length)];
        }
        
        /**
         * 颜色混合 
         * Todo
         */
        function mix(color1, color2) {
            return color1;//palette[Math.floor(Math.random()*palette.length)];
        }
        
        return {
            customPalette : customPalette,
            resetPalette : resetPalette,
            getColor : getColor,
            getScaleColor : getScaleColor,
            getHighlightColor : getHighlightColor,
            getRadialGradient : getRadialGradient,
            getLinearGradient : getLinearGradient,
            reverse : reverse,
            mix : mix
        };
    }
);