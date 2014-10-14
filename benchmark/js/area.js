define(function(require) {
    
    var Benchmark = require('benchmark');

    var zrender = require('zrender');
    var etpl = require('etpl');
    var area = require('zrender/tool/area');
    var util = require('zrender/tool/util');
    var shapeMakers = require('./shapes');
    var PathProxy = require('zrender/shape/util/PathProxy');

    window.zr = zrender.init(document.getElementById('main'));
    var canvas = document.getElementById('points');
    window.width = zr.getWidth();
    window.height = zr.getHeight();
    canvas.width = width;
    canvas.height = height;
    window.ctx = canvas.getContext('2d');

    var suite = new Benchmark.Suite();

    var shapeTypes = ['Circle', 'Line', 'Rectangle', 'Star', 'Sector', 'Heart', 'Cubic', 'Quadratic'];
    // var shapeTypes = ['Curve'];

    suite.benchmarks = [];
    suite.on('add', function(e) {
        suite.benchmarks.push(e.target);
    });

    var renderResult = etpl.compile('<h3>${name}</h3>\
        <table>\
            <tr>\
            <th>shape类型</th>\
            <!-- for: ${result} as ${item} -->\
            <th>${item.shapeType}</th>\
            <!-- /for -->\
            </tr>\
            <tr>\
            <td>op/s</td>\
            <!-- for: ${result} as ${item} -->\
            <td>${item.ops}</td>\
            <!-- /for -->\
            </tr>\
        </table>');

    var shapeList = [];
    var N_SHAPE = 20;

    window.N_ITER = 2000;
    window.points = [];
    for (var i = 0; i < N_ITER; i++) {
        points[i] = [0, 0, false];
    }

    function addBenck (funcName, name) {
        var res = [];

        var count = shapeTypes.length;
        var resultDom = document.createElement('div');
        resultDom.className = 'result';
        document.getElementById('results').appendChild(resultDom);

        shapeTypes.forEach(function(shapeType) {
            
            function setup () {
                for (var i = 0; i < N_ITER; i++) {
                    var x = Math.random() * width;
                    var y = Math.random() * height;
                    points[i][0] = x;
                    points[i][1] = y;
                    points[i][2] = false;
                }
            }

            function teardown () {
                for (var i = 0; i < N_ITER; i++) {
                    ctx.fillStyle = points[i][2] ? 'green' : 'red'
                    ctx.fillRect(points[i][0], points[i][1], 2, 2);
                }
            }

            function onComplete(e) {
                var bench = e.target;
                res.push({
                    ops: (N_ITER * N_SHAPE / (bench.stats.mean + bench.stats.moe)).toFixed(0),
                    shapeType: shapeType
                });
                count--;
                resultDom.innerHTML = renderResult({
                    result: res,
                    name: name
                });
            }

            suite.add('ZRender ' + shapeType, {
                fn: 'for (var i = 0; i < N_ITER; i++) {\n\
                    points[i][2] = ' + funcName + '(points[i][0], points[i][1]);\n\
                }',
                setup: setup,
                teardown: teardown,
                async: true,
                onError: onError,
                onStart: function() {
                    zr.storage.delRoot();
                    for (var i = 0; i < N_SHAPE; i++) {
                        var shape = shapeMakers['make' + shapeType](width, height);
                        if (!shape._pathProxy) {
                            shape._pathProxy = new PathProxy();
                            shape.buildPath(shape._pathProxy, shape.style);
                        }
                        shapeList[i] = shape;
                        zr.addShape(shape);
                    }
                    zr.refresh();
                    ctx.clearRect(0, 0, width, height);
                },
                onComplete: onComplete
            });
            function onError(err) {
                console.log(err.message.message);
            }
        });
    }

    document.getElementById('run').addEventListener('click', function() {

        window['mathMethod'] = function (x, y) {
            for (var j = 0; j < N_SHAPE; j++) {
                var shape = shapeList[j];
                if (area.isInside(shape, shape.style, x, y)) {
                    return true;
                }
            }
        }

        window['buildPath'] = function (x, y) {
            for (var j = 0; j < N_SHAPE; j++) {
                var shape = shapeList[j];
                ctx.beginPath();
                shape.buildPath(ctx, shape.style);
                ctx.closePath();
                if (ctx.isPointInPath(x, y)) {
                    return true;
                }
            }
        }

        window['jsInsidePath'] = function (x, y) {
            for (var j = 0; j < N_SHAPE; j++) {
                var shape = shapeList[j];
                if (area.isInsidePath(
                    shape._pathProxy.pathCommands, shape.style.lineWidth, shape.style.brushType, x, y
                )) {
                    return true;
                }
            }
        }

        function _isPainted(context, x, y, unit) {
            var pixelsData;
            if (typeof unit != 'undefined') {
                unit = (unit || 1) >> 1;
                pixelsData = context.getImageData(
                    x - unit,
                    y - unit,
                    unit + unit,
                    unit + unit
                ).data;
            }
            else {
                pixelsData = context.getImageData(x, y, 1, 1).data;
            }

            var len = pixelsData.length;
            while (len--) {
                if (pixelsData[len] !== 0) {
                    return true;
                }
            }
            return false;
        }
        window['pixelMethod'] = function (x, y) {
            for (var j = 0; j < N_SHAPE; j++) {
                var shape = shapeList[j];

                var _rect = shape.getRect(shape.style);
                var _context = util.getPixelContext();
                var _offset = util.getPixelOffset();

                util.adjustCanvasSize(x, y);
                _context.clearRect(_rect.x, _rect.y, _rect.width, _rect.height);
                _context.beginPath();
                shape.brush(_context, { style: shape.style });
                _context.closePath();

                if (_isPainted(_context, x + _offset.x, y + _offset.y)) {
                    return true;
                }
            }
        }

        addBenck('mathMethod', 'Math method');
        addBenck('buildPath', 'Native isPointInPath');
        addBenck('jsInsidePath', 'JS isPointInPath');
        // addBenck('pixelMethod', 'pixelMethod');

        suite.run();
    });

    suite.on('complete', function() {
        var benches = Benchmark.filter(suite.benchmarks, 'successful');
    });
});