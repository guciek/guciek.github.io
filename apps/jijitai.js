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
                        bufob.bind_ab();
                        gl.vertexAttribPointer(attr, vsize, gl.FLOAT,
                                false, 0, 0);
                        attr_length = Math.floor(bufob.length() / vsize);
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
                }
            }
            addshader(gl.VERTEX_SHADER, vs);
            addshader(gl.FRAGMENT_SHADER, fs);
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                throw "Could not link the shader program!";
            }
            return {
                draw_triangles : function () {
                    if (attr_length < 1) {
                        throw "Buffer length unknown!";
                    }
                    activate();
                    gl.drawArrays(gl.TRIANGLES, 0, attr_length);
                },
                attribute_vec3: function (n) {
                    if (attributes[n]) {
                        return attributes[n];
                    }
                    activate();
                    attributes[n] = attribute_init_vec(n, 3);
                    return attributes[n];
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
            var buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
            return {
                length: function () {
                    return arr.length;
                },
                bind_ab: function () {
                    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
                }
            };
        }
        return {
            new_program: new_program,
            new_buffer_float32: new_buffer_float32,
            clear : function () {
                update_viewport();
                gl.clearColor(0, 0, 0, 1);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
        };
    }

    function view() {
        var w = webgl(env.canvas()),
            prog = w.new_program(
                "attribute vec3 v;" +
                    "uniform mat4 rot;" +
                    "uniform vec3 param;" +
                    "void main() {" +
                    "    vec4 p = rot * vec4(v, 1.0);" +
                    "    gl_Position = vec4(p.x * param.x, p.y, p.z, p.z);" +
                    "}",
                "void main() {" +
                    "    gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0);" +
                    "}"
            ),
            buf = (function () {
                var x,
                    z,
                    a = [];
                for (x = -5; x < 5; x += 1) {
                    for (z = -5; z < 5; z += 1) {
                        a.push(x);
                        a.push(0);
                        a.push(z);
                        a.push(x + 1);
                        a.push(0);
                        a.push(z);
                        a.push(x);
                        a.push(0);
                        a.push(z + 1);
                    }
                }
                return w.new_buffer_float32(a);
            }());
        prog.attribute_vec3("v").set_buffer(buf);
        return {
            redraw: function (cam) {
                w.clear();
                prog.uniform_mat4("rot").set_matrix(cam);
                prog.uniform_vec3("param").set_xyz(
                    env.canvas().height / env.canvas().width,
                    0,
                    0
                );
                prog.draw_triangles();
            },
            step: function () {
                return false;
            }
        };
    }

    function init() {
        var v = view(),
            drawn = false,
            mousex = -1,
            mousey = -1,
            cam_pos = matrix(4, 1),
            movement = matrix(4, 1),
            key_pressed = {};

        cam_pos.set_cell(1, 0, 1);

        function m_rotate(r, i) {
            var i1 = (i + 1) % 3, i2 = (i + 2) % 3;
            return identity(4).
                    set_cell(i1, i1, Math.cos(r)).
                    set_cell(i1, i2, Math.sin(r)).
                    set_cell(i2, i1, -Math.sin(r)).
                    set_cell(i2, i2, Math.cos(r));
        }

        function m_move_minus(v) {
            return identity(4).
                    set_cell(0, 3, -v.cell(0, 0)).
                    set_cell(1, 3, -v.cell(1, 0)).
                    set_cell(2, 3, -v.cell(2, 0));
        }

        function onframe() {
            var mx = env.mouse().getX(),
                my = env.mouse().getY();
            if ((mx < 0) && (my < 0)) {
                mx = Math.floor(env.canvas().width * 0.5);
                my = Math.floor(env.canvas().height * 0.5);
            }
            if ((mx !== mousex) || (my !== mousey)) {
                mousex = mx;
                mousey = my;
                drawn = false;
            }
            if (!drawn) {
                drawn = true;
                mx = 3 * (0.5 - (mousey / env.canvas().height));
                my = 11 * ((mousex / env.canvas().width) - 0.5);
                cam_pos = cam_pos.add(m_rotate(-my, 1).mult(m_rotate(mx, 0)).
                        mult(movement));
                movement = matrix(4, 1);
                v.redraw(m_rotate(-mx, 0).mult(m_rotate(my, 1)).
                        mult(m_move_minus(cam_pos)));
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
        setInterval(env.eventHandler(function () {
            var speed = 0.05;
            if (key_pressed[87]) {
                movement.set_cell(2, 0, movement.cell(2, 0) + speed);
                drawn = false;
            }
            if (key_pressed[83]) {
                movement.set_cell(2, 0, movement.cell(2, 0) - speed);
                drawn = false;
            }
            if (key_pressed[65]) {
                movement.set_cell(0, 0, movement.cell(0, 0) - speed);
                drawn = false;
            }
            if (key_pressed[68]) {
                movement.set_cell(0, 0, movement.cell(0, 0) + speed);
                drawn = false;
            }
        }), 30);

        env.menu().addSubmenu("Fractal").
            addLink("Mandelbulb", "#mandelbulb").
            addLink("Mandelbox", "#mandelbox");
    }

    init();
}
