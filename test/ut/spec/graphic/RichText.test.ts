import {RichText} from '../zrender';

describe('RichText', function () {

    it('RichText#useStyle should merge rich style property.', function () {
        const text = new RichText({
            style: {
                rich: {
                    foo: {
                        fill: 'red'
                    }
                }
            }
        });
        const emphasisState = text.ensureState('emphasis');
        emphasisState.style = {
            rich: {
                foo: {
                    stroke: 'blue'
                }
            }
        }

        text.useState('emphasis');

        expect(text.style.rich.foo).toEqual({
            fill: 'red',
            stroke: 'blue'
        });
    });

});