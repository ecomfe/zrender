define(function (require) {

    var CircleShape = require('zrender/shape/Circle');
    var LineShape = require('zrender/shape/Line');
    var RectangleShape = require('zrender/shape/Rectangle');
    var SectorShape = require('zrender/shape/Sector');
    var HeartShape = require('zrender/shape/Heart');
    var StarShape = require('zrender/shape/Star');
    var CurveShape = require('zrender/shape/BezierCurve');

    var zrColor = require('zrender/tool/color');

    return {
        makeCircle: function (w, h) {
            return new CircleShape({
                style: {
                    x: w * Math.random(),
                    y: h * Math.random(),
                    r: 50 * Math.random() + 50,
                    brushType: 'fill'
                },
                hoverable: false
            });
        },
        makeLine: function (w, h) {
            var xStart = Math.random() * w;
            var yStart = Math.random() * h;
            return new LineShape({
                style: {
                    xStart: xStart,
                    yStart: yStart,
                    xEnd: xStart + 300 * Math.random(),
                    yEnd: yStart + 300 * Math.random(),
                    lineWidth: 20,
                    brushType: 'stroke'
                },
                hoverable: false,
                position: [0, 0]
            });
        },
        makeRectangle: function (w, h) {
            var width = 100 + Math.random() * 100;
            var height = 100 + Math.random() * 100;
            return new RectangleShape({
                style: {
                    x: w * Math.random(),
                    y: h * Math.random(),
                    width: width,
                    height: height,
                    // radius: Math.min(width, height) * 0.2,
                    brushType: 'fill'
                },
                hoverable: false
            });
        },
        makeStar: function (w, h) {
            return new StarShape({
                style: {
                    x: w * Math.random(),
                    y: h * Math.random(),
                    r: Math.random() * 200,
                    r0: Math.random() * 200,
                    n: Math.round(Math.random() * 10),
                    brushType: 'fill'
                },
                hoverable: false
            });
        },
        makeHeart: function (w, h) {
            return new HeartShape({
                style: {
                    x: w * Math.random(),
                    y: h * Math.random(),
                    a: Math.random() * 200,
                    b: Math.random() * 200
                },
                hoverable: false
            });
        },
        makeQuadratic: function (w, h) {
            return new CurveShape({
                style: {
                    xStart: Math.random() * w,
                    yStart: Math.random() * h,
                    xEnd: Math.random() * w,
                    yEnd: Math.random() * h,
                    cpX1: Math.random() * w,
                    cpY1: Math.random() * h,
                    lineWidth: 20,
                    brushType: 'stroke'
                },
                hoverable: false
            });
        },
        makeCubic: function (w, h) {
            return new CurveShape({
                style: {
                    xStart: Math.random() * w,
                    yStart: Math.random() * h,
                    xEnd: Math.random() * w,
                    yEnd: Math.random() * h,
                    cpX1: Math.random() * w,
                    cpY1: Math.random() * h,
                    cpX2: Math.random() * w,
                    cpY2: Math.random() * h,
                    lineWidth: 20,
                    brushType: 'stroke'
                },
                hoverable: false
            });
        },
        makeSector: function (w, h) {
            return new SectorShape({
                style: {
                    x: w * Math.random(),
                    y: h * Math.random(),
                    r: 50 * Math.random() + 50,
                    r0: 20 * Math.random() + 20,
                    startAngle: Math.random() * 360,
                    endAngle: Math.random() * 360,
                    brushType: 'fill'
                },
                hoverable: false
            });
        }
    }
});