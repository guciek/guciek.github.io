// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

function jsspect(env) {
    "use strict";

    var onSampleData,
        newSampleReceiver,
        getWindowFunc;

    function fftModulus(datar) {
        var n = datar.length, datai = [], i,
            multr, multi, group, step, pr, pi, fr, fi;
        (function () {
            var swap = 0, bit, tmp;
            for (i = 0; i < n; i += 1) {
                if (swap > i) {
                    tmp = datar[swap];
                    datar[swap] = datar[i];
                    datar[i] = tmp;
                }
                bit = n >> 1;
                while (swap & bit) {
                    swap &= ~bit;
                    bit >>= 1;
                }
                swap |= bit;
            }
        }());
        for (i = 0; i < n; i += 1) {
            datai.push(0);
        }
        for (step = 1; step < n; step *= 2) {
            multr = Math.cos(-Math.PI / step) - 1;
            multi = Math.sin(-Math.PI / step);
            fr = 1;
            fi = 0;
            for (group = 0; group < step; group += 1) {
                for (i = group; i < n; i += (step * 2)) {
                    pr = fr * datar[i + step] - fi * datai[i + step];
                    pi = fr * datai[i + step] + fi * datar[i + step];
                    datar[i + step] = datar[i] - pr;
                    datai[i + step] = datai[i] - pi;
                    datar[i] += pr;
                    datai[i] += pi;
                }
                pr = fr * multr - fi * multi;
                pi = fr * multi + fi * multr;
                fr += pr;
                fi += pi;
            }
        }
        for (i = 0; i < n; i += 1) {
            datar[i] = datar[i] * datar[i] + datai[i] * datai[i];
        }
        return datar;
    }

    newSampleReceiver = (function () {
        var receivers = [],
            sampleRate = 8000;
        onSampleData = function (data, rate) {
            var i,
                arr = [];
            if ((!data) || (data.length < 2)) {
                return;
            }
            if (rate && (Number(rate) > 1000)) {
                sampleRate = Number(rate);
            }
            for (i = 0; i < data.length; i += 1) {
                arr.push(data[i]);
            }
            for (i = 0; i < receivers.length; i += 1) {
                (receivers[i])(arr);
            }
        };
        return function () {
            var newsamples = [], registered = false, ok = true;
            return {
                getSamples: function (n) {
                    if (!registered) {
                        registered = true;
                        receivers.push(function (data) {
                            if (!ok) { return; }
                            newsamples = newsamples.concat(data);
                            if (newsamples.length > sampleRate * 3) {
                                newsamples = [];
                                ok = false;
                            }
                        });
                    }
                    var ret = null;
                    if (n) {
                        if (newsamples.length < n) { return ret; }
                        ret = newsamples.slice(0, n);
                        newsamples = newsamples.slice(n);
                    } else {
                        ret = newsamples;
                        newsamples = [];
                    }
                    return ret;
                },
                sampleRate : function () {
                    return sampleRate;
                }
            };
        };
    }());

    function volumeGraph(samplerec) {
        var w = 100, h = 100, lastx = -1;
        function map_val(v) {
            v = Math.floor(((Math.log(v + 0.00001) / 11.513) + 1) * h);
            if (v < 0) { v = 0; }
            if (v > h) { v = h; }
            return v;
        }
        function drawbar(c) {
            var v, m, i, a,
                step = samplerec.sampleRate() / 200,
                s = samplerec.getSamples(step);
            if (s === null) {
                return false;
            }
            v = 0;
            m = 0;
            for (i = 0; i < s.length; i += 1) {
                a = Math.abs(s[i]);
                v += a;
                if (a > m) { m = a; }
            }
            v = map_val(v / s.length);
            m = map_val(m);
            lastx += 1;
            if (lastx >= w) { lastx = 0; }
            c.fillStyle = "rgb(255,255,255)";
            c.fillRect((lastx + 3) % w, 0, 1, h);
            c.fillStyle = "rgb(0,0,0)";
            c.fillRect(lastx, h - v, 1, v);
            c.fillStyle = "rgb(255,128,128)";
            c.fillRect(lastx, h - m, 1, m - v);
            s = samplerec.getSamples(step);
            return true;
        }
        return {
            step: drawbar,
            setsize: function (width, height) {
                w = width;
                h = height;
                lastx = -1;
            }
        };
    }

    getWindowFunc = (function () {
        var cache = [];
        return function (size) {
            var k, a = [];
            if (cache[size]) { return cache[size]; }
            for (k = 0; k < size; k += 1) {
                a[k] = 0.54 - 0.46 * Math.cos(2 * Math.PI * k / size);
            }
            cache[size] = a;
            return a;
        };
    }());

    function freqAnalysis(samples, rate) {
        var fftLen = 512,
            cache = {},
            log2 = Math.log(2);
        function fftArray(scale) {
            var i,
                j,
                pos,
                v,
                window = getWindowFunc(fftLen),
                scaleWinLength = scale > 1 ? scale * 3 + 2 : 1,
                scaleWin = getWindowFunc(scaleWinLength),
                scaleWinSum = 0,
                buf = [];
            if (cache[scale]) {
                return cache[scale];
            }
            if (samples.length < fftLen * scale + scaleWinLength) {
                return undefined;
            }
            if (scale > 1) {
                for (j = 0; j < scaleWinLength; j += 1) {
                    scaleWinSum += scaleWin[j];
                }
            }
            for (i = 0; i < fftLen; i += 1) {
                pos = samples.length - (fftLen - i) * scale;
                if (scale > 1) {
                    v = 0;
                    for (j = 0; j < scaleWinLength; j += 1) {
                        v += samples[pos - j] * scaleWin[j];
                    }
                    v /= scaleWinSum;
                } else {
                    v = samples[pos];
                }
                buf.push(window[i] * v);
            }
            cache[scale] = fftModulus(buf);
            return cache[scale];
        }
        function fftValue(scale, pos) {
            if (pos < 0.02) { return 0; }
            if (pos > 0.4) { return 0; }
            var d = fftArray(scale), integer;
            if (!d) { return 0; }
            pos *= d.length;
            integer = Math.floor(pos);
            pos -= integer;
            return d[integer] * (1 - pos) + d[integer + 1] * pos;
        }
        return {
            getFreq: function (freq) {
                var scale = 1, part;
                freq /= rate;
                while ((freq < 0.2) && (fftLen * scale < rate / 3)) {
                    scale *= 2;
                    freq *= 2;
                }
                if ((scale > 1) && (freq >= 0.2) && (freq < 0.4)) {
                    part = Math.log(freq / 0.2) / log2;
                    return fftValue(scale, freq) *
                            Math.cos(part * Math.PI * 0.5)
                        + fftValue(scale / 2, freq / 2) *
                            Math.sin(part * Math.PI * 0.5);
                }
                return fftValue(scale, freq);
            }
        };
    }

    function freqReceiver(samplerec, timestep) {
        var unprocessed_time = 0,
            analysis,
            samples = [],
            blackframes = 0;
        return {
            getFreq: function (a) {
                if (!analysis) {
                    return 0;
                }
                return analysis.getFreq(a);
            },
            nextStep: function () {
                if (blackframes > 0) {
                    blackframes -= 1;
                }
                var p, s, r = samplerec.sampleRate();
                if (unprocessed_time < timestep) {
                    s = samplerec.getSamples();
                    if (s.length > r) {
                        blackframes = 10;
                    }
                    unprocessed_time += s.length / r;
                    samples = samples.concat(s);
                }
                if (unprocessed_time < timestep) {
                    return false;
                }
                unprocessed_time -= timestep;
                if (samples.length > r * 3) {
                    samples = samples.slice(samples.length - r * 2);
                }
                p = Math.round(samples.length - unprocessed_time * r);
                if ((blackframes > 0) || (p < 260)) {
                    analysis = undefined;
                    return true;
                }
                analysis = freqAnalysis(
                    samples.slice(0, p),
                    r
                );
                return true;
            }
        };
    }

    function color(v) {
        v *= 7;
        var p = Math.floor(v);
        function palette(d) {
            if (d <= 0) { return { r: 0.0, g: 0.0, b: 0.0 }; }
            if (d <= 1) { return { r: 0.1, g: 0.1, b: 0.1 }; }
            if (d <= 2) { return { r: 0.0, g: 0.3, b: 0.3 }; }
            if (d <= 3) { return { r: 0.0, g: 0.0, b: 0.5 }; }
            if (d <= 4) { return { r: 0.0, g: 0.5, b: 0.2 }; }
            if (d <= 5) { return { r: 0.5, g: 0.6, b: 0.0 }; }
            if (d <= 6) { return { r: 0.8, g: 0.8, b: 0.0 }; }
            return { r: 1.0, g: 0.0, b: 0.0 };
        }
        function val256(f) {
            if (f <= 0) { return 0; }
            if (f >= 0.999) { return 255; }
            return Math.floor(f * 256);
        }
        function interpolate(a, b, t) {
            return {
                r: val256(a.r + t * (b.r - a.r)),
                g: val256(a.g + t * (b.g - a.g)),
                b: val256(a.b + t * (b.b - a.b))
            };
        }
        return interpolate(palette(p), palette(p + 1), v - p);
    }

    function spectGraph(samplerec) {
        var freqrec = freqReceiver(samplerec, 0.01),
            w = 100,
            h = 100,
            viewleft = 4.1,
            viewsize = 3.86,
            updated = false,
            maxval = 0,
            step;
        function y_to_freq(y) {
            return Math.exp(viewleft + viewsize * (1 - y / (h - 1)));
        }
        function freq_to_y(freq) {
            return (1 - ((Math.log(freq) - viewleft) / viewsize)) * (h - 1);
        }
        function getval(freq) {
            var v = freqrec.getFreq(freq);
            if (v > maxval) { maxval = v; }
            if (maxval > 0) { v /= maxval; }
            v = (Math.log(v + 0.0001) + 9.21034) / 9.21044;
            return v;
        }
        function drawkeys(c, left, wid) {
            var y, i, s,
                kf = [261.626, 277.183, 293.665, 311.127, 329.628, 349.228,
                    369.994, 391.995, 415.305, 440.000, 466.164, 493.883];
            function keyy(k) {
                var mult = 1;
                while (k < 0) { k += 12; mult *= 0.5; }
                while (k >= 12) { k -= 12; mult *= 2.0; }
                return freq_to_y(kf[k] * mult);
            }
            s = (keyy(1) - keyy(0)) * 0.6;
            for (i = -12 * 2; i < 12 * 3 + 5; i += 1) {
                y = keyy(i);
                if ((((i + 115) % 12) % 7) % 2 === 1) {
                    c.fillStyle = "rgb(0,0,0)";
                    c.fillRect(left, y - s / 2, wid * 0.75, s);
                } else {
                    c.fillStyle = "rgb(255,255,255)";
                    c.fillRect(left, y - s / 2,
                        wid * (((i + 120) % 12 === 0) ? 1 : 0.75), s);
                }
            }
        }
        step = (function () {
            var lastx = -1, vline;
            return function (c) {
                var y, freq, rgb;
                if (!updated) {
                    updated = true;
                    lastx = -1;
                    vline = c.getImageData(0, 0, 1, h);
                    c.fillStyle = "rgb(80,80,80)";
                    c.fillRect(w - 20, 0, 20, h);
                    drawkeys(c, w - 20, 20);
                }
                if (!freqrec.nextStep()) {
                    return false;
                }
                maxval *= 0.99;
                lastx += 1;
                if (lastx >= (w - 20)) { lastx = 0; }
                c.fillStyle = "rgb(255,255,255)";
                c.fillRect((lastx + 3) % (w - 20), 0, 1, h);
                for (y = 0; y < h; y += 1) {
                    freq = y_to_freq(y);
                    rgb = color(getval(freq));
                    vline.data[y * 4] = rgb.r;
                    vline.data[y * 4 + 1] = rgb.g;
                    vline.data[y * 4 + 2] = rgb.b;
                    vline.data[y * 4 + 3] = 255;
                }
                c.putImageData(vline, lastx, 0);
                return true;
            };
        }());
        return {
            step: step,
            setsize: function (width, height) {
                w = width;
                h = height;
                updated = false;
            }
        };
    }

    function ringGraph(samplerec) {
        var freqrec = freqReceiver(samplerec, 0.01),
            w = 100,
            h = 100,
            updated = false,
            maxval = 0,
            getval = (function () {
                var m = 0;
                return function (freq) {
                    var v = freqrec.getFreq(freq);
                    if (v > m) { m = v; }
                    if (m > 0) { v /= m; }
                    v = (Math.log(v + 0.0001) + 9.21034) / 9.21044;
                    return v;
                };
            }()),
            getvalangle = function (a) {
                function angle_to_freq(a) {
                    return Math.exp(a * 0.34657359 / Math.PI) * 261.626;
                }
                var p = a / (2 * Math.PI), f = angle_to_freq(a), v;
                v = getval(f) + getval(f * 2) + getval(f * 0.5) +
                    p * getval(f * 0.25) + (1 - p) * getval(f * 4);
                if (v > maxval) { maxval = v; }
                if (maxval > 0) { v /= maxval; }
                return v;
            },
            step = (function () {
                var cx, cy, dx, dy, dw, dh, loopa = [], loopx = [], loopy = [];
                return function (c) {
                    var i, rgb;
                    if (!updated) {
                        updated = true;
                        c.fillStyle = "rgb(0,0,0)";
                        c.fillRect(0, 0, w, h);
                        cx = Math.floor(w / 2);
                        cy = Math.floor(h / 2);
                        i = 0.02;
                        dx = -Math.round(i * cx);
                        dy = -Math.round(i * cy);
                        dw = w - 2 * dx;
                        dh = h - 2 * dy;
                        for (i = 0; i < 80; i += 1) {
                            loopa[i] = Math.PI * i / 40;
                            loopx[i] = Math.floor(cx + 24 * Math.sin(loopa[i]));
                            loopy[i] = Math.floor(cy - 26 * Math.cos(loopa[i]));
                        }
                    }
                    if (!freqrec.nextStep()) {
                        return false;
                    }
                    c.drawImage(c.canvas, dx, dy, dw, dh);
                    maxval *= 0.999;
                    for (i = 0; i < 80; i += 1) {
                        rgb = color(getvalangle(loopa[i]));
                        c.fillStyle = "rgb(" + rgb.r + "," +
                            rgb.g + "," + rgb.b + ")";
                        c.fillRect(loopx[i], loopy[i], 2, 2);
                    }
                    return true;
                };
            }());
        return {
            step: step,
            setsize: function (width, height) {
                w = width;
                h = height;
                updated = false;
            }
        };
    }

    function initDraw() {
        var view = env.canvas(),
            graph;
        try {
            view = view.getContext("2d");
        } catch (err) {
            throw "Your web browser does not support " +
                "the <canvas> element!";
        }
        function redraw() {
            var w = view.canvas.width,
                h = view.canvas.height;
            view.fillStyle = "rgb(192,192,192)";
            view.fillRect(0, 0, w, h);
            view.fillStyle = "rgb(255,255,255)";
            graph.setsize(w, h);
            graph.step(view);
        }
        function setmode() {
            var m = env.location().getHash();
            if (m === "volume") {
                graph = volumeGraph(newSampleReceiver());
            } else if (m === "ring") {
                graph = ringGraph(newSampleReceiver());
            } else {
                if (m !== "spectrum") {
                    env.location().setHash("spectrum");
                }
                graph = spectGraph(newSampleReceiver());
            }
            redraw();
        }
        function onidle() {
            if (graph.step(view)) {
                env.runOnNextIdle(onidle);
            } else {
                env.runOnNextFrame(onidle);
            }
        }
        env.runOnNextIdle(onidle);
        setmode();
        env.runOnCanvasResize(redraw);
        env.runOnLocationChange(setmode);
    }

    function genTestInput() {
        var t = 0, t2 = 0, m = 500, mdir = true;
        setInterval(function () {
            var i, data = [], d;
            for (i = 0; i < 400; i += 1) {
                t2 += 0.000025;
                t2 -= Math.floor(t2);
                d = Math.sin(t2 * 2 * Math.PI);
                d = d * d;
                d = 1 + d * d * 0.00015;
                if (mdir) {
                    m *= d;
                    if (m > 2500) { mdir = false; }
                } else {
                    m /= d;
                    if (m < 70) { mdir = true; }
                }
                t += m / 8000;
                t -= Math.floor(t);
                data.push(0.1 * Math.sin(t * 2 * Math.PI));
            }
            onSampleData(data, 8000);
        }, 50);
    }

    function initCapture(lms) {
        env.showMessage("Waiting for samples..." +
            " (warning: a bug in Chrome might prevent this from working, " +
            "try a recent version of Firefox)");
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        var context = new window.AudioContext(),
            proc = context.createScriptProcessor(2048, 1, 0);
        proc.onaudioprocess = env.eventHandler(function (ev) {
            var data = ev.inputBuffer.getChannelData(0);
            if (data.length >= 2) {
                env.showMessage();
                onSampleData(data, context.sampleRate);
            }
        });
        window.source = context.createMediaStreamSource(lms);
        window.source.connect(proc);
    }

    function requestCapture() {
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia;
        if (!navigator.getUserMedia) {
            throw "Required getUserMedia API is not supported in your browser.";
        }
        env.showMessage("Requesting audio capture...");
        navigator.getUserMedia(
            { audio: true },
            env.eventHandler(initCapture),
            env.eventHandler(function () {
                genTestInput();
                throw "Could not capture audio.";
            })
        );
    }

    env.menu().
        addLink("Spectrum", "#spectrum").
        addLink("Volume", "#volume").
        addLink("Note Ring", "#ring");

    initDraw();
    requestCapture();
}
