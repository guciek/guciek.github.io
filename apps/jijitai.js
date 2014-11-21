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
            function uniform_init_vec3(n) {
                var attr = gl.getUniformLocation(prog, n);
                if (attr < 0) {
                    throw "Could not load uniform variable location!";
                }
                return {
                    set_xyz : function (x, y, z) {
                        gl.uniform3f(attr, x, y, z);
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
                uniform_vec3: function (n) {
                    if (uniforms[n]) {
                        return uniforms[n];
                    }
                    activate();
                    uniforms[n] = uniform_init_vec3(n);
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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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
            clear : function () {
                update_viewport();
                gl.clearColor(0, 0, 0, 1);
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

    function renderer() {
        var w = webgl(env.canvas()),
            prog = w.new_program(
                "precision mediump float;" +
                    "attribute vec3 xyz;" +
                    "attribute vec2 uv;" +
                    "uniform mat4 rot;" +
                    "uniform float ratio;" +
                    "varying vec2 st;" +
                    "void main() {" +
                    "    vec4 p = rot * vec4(xyz, 1.0);" +
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
                    a.push(mesh[i][0] * 3);
                    a.push(mesh[i][1] * 3);
                    a.push(mesh[i][2] * 3);
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
            spheres = [];

        function init_triangle(nr) {
            var c = document.createElement("canvas").getContext("2d"),
                t = w.new_texture(),
                updated = false,
                empty = true,
                steps = 0;
            c.canvas.width = 256;
            c.canvas.height = 256;
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
                step: function () {
                    if (steps >= 1000) { return false; }
                    var x, y, f, cw = c.canvas.width, ch = c.canvas.height;
                    x = Math.random() * cw;
                    y = Math.random() * ch;
                    f = (Math.sin(3 * y / ch) + 1) * 0.5;
                    c.fillStyle = "rgb(" +
                        Math.floor(Math.random() * 256 * f) + "," +
                        (nr * 10) + "," +
                        Math.floor(Math.random() * 256 * (1 - f)) + ")";
                    c.beginPath();
                    c.arc(x, y, 5, 0, 2 * Math.PI, false);
                    c.fill();
                    c.fillStyle = "rgba(255,255,255,0.5)";
                    c.textAlign = "center";
                    c.font = "bold 20px Sans-Serif";
                    c.fillText("f/" + nr, c.canvas.width/2, 0.4*c.canvas.height);
                    empty = false;
                    updated = true;
                    steps += 1;
                    return true;
                }
            };
        }

        function init_sphere() {
            var triangles = [],
                step_i = 0;
            (function () {
                var i;
                for (i = 0; i < 20; i += 1) {
                    triangles[i] = init_triangle(i);
                }
            }());
            return {
                draw: function () {
                    var i;
                    for (i = 0; i < 20; i += 1) {
                        triangles[i].draw();
                    }
                },
                step: function () {
                    if (triangles[step_i].step()) {
                        return true;
                    }
                    step_i = (step_i + 1) % 20;
                    return false;
                }
            };
        }

        spheres[0] = init_sphere();

        prog.attribute_vec3("xyz").set_buffer(buf_xyz);
        prog.attribute_vec2("uv").set_buffer(buf_uv);

        return {
            redraw: function (cam) {
                w.clear();
                prog.uniform_mat4("rot").set_matrix(cam);
                prog.uniform_float("ratio").set_value(
                    env.canvas().height / env.canvas().width
                );
                spheres[0].draw();
            },
            step: function () {
                return spheres[0].step();
            }
        };
    }

    function view() {
        var r = renderer(),
            cam_pos = matrix(4, 1),
            cam_rotm = identity(4),
            last_redraw = 0;

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
                if (!r.step()) { return false; }
                var t = new Date().getTime();
                if (t - last_redraw > 200) {
                    r.redraw(cam_rotm.mult(m_cam_pos()));
                    last_redraw = t;
                }
                return true;
            }
        };
    }

    function init() {
        var v = view(),
            prev_mousex = -1,
            prev_mousey = -1,
            movement = matrix(4, 1),
            key_pressed = {},
            drawn = false,
            last_time = new Date().getTime();

        function move(t) {
            var speed = 2;
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
            var mx = env.mouse().getX(),
                my = env.mouse().getY(),
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
        });

        env.menu().addSubmenu("Fractal").
            addLink("Mandelbulb", "#mandelbulb").
            addLink("Mandelbox", "#mandelbox");
    }

    init();
}
