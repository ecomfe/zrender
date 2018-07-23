/* global zrender */
(function () {

    var roots = [];

    var rawTransformable = new zrender.Group();
    var roamTransformable = new zrender.Group();
    roamTransformable.add(rawTransformable);

    var moving;

    /**
     * @param {module:zrender|boolean} zr Clear if `false`
     * @param {module:zrender/Element|boolean} root Target root to be roamed. Clear if `false`.
     * @param {Function|boolean} handler Roam event handler or disable roam if `false`.
     */
    window.roamable = function (zr, root, handler) {
        var indexExists = find(root);

        if (zr === false || root === false) {
            roots.length = 0;
            return;
        }

        if (handler === false) {
            if (indexExists >= 0) {
                roots.splice(indexExists, 1);
            }
            return;
        }

        if (indexExists >= 0) {
            return;
        }

        roots.push({root: root, handler: handler});

        if (!zr.__testRoamableMounted) {
            zr.on('mousewheel', handleMouseWheel);
            zr.on('mousedown', handleMouseDown);
            zr.on('mousemove', handleMouseMove);
            zr.on('mouseup', handleMouseUp);
            zr.__testRoamableMounted = true;
        }
    };

    function find(root) {
        for (var i = 0; i < roots.length; i++) {
            if (roots[i].root === root) {
                return i;
            }
        }
        return -1;
    }

    function handleMouseDown(e) {
        moving = [e.offsetX, e.offsetY];
    }

    function handleMouseMove(e) {
        if (!moving) {
            return;
        }
        var pointerPos = [e.offsetX, e.offsetY];
        for (var i = 0; i < roots.length; i++) {
            updateTransform(
                roots[i],
                [pointerPos[0] - moving[0], pointerPos[1] - moving[1]],
                [1, 1],
                [0, 0]
            );
        }
        moving = pointerPos;
    }

    function handleMouseUp(e) {
        moving = false;
    }

    function handleMouseWheel(e) {
        e.stop();

        var wheelDelta = e.wheelDelta;
        var absWheelDeltaDelta = Math.abs(wheelDelta);
        var originX = e.offsetX;
        var originY = e.offsetY;

        // wheelDelta maybe -0 in chrome mac.
        if (wheelDelta === 0) {
            return;
        }

        var factor = absWheelDeltaDelta > 3 ? 1.4 : absWheelDeltaDelta > 1 ? 1.2 : 1.1;
        var scaleDelta = wheelDelta > 0 ? factor : 1 / factor;

        for (var i = 0; i < roots.length; i++) {
            updateTransform(roots[i], [0, 0], [scaleDelta, scaleDelta], [originX, originY]);
        }
    }

    function updateTransform(rootRecord, positionDeltas, scaleDeltas, origin) {
        var root = rootRecord.root;

        rawTransformable.scale = root.scale.slice();
        rawTransformable.position = root.position.slice();
        rawTransformable.origin = root.origin && root.origin.slice();
        rawTransformable.rotation = root.rotation;

        roamTransformable.scale = scaleDeltas;
        roamTransformable.origin = origin;
        roamTransformable.position = positionDeltas;

        roamTransformable.updateTransform();
        rawTransformable.updateTransform();

        zrender.matrix.copy(
            root.transform || (root.transform = []),
            rawTransformable.transform || zrender.matrix.create()
        );

        root.decomposeTransform();
        root.dirty(true);

        var handler = rootRecord.handler;
        handler && handler(root);
    }


})();