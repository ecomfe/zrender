import Handler from "../../../src/Handler";
import Storage from "../../../src/Storage";
import { Rect } from "./zrender";

function makeEvent(zrX: number, zrY: number) {
  return {
    zrX,
    zrY,
    zrDelta: 0,
    zrByTouch: false,
    which: 1,
  } as any;
}

describe("Handler", function () {
  it("should fire mouseover again after mouseout from canvas and re-entering the same element", function () {
    const storage = new Storage();
    const proxy = {
      on() {},
      dispose() {},
      setCursor() {},
    } as any;
    const painter = {
      getWidth() {
        return 200;
      },
      getHeight() {
        return 200;
      },
    } as any;
    const handler = new Handler(storage, painter, proxy, null, null);

    const rect = new Rect({
      shape: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
    });
    storage.addRoot(rect);

    let mouseoverCount = 0;
    let mouseoutCount = 0;
    rect.on("mouseover", function () {
      mouseoverCount++;
    });
    rect.on("mouseout", function () {
      mouseoutCount++;
    });

    handler.mousemove(makeEvent(10, 10));
    expect(mouseoverCount).toBe(1);
    expect(mouseoutCount).toBe(0);

    handler.mouseout(makeEvent(150, 150));
    expect(mouseoutCount).toBe(1);

    handler.mousemove(makeEvent(10, 10));
    expect(mouseoverCount).toBe(2);
  });
});
