import { Track } from '../../../../src/animation/Animator';

describe('Track', function () {
    it('valueType number', async () => {
        const obj = {
            x: 100
        };
        const track = new Track('x');
        track.addKeyframe(0, 100);
        track.addKeyframe(1000, 150);
        track.addKeyframe(2000, 300);
        track.prepare(2000);
        track.step(obj, 0.25);
        expect(obj.x).toBe(125);
    });

    it('valueType 1d array', async () => {
        const obj = {
            x: [100, 100]
        };
        const track = new Track('x');
        track.addKeyframe(0, [100, 100]);
        track.addKeyframe(1000, [150, 200]);
        track.addKeyframe(2000, [300, 400]);
        track.prepare(2000);
        track.step(obj, 0.25);
        expect(obj.x).toStrictEqual([125, 150]);
        track.step(obj, 0.75);
        expect(obj.x).toStrictEqual([225, 300]);
    });

    it('valueType 2d array', async () => {
        const obj = {
            x: [[100, 50], [100, 30]]
        };
        const track = new Track('x');
        track.addKeyframe(0, [[100, 50], [100, 30]]);
        track.addKeyframe(1000, [[150, 100], [200, 60]]);
        track.addKeyframe(2000, [[300, 150], [400, 120]]);
        track.prepare(2000);
        track.step(obj, 0.25);
        expect(obj.x).toStrictEqual([[125, 75], [150, 45]]);
        track.step(obj, 0.75);
        expect(obj.x).toStrictEqual([[225, 125], [300, 90]]);
    });

    it('valueType color', async () => {
        const obj = {
            x: 'rgba(0,0,0,0)'
        };
        const track = new Track('x');
        track.addKeyframe(0, 'rgba(0,0,0,0)');
        track.addKeyframe(1000, 'rgba(200,200,200,1)');
        track.addKeyframe(2000, 'rgba(100,100,100,0)');
        track.prepare(2000);
        track.step(obj, 0.25);
        expect(obj.x).toStrictEqual('rgba(100,100,100,0.5)');
        track.step(obj, 0.75);
        expect(obj.x).toStrictEqual('rgba(150,150,150,0.5)');
    });

    it('valueType linear', async () => {
        const obj = {
            x: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [{
                    offset: 0,
                    color: '#00f'
                }, {
                    offset: 1,
                    color: '#f0f'
                }]
            }
        };
        const track = new Track('x');
        track.addKeyframe(0, {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [{
                offset: 0,
                color: '#00f'
            }, {
                offset: 1,
                color: '#f0f'
            }]
        });
        track.addKeyframe(1000, {
            type: 'linear',
            x: 1,
            y: 1,
            x2: 0,
            y2: 0,
            colorStops: [{
                offset: 0,
                color: '#00f'
            }, {
                offset: 1,
                color: '#f0f'
            }]
        });
        track.prepare(1000);
        track.step(obj, 0.25);
        expect(obj.x).toStrictEqual({
            'colorStops': [{'color': 'rgba(0,0,255,1)', 'offset': 0}, {'color': 'rgba(255,0,255,1)', 'offset': 1}],
            'global': undefined,
            'type': 'linear',
            'x': 0.25,
            'x2': 0.75,
            'y': 0.25,
            'y2': 0.75
        });
        track.step(obj, 0.75);
        expect(obj.x).toStrictEqual({
            'colorStops': [{'color': 'rgba(0,0,255,1)', 'offset': 0}, {'color': 'rgba(255,0,255,1)', 'offset': 1}],
            'global': undefined,
            'type': 'linear',
            'x': 0.75,
            'x2': 0.25,
            'y': 0.75,
            'y2': 0.25
        });
    });
});
