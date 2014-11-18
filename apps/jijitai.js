// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

function jijitai(env) {
    "use strict";

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
                    throw "getAttribLocation(" + n + ") returned " + attr;
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
                    throw "getUniformLocation(" + n + ") returned " + attr;
                }
                return {
                    set_xyz : function (x, y, z) {
                        gl.uniform3f(attr, x, y, z);
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
                    "uniform vec3 pos;" +
                    "uniform vec3 rot;" +
                    "void main() {" +
                    "    mat3 rotm = mat3(" +
                    "        1.0, 0.0,         0.0," +
                    "        0.0, cos(rot.x),  sin(rot.x)," +
                    "        0.0, -sin(rot.x), cos(rot.x)" +
                    "    );" +
                    "    rotm = rotm * mat3(" +
                    "        cos(rot.y),  0.0, sin(rot.y)," +
                    "        0.0,         1.0, 0.0," +
                    "        -sin(rot.y), 0.0, cos(rot.y)" +
                    "    );" +
                    "    vec3 p = rotm * (v - pos);" +
                    "    gl_Position = vec4(p.x * rot.z, p.y, p.z, p.z);" +
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
                        a.push(x+1);
                        a.push(0);
                        a.push(z);
                        a.push(x);
                        a.push(0);
                        a.push(z+1);
                    }
                }
                return w.new_buffer_float32(a);
            })();
        prog.attribute_vec3("v").set_buffer(buf);
        return {
            redraw: function (cam) {
                w.clear();
                prog.uniform_vec3("pos").set_xyz(cam.x, cam.y, cam.z);
                prog.uniform_vec3("rot").set_xyz(cam.rx, cam.ry,
                        env.canvas().height / env.canvas().width);
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
            camx = 0,
            camy = 1,
            camz = 0,
            speedx = 0,
            speedz = 0;

        function onframe() {
            var mx = env.mouse().getX(),
                my = env.mouse().getY(),
                cam;
            if ((mx < 0) && (my < 0)) {
                mx = Math.floor(env.canvas().width * 0.5);
                my = Math.floor(env.canvas().height * 0.5);
            }
            if ((mx !== mousex) || (my !== mousey)) {
                mousex = mx;
                mousey = my;
                drawn = false;
            }
            if ((speedx !== 0) || (speedz !== 0)) {
                drawn = false;
            }
            if (!drawn) {
                drawn = true;
                cam = {
                    x: camx,
                    y: camy,
                    z: camz,
                    rx: 3 * (0.5 - (mousey / env.canvas().height)),
                    ry: 9 * ((mousex / env.canvas().width) - 0.5)
                };
                camx += speedz * Math.sin(cam.ry) * 0.03;
                camz += speedz * Math.cos(cam.ry) * 0.03;
                camx += speedx * Math.cos(cam.ry) * 0.03;
                camz -= speedx * Math.sin(cam.ry) * 0.03;
                v.redraw(cam);
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
            speedx = 0;
            speedz = 0;
            if (ev.keyCode === 87) { speedz = 1; }
            if (ev.keyCode === 83) { speedz = -1; }
            if (ev.keyCode === 65) { speedx = -1; }
            if (ev.keyCode === 68) { speedx = 1; }
        });
        document.body.onkeyup = env.eventHandler(function (ev) {
            speedx = 0;
            speedz = 0;
        });

        env.menu().addSubmenu("Fractal").
            addLink("Mandelbulb", "#mandelbulb").
            addLink("Mandelbox", "#mandelbox");
    }

    init();
}
