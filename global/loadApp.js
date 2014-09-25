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

    function $(id) {
        var e = document.getElementById(id);
        if (!e) {
            throw "Could not find element '" + id + "'";
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
                $("error").innerHTML = msg;
            }
            console.debug(msg);
        } catch (err) {
            alert(msg);
        }
    }

    function eventHandler(action, p1, p2, p3) {
        return function () {
            try {
                action(p1, p2, p3);
            } catch (err) {
                showError(err);
            }
        };
    }

    function menuManager() {
        var parent = $("description"),
            firstleft = true,
            firstright = true;
        return {
            addLink: function (title, link) {
                var a = element("a", String(title));
                a.href = link;
                if (firstleft) {
                    firstleft = false;
                    a.style.marginLeft = "20px";
                }
                parent.appendChild(element("div", a));
            },
            addSubmenu: function (submenu, rightside) {
                var menu = element("div", element("p", submenu)),
                    links = element("div");
                menu.appendChild(links);
                if (rightside) {
                    if (firstright) {
                        firstright = false;
                        menu.style.marginRight = "20px";
                    }
                    menu.className = "right_menu";
                } else if (firstleft) {
                    firstleft = false;
                    menu.style.marginLeft = "20px";
                }
                parent.appendChild(menu);
                return {
                    addLink: function (title, link) {
                        var a = element("a", String(title));
                        a.href = link;
                        links.appendChild(a);
                    }
                };
            }
        };
    }

    function canvas() {
        try {
            return $("canvas");
        } catch (ignore) {}
        var canvas = element("canvas"),
            onResize = eventHandler(function () {
                var w = window.innerWidth,
                    h = window.innerHeight - 25;
                if ((w >= 50) && (h >= 50) &&
                        ((canvas.width !== w) || (canvas.height !== h))) {
                    canvas.width = w;
                    canvas.height = h;
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
        } catch(err) {
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

    function addRightMenu(manager, selfid) {
        var menu = manager.addSubmenu("More Apps", true);
        function add(id, title) {
            if (id === selfid) { return; }
            menu.addLink(title, id + ".html");
        }
        add("burn_canvas",        "Burn Canvas");
        add("canvasmeye",         "Canvas Magic Eye");
        add("imagzag",            "Imagzag");
        add("js2dsim",            "2D Physics Simulation");
        add("jsspect",            "Spectral Analyzer");
        add("plasmodrops",        "Plasmodrops");
        add("teflyjs",            "Terrain Fly JS");
        add("web_mandelbrot",     "Web Mandelbrot");
    }

    function loadApp(appid) {
        var s = element("script");
        s.src = "apps/" + appid + ".js";
        document.body.appendChild(s);
        document.body.onload = eventHandler(function () {
            var menu = menuManager();
            addRightMenu(menu, appid);
            window[appid]({
                canvas: canvas,
                eventHandler: eventHandler,
                menu: function () { return menu; },
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
