// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

function jijitai(env) {
    "use strict";

    function matrix(h, w) {
        var m, v = [];

        (function () {
            var i;
            for (i = 0; i < w * h; i += 1) {
                v.push(0);
            }
        }());

        m = {
            cell: function (y, x) {
                return v[y * w + x];
            },
            set_cell: function (y, x, val) {
                val = Number(val);
                if (!val) { val = 0; }
                v[y * w + x] = val;
                return m;
            },
            add: function (m2) {
                if ((w !== m2.width()) || (h !== m2.height())) {
                    throw "Invalid matrix addition!";
                }
                var y, x, ret = matrix(h, w);
                for (y = 0; y < h; y += 1) {
                    for (x = 0; x < w; x += 1) {
                        ret.set_cell(y, x, v[y * w + x] + m2.cell(y, x));
                    }
                }
                return ret;
            },
            mult: function (m2) {
                if (w !== m2.height()) {
                    throw "Invalid matrix multiplication!";
                }
                var s, y, x, i, ret = matrix(h, m2.width());
                for (y = 0; y < h; y += 1) {
                    for (x = 0; x < m2.width(); x += 1) {
                        s = 0;
                        for (i = 0; i < w; i += 1) {
                            s += v[y * w + i] * m2.cell(i, x);
                        }
                        ret.set_cell(y, x, s);
                    }
                }
                return ret;
            },
            width: function () {
                return w;
            },
            height: function () {
                return h;
            }
        };
        return m;
    }

    function identity(s) {
        var i, m = matrix(s, s);
        for (i = 0; i < s; i += 1) {
            m.set_cell(i, i, 1);
        }
        return m;
    }

    function webgl(canvas) {
        var gl,
            cur_program,
            canvas_w = 0,
            canvas_h = 0;

        try {
            gl = canvas.getContext("webgl");
            if (!gl) { throw "x"; }
        } catch (err) {
            throw "Your web browser does not support WebGL!";
        }

        function update_viewport() {
            if ((canvas.width !== canvas_w) || (canvas.height !== canvas_h)) {
                canvas_w = canvas.width;
                canvas_h = canvas.height;
                gl.viewport(0, 0, canvas_w, canvas_h);
            }
        }

        function new_program(vs, fs) {
            var prog = gl.createProgram(),
                attributes = {},
                uniforms = {},
                attr_length = 0;
            function addshader(type, source) {
                var s = gl.createShader(type);
                gl.shaderSource(s, source);
                gl.compileShader(s);
                if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                    throw "Could not compile shader: " +
                            gl.getShaderInfoLog(s);
                }
                gl.attachShader(prog, s);
            }
            function attribute_init_vec(n, vsize) {
                var attr = gl.getAttribLocation(prog, n);
                if (attr < 0) {
                    throw "Could not load attribute location!";
                }
                gl.enableVertexAttribArray(attr);
                return {
                    set_buffer: function (bufob) {
                        bufob.webgl_bind();
                        gl.vertexAttribPointer(attr, vsize, gl.FLOAT,
                                false, 0, 0);
                        attr_length = Math.floor(bufob.length() / vsize);
                    }
                };
            }
            function uniform_init_float(n) {
                var attr = gl.getUniformLocation(prog, n);
                if (attr < 0) {
                    throw "Could not load uniform variable location!";
                }
                return {
                    set_value : function (val) {
                        gl.uniform1f(attr, val);
                    }
                };
            }
            function uniform_init_vec4(n) {
                var attr = gl.getUniformLocation(prog, n);
                if (attr < 0) {
                    throw "Could not load uniform variable location!";
                }
                return {
                    set_values : function (x, y, z, w) {
                        gl.uniform4f(attr, x, y, z, w);
                    }
                };
            }
            function uniform_init_mat(n) {
                var attr = gl.getUniformLocation(prog, n);
                if (attr < 0) {
                    throw "Could not load uniform variable location!";
                }
                return {
                    set_matrix : function (m) {
                        var x, y, values = [];
                        for (x = 0; x < m.width(); x += 1) {
                            for (y = 0; y < m.height(); y += 1) {
                                values.push(m.cell(y, x));
                            }
                        }
                        values = new Float32Array(values);
                        if ((m.width() === 4) && (m.height() === 4)) {
                            gl.uniformMatrix4fv(attr, gl.FALSE, values);
                        } else {
                            throw "Invalid matrix size!";
                        }
                    }
                };
            }
            function activate() {
                update_viewport();
                if (cur_program !== prog) {
                    cur_program = prog;
                    gl.useProgram(prog);
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                }
            }
            addshader(gl.VERTEX_SHADER, vs);
            addshader(gl.FRAGMENT_SHADER, fs);
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                throw "Could not link the shader program!";
            }
            return {
                draw_triangles : function (begin, end) {
                    if (attr_length < 1) {
                        throw "Buffer length unknown!";
                    }
                    activate();
                    var start = begin || 0;
                    gl.drawArrays(gl.TRIANGLES, start,
                            end || attr_length - start);
                },
                attribute_vec2: function (n) {
                    if (attributes[n]) {
                        return attributes[n];
                    }
                    activate();
                    attributes[n] = attribute_init_vec(n, 2);
                    return attributes[n];
                },
                attribute_vec3: function (n) {
                    if (attributes[n]) {
                        return attributes[n];
                    }
                    activate();
                    attributes[n] = attribute_init_vec(n, 3);
                    return attributes[n];
                },
                uniform_float: function (n) {
                    if (uniforms[n]) {
                        return uniforms[n];
                    }
                    activate();
                    uniforms[n] = uniform_init_float(n);
                    return uniforms[n];
                },
                uniform_vec4: function (n) {
                    if (uniforms[n]) {
                        return uniforms[n];
                    }
                    activate();
                    uniforms[n] = uniform_init_vec4(n);
                    return uniforms[n];
                },
                uniform_mat4: function (n) {
                    if (uniforms[n]) {
                        return uniforms[n];
                    }
                    activate();
                    uniforms[n] = uniform_init_mat(n);
                    return uniforms[n];
                }
            };
        }

        function new_buffer_float32(arr) {
            arr = new Float32Array(arr);
            if (arr.length < 1) { throw "Invalid buffer data!"; }
            var ret, buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
            ret = {
                length: function () {
                    return arr.length;
                },
                webgl_bind: function () {
                    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
                    return ret;
                }
            };
            return ret;
        }

        function new_texture() {
            var ret, t = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            ret = {
                set_image: function (i) {
                    gl.bindTexture(gl.TEXTURE_2D, t);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
                            gl.UNSIGNED_BYTE, i);
                    return ret;
                },
                webgl_bind: function () {
                    gl.bindTexture(gl.TEXTURE_2D, t);
                    return ret;
                }
            };
            return ret;
        }

        return {
            new_program: new_program,
            new_buffer_float32: new_buffer_float32,
            new_texture: new_texture,
            clear : function (r, g, b) {
                update_viewport();
                gl.clearColor(r || 0, g || 0, b || 0, 1);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
        };
    }

    function icosahedron() {
        var t = (1 + Math.sqrt(5)) / 2,
            v = [
                [-1, t, 0],
                [1, t, 0],
                [-1, -t, 0],
                [1, -t, 0],
                [0, -1, t],
                [0, 1, t],
                [0, -1, -t],
                [0, 1, -t],
                [t, 0, -1],
                [t, 0, 1],
                [-t, 0, -1],
                [-t, 0, 1]
            ];
        return [
            v[0], v[11], v[5],
            v[0], v[5], v[1],
            v[0], v[1], v[7],
            v[0], v[7], v[10],
            v[0], v[10], v[11],
            v[1], v[5], v[9],
            v[5], v[11], v[4],
            v[11], v[10], v[2],
            v[10], v[7], v[6],
            v[7], v[1], v[8],
            v[3], v[9], v[4],
            v[3], v[4], v[2],
            v[3], v[2], v[6],
            v[3], v[6], v[8],
            v[3], v[8], v[9],
            v[4], v[9], v[5],
            v[2], v[4], v[11],
            v[6], v[2], v[10],
            v[8], v[6], v[7],
            v[9], v[8], v[1]
        ];
    }

    function mandelbulb(x, y, z) {
        x *= 1.3;
        y *= 1.3;
        z *= 1.3;
        var i, r, phi, theta, sinth, cx = x, cy = y, cz = z;
        for (i = 0; i < 1000; i += 1) {
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
        return (r < 2);
    }

    function render_ray(cx, cy, cz, sx, sy, sz, max, oncollision) {
        var i = 1, f = 1.01, x, y, z, d, prev_d;
        if (mandelbulb(cx + sx, cy + sy, cz + sz)) {
            oncollision();
            return false;
        }
        i *= f;
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
                x -= cx;
                y -= cy;
                z -= cz;
                d = -Math.log(Math.sqrt(x * x + y * y + z * z)) * 3;
                return [0.5 + Math.sin(d) * 0.5, 0.5 + Math.cos(d) * 0.5, 1];
            }
            i *= f;
        }
        return false;
    }

    function renderer() {
        var w = webgl(env.canvas()),
            prog = w.new_program(
                "precision mediump float;" +
                    "attribute vec3 xyz;" +
                    "attribute vec2 uv;" +
                    "uniform mat4 rot;" +
                    "uniform vec4 sphere;" +
                    "uniform float ratio;" +
                    "varying vec2 st;" +
                    "void main() {" +
                    "    vec4 p = rot * vec4(xyz*sphere.w+sphere.xyz, 1.0);" +
                    "    st = uv;" +
                    "    gl_Position = vec4(p.x * ratio, p.y, p.z, p.z);" +
                    "}",
                "precision mediump float;" +
                    "varying vec2 st;" +
                    "uniform sampler2D sampl;" +
                    "void main() {" +
                    "    gl_FragColor = texture2D(sampl, vec2(st.s, st.t));" +
                    "}"
            ),
            mesh = icosahedron(),
            buf_xyz = (function () {
                var i, a = [];
                for (i = 0; i < mesh.length; i += 1) {
                    a.push(mesh[i][0]);
                    a.push(mesh[i][1]);
                    a.push(mesh[i][2]);
                }
                return w.new_buffer_float32(a);
            }()),
            buf_uv = (function () {
                var i, a = [];
                for (i = 0; i < mesh.length; i += 3) {
                    a.push(0.5);
                    a.push(0);
                    a.push(0);
                    a.push(1);
                    a.push(1);
                    a.push(1);
                }
                return w.new_buffer_float32(a);
            }()),
            spheres = [],
            active_spheres = 1,
            last_ratio = 1;

        function interpolate(p1, p2, part) {
            return [p1[0] * (1 - part) + p2[0] * part,
                    p1[1] * (1 - part) + p2[1] * part,
                    p1[2] * (1 - part) + p2[2] * part];
        }

        function dist(p1, p2) {
            var x = p1[0] - p2[0],
                y = p1[1] - p2[1],
                z = p1[2] - p2[2];
            return Math.sqrt(x * x + y * y + z * z);
        }

        function point_visible(x, y, z, cam) {
            var v = matrix(4, 1).
                set_cell(0, 0, x).
                set_cell(1, 0, y).
                set_cell(2, 0, z).
                set_cell(3, 0, 1);
            v = cam.mult(v);
            if (v.cell(2, 0) <= 0) { return false; }
            if (v.cell(0, 0) * last_ratio > v.cell(2, 0)) { return false; }
            if (v.cell(0, 0) * last_ratio < -v.cell(2, 0)) { return false; }
            if (v.cell(1, 0) > v.cell(2, 0)) { return false; }
            if (v.cell(1, 0) < -v.cell(2, 0)) { return false; }
            return true;
        }

        function init_triangle(nr, r1, r2, tex_size) {
            var c = document.createElement("canvas").getContext("2d"),
                t = w.new_texture(),
                updated = false,
                empty = true,
                intersection = false,
                next_y = tex_size,
                next_x = 0,
                center = [0, 0, 0];
            c.canvas.width = tex_size;
            c.canvas.height = tex_size;
            function step() {
                if (next_x < next_y * 0.5 - 1) {
                    return false;
                }
                if (next_x > tex_size - next_y * 0.5 + 1) {
                    return false;
                }
                var ray, ww = tex_size - next_y - 1;
                if (ww < 1) {
                    ww = 1;
                }
                ray = interpolate(
                    interpolate(
                        mesh[nr * 3 + 1],
                        mesh[nr * 3 + 2],
                        (next_x - next_y * 0.5) / ww
                    ),
                    mesh[nr * 3],
                    next_y / tex_size
                );
                ray = render_ray(
                    center[0],
                    center[1],
                    center[2],
                    ray[0] * r1,
                    ray[1] * r1,
                    ray[2] * r1,
                    r2 / r1,
                    function () { intersection = true; }
                );
                if (ray) {
                    if (ray[0] < 0) { ray[0] = 0; }
                    if (ray[0] > 1) { ray[0] = 1; }
                    if (ray[1] < 0) { ray[1] = 0; }
                    if (ray[1] > 1) { ray[1] = 1; }
                    if (ray[2] < 0) { ray[2] = 0; }
                    if (ray[2] > 1) { ray[2] = 1; }
                    c.fillStyle = "rgb(" + Math.floor(255 * ray[0]) + "," +
                            Math.floor(255 * ray[1]) + "," +
                            Math.floor(255 * ray[2]) + ")";
                    c.fillRect(next_x, next_y, 1, 1);
                    updated = true;
                    empty = false;
                }
                return true;
            }
            function steps() {
                var k = 0;
                while (k < 10) {
                    if (next_y >= tex_size) {
                        return;
                    }
                    if (step()) { k += 1; }
                    next_x += 1;
                    if (next_x >= tex_size) {
                        next_x = 0;
                        next_y += 1;
                    }
                }
            }
            function visible_vertices(cam) {
                var i, p, ret = 0;
                for (i = 0; i < 3; i += 1) {
                    p = mesh[nr * 3 + i];
                    if (point_visible(center[0] + p[0] * r1,
                            center[1] + p[1] * r1,
                            center[2] + p[2] * r1, cam)) {
                        ret += 1;
                    }
                }
                return ret;
            }
            return {
                draw: function () {
                    if (empty) {
                        return;
                    }
                    if (updated) {
                        t.set_image(c.canvas);
                    }
                    t.webgl_bind();
                    prog.draw_triangles(nr * 3, 3);
                },
                register_steps: function (register, cam) {
                    if (next_y < tex_size) {
                        register(visible_vertices(cam) * 1000, steps);
                    }
                },
                set_center: function (x, y, z) {
                    center = [x, y, z];
                    empty = true;
                    updated = true;
                    intersection = false;
                    next_x = 0;
                    next_y = 0;
                    c.clearRect(0, 0, tex_size, tex_size);
                },
                has_intersection: function () {
                    return intersection;
                }
            };
        }

        function init_sphere(n, r1, r2) {
            var triangles = [], cx = 1000, cy = 0, cz = 0;
            (function () {
                var i;
                for (i = 0; i < 20; i += 1) {
                    triangles[i] = init_triangle(i, r1, r2, 256);
                }
            }());
            return {
                draw: function () {
                    if (cx > 100) { return; }
                    prog.uniform_vec4("sphere").set_values(cx, cy, cz, r1);
                    var i;
                    for (i = 0; i < 20; i += 1) {
                        triangles[i].draw();
                    }
                },
                register_steps: function (register, cam) {
                    if (cx > 100) { return; }
                    var i;
                    function register_r(p, c) {
                        register(p + n, c);
                    }
                    for (i = 0; i < 20; i += 1) {
                        triangles[i].register_steps(register_r, cam);
                    }
                },
                set_center: function (x, y, z) {
                    var i;
                    cx = x;
                    cy = y;
                    cz = z;
                    for (i = 0; i < 20; i += 1) {
                        triangles[i].set_center(x, y, z);
                    }
                },
                radius: function () {
                    return r1;
                },
                center: function () {
                    return [cx, cy, cz];
                },
                reset: function () {
                    cx = 1000;
                },
                has_intersection: function () {
                    var i;
                    for (i = 0; i < 20; i += 1) {
                        if (triangles[i].has_intersection()) {
                            return true;
                        }
                    }
                    return false;
                }
            };
        }

        function activate_sphere(n) {
            var r;
            while ((n >= spheres.length) && (spheres.length < 20)) {
                r = spheres[spheres.length - 1].radius();
                spheres.push(init_sphere(
                    spheres.length,
                    r * 0.5,
                    r
                ));
            }
            if ((n >= active_spheres) && (active_spheres < spheres.length)) {
                spheres[active_spheres].reset();
                active_spheres += 1;
            }
        }

        spheres[0] = init_sphere(0, 0.5, 1);

        prog.attribute_vec3("xyz").set_buffer(buf_xyz);
        prog.attribute_vec2("uv").set_buffer(buf_uv);

        return {
            redraw: function (cam) {
                var i;
                w.clear(0.4, 0.5, 1.0);
                prog.uniform_mat4("rot").set_matrix(cam);
                last_ratio = env.canvas().height / env.canvas().width;
                prog.uniform_float("ratio").set_value(last_ratio);
                for (i = 0; i < active_spheres; i += 1) {
                    spheres[i].draw();
                }
            },
            step: function (pos, rot) {
                var d, i, highest = -1000, highest_compute;
                function register(priority, compute) {
                    if (priority > highest) {
                        highest = priority;
                        highest_compute = compute;
                    }
                }
                for (i = 0; i < active_spheres; i += 1) {
                    d = dist(pos, spheres[i].center());
                    if (d > spheres[i].radius() * 0.5) {
                        spheres[i].set_center(pos[0], pos[1], pos[2]);
                        active_spheres = i + 1;
                    }
                    spheres[i].register_steps(register, rot);
                }
                if (spheres[active_spheres - 1].has_intersection()) {
                    activate_sphere(active_spheres);
                }
                if (highest_compute) {
                    highest_compute();
                    return true;
                }
                return false;
            },
            scale: function () {
                return spheres[active_spheres - 1].radius();
            }
        };
    }

    function view() {
        var r = renderer(),
            cam_pos = matrix(4, 1),
            cam_rotm = identity(4),
            last_redraw = 0;

        cam_pos.set_cell(2, 0, -1);

        function m_rotate(r, i) {
            var i1 = (i + 1) % 3, i2 = (i + 2) % 3;
            return identity(4).
                    set_cell(i1, i1, Math.cos(r)).
                    set_cell(i1, i2, Math.sin(r)).
                    set_cell(i2, i1, -Math.sin(r)).
                    set_cell(i2, i2, Math.cos(r));
        }

        function m_cam_pos() {
            return identity(4).
                    set_cell(0, 3, -cam_pos.cell(0, 0)).
                    set_cell(1, 3, -cam_pos.cell(1, 0)).
                    set_cell(2, 3, -cam_pos.cell(2, 0));
        }

        return {
            onrotate: function (rx, ry, movement) {
                cam_rotm = m_rotate(-rx, 0).mult(m_rotate(ry, 1));
                var inv = m_rotate(-ry, 1).mult(m_rotate(rx, 0));
                cam_pos = cam_pos.add(inv.mult(movement));
                r.redraw(cam_rotm.mult(m_cam_pos()));
                last_redraw = new Date().getTime();
            },
            step: function () {
                if (!r.step([cam_pos.cell(0, 0), cam_pos.cell(1, 0),
                        cam_pos.cell(2, 0)], cam_rotm)) {
                    return false;
                }
                var t = new Date().getTime();
                if (t - last_redraw > 200) {
                    r.redraw(cam_rotm.mult(m_cam_pos()));
                    last_redraw = t;
                }
                return true;
            },
            scale: r.scale
        };
    }

    function init() {
        var v = view(),
            prev_mousex = -1,
            prev_mousey = -1,
            movement = matrix(4, 1),
            key_pressed = {},
            drawn = false,
            last_time = new Date().getTime(),
            lock_rotation = false;

        function move(t) {
            var speed = 0.6 * v.scale();
            if (key_pressed[87]) {
                movement.set_cell(2, 0, movement.cell(2, 0) + speed * t);
                drawn = false;
            }
            if (key_pressed[83]) {
                movement.set_cell(2, 0, movement.cell(2, 0) - speed * t);
                drawn = false;
            }
            if (key_pressed[65]) {
                movement.set_cell(0, 0, movement.cell(0, 0) - speed * t);
                drawn = false;
            }
            if (key_pressed[68]) {
                movement.set_cell(0, 0, movement.cell(0, 0) + speed * t);
                drawn = false;
            }
        }

        function onframe() {
            var mx = lock_rotation ? prev_mousex : env.mouse().getX(),
                my = lock_rotation ? prev_mousey : env.mouse().getY(),
                t = new Date().getTime();
            move((t - last_time) / 1000);
            last_time = t;
            if ((mx < 0) && (my < 0)) {
                mx = Math.floor(env.canvas().width * 0.5);
                my = Math.floor(env.canvas().height * 0.5);
            }
            if ((mx !== prev_mousex) || (my !== prev_mousey) || (!drawn)) {
                prev_mousex = mx;
                prev_mousey = my;
                drawn = true;
                v.onrotate(
                    3 * (0.5 - (my / env.canvas().height)),
                    11 * ((mx / env.canvas().width) - 0.5),
                    movement
                );
                movement = matrix(4, 1);
            }
            env.runOnNextFrame(onframe);
        }
        env.runOnNextFrame(onframe);

        function onidle() {
            if (v.step()) {
                env.runOnNextIdle(onidle);
            } else {
                env.runOnNextFrame(onidle);
            }
        }
        env.runOnNextIdle(onidle);

        env.runOnCanvasResize(function () {
            drawn = false;
            onframe();
        });

        document.body.onkeydown = env.eventHandler(function (ev) {
            if (ev.keyCode) {
                key_pressed[ev.keyCode] = true;
            }
        });

        document.body.onkeyup = env.eventHandler(function (ev) {
            if (ev.keyCode) {
                key_pressed[ev.keyCode] = undefined;
            }
            if (ev.keyCode === 32) {
                lock_rotation = !lock_rotation;
            }
        });

        env.menu().addSubmenu("Fractal").
            addLink("Mandelbulb", "#mandelbulb").
            addLink("Mandelbox", "#mandelbox");
    }

    init();
}
