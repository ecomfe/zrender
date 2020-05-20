import {Text} from '../zrender';

describe('Text', function () {

    it('Text#useState should merge rich style property.', function () {
        const text = new Text({
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