import {createOrUpdateImage} from '../../../../src/graphic/helper/image';
import {Image as ZRImage} from '../zrender';

class HTMLImageElement {
    width: number
    height: number
    src?: string

    constructor() {}
}

class Image {
    width?: number
    height?: number
    onload?: () => void

    constructor(width?: number, height?: number, onload?: () => void) {
        this.width = width || 1;
        this.height = height || 1;
        this.onload = onload;
        setTimeout(() => {
            this.onload?.();
        }, 100);
    }
}

describe('Image', function () {

    it('Should get width and height from style by default', function () {
        const imgSource = new HTMLImageElement();
        imgSource.width = 100;
        imgSource.height = 100;
        const img = new ZRImage({
            style: {
                width: 300,
                height: 200,
                // @ts-ignore
                image: imgSource
            }
        });

        const rect = img.getBoundingRect();
        expect(rect.width).toBe(300);
        expect(rect.height).toBe(200);
    });


    it('Should get width with proper aspect', function () {
        const imgSource = new HTMLImageElement();
        imgSource.width = 100;
        imgSource.height = 50;
        const img = new ZRImage({
            style: {
                width: 300,
                // @ts-ignore
                image: imgSource
            }
        });

        const rect = img.getBoundingRect();
        expect(rect.width).toBe(300);
        expect(rect.height).toBe(150);
    });

    it('Should get height with proper aspect', function () {
        const imgSource = new HTMLImageElement();
        imgSource.width = 100;
        imgSource.height = 50;
        const img = new ZRImage({
            style: {
                height: 200,
                // @ts-ignore
                image: imgSource
            }
        });

        const rect = img.getBoundingRect();
        expect(rect.width).toBe(400);
        expect(rect.height).toBe(200);
    });

    it('Should trigger `onload` event even if hit cache', function (done) {
        const imgSource = new HTMLImageElement();
        imgSource.width = 100;
        imgSource.height = 50;
        imgSource.src = '#';
        const mockOnload = jest.fn();
        const fakeHostEl = {
            dirty: () => {}
        };

        // 模拟测试Image加载
        (global as any).Image = Image;
        createOrUpdateImage(imgSource.src, imgSource as any, fakeHostEl, mockOnload);
        createOrUpdateImage(imgSource.src, imgSource as any, fakeHostEl, mockOnload);
        
        setTimeout(() => {
            expect(mockOnload).toHaveBeenCalledTimes(2);
            done();
        }, 200);
    });
});