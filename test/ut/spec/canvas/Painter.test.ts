import CanvasPainter from '../../../../src/canvas/Painter';
import Layer from '../../../../src/canvas/Layer';
import Storage from '../../../../src/Storage';
import {platformApi, setPlatformAPI} from '../../../../src/core/platform';
import Rect from '../../../../src/graphic/shape/Rect';

describe('CanvasPainter', function () {
    const originalCreateCanvas = platformApi.createCanvas;

    afterEach(function () {
        setPlatformAPI({
            createCanvas: originalCreateCanvas
        });
    });

    it('includes custom layers in z-order when exporting above painter dpr', function () {
        const events: string[] = [];

        function createCanvas() {
            let ctx: CanvasRenderingContext2D;
            const canvas = {
                getContext: () => ctx,
                height: 100,
                nodeName: 'CANVAS',
                style: null,
                width: 100
            } as unknown as HTMLCanvasElement;
            ctx = {
                beginPath: jest.fn(),
                canvas,
                clearRect: jest.fn(),
                fill: jest.fn(),
                rect: jest.fn(),
                restore: jest.fn(),
                save: jest.fn(),
                setTransform: jest.fn(),
                stroke: jest.fn()
            } as unknown as CanvasRenderingContext2D;
            return canvas;
        }

        setPlatformAPI({createCanvas});

        const storage = new Storage();
        const root = createCanvas();
        const painter = new CanvasPainter(root, storage, {
            devicePixelRatio: 1,
            width: 100,
            height: 100
        }, 0);

        function insertCustomLayer(zlevel: number, name: string) {
            const layer = new Layer(name, painter, 1);
            layer.virtual = true;
            layer.refresh = jest.fn();
            layer.resize = jest.fn();
            layer.renderToCanvas = jest.fn(function () {
                events.push(name);
            });
            painter.insertLayer(zlevel, layer);
            return layer;
        }

        const lowerLayer = insertCustomLayer(1, 'lower custom layer');
        const upperLayer = insertCustomLayer(3, 'upper custom layer');
        const rect = new Rect({
            shape: {width: 10, height: 10}
        });
        rect.zlevel = 2;
        rect.beforeBrush = function () {
            events.push('displayable');
        };
        storage.addRoot(rect);

        const exportedCanvas = painter.getRenderedCanvas({pixelRatio: 2});

        expect(exportedCanvas.width).toBe(200);
        expect(exportedCanvas.height).toBe(200);
        expect(lowerLayer.renderToCanvas).toHaveBeenCalledTimes(1);
        expect(upperLayer.renderToCanvas).toHaveBeenCalledTimes(1);
        expect(events).toEqual([
            'lower custom layer',
            'displayable',
            'upper custom layer'
        ]);
    });
});
