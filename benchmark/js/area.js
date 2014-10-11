define(function(require) {
    
    var Benchmark = require('benchmark');

    var zrender = require('zrender');
    var etpl = require('etpl');
    var area = require('zrender/tool/area');
    var shapeMakers = require('./shapes');

    window.zr = zrender.init(document.getElementById('main'));
    var canvas = document.getElementById('points');
    window.width = zr.getWidth();
    window.height = zr.getHeight();
    canvas.width = width;
    canvas.height = height;
    window.ctx = canvas.getContext('2d');

    var suite = new Benchmark.Suite();

    var shapeTypes = ['Circle', 'Line', 'Rectangle', 'Star', 'Sector', 'Heart', 'Curve'];

    suite.benchmarks = [];
    suite.on('add', function(e) {
        suite.benchmarks.push(e.target);
    });

    var renderResult = etpl.compile('<div class="result">\
        <h3>${name}</h3>\
        <table>\
            <tr>\
            <th>shape类型</th>\
            <th>op/s</th>\
            </tr>\
            <!-- for: ${result} as ${item} -->\
            <tr>\
            <td>${item.shapeType}</td>\
            <td>${item.ops}</td>\
            </tr>\
            <!-- /for -->\
        </table>\
    </div>');

    var shapeList = [];
    var N_SHAPE = 20;

    window.N_ITER = 500;
    window.points = [];
    for (var i = 0; i < N_ITER; i++) {
        points[i] = [0, 0, false];
    }

    function addBenck (funcName, name) {
        var res = [];

        var count = shapeTypes.length;
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
                    ops: (1000 * N_ITER / (bench.stats.mean + bench.stats.moe)).toFixed(2),
                    shapeType: shapeType
                });
                count--;
                document.getElementById('result').innerHTML = renderResult({
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

    $('#run').bind('click', function() {

        window['isInsidePath'] = function (x, y) {
            for (var j = 0; j < N_SHAPE; j++) {
                var shape = shapeList[j];
                if (area.isInside(shape, shape.style, x, y)) {
                    return true;
                }
            }
        }

        addBenck('isInsidePath', 'Math method')

        suite.run();
    });

    suite.on('complete', function() {
        var benches = Benchmark.filter(suite.benchmarks, 'successful');
    });
});