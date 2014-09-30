// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

function web_mandelbrot(env) {
    "use strict";

    function mandelbrot_draw(acontext, aw, ah, areal, aimag, aradius, amaxiter) {
        var c = acontext,
            w = aw,
            h = ah,
            real = areal,
            imag = aimag,
            zoom = (2 * aradius) / ((h < w) ? h : w),
            maxiter = amaxiter,
            time = 0,
            first_tile_size = 128,
            sidestart = 0,
            sidestep = 0,
            tile = first_tile_size,
            sx = Math.floor(w / 2),
            sy = Math.floor(h / 2),
            antialias = false;
        function mapped_point(x, y) {
            return {
                real: (x - w * 0.5) * zoom + real,
                imag: (h * 0.5 - y) * zoom + imag
            };
        }
        function hsv2rgb(i) {
            i.h -= Math.floor(i.h);
            i.h *= 6.0;
            if (i.s < 0) { i.s = 0; }
            if (i.s > 1) { i.s = 1; }
            if (i.v < 0) { i.v = 0; }
            if (i.v > 1) { i.v = 1; }
            var f = i.h - Math.floor(i.h), r, g, b;
            switch (Math.floor(i.h)) {
            case 0:
                r = 1;
                g = 1 - (1 - f) * i.s;
                b = 1 - i.s;
                break;
            case 1:
                r = 1 - i.s * f;
                g = 1;
                b = 1 - i.s;
                break;
            case 2:
                r = 1 - i.s;
                g = 1;
                b = 1 - (1 - f) * i.s;
                break;
            case 3:
                r = 1 - i.s;
                g = 1 - i.s * f;
                b = 1;
                break;
            case 4:
                r = 1 - (1 - f) * i.s;
                g = 1 - i.s;
                b = 1;
                break;
            default:
                r = 1;
                g = 1 - i.s;
                b = 1 - i.s * f;
            }
            r *= i.v;
            g *= i.v;
            b *= i.v;
            return { r: r, g: g, b: b };
        }
        function mandelbrot(pt) {
            var r0 = pt.real,
                i0 = pt.imag,
                r = r0,
                i = i0,
                nr,
                ni,
                iter = 0;
            while (iter < maxiter) {
                iter += 1;
                nr = r * r - i * i;
                ni = 2 * r * i;
                r = nr + r0;
                i = ni + i0;
                if (r * r + i * i >= 4) { break; }
            }
            if (r * r + i * i >= 4) {
                nr = r * r - i * i;
                ni = 2 * r * i;
                r = nr + r0;
                i = ni + i0;
                nr = r * r - i * i;
                ni = 2 * r * i;
                r = nr + r0;
                i = ni + i0;
                time += iter;
                return iter + 10.0 - Math.log(Math.log(r * r + i * i) * 0.5) *
                    1.44269504;
            }
            time += maxiter;
            return -1;
        }
        function palette(d) {
            time += 100;
            var v = Math.sin(d * 0.1847969) * 0.5 + 0.5;
            return hsv2rgb({
                h: d * 0.00521336,
                s: (Math.sin(d * 0.162012467) * 0.5 + 0.5) * (1 - v),
                v: v
            });
        }
        function interpolate(a, b, t) {
            return {
                r: a.r + t * (b.r - a.r),
                g: a.g + t * (b.g - a.g),
                b: a.b + t * (b.b - a.b)
            };
        }
        function log_color(d) {
            if (d < 0) { return { r: 0, g: 0, b: 0 }; }
            d += 50;
            d = Math.log(d);
            d *= 100;
            var p = Math.floor(d);
            return interpolate(palette(p), palette(p + 1), d - p);
        }
        function html_color(m) {
            function int256(f) {
                if (f <= 0) { return 0; }
                if (f >= 0.999) { return 255; }
                return Math.floor(f * 256);
            }
            return "rgb(" + int256(m.r) + "," +
                int256(m.g) + "," + int256(m.b) + ")";
        }
        function draw_tile(x, y) {
            var tilex = sx + x * tile,
                tiley = sy + y * tile,
                rgb;
            if (tilex + tile / 2 < 0) { return; }
            if (tiley + tile / 2 < 0) { return; }
            if (tilex - tile / 2 >= w) { return; }
            if (tiley - tile / 2 >= h) { return; }
            if (antialias) {
                rgb = interpolate(
                    interpolate(
                        log_color(mandelbrot(mapped_point(tilex - 0.25, tiley - 0.25))),
                        log_color(mandelbrot(mapped_point(tilex - 0.25, tiley + 0.25))),
                        0.5
                    ),
                    interpolate(
                        log_color(mandelbrot(mapped_point(tilex + 0.25, tiley - 0.25))),
                        log_color(mandelbrot(mapped_point(tilex + 0.25, tiley + 0.25))),
                        0.5
                    ),
                    0.5
                );
            } else {
                if (x < 0) { x = -x; }
                if (y < 0) { y = -y; }
                if ((tile > 1.5) && (tile < first_tile_size) &&
                        (x % 2 === 0) && (y % 2 === 0)) {
                    return;
                }
                rgb = log_color(mandelbrot(mapped_point(tilex, tiley)));
            }
            c.fillStyle = html_color(rgb);
            c.fillRect(Math.floor(tilex - tile / 2),
                Math.floor(tiley - tile / 2), tile, tile);
            time += 10 + tile;
        }
        function step() {
            if (((sidestart - 1) * tile * 2 > h) &&
                    ((sidestart - 1) * tile * 2 > w)) {
                if (antialias) {
                    return false;
                }
                tile = Math.floor(tile / 2);
                if (tile < 3) {
                    antialias = true;
                    tile = 1;
                }
                sidestart = 0;
                sidestep = 0;
            }
            if (sidestart < 0.5) {
                draw_tile(0, 0);
            } else {
                draw_tile(-sidestart + sidestep, -sidestart);
                draw_tile(sidestart, -sidestart + sidestep);
                draw_tile(sidestart - sidestep, sidestart);
                draw_tile(-sidestart, sidestart - sidestep);
            }
            sidestep += 1;
            if (sidestep + 1 > sidestart * 2) {
                sidestart += 1;
                sidestep = 0;
            }
            return true;
        }
        return {
            step:
                function () {
                    time = 0;
                    var maxtime = 100000;
                    while (step()) {
                        if ((time > maxtime) &&
                                (tile < first_tile_size - 0.1)) {
                            return true;
                        }
                    }
                    return false;
                },
            mapped_point: mapped_point,
            pixel_size: zoom
        };
    }

    function init() {
        var view,
            pt = { real: NaN, imag: NaN },
            radius = NaN,
            maxiter = NaN,
            draw;

        try {
            view = env.canvas().getContext("2d");
        } catch (err) {
            throw "Your web browser does not support " +
                "the <canvas> element!";
        }

        function redraw() {
            env.location().setHash(pt.real + ";" + pt.imag +
                ";" + radius + ";" + maxiter);
            draw = mandelbrot_draw(view, view.canvas.width,
                view.canvas.height, pt.real, pt.imag, radius, maxiter);
        }

        function onhashchange() {
            var loc = env.location().getHash().split(";");
            while ((loc.length) < 4) { loc[loc.length] = ''; }
            pt.real = parseFloat(loc[0]);
            pt.imag = parseFloat(loc[1]);
            radius = parseFloat(loc[2]);
            maxiter = parseInt(loc[3], 10);
            if (isNaN(pt.real)) { pt.real = -0.5; }
            if (isNaN(pt.imag)) { pt.imag = 0; }
            if (isNaN(radius) || (radius <= 0)) { radius = 2; }
            if (isNaN(maxiter)) { maxiter = 1000; }
            if (maxiter < 100) { maxiter = 100; }
            if (maxiter > 100000) { maxiter = 100000; }
            redraw();
        }

        env.runOnCanvasResize(redraw);
        env.runOnLocationChange(onhashchange);
        onhashchange();

        env.canvas().onclick = function () {
            var x = env.mouse().getX(),
                y = env.mouse().getY();
            if ((x < view.canvas.width * 0.15) ||
                    (x > view.canvas.width * 0.85)) {
                // Zoom out
                if (radius < 3) {
                    radius *= 2;
                    redraw();
                }
            } else if (draw.pixel_size > 0.0000000000000002) {
                // Zoom in
                radius /= 2;
                pt = draw.mapped_point(x, y);
                redraw();
            }
        };

        function onidle() {
            if (draw.step()) {
                env.runOnNextIdle(onidle);
            } else {
                env.runOnNextFrame(onidle);
            }
        }
        env.runOnNextIdle(onidle);

        env.menu().addSubmenu("Reset").
            addLink("Low Precision", "#-0.5;0;2;300").
            addLink("Normal Precision", "#-0.5;0;2;1000").
            addLink("High Precision", "#-0.5;0;2;5000").
            addLink("Ultra High Precision", "#-0.5;0;2;30000");
    }

    init();
}
