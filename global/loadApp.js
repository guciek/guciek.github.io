// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

function loadApp(appid) {
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
        window.addEventListener("mousedown", onmove, false);
        window.addEventListener("mouseup", onmove, false);
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
                        var p = String(window.location.pathname);
                        if (p.charAt(p.length - 1) === "/") {
                            p += "index.html";
                        }
                        return p;
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

    function menuManager(location) {
        var parent,
            ret,
            prev_right;
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
                } else if (link.substring(0, 4) === "http") {
                    a.target = "_blank";
                } else {
                    if (link.charAt(0) !== "/") {
                        link = "/" + link;
                    }
                    if (link === "/") {
                        link += "index.html";
                    }
                    if (path.substring(path.length - link.length) === link) {
                        a.className = "selected";
                    }
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
        try {
            parent = $("menubar");
        } catch (err) {
            parent = element("div");
            parent.id = "menubar";
            document.body.appendChild(parent);
        }
        (function () {
            var i, a = parent.getElementsByTagName("a");
            for (i = 0; i < a.length; i += 1) {
                if (a[i].href.substring(0, 4) === "http") {
                    a[i].target = "_blank";
                }
            }
        }());
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
                    if (prev_right) {
                        prev_right.style.marginLeft = "0px";
                    } else {
                        menu.style.marginRight = "20px";
                    }
                    prev_right = menu;
                    menu.style.marginLeft = "20px";
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
                    },
                    addText: function (str) {
                        links.appendChild(element("p", String(str)));
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
        canvas.id = "canvas";
        $("content").appendChild(canvas);
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
        var todo,
            last_clear_queue = new Date().getTime();

        function run(fn) {
            var done = false;
            todo = eventHandler(function (clear) {
                if (!done) {
                    done = true;
                    fn();
                }
            });
            setTimeout(eventHandler(function () {
                if (!done) {
                    done = true;
                    last_clear_queue = new Date().getTime();
                    fn();
                }
            }), 1);
            if (new Date().getTime() - last_clear_queue < 100) {
                window.postMessage("todo_idle", "*");
            }
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
        manager.addSubmenu("More Apps", true).
            addText("Apps:").
            addLink("Canvas Magic Eye",       "canvasmeye.html").
            addLink("JSSpect",                "jsspect.html").
            addLink("Web Mandelbrot",         "web_mandelbrot.html").
            addLine().
            addText("Demos:").
            addLink("3D Terrain",             "teflyjs.html").
            addLink("Ball Bowl",              "js2dsim.html").
            addLink("Burn Canvas",            "burn_canvas.html").
            addLink("Jijitai Fractal Viewer", "jijitai.html").
            addLink("Main Page",              "/").
            addLine().
            addText('Contact: k.gucciek@gmail.com with a single "c" instead of "cc".').
            addLink("View Source (Github)", "https://github.com/guciek/guciek.github.io/tree/master/apps");
    }

    function runApp(appFun) {
        showMessage();
        var location = initLocationManager(),
            menu = menuManager(location),
            mouse = initMouseTracker(),
            runOnIdle = initRunOnIdle(),
            resizeEvent = makeEvent();
        addRightMenu(menu);
        addCanvas(resizeEvent);
        appFun({
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
    }

    function startLoad() {
        while ($("content").childNodes.length > 0) {
            $("content").removeChild($("content").childNodes[0]);
        }
        $("error").style.display = "none";
        showMessage("Loading...");
        var s = element("script"),
            check = eventHandler(function () {
                if (window[appid]) {
                    runApp(window[appid]);
                } else {
                    setTimeout(check, 50);
                }
            });
        s.src = "apps/" + appid + ".js";
        document.body.appendChild(s);
        setTimeout(check, 50);
    }

    eventHandler(startLoad)();
}
