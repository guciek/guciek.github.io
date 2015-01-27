
function jijitai_render() {
    "use strict";

    var intersection = false;

    function mandelbulb(x, y, z) {
        x *= 1.3;
        y *= 1.3;
        z *= 1.3;
        var i, r, phi, theta, sinth, cx = x, cy = y, cz = z;
        for (i = 0; i < 100; i += 1) {
            r = Math.sqrt(x * x + y * y + z * z);
            if (r > 1.3) { return false; }
            phi = 8 * Math.atan2(z, x);
            theta = 8 * Math.acos(y / r);
            sinth = Math.sin(theta);
            r = r * r;
            r = r * r;
            r = r * r;
            x = r * sinth * Math.cos(phi) + cx;
            y = r * Math.cos(theta) + cy;
            z = r * sinth * Math.sin(phi) + cz;
        }
        r = Math.sqrt(x * x + y * y + z * z);
        return r <= 1.3;
    }

    function shading(px, py, pz, dist) {
        var light = 0, fog = 1 + Math.log(dist) / 6;
        if (fog < 0) {
            fog = 0;
        }
        if (fog > 0.7) {
            fog = 0.7;
        }
        function add_light(scale, dx, dy, dz) {
            var i, a = 1;
            dx *= scale;
            dy *= scale;
            dz *= scale;
            for (i = 0; i < 5; i += 1) {
                if (mandelbulb(px + a * dx, py + a * dy, pz + a * dz)) {
                    break;
                }
                light += 1;
                a *= 1.5;
            }
        }

        add_light(0.001, -0.41, 1, -0.32);
        add_light(0.001, -0.32, 1, -0.21);

        add_light(0.0001, -0.13, 1, 0.34);
        add_light(0.0001, -0.12, 1, 0.28);

        add_light(0.00001, -0.45, 1, 0.11);
        add_light(0.00001, -0.36, 1, -0.37);

        light /= 40;

        return [
            fog * 0.4 + (1 - fog) * light * 0.4,
            fog * 0.5 + (1 - fog) * light,
            fog + (1 - fog) * light * 0.5
        ];
    }

    function render_ray(cx, cy, cz, sx, sy, sz, step, max) {
        var prev_i, i = 0.9, x, y, z, x1, y1, z1, d, prev_d;
        while (i < max) {
            prev_d = d;
            x = cx + i * sx;
            y = cy + i * sy;
            z = cz + i * sz;
            d = x * x + y * y + z * z;
            if ((d > 1) && prev_d && (d > prev_d)) {
                return false;
            }
            if ((d <= 1) && mandelbulb(x, y, z)) {
                if (i <= 1) {
                    intersection = true;
                }
                if (!prev_i) {
                    return true;
                }
                x1 = cx + prev_i * sx;
                y1 = cy + prev_i * sy;
                z1 = cz + prev_i * sz;
                while (true) {
                    sx = x1 - x;
                    sy = y1 - y;
                    sz = z1 - z;
                    if (Math.sqrt(sx * sx + sy * sy + sz * sz) < 0.000001) {
                        break;
                    }
                    if (mandelbulb(0.5 * (x1 + x), 0.5 * (y1 + y), 0.5 * (z1 + z))) {
                        x = 0.5 * (x1 + x);
                        y = 0.5 * (y1 + y);
                        z = 0.5 * (z1 + z);
                    } else {
                        x1 = 0.5 * (x1 + x);
                        y1 = 0.5 * (y1 + y);
                        z1 = 0.5 * (z1 + z);
                    }
                }
                sx = x1 - cx;
                sy = y1 - cy;
                sz = z1 - cz;
                return shading(x1, y1, z1,
                        Math.sqrt(sx * sx + sy * sy + sz * sz));
            }
            prev_i = i;
            i *= (1 + step);
        }
        return false;
    }

    function interpolate(a, b, p) {
        return [
            a[0] * (1 - p) + b[0] * p,
            a[1] * (1 - p) + b[1] * p,
            a[2] * (1 - p) + b[2] * p
        ];
    }

    return function (ev) {
        var tex_size = ev.data.tex_size,
            center = ev.data.center,
            distance_limit = ev.data.distance_limit,
            t_0_0 = ev.data.t_0_0,
            t_1_0 = ev.data.t_1_0,
            t_05_1 = ev.data.t_05_1,
            rgb = new Uint8Array(tex_size * tex_size * 3),
            x,
            y,
            tex_x,
            tex_y,
            r,
            direction,
            empty = true;
        intersection = false;
        for (y = 0; y < tex_size; y += 1) {
            for (x = 0; x < tex_size; x += 1) {
                if ((x > 0.5 * y - 1) && (x < tex_size - 0.5 * y + 1)) {
                    tex_x = (x + 0.5) / tex_size;
                    tex_y = (y + 0.5) / tex_size;
                    direction = interpolate(
                        interpolate(
                            t_0_0,
                            t_1_0,
                            (tex_x - tex_y * 0.5) / (1 - tex_y)
                        ),
                        t_05_1,
                        tex_y
                    );
                    r = render_ray(
                        center[0],
                        center[1],
                        center[2],
                        direction[0],
                        direction[1],
                        direction[2],
                        0.02,
                        distance_limit
                    );
                    if (r) {
                        if (typeof r === "object") {
                            if (r[0] < 0) { r[0] = 0; }
                            if (r[0] > 1) { r[0] = 1; }
                            if (r[1] < 0) { r[1] = 0; }
                            if (r[1] > 1) { r[1] = 1; }
                            if (r[2] < 0) { r[2] = 0; }
                            if (r[2] > 1) { r[2] = 1; }
                        } else {
                            r = [0.5, 0.5, 0.5];
                        }
                        empty = false;
                    } else {
                        r = [1.0, 0.0, 0.0];
                    }
                    rgb[(tex_size * y + x) * 3] = 255 * r[0];
                    rgb[(tex_size * y + x) * 3 + 1] = 255 * r[1];
                    rgb[(tex_size * y + x) * 3 + 2] = 255 * r[2];
                }
            }
        }
        self.postMessage({
            empty: empty,
            intersection: intersection,
            tex_rgb: rgb
        });
    };
}

self.addEventListener('message', jijitai_render(), false);
