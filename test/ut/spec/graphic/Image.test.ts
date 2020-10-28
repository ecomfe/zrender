import {Image as ZRImage} from '../zrender';

class HTMLImageElement {
    width: number
    height: number

    constructor() {}
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

});