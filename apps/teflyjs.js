// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

function teflyjs(env) {
    "use strict";

    function height(x, z) {
        return 1 + 0.5 * ((Math.sin(x) * Math.cos(x * 1.11)) +
            Math.sin(z * 0.8 + Math.sin(x * 1.33)));
    }

    function compile_draw_fun(dir, w, h) {
        var code = 'var x, y, z, a, s1=Math.sin(cry), c1=Math.cos(cry), ' +
                's2=Math.sin(crx), c2=Math.cos(crx);',
            m = 'a=c1*x-s1*z;z=c1*z+s1*x;x=a;a=c2*y-s2*z;z=c2*z+s2*y;' +
                'if(z>0.2){y=a;x*=1/z;y*=1/z;x=x*' + h + '+' + (w / 2) +
                ';y=h/2-y*' + h + ';',
            size = 1;
        function rect(x, z) {
            var v1 = height((x + z) * 0.3, (z - x) * 0.3) * 80,
                v2 = height((x - z) * 0.4, (z + x) * 0.4) * 100;
            code += 'view.beginPath();';
            code += "view.fillStyle = 'rgb(" +
                Math.floor(v1) + "," +
                Math.floor(200 - (v1 + v2) / 2) + "," +
                Math.floor(v2) + ")';";
            function pt(dx, dz) {
                code += 'x=' + (x + dx * (size / 2)) + '-cx;';
                code += 'y=' + 2 * height(x + dx * size / 2, z + dz * size / 2) + '-cy;';
                code += 'z=' + (z + dz * (size / 2)) + '-cz;';
            }
            pt(-1, -1);
            code += m + 'view.moveTo(x,y);';
            pt(1, -1);
            code += m + 'view.lineTo(x,y);';
            pt(1, 1);
            code += m + 'view.lineTo(x,y);';
            pt(-1, 1);
            code += m + 'view.lineTo(x,y);view.fill();}}}}';
        }
        function xz(signx, signz) {
            var x, z;
            for (x = -10; x < 10.1; x += size) {
                for (z = -10; z < 10.1; z += size) {
                    rect(x * signx, z * signz);
                }
            }
        }
        function zx(signx, signz) {
            var x, z;
            for (z = -10; z < 10.1; z += size) {
                for (x = -10; x < 10.1; x += size) {
                    rect(x * signx, z * signz);
                }
            }
        }
        if (dir === 0) { zx(-1, -1); }
        if (dir === 1) { xz(-1, -1); }
        if (dir === 2) { xz(-1, 1); }
        if (dir === 3) { zx(-1, 1); }
        if (dir === 4) { zx(1, 1); }
        if (dir === 5) { xz(1, 1); }
        if (dir === 6) { xz(1, -1); }
        if (dir === 7) { zx(1, -1); }
        return eval('(function(view,cx,cy,cz,cry,crx){' + code + '})');
    }

    function init() {
        var t = 0,
            view,
            draw_funcs = [],
            w = 400,
            h = 300;
        try {
            view = env.canvas().getContext('2d');
        } catch (err) {
            throw "Your web browser does not support " +
                "the <canvas> element!";
        }
        function onresize() {
            draw_funcs = [];
            w = view.canvas.width;
            h = view.canvas.height;
            if (h > 300) {
                w = Math.round(300 * w / h);
                h = 300;
                view.canvas.width = w;
                view.canvas.height = h;
            }
            view.fillStyle = '#ccc';
            view.fillRect(0, 0, w, h);
        }
        onresize();
        env.runOnCanvasResize(onresize);
        function onframe() {
            env.runOnNextFrame(onframe);
            var camrx = 7 * env.mouse().getX() / w,
                camry = -env.mouse().getY() / (h * 2),
                f;
            f = Math.floor(camrx / (Math.PI / 4));
            while (f < 0) { f += 8; }
            while (f > 7) { f -= 8; }
            if (!draw_funcs[f]) {
                draw_funcs[f] = compile_draw_fun(f, w, h);
            }
            view.fillStyle = '#ccc';
            view.fillRect(0, 0, w, h);
            draw_funcs[f](
                view,
                Math.cos(t * 0.244) * 5,
                Math.sin(t) + 5.5,
                Math.sin(t * 0.2431) * 5,
                camrx,
                camry
            );
        }
        env.runOnNextFrame(onframe);
        setInterval(function () {
            t += 0.01;
        }, 10);
    }

    init();
}
