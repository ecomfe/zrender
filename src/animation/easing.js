/**
 * 缓动代码来自 https://github.com/sole/tween.js/blob/master/src/Tween.js
 * author: lang( shenyi01@baidu.com )
 */
define(
    function(require){
        var Easing = {
            Linear: function ( k ) {
                return k;
            },

            QuadraticIn: function ( k ) {
                return k * k;
            },
            QuadraticOut: function ( k ) {
                return k * ( 2 - k );
            },
            QuadraticInOut: function ( k ) {
                if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
                return - 0.5 * ( --k * ( k - 2 ) - 1 );
            },

            CubicIn: function ( k ) {
                return k * k * k;
            },
            CubicOut: function ( k ) {
                return --k * k * k + 1;
            },
            CubicInOut: function ( k ) {
                if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
                return 0.5 * ( ( k -= 2 ) * k * k + 2 );
            },

            QuarticIn: function ( k ) {
                return k * k * k * k;
            },

            QuarticOut: function ( k ) {
                return 1 - ( --k * k * k * k );
            },

            QuarticInOut: function ( k ) {
                if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
                return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );
            },

            QuinticIn: function ( k ) {
                return k * k * k * k * k;
            },

            QuinticOut: function ( k ) {
                return --k * k * k * k * k + 1;
            },

            QuinticInOut: function ( k ) {
                if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k * k * k;
                return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );
            },
            SinusoidalIn: function ( k ) {
                return 1 - Math.cos( k * Math.PI / 2 );
            },
            SinusoidalOut: function ( k ) {
                return Math.sin( k * Math.PI / 2 );
            },
            SinusoidalInOut: function ( k ) {
                return 0.5 * ( 1 - Math.cos( Math.PI * k ) );
            },

            ExponentialIn: function ( k ) {
                return k === 0 ? 0 : Math.pow( 1024, k - 1 );
            },

            ExponentialOut: function ( k ) {
                return k === 1 ? 1 : 1 - Math.pow( 2, - 10 * k );
            },

            ExponentialInOut: function ( k ) {
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 1024, k - 1 );
                return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );
            },

            CircularIn: function ( k ) {
                return 1 - Math.sqrt( 1 - k * k );
            },

            CircularOut: function ( k ) {
                return Math.sqrt( 1 - ( --k * k ) );
            },
            CircularInOut: function ( k ) {
                if ( ( k *= 2 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
                return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);
            },

            ElasticIn: function ( k ) {
                var s, a = 0.1, p = 0.4;
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( !a || a < 1 ) { a = 1; s = p / 4; }
                else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
                return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
            },
            ElasticOut: function ( k ) {
                var s, a = 0.1, p = 0.4;
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( !a || a < 1 ) { a = 1; s = p / 4; }
                else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
                return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );
            },
            ElasticInOut: function ( k ) {
                var s, a = 0.1, p = 0.4;
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( !a || a < 1 ) { a = 1; s = p / 4; }
                else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
                if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
                return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;

            },

            BackIn: function ( k ) {
                var s = 1.70158;
                return k * k * ( ( s + 1 ) * k - s );
            },
            BackOut: function ( k ) {
                var s = 1.70158;
                return --k * k * ( ( s + 1 ) * k + s ) + 1;
            },
            BackInOut: function ( k ) {
                var s = 1.70158 * 1.525;
                if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
                return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );
            },

            BounceIn: function ( k ) {
                return 1 - Easing.BounceOut( 1 - k );
            },
            BounceOut: function ( k ) {
                if ( k < ( 1 / 2.75 ) ) {
                    return 7.5625 * k * k;
                } else if ( k < ( 2 / 2.75 ) ) {
                    return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;
                } else if ( k < ( 2.5 / 2.75 ) ) {
                    return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;
                } else {
                    return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;
                }
            },
            BounceInOut: function ( k ) {
                if ( k < 0.5 ) return Easing.BounceIn( k * 2 ) * 0.5;
                return Easing.BounceOut( k * 2 - 1 ) * 0.5 + 0.5;
            }
        } 
        
        return Easing;
    }
)

