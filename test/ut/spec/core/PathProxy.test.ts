import PathProxy from '../../../../src/core/PathProxy';

describe('PathProxy.arcTo', function () {
    const createRebuilder = () => ({
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        bezierCurveTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        arc: jest.fn(),
        ellipse: jest.fn(),
        rect: jest.fn(),
        closePath: jest.fn()
    });

    it('replays the tangent line and a clockwise corner', function () {
        const path = new PathProxy();
        path.moveTo(0, 0);
        path.arcTo(10, 0, 10, 10, 2);
        path.lineTo(10, 10);

        const ctx = createRebuilder();
        path.rebuildPath(ctx, 1);

        expect(ctx.lineTo.mock.calls).toEqual([[8, 0], [10, 10]]);
        const [x, y, radius, start, end, anticlockwise] = ctx.arc.mock.calls[0];
        expect([x, y, radius, anticlockwise]).toEqual([8, 2, 2, false]);
        expect(start).toBeCloseTo(3 * Math.PI / 2);
        expect(end).toBeCloseTo(2 * Math.PI);
    });

    it('replays an anticlockwise corner from the current point of a rectangle', function () {
        const path = new PathProxy();
        path.rect(20, 20, 5, 5);
        path.arcTo(30, 20, 30, 10, 2);

        const ctx = createRebuilder();
        path.rebuildPath(ctx, 1);

        expect(ctx.lineTo).toHaveBeenCalledWith(28, 20);
        const [x, y, radius, start, end, anticlockwise] = ctx.arc.mock.calls[0];
        expect([x, y, radius, anticlockwise]).toEqual([28, 18, 2, true]);
        expect(start).toBeCloseTo(Math.PI / 2);
        expect(end).toBeCloseTo(0);
    });

    it('moves to the corner on an empty path and uses a line for zero radius or collinear points', function () {
        const path = new PathProxy();
        path.arcTo(2, 3, 4, 3, 2);
        path.arcTo(4, 3, 8, 3, 2);
        path.arcTo(8, 3, 8, 6, 0);

        const ctx = createRebuilder();
        path.rebuildPath(ctx, 1);

        expect(ctx.moveTo.mock.calls).toEqual([[2, 3]]);
        expect(ctx.lineTo.mock.calls).toEqual([[4, 3], [8, 3]]);
        expect(ctx.arc).not.toHaveBeenCalled();
    });
});
