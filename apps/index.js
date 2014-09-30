// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

function index(env) {
    "use strict";
    var view, buf, numParticles = 0;

    try {
        view = env.canvas().getContext("2d");
        buf = document.createElement("canvas").getContext("2d");
    } catch (err) {
        throw "Your web browser does not support " +
            "the <canvas> element!";
    }

    function onresize() {
        var w = view.canvas.width,
            h = view.canvas.height;
        buf.canvas.width = w;
        buf.canvas.height = h;
        view.fillStyle = "rgb(0,0,0)";
        view.fillRect(0, 0, w, h);
        buf.fillStyle = "rgb(0,0,0)";
        buf.fillRect(0, 0, w, h);
    }
    onresize();
    env.runOnCanvasResize(onresize);

    function addtext(str, x, y, font, align, baseline) {
        var i;
        buf.font = font;
        buf.textAlign = align;
        buf.textBaseline = baseline;
        view.font = font;
        view.textAlign = align;
        view.textBaseline = baseline;
        buf.fillStyle = "rgba(255,255,255,0.5)";
        for (i = 0; i < 5; i += 1) {
            buf.fillText(str, x + Math.random() * 10, y + Math.random() * 10);
        }
        buf.fillStyle = "rgba(0,0,0,0.2)";
        buf.fillText(str, x, y);
        view.fillStyle = "rgb(0,0,0)";
        view.fillText(str, x, y);
    }

    function onframe() {
        env.runOnNextFrame(onframe);
        var w = view.canvas.width,
            h = view.canvas.height;
        view.drawImage(buf.canvas, w * 0.01, h * 0.01, w * 0.98, h * 0.98,
                0, 0, w, h);
        buf.drawImage(view.canvas, 0, 0);
        buf.fillStyle = "rgba(0,0,0,0.04)";
        buf.fillRect(0, 0, w, h);
        addtext(
            "guciek.github.io",
            w / 2,
            h / 2,
            "bold 60px Sans-Serif",
            "center",
            "bottom"
        );
        addtext(
            "load apps using the top right menu",
            w / 2,
            h / 2 + 10,
            "bold 24px Sans-Serif",
            "center",
            "top"
        );
    }
    env.runOnNextFrame(onframe);

    function particle(x, y, vx, vy, r, g, b, radius) {
        if (radius < 1) { return; }
        if (r < 0) { r = 0; }
        if (r > 1) { r = 1; }
        if (g < 0) { g = 0; }
        if (g > 1) { g = 1; }
        if (b < 0) { b = 0; }
        if (b > 1) { b = 1; }
        if (r + g + b < 1) { r = 1; }
        numParticles += 1;
        var color = "rgb(" + Math.round(r * 255) + "," + Math.round(g * 255) +
            "," + Math.round(b * 255) + ")";
        function step() {
            var i;
            buf.fillStyle = color;
            buf.beginPath();
            buf.arc(x, y, radius, 0, 2 * Math.PI, false);
            buf.fill();
            vx *= 0.997;
            vy *= 0.997;
            if ((vx > 0) && (x + radius > buf.canvas.width)) { vx = -vx; }
            if ((vx < 0) && (x < radius)) { vx = -vx; }
            if ((vy > 0) && (y + radius > buf.canvas.height)) { vy = -vy; }
            if ((vy < 0) && (y < radius)) { vy = -vy; }
            x += vx;
            y += vy;
            if (vx * vx + vy * vy > 5) {
                env.runOnNextFrame(step);
            } else {
                numParticles -= 1;
                if (numParticles < 200) {
                    for (i = 0; i < 10; i += 1) {
                        particle(
                            x,
                            y,
                            (Math.random() - 0.5) * 20,
                            (Math.random() - 0.5) * 20,
                            r + 0.5 * (Math.random() - 0.5),
                            g + 0.5 * (Math.random() - 0.5),
                            b + 0.5 * (Math.random() - 0.5),
                            10 * Math.random()
                        );
                    }
                }
            }
            if (Math.random() < 1 / (numParticles + 10)) {
                particle(
                    x,
                    y,
                    vx * 0.9 + Math.random() - 0.5,
                    vy * 0.9 + Math.random() - 0.5,
                    r + 0.1 * (Math.random() - 0.5),
                    g + 0.1 * (Math.random() - 0.5),
                    b + 0.1 * (Math.random() - 0.5),
                    radius * Math.random()
                );
            }
        }
        step();
    }

    particle(
        view.canvas.width / 2,
        view.canvas.height / 2,
        0,
        0,
        1,
        1,
        1,
        10
    );
}
