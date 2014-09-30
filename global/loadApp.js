// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

(function () {
    "use strict";

    Array.prototype.forEach = function (f) {
        var i, len = this.length;
        if (typeof f !== "function") {
            throw new TypeError();
        }
        for (i = 0; i < len; i += 1) {
            if (this.hasOwnProperty(i)) { f(this[i], i); }
        }
    };

    function makeSet() {
        var es = [];
        return {
            add: function (e) {
                var i;
                for (i = 0; i < es.length; i += 1) {
                    if (es[i] === e) { return false; }
                }
                es.push(e);
                return true;
            },
            remove: function (e) {
                var i;
                for (i = 0; i < es.length; i += 1) {
                    if (es[i] === e) {
                        es.splice(i, 1);
                        return true;
                    }
                }
                return false;
            },
            removeAll: function () {
                es = [];
            },
            contains: function (e) {
                var i;
                for (i = 0; i < es.length; i += 1) {
                    if (es[i] === e) {
                        return true;
                    }
                }
                return false;
            },
            forEach: function (f) {
                var i, copy = [];
                for (i = 0; i < es.length; i += 1) {
                    copy.push(es[i]);
                }
                for (i = 0; i < copy.length; i += 1) {
                    f(copy[i]);
                }
            }
        };
    }

    function $(id) {
        var e = document.getElementById(id);
        if (!e) {
            throw "Could not find element '" + id + "'!";
        }
        return e;
    }

    function element(tag, content) {
        var e = document.createElement(String(tag));
        if (content) {
            if (typeof content === "object") {
                e.appendChild(content);
            } else {
                e.textContent = String(content);
            }
        }
        return e;
    }

    function showError(msg) {
        msg = "Error: " + msg;
        try {
            if ($("error").style.display !== "block") {
                $("error").style.display = "block";
                $("error").textContent = msg;
            }
            console.debug(msg);
        } catch (err) {
            alert(msg);
        }
    }

    function eventHandler(action) {
        return function (p1, p2, p3) {
            try {
                action(p1, p2, p3);
            } catch (err) {
                showError(err);
            }
        };
    }

    function makeEvent() {
        var callbacks = makeSet();
        return {
            add: callbacks.add,
            remove: callbacks.remove,
            removeAll: callbacks.removeAll,
            fire: function () {
                callbacks.forEach(function (callback) {
                    try {
                        callback();
                    } catch (err) {
                        showError(err);
                    }
                });
            }
        };
    }

    function initMouseTracker() {
        var x = -1,
            y = -1,
            onmove = eventHandler(function (e) {
                if (e.pageX && e.pageY && (e.pageY >= 25)) {
                    x = Number(e.pageX);
                    y = Number(e.pageY) - 25;
                }
            });
        window.addEventListener("mousemove", onmove, false);
        return {
            getX: function () { return x; },
            getY: function () { return y; }
        };
    }

    function initLocationManager() {
        function readHash() {
            if (window.location.hash) {
                return String(window.location.hash).substring(1);
            }
            return "";
        }
        var currentHash = readHash(),
            ret = {
                onchange: makeEvent(),
                setHash: function (h) {
                    h = String(h);
                    if (readHash() !== h) {
                        window.location = '#' + h;
                    }
                },
                getHash: function () {
                    return currentHash;
                },
                getPath: function () {
                    if (window.location.pathname) {
                        return String(window.location.pathname).substring(1);
                    }
                    return "";
                }
            },
            checkhash = eventHandler(function () {
                var newHash = readHash();
                if (newHash === currentHash) { return; }
                currentHash = newHash;
                ret.onchange.fire();
            });
        setInterval(checkhash, 250);
        window.addEventListener("hashchange", checkhash, false);
        return ret;
    }

    function initMenuManager(location) {
        var parent = element("div"),
            ret;
        function newLink(title, link) {
            var a = element("a", String(title)),
                path = location.getPath();
            function updFocus() {
                a.className = ("#" + location.getHash() === link) ?
                        "selected" : "";
            }
            if (typeof link === "string") {
                a.href = link;
                if (link.charAt(0) === "#") {
                    location.onchange.add(updFocus);
                    updFocus();
                } else if (path.substring(path.length - link.length) === link) {
                    a.className = "selected";
                }
            } else if (typeof link === "function") {
                a.href = "#";
                a.onclick = function (ev) {
                    eventHandler(link)();
                    ev.preventDefault();
                    return false;
                };
            } else if ((typeof link === "object") && (link.nodeType === 1)) {
                a.style.position = "relative";
                link.style.position = "absolute";
                link.style.left = "0px";
                link.style.top = "0px";
                link.style.width = "100%";
                link.style.height = "100%";
                link.style.cursor = "pointer";
                link.style.opacity = "0";
                a.appendChild(link);
            } else {
                throw "Invalid link";
            }
            return a;
        }
        parent.id = "menubar";
        document.body.appendChild(parent);
        ret = {
            addLink: function (title, link) {
                var a = newLink(title, link);
                a = element("div", a);
                a.className = "menu";
                parent.appendChild(a);
                return ret;
            },
            addSubmenu: function (submenu, rightside) {
                var menu = element("div", element("p", submenu)),
                    links = element("div"),
                    subret;
                menu.className = "menu";
                menu.appendChild(links);
                if (rightside) {
                    menu.style.marginLeft = "20px";
                    menu.style.marginRight = "20px";
                    menu.style.float = "right";
                    links.style.left = "auto";
                    links.style.right = "0px";
                    $("description").appendChild(menu);
                } else {
                    parent.appendChild(menu);
                }
                subret = {
                    addLink: function (title, link) {
                        links.appendChild(newLink(title, link));
                        return subret;
                    },
                    addLine: function () {
                        links.appendChild(element("hr"));
                        return subret;
                    }
                };
                return subret;
            }
        };
        return ret;
    }

    function addCanvas(resizeEvent) {
        var canvas = element("canvas"),
            onResize = eventHandler(function () {
                var w = window.innerWidth,
                    h = window.innerHeight - 25;
                if ((w >= 50) && (h >= 50) &&
                        ((canvas.width !== w) || (canvas.height !== h))) {
                    canvas.width = w;
                    canvas.height = h;
                    canvas.style.width = w + "px";
                    canvas.style.height = h + "px";
                    resizeEvent.fire();
                }
            });
        canvas.style.left = "0px";
        canvas.style.top = "25px";
        canvas.style.position = "fixed";
        canvas.id = "canvas";
        document.body.insertBefore(canvas, document.body.childNodes[0]);
        window.onresize = onResize;
        setInterval(onResize, 1000);
        onResize();
        return canvas;
    }

    function showMessage(msg) {
        var message, error;
        try {
            message = $("message");
        } catch (err) {
            error = $("error");
            message = element("div");
            message.id = "message";
            error.parentNode.insertBefore(message, error);
        }
        if (msg) {
            message.style.display = "block";
            message.innerHTML = String(msg);
        } else {
            message.style.display = "none";
        }
    }

    function runOnAnimationFrame(f) {
        f = eventHandler(f);
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(f);
            return;
        }
        if (window.mozRequestAnimationFrame) {
            window.mozRequestAnimationFrame(f);
            return;
        }
        if (window.webkitRequestAnimationFrame) {
            window.webkitRequestAnimationFrame(f);
            return;
        }
        if (window.oRequestAnimationFrame) {
            window.oRequestAnimationFrame(f);
            return;
        }
        setTimeout(f, 50);
    }

    function initRunOnIdle() {
        var todo;

        function run(fn) {
            var done = false,
                process = eventHandler(function () {
                    if (!done) {
                        done = true;
                        fn();
                    }
                });
            todo = process;
            setTimeout(process, 50);
            window.postMessage("todo_idle", "*");
        }

        window.addEventListener(
            "message",
            function handleMessage(ev) {
                try {
                    if (ev.data === "todo_idle") {
                        if (todo) { todo(); }
                        ev.stopPropagation();
                        return false;
                    }
                } catch (ignore) {}
            },
            true
        );

        return run;
    }

    function addRightMenu(manager) {
        var menu = manager.addSubmenu("More Apps", true);
        menu.addLink("Canvas Magic Eye",    "canvasmeye.html");
        menu.addLink("JSSpect",             "jsspect.html");
        menu.addLink("Web Mandelbrot",      "web_mandelbrot.html");
        menu.addLine();
        menu.addLink("3D Terrain Demo",     "teflyjs.html");
        menu.addLink("Burn Canvas Demo",    "burn_canvas.html");
        menu.addLink("Physics Demo",        "js2dsim.html");
    }

    function loadApp(appid) {
        var s = element("script");
        s.src = "apps/" + appid + ".js";
        document.body.appendChild(s);
        document.body.onload = eventHandler(function () {
            var location = initLocationManager(),
                menu = initMenuManager(location),
                mouse = initMouseTracker(),
                runOnIdle = initRunOnIdle(),
                resizeEvent = makeEvent();
            addRightMenu(menu);
            addCanvas(resizeEvent);
            window[appid]({
                canvas: function () { return $("canvas"); },
                eventHandler: eventHandler,
                location: function () { return location; },
                menu: function () { return menu; },
                mouse: function () { return mouse; },
                runOnNextFrame: runOnAnimationFrame,
                runOnNextIdle: runOnIdle,
                runOnCanvasResize: resizeEvent.add,
                runOnLocationChange: location.onchange.add,
                showMessage: showMessage
            });
        });
    }

    eventHandler(function () {
        $("error").style.display = "none";
        var path = String(window.location).split("/");
        path = path[path.length - 1].split(".")[0];
        loadApp(path || "index");
    })();
}());
