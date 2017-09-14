var zrender = require('./lib/zrender');

zrender.Group = require('./lib/container/Group');
zrender.Path = require('./lib/graphic/Path');
zrender.Image = require('./lib/graphic/Image');
zrender.CompoundPath = require('./lib/graphic/CompoundPath');
zrender.Text = require('./lib/graphic/Text');

zrender.Arc = require('./lib/graphic/shape/Arc');
zrender.BezierCurve = require('./lib/graphic/shape/BezierCurve');
zrender.Circle = require('./lib/graphic/shape/Circle');
zrender.Droplet = require('./lib/graphic/shape/Droplet');
zrender.Ellipse = require('./lib/graphic/shape/Ellipse');
zrender.Heart = require('./lib/graphic/shape/Heart');
zrender.Isogon = require('./lib/graphic/shape/Isogon');
zrender.Line = require('./lib/graphic/shape/Line');
zrender.Polygon = require('./lib/graphic/shape/Polygon');
zrender.Polyline = require('./lib/graphic/shape/Polyline');
zrender.Rect = require('./lib/graphic/shape/Rect');
zrender.Ring = require('./lib/graphic/shape/Ring');
zrender.Rose = require('./lib/graphic/shape/Rose');
zrender.Sector = require('./lib/graphic/shape/Sector');
zrender.Star = require('./lib/graphic/shape/Star');
zrender.Trochoid = require('./lib/graphic/shape/Trochoid');

zrender.LinearGradient = require('./lib/graphic/LinearGradient');
zrender.RadialGradient = require('./lib/graphic/RadialGradient');
zrender.Pattern = require('./lib/graphic/Pattern');

zrender.BoundingRect = require('./lib/core/BoundingRect');
zrender.matrix = require('./lib/core/matrix');
zrender.vector = require('./lib/core/vector');

zrender.color = require('./lib/tool/color');
zrender.path = require('./lib/tool/path');
zrender.util = require('./lib/core/util');

require('./lib/svg/svg');
require('./lib/vml/vml');

module.exports = zrender;

