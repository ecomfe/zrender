/**
 * 缓动代码来自 https://github.com/sole/tween.js/blob/master/src/Tween.js
 * author: lang(shenyi01@baidu.com)
 */
define(
    function() {
        var Easing = {
            // 线性
            Linear: function(k) {
                return k;
            },

            // 二次方的缓动（t^2）
            QuadraticIn: function(k) {
                return k * k;
            },
            QuadraticOut: function(k) {
                return k * (2 - k);
            },
            QuadraticInOut: function(k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k;
                }
                return - 0.5 * (--k * (k - 2) - 1);
            },

            // 三次方的缓动（t^3）
            CubicIn: function(k) {
                return k * k * k;
            },
            CubicOut: function(k) {
                return --k * k * k + 1;
            },
            CubicInOut: function(k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k;
                }
                return 0.5 * ((k -= 2) * k * k + 2);
            },

            // 四次方的缓动（t^4）
            QuarticIn: function(k) {
                return k * k * k * k;
            },
            QuarticOut: function(k) {
                return 1 - (--k * k * k * k);
            },
            QuarticInOut: function(k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k * k;
                }
                return - 0.5 * ((k -= 2) * k * k * k - 2);
            },

            // 五次方的缓动（t^5）
            QuinticIn: function(k) {
                return k * k * k * k * k;
            },

            QuinticOut: function(k) {
                return --k * k * k * k * k + 1;
            },
            QuinticInOut: function(k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k * k * k;
                }
                return 0.5 * ((k -= 2) * k * k * k * k + 2);
            },

            // 正弦曲线的缓动（sin(t)）
            SinusoidalIn: function(k) {
                return 1 - Math.cos(k * Math.PI / 2);
            },
            SinusoidalOut: function(k) {
                return Math.sin(k * Math.PI / 2);
            },
            SinusoidalInOut: function(k) {
                return 0.5 * (1 - Math.cos(Math.PI * k));
            },

            // 指数曲线的缓动（2^t）
            ExponentialIn: function(k) {
                return k === 0 ? 0 : Math.pow(1024, k - 1);
            },
            ExponentialOut: function(k) {
                return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);
            },
            ExponentialInOut: function(k) {
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if ((k *= 2) < 1) {
                    return 0.5 * Math.pow(1024, k - 1);
                }
                return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);
            },

            // 圆形曲线的缓动（sqrt(1-t^2)）
            CircularIn: function(k) {
                return 1 - Math.sqrt(1 - k * k);
            },
            CircularOut: function(k) {
                return Math.sqrt(1 - (--k * k));
            },
            CircularInOut: function(k) {
                if ((k *= 2) < 1) {
                    return - 0.5 * (Math.sqrt(1 - k * k) - 1);
                }
                return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
            },

            // 创建类似于弹簧在停止前来回振荡的动画
            ElasticIn: function(k) {
                var s, a = 0.1, p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }else{
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                return - (a * Math.pow(2, 10 * (k -= 1)) *
                            Math.sin((k - s) * (2 * Math.PI) / p));
            },
            ElasticOut: function(k) {
                var s, a = 0.1, p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }
                else{
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                return (a * Math.pow(2, - 10 * k) *
                        Math.sin((k - s) * (2 * Math.PI) / p) + 1);
            },
            ElasticInOut: function(k) {
                var s, a = 0.1, p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }
                else{
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                if ((k *= 2) < 1) {
                    return - 0.5 * (a * Math.pow(2, 10 * (k -= 1))
                        * Math.sin((k - s) * (2 * Math.PI) / p));
                }
                return a * Math.pow(2, -10 * (k -= 1))
                        * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;

            },

            // 在某一动画开始沿指示的路径进行动画处理前稍稍收回该动画的移动
            BackIn: function(k) {
                var s = 1.70158;
                return k * k * ((s + 1) * k - s);
            },
            BackOut: function(k) {
                var s = 1.70158;
                return --k * k * ((s + 1) * k + s) + 1;
            },
            BackInOut: function(k) {
                var s = 1.70158 * 1.525;
                if ((k *= 2) < 1) {
                    return 0.5 * (k * k * ((s + 1) * k - s));
                }
                return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
            },

            // 创建弹跳效果
            BounceIn: function(k) {
                return 1 - Easing.BounceOut(1 - k);
            },
            BounceOut: function(k) {
                if (k < (1 / 2.75)) {
                    return 7.5625 * k * k;
                }
                else if (k < (2 / 2.75)) {
                    return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
                } else if (k < (2.5 / 2.75)) {
                    return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
                } else {
                    return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
                }
            },
            BounceInOut: function(k) {
                if (k < 0.5) {
                    return Easing.BounceIn(k * 2) * 0.5;
                }
                return Easing.BounceOut(k * 2 - 1) * 0.5 + 0.5;
            }
        };

        return Easing;
    }
);

