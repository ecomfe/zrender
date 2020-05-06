import {Group, Path, Image as ZImage, Element} from '../zrender';

describe('Group', function () {

    it('Default properties should be right', function () {
        const group = new Group();
        expect(group.x).toEqual(0);
        expect(group.y).toEqual(0);
        expect(group.scaleX).toEqual(1);
        expect(group.scaleY).toEqual(1);
        expect(group.rotation).toBe(0);

        expect(group.type).toBe('group');
        expect(group.isGroup).toBe(true);
    });

    it('Option can be set properly', function () {
        const group = new Group({
            x: 2,
            y: 3,
            scaleX: 1.5,
            scaleY: 1.5,
            rotation: 2,
            name: 'Test'
        });
        expect(group.x).toEqual(2);
        expect(group.y).toEqual(3);
        expect(group.scaleX).toEqual(1.5);
        expect(group.scaleY).toEqual(1.5);
        expect(group.rotation).toBe(2);
        expect(group.name).toBe('Test');
    });

    it('Group#add', function () {
        const group = new Group();
        const g1 = new Group();
        const g2 = new Group();

        group.add(g1);
        group.add(g2);

        expect(group.childCount()).toBe(2);
        expect(group.children().length).toBe(2);

        expect(g1.parent).toBe(group);
        expect(g2.parent).toBe(group);
    });


    it('Group#addBefore', function () {
        const group = new Group();
        const g1 = new Group();
        const g2 = new Group();

        group.add(g1);
        group.addBefore(g2, g1);

        expect(group.childCount()).toBe(2);
        expect(group.childAt(0)).toBe(g2);
        expect(group.childAt(1)).toBe(g1);
    });

    it('Group#remove', function () {
        const group = new Group();
        const g1 = new Group();
        const g2 = new Group();

        group.add(g1);
        group.add(g2);

        group.remove(g2);

        expect(group.childCount()).toBe(1);
        expect(g2.parent).toBe(null);
        expect(group.childAt(0)).toBe(g1);

        group.remove(g1);
        expect(group.childCount()).toBe(0);
    });

    it('Group#removeAll', function () {
        const group = new Group();
        const g1 = new Group();
        const g2 = new Group();

        group.add(g1);
        group.add(g2);

        group.removeAll();

        expect(group.childCount()).toBe(0);
        expect(g1.parent).toBe(null);
        expect(g2.parent).toBe(null);
    });

    it('Group#childAt', function () {
        const group = new Group();
        group.add(new Group({
            name: 'First Child'
        }));
        group.add(new Group({
            name: 'Second Child'
        }));

        expect(group.childAt(0).name).toEqual('First Child');
        expect(group.childAt(1).name).toEqual('Second Child');
    });

    it('Group#childOfName', function () {
        const group = new Group();
        group.add(new Group({
            name: 'First Child'
        }));
        group.add(new Group({
            name: 'Second Child'
        }));

        expect(group.childOfName('Second Child').name).toEqual('Second Child');
    });

    it('Group#eachChild', function () {
        const group = new Group();
        const g1 = new Group({
            name: 'g1'
        });
        const g2 = new Group({
            name: 'g2'
        });
        const g11 = new Group({
            name: 'g3'
        });

        group.add(g1);
        group.add(g2);
        g1.add(g11);

        const children: Element[] = [];
        const indices: number[] = [];
        const context = { foo: 2 };
        group.eachChild(function (child, idx) {
            indices.push(idx);
            children.push(child);
            expect(this.foo).toBe(2);
        }, context);
        expect(children).toHaveLength(2);
        expect(children[0]).toBe(g1);
        expect(children[1]).toBe(g2);

        expect(indices).toEqual([0, 1]);
    });

    it('Group#traverse', function () {
        const group = new Group();
        const g1 = new Group({
            name: 'g1'
        });
        const g2 = new Group({
            name: 'g2'
        });
        const g11 = new Group({
            name: 'g3'
        });

        group.add(g1);
        group.add(g2);
        g1.add(g11);

        const children: Element[] = [];
        const context = { foo: 2 };
        group.traverse(function (child) {
            children.push(child);
            expect(this.foo).toBe(2);
        }, context);
        // Check if is depth first traverse
        expect(children).toHaveLength(3);
        expect(children[0]).toBe(g1);
        expect(children[1]).toBe(g11);
        expect(children[2]).toBe(g2);
    });

    // TODO BoundingRect
});