// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

function burn_canvas(env) {
    "use strict";

    var effects = {};

    effects.burn = function (i, centerx, centery, radius) {
        var rr = 1 / (radius * radius),
            pos = 0,
            w = i.width,
            t = 0,
            v = 0,
            a = 0,
            vv = 0,
            idata = i.data,
            x,
            y,
            b,
            bb;
        for (y = 0; y < i.height; y += 1) {
            b = y - centery;
            bb = b * b;
            for (x = 0; x < w; x += 1) {
                a = x - centerx;
                v = 1 - (a * a + bb) * rr;
                if (v <= 0) {
                    pos += 4;
                } else {
                    vv = v * v;
                    v = 6 * (vv - vv * v);
                    t = idata[pos];
                    t -= v * 10;
                    if (t < 0) { t += 256; }
                    idata[pos] = t;
                    pos += 1;
                    t = idata[pos];
                    t -= v * 21.23553;
                    if (t < 0) { t += 256; }
                    idata[pos] = t;
                    pos += 1;
                    t = idata[pos];
                    t -= v * 46.72232;
                    if (t < 0) { t += 256; }
                    idata[pos] = t;
                    pos += 2;
                }
            }
        }
    };

    effects.melt = function (i, centerx, centery, radius) {
        var x, y, pos, a, b, v;
        for (y = i.height - 1; y >= 1; y -= 1) {
            for (x = 0; x < i.width; x += 1) {
                pos = 4 * (i.width * y + x);
                a = x - centerx;
                b = y - centery;
                v = 1 - (a * a + b * b) / (radius * radius);
                if (v < 0) { v = 0; }
                v = v * v;
                i.data[pos] += v * (i.data[pos - i.width * 4] - i.data[pos]);
                i.data[pos + 1] += v *
                    (i.data[pos + 1 - i.width * 4] - i.data[pos + 1]);
                i.data[pos + 2] += v *
                    (i.data[pos + 2 - i.width * 4] - i.data[pos + 2]);
            }
        }
    };

    function initDraw() {
        var view,
            reach = 50,
            x = -1,
            y = -1;
        try {
            view = env.canvas().getContext("2d");
        } catch (err) {
            throw "Your web browser does not support " +
                "the <canvas> element!";
        }
        env.menu().
            addLink("Burn", "#burn").
            addLink("Melt", "#melt").
            addLink("Unlimited Burn", "#unlimited");
        (function () {
            var inp = document.createElement("input");
            inp.type = "file";
            env.menu().addLink("Load Image", inp);
            inp.onchange = env.eventHandler(function () {
                if (inp.files.length < 1) { return; }
                var fr = new window.FileReader();
                fr.onload = env.eventHandler(function (ev) {
                    var img = document.createElement("img");
                    img.onload = env.eventHandler(function () {
                        view.drawImage(
                            img,
                            0,
                            0,
                            view.canvas.width,
                            view.canvas.height
                        );
                    });
                    img.src = ev.target.result;
                });
                fr.readAsDataURL(inp.files[0]);
            });
        }());
        function onresize() {
            env.location().setHash("burn");
            view.fillStyle = "rgb(255,255,255)";
            view.fillRect(0, 0, view.canvas.width, view.canvas.height);
        }
        onresize();
        env.runOnCanvasResize(onresize);
        function updmouse() {
            var newx = env.mouse().getX(),
                newy = env.mouse().getY(),
                dx = x - newx,
                dy = y - newy;
            if (newx < 0) { return; }
            if (dx < 0) { dx = -dx; }
            if (dy < 0) { dy = -dy; }
            if (dx + dy > 0) {
                reach -= 1 + Math.round(0.1 * (dx + dy));
                if (reach < 50) { reach = 50; }
                if (reach > 100) { reach = 100; }
                x = newx;
                y = newy;
            }
        }
        function onframe() {
            env.runOnNextFrame(onframe);
            updmouse();
            var w = view.canvas.width,
                h = view.canvas.height,
                x1 = x - reach,
                x2 = x + reach,
                y1 = y - reach,
                y2 = y + reach,
                i,
                effect = env.location().getHash() || "burn",
                limit = 100;
            if (effect === "unlimited") {
                effect = "burn";
                limit = 1000;
            }
            if (!effects[effect]) {
                throw "Unknown effect";
            }
            if (reach < limit) {
                reach += 1;
            } else {
                return;
            }
            if (x < 0) { return; }
            if (x1 < 0) { x1 = 0; }
            if (y1 < 0) { y1 = 0; }
            if (x1 > w - 1) { return; }
            if (y1 > h - 1) { return; }
            if (x2 < x1 + 1) { x2 = x1 + 1; }
            if (y2 < y1 + 1) { y2 = y1 + 1; }
            if (x2 > w) { x2 = w; }
            if (y2 > h) { y2 = h; }
            i = view.getImageData(x1, y1, x2 - x1, y2 - y1);
            effects[effect](i, x - x1, y - y1, reach);
            view.putImageData(i, x1, y1);
        }
        env.runOnNextFrame(onframe);
    }

    initDraw();
}
