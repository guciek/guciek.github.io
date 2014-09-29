// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

function canvasmeye(env) {
    "use strict";

    function pattern(w, h) {
        var c = document.createElement("canvas").getContext("2d"),
            i,
            x,
            y,
            f;
        c.canvas.width = w;
        c.canvas.height = h;
        c.fillStyle = "rgb(255,255,255)";
        c.fillRect(0, 0, w, h);
        for (i = 0; i < (w * h / 30); i += 1) {
            x = Math.random() * w;
            y = Math.random() * h;
            f = (Math.sin(3 * y / h) + 1) * 0.5;
            c.fillStyle = "rgb(" +
                Math.floor(Math.random() * 256 * f) + "," +
                Math.floor(Math.random() * 256) + "," +
                Math.floor(Math.random() * 256 * (1 - f)) + ")";
            c.beginPath();
            c.arc(x - w, y, 5, 0, 2 * Math.PI, false);
            c.fill();
            c.beginPath();
            c.arc(x, y, 5, 0, 2 * Math.PI, false);
            c.fill();
            c.beginPath();
            c.arc(x + w, y, 5, 0, 2 * Math.PI, false);
            c.fill();
        }
        return c;
    }

    function example_image(w, h) {
        var r = w;
        if (h < w) { r = h; }
        r *= 0.5;
        return function (x, y) {
            var mdist = Math.sqrt((y - h / 2) * (y - h / 2) +
                    (x - w / 2) * (x - w / 2)),
                ret = 0;
            if (mdist < r * 0.3) {
                ret = 0.5 + Math.sqrt(r * r * 0.09 - mdist * mdist) / 300;
            } else if (mdist > r * 0.8) {
                mdist /= r;
                mdist -= 0.8;
                mdist /= 6;
                if (mdist > 0.1) { mdist = 0.1; }
                ret = (Math.sin(x * 0.03) * Math.sin(y * 0.03) + 1) * mdist;
            } else if (mdist > r * 0.6) {
                ret = 1;
            }
            if (ret < 0.0) { ret = 0.0; }
            if (ret > 1.0) { ret = 1.0; }
            return ret;
        };
    }

    function draw(c) {
        var w = c.canvas.width,
            h = c.canvas.height,
            templ_w = 100,
            templ = pattern(templ_w, h),
            drawy = 0,
            image = example_image(w - templ_w, h);
        function height(x, y) {
            if (x < templ_w) {
                return 0;
            }
            var ret = image(x - templ_w, y);
            return ret;
        }
        function line_filler(y) {
            var source = templ.getImageData(0, y, templ_w, 1),
                dest = c.getImageData(0, y, w, 1),
                xf,
                xm;
            function set_pixel(sx, dx) {
                if (sx < 0) { return; }
                if (sx >= templ_w) { return; }
                dx = Math.floor(dx);
                if (dx < 0) { return; }
                if (dx >= w) { return; }
                xf = Math.floor(sx);
                xm = sx - xf;
                xf *= 4;
                function s(f) {
                    if (f >= templ_w * 4) { return source.data[f - templ_w * 4]; }
                    return source.data[f];
                }
                dest.data[4 * dx] = s(xf) + xm * (s(xf + 4) - s(xf));
                dest.data[4 * dx + 1] = s(xf + 1) + xm * (s(xf + 5) - s(xf + 1));
                dest.data[4 * dx + 2] = s(xf + 2) + xm * (s(xf + 6) - s(xf + 2));
                dest.data[4 * dx + 3] = 255;
            }
            function save() {
                c.putImageData(dest, 0, y);
            }
            return {
                set_pixel : set_pixel,
                save : save
            };
        }
        function line_pixel_copier(y) {
            var l = line_filler(y), from = [];
            (function () {
                var i;
                for (i = 0; i <= w + 1; i += 1) {
                    from[i] = 0;
                }
            }());
            function pick_from(x) {
                var xf = Math.floor(x), xm, d;
                xm = x - xf;
                d = from[xf + 1] - from[xf];
                if (d < -templ_w / 2) { d += templ_w; }
                if (d > templ_w / 2) { d -= templ_w; }
                return from[xf] + xm * d;
            }
            function copy(x1, x2) {
                if (x1 < 0) {
                    from[x2] = x1;
                } else {
                    from[x2] = pick_from(x1);
                }
                while (from[x2] < 0) { from[x2] += templ_w; }
                while (from[x2] >= templ_w) { from[x2] -= templ_w; }
                l.set_pixel(from[x2], x2);
            }
            function fill_stripe(x, w, similar) {
                var s = pick_from(similar), m = Math.round(w / 2),
                    i,
                    direction = 1;
                if (s > templ_w / 2) { direction = -1; }
                for (i = 0; i < m; i += 1) {
                    from[x + i] = s + i * direction;
                    l.set_pixel(from[x + i], x + i);
                }
                for (i = m; i < w; i += 1) {
                    from[x + i] = s + (w - i) * direction;
                    l.set_pixel(from[x + i], x + i);
                }
            }
            return {
                copy : copy,
                fill_stripe : fill_stripe,
                save : l.save
            };
        }
        function draw_line(y) {
            function source(x) {
                return x - (1.0 - height(x, y) * 0.2) * templ_w;
            }
            var l = line_pixel_copier(y), x = 0, based = -templ_w, d, x1;
            while (x < w) {
                d = source(x);
                if (d >= based) {
                    based = d;
                    l.copy(d, x);
                    x += 1;
                } else {
                    x1 = x;
                    x += 1;
                    while ((x < w) && (source(x) < based)) {
                        x += 1;
                    }
                    l.fill_stripe(x1, x - x1 + 1, based);
                }
            }
            l.save();
        }
        function step() {
            if (drawy >= h) { return false; }
            draw_line(drawy);
            drawy += 1;
            return true;
        }
        return {
            step: step
        };
    }

    function init() {
        var c, d;
        try {
            c = env.canvas().getContext("2d");
        } catch (err) {
            throw "Your web browser does not support " +
                "the <canvas> element!";
        }
        d = draw(c);
        env.runOnCanvasResize(function () {
            d = draw(c);
        });
        function step() {
            if (d.step()) {
                env.runOnNextIdle(step);
            } else {
                env.runOnNextFrame(step);
            }
        }
        env.runOnNextIdle(step);
    }

    init();
}
