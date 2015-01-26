{
    // appDir: './',
    baseUrl: '../src',
    optimize: 'none',
    name: 'zrender',
    packages: [
        {
            name: 'zrender',
            location: '.',
            main: 'zrender'
        }
    ],
    include:[
        'zrender/shape/Rose',
        'zrender/shape/Trochoid',
        'zrender/shape/Circle',
        'zrender/shape/Sector',
        'zrender/shape/Ring',
        'zrender/shape/Ellipse',
        'zrender/shape/Rectangle',
        'zrender/shape/Text',
        'zrender/shape/Heart',
        'zrender/shape/Droplet',
        'zrender/shape/Line',
        'zrender/shape/Image',
        'zrender/shape/Star',
        'zrender/shape/Isogon',
        'zrender/shape/BezierCurve',
        'zrender/shape/Polyline',
        'zrender/shape/Path',
        'zrender/shape/Polygon',
        'zrender/loadingEffect/Bar',
        'zrender/loadingEffect/Bubble',
        'zrender/loadingEffect/DynamicLine',
        'zrender/loadingEffect/Ring',
        'zrender/loadingEffect/Spin',
        'zrender/loadingEffect/Whirling'
    ],
    out: 'zrender-original.js'
}