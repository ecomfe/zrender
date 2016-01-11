({
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
        'zrender/graphic/Image',
        'zrender/graphic/Text',
        'zrender/graphic/shape/Rose',
        'zrender/graphic/shape/Trochoid',
        'zrender/graphic/shape/Circle',
        'zrender/graphic/shape/Sector',
        'zrender/graphic/shape/Ring',
        'zrender/graphic/shape/Ellipse',
        'zrender/graphic/shape/Rect',
        'zrender/graphic/shape/Heart',
        'zrender/graphic/shape/Droplet',
        'zrender/graphic/shape/Line',
        'zrender/graphic/shape/Star',
        'zrender/graphic/shape/Isogon',
        'zrender/graphic/shape/BezierCurve',
        'zrender/graphic/shape/Polyline',
        'zrender/graphic/shape/Polygon',
        'zrender/container/Group',
        'zrender/vml/vml'
    ],
    out: 'zrender.js'
})