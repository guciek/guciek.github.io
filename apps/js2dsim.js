// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

function js2dsim(env) {
    "use strict";

    function vect(x, y, z) {
        if (z === undefined) {
            z = 0;
        }
        if (y === undefined) {
            x = 0;
            y = 0;
        }
        return {
            getX: function () {
                return x;
            },
            getY: function () {
                return y;
            },
            getZ: function () {
                return z;
            },
            add: function (v) {
                return vect(x + v.getX(), y + v.getY(), z + v.getZ());
            },
            substract: function (v) {
                return vect(x - v.getX(), y - v.getY(), z - v.getZ());
            },
            mult: function (a) {
                return vect(x * a, y * a, z * a);
            },
            dot: function (v) {
                return x * v.getX() + y * v.getY() + z * v.getZ();
            },
            cross: function (v) {
                return vect(y * v.getZ() - z * v.getY(),
                    x * v.getZ() - z * v.getX(),
                    x * v.getY() - y * v.getX());
            },
            normalize: function () {
                var l = Math.sqrt(x * x + y * y + z * z);
                if (l < 0.000001) {
                    return vect(1, 0, 0);
                }
                l = 1 / l;
                return vect(x * l, y * l, z * l);
            },
            len: function () {
                return Math.sqrt(x * x + y * y + z * z);
            },
            rotateZ: function (angle) {
                var s = Math.sin(angle),
                    c = Math.cos(angle);
                return vect(c * x - s * y, c * y + s * x, z);
            }
        };
    }

    function body(position) {
        var velocity = vect(),
            oldvelocity = vect(),
            ret = {},
            pinned = false;
        ret.step = function (t) {
            if (!pinned) {
                velocity = velocity.add(vect(0, -9.81 * t));
                position = position.add(velocity.mult(t));
                if (position.getZ() > Math.PI) {
                    position = position.add(vect(0, 0, -2 * Math.PI));
                }
                if (position.getZ() < -Math.PI) {
                    position = position.add(vect(0, 0,
                        2 * Math.PI));
                }
                oldvelocity = velocity;
            }
        };
        ret.getPosition = function () {
            return position;
        };
        ret.draw = function (c) {
            c.save();
            try {
                c.translate(position.getX(), position.getY());
                c.rotate(position.getZ());
                ret.drawLocal(c);
            } catch (ignore) {}
            c.restore();
        };
        ret.impulse = function (point, value) {
            if (pinned) {
                return;
            }
            var r = point.substract(position).cross(value).getZ();
            velocity = velocity.add(vect(value.getX() / ret.getMass(),
                value.getY() / ret.getMass(),
                r / ret.getInertia()));
        };
        ret.velocityAt = function (point) {
            var v = point.substract(position);
            v = vect(-v.getY(), v.getX()).mult(oldvelocity.getZ());
            v = v.add(oldvelocity);
            return vect(v.getX(), v.getY());
        };
        ret.pin = function () {
            pinned = true;
        };
        ret.isPinned = function () {
            return pinned;
        };
        ret.localToGlobal = function (point) {
            point = point.rotateZ(position.getZ());
            point = point.add(position);
            return vect(point.getX(), point.getY());
        };
        ret.globalToLocal = function (point) {
            point = point.substract(position);
            point = point.rotateZ(-position.getZ());
            return vect(point.getX(), point.getY());
        };
        return ret;
    }

    function circle(aposition, radius) {
        var ret = body(aposition);
        ret.drawLocal = function (c) {
            c.fillStyle = 'rgb(0,0,0)';
            c.beginPath();
            c.arc(0, 0, radius, 0, 2 * Math.PI, false);
            c.fill();
            c.fillStyle = 'rgb(255,255,0)';
            c.beginPath();
            c.arc(0, 0, radius - 0.02, 0, Math.PI, false);
            c.fill();
        };
        ret.getMass = function () {
            return 50 * radius * radius;
        };
        ret.getInertia = function () {
            var m = ret.getMass();
            return (m * m * radius) / 2;
        };
        ret.getCircleRadius = function () {
            return radius;
        };
        ret.detectCollision = function (ob) {
            var radiussum, centerdiff, d, n, p, info;
            if (ob.getCircleRadius) {
                radiussum = radius + ob.getCircleRadius();
                centerdiff = ob.getPosition().substract(ret.getPosition());
                centerdiff = vect(centerdiff.getX(), centerdiff.getY());
                d = radiussum - centerdiff.len();
                if (d < 0) {
                    return false;
                }
                n = centerdiff.normalize();
                p = ret.getPosition().add(n.mult(radius));
                p = vect(p.getX(), p.getY());
                return {
                    point: p,
                    normal: n,
                    depth: d
                };
            }
            if (ob.getRectangleW) {
                info = ob.detectCollision(ret);
                if (info) {
                    info.normal = vect(-info.normal.getX(), -info.normal.getY());
                    return info;
                }
                return false;
            }
            throw "Collision not implemented";
        };
        return ret;
    }

    function lightcircle(aposition, radius) {
        var ret = circle(aposition, radius);
        ret.drawLocal = function (c) {
            c.fillStyle = 'rgb(0,0,0)';
            c.beginPath();
            c.arc(0, 0, radius, 0, 2 * Math.PI, false);
            c.fill();
            c.fillStyle = 'rgb(128,128,255)';
            c.beginPath();
            c.arc(0, 0, radius - 0.02, 0, Math.PI * 12, false);
            c.fill();
        };
        ret.getMass = function () {
            return 15 * radius * radius;
        };
        return ret;
    }

    function rectangle(aposition, w, h) {
        var ret = body(aposition);
        ret.drawLocal = function (c) {
            c.fillStyle = 'rgb(0,0,0)';
            c.fillRect(-w / 2, -h / 2, w, h);
            c.fillStyle = 'rgb(255,255,0)';
            c.fillRect(-w / 2 + 0.02, -h / 2 + 0.02, w - 0.04, h - 0.04);
        };
        ret.getMass = function () {
            return 20 * w * h;
        };
        ret.getInertia = function () {
            return ret.getMass() * (w * w + h * h) / 12;
        };
        ret.getRectangleW = function () {
            return w;
        };
        ret.detectCollision = function (ob) {
            if (ob.getCircleRadius) {
                var r = ob.getCircleRadius(),
                    center = ret.globalToLocal(ob.getPosition()),
                    n = false,
                    d = 0,
                    x,
                    y,
                    checkcorner,
                    p;
                x = center.getX();
                y = center.getY();
                checkcorner = function (lp) {
                    lp = center.substract(lp);
                    if (lp.len() <= r) {
                        n = lp.normalize();
                        d = r - lp.len();
                    }
                };
                if ((x <= w / 2 + r) && (x >= -w / 2 - r) &&
                        (y <= h / 2) && (y >= -h / 2)) {
                    n = vect((x < 0) ? -1 : 1, 0);
                    if (x < 0) {
                        x = -x;
                    }
                    d = w / 2 + r - x;
                } else if ((x <= w / 2) && (x >= -w / 2) &&
                        (y <= h / 2 + r) && (y >= -h / 2 - r)) {
                    n = vect(0, (y < 0) ? -1 : 1);
                    if (y < 0) {
                        y = -y;
                    }
                    d = h / 2 + r - y;
                } else {
                    checkcorner(vect(w / 2, h / 2));
                    checkcorner(vect(w / 2, -h / 2));
                    checkcorner(vect(-w / 2, h / 2));
                    checkcorner(vect(-w / 2, -h / 2));
                }
                if (!n) {
                    return false;
                }
                p = center.add(n.mult(-r));
                p = ret.localToGlobal(p);
                n = n.rotateZ(ret.getPosition().getZ());
                return {
                    point: p,
                    normal: n,
                    depth: d
                };
            }
            throw "Collision not implemented";
        };
        return ret;
    }

    function world() {
        var bodies = [
            rectangle(vect(0, -0.5, 0), 7, 1),
            rectangle(vect(-4, 2.5, Math.PI - 1.2), 7, 1),
            rectangle(vect(4, 2.5, 1.2), 7, 1),
            rectangle(vect(-1.1, 2, -0.3), 2, 0.4)
        ];
        bodies.forEach(function (body) {
            body.pin();
        });

        function draw(c, minx, miny, maxx, maxy) {
            var skyGradient = c.createLinearGradient(0, 5, 0, 0);
            skyGradient.addColorStop(0, 'rgb(32,57,141)');
            skyGradient.addColorStop(1, 'rgb(161,193,232)');
            c.fillStyle = skyGradient;
            c.fillRect(minx, miny, maxx - minx, maxy - miny);

            bodies.forEach(function (body) {
                body.draw(c);
            });
        }

        function onClick(x, y) {
            if (Math.random() < 0.3) {
                bodies[bodies.length] = lightcircle(vect(x, y,
                    Math.random() * 2 * Math.PI), 0.2);
            } else {
                bodies[bodies.length] = circle(vect(x, y,
                    Math.random() * 2 * Math.PI), 0.2);
            }
        }

        function collide(info, ob1, ob2) {
            var normal = info.normal.normalize(),
                m,
                i = ob2.velocityAt(info.point).substract(
                    ob1.velocityAt(info.point)
                );
            if (i.len() > 0.1) {
                i = i.mult(0.1).add(vect(Math.random() - 0.5,
                        Math.random() - 0.5).mult(0.01));
            }

            i = i.add(normal.mult(-info.depth * 50));

            function impMass(ob) {
                if (ob.isPinned()) {
                    return 0;
                }
                var r = info.point.substract(ob.getPosition()).
                        cross(normal).getZ();
                return 1 / ob.getMass() + (r * r) / ob.getInertia();
            }
            m = 1 / (impMass(ob1) + impMass(ob2));
            ob1.impulse(info.point, i.mult(m));
            ob2.impulse(info.point, i.mult(-m));
        }

        function step(t) {
            bodies.forEach(function (body) {
                body.step(t);
            });
            var i, j, info;
            for (i = 0; i < bodies.length; i += 1) {
                for (j = i + 1; j < bodies.length; j += 1) {
                    if ((!bodies[i].isPinned()) || (!bodies[j].isPinned())) {
                        info = bodies[i].detectCollision(bodies[j]);
                        if (info) {
                            if (info.depth < 0) {
                                throw "Bug";
                            }
                            collide(info, bodies[i], bodies[j]);
                        }
                    }
                }
            }
            for (i = 0; i < bodies.length; i += 1) {
                if (bodies[i].getPosition().getY() < -100) {
                    bodies.splice(i, 1);
                    break;
                }
            }
        }

        return {
            draw: draw,
            step: step,
            onClick: onClick
        };
    }

    function init() {
        var c,
            w = world(),
            scale = 1,
            centerX = 0,
            centerY = 2.5,
            simTimeSinceRedraw = 0;

        try {
            c = env.canvas().getContext('2d');
        } catch (err) {
            throw "Your web browser does not support " +
                "the <canvas> element!";
        }

        env.canvas().onclick = env.eventHandler(function () {
            w.onClick(
                (env.mouse().getX() - c.canvas.width / 2) / scale + centerX,
                -(env.mouse().getY() - c.canvas.height / 2) / scale + centerY
            );
        });

        function redraw() {
            simTimeSinceRedraw = 0;
            scale = (c.canvas.width > c.canvas.height ?
                    c.canvas.height : c.canvas.width) / 5.5;
            c.save();
            c.translate(c.canvas.width / 2, c.canvas.height / 2);
            c.scale(scale, -scale);
            c.translate(-centerX, -centerY);
            w.draw(
                c,
                -c.canvas.width / (2 * scale) + centerX,
                -c.canvas.height / (2 * scale) + centerY,
                c.canvas.width / (2 * scale) + centerX,
                c.canvas.height / (2 * scale) + centerY
            );
            c.restore();
        }

        redraw();
        env.runOnCanvasResize(redraw);

        function onframe() {
            if (simTimeSinceRedraw >= 0.03) {
                redraw();
            }
            env.runOnNextFrame(onframe);
        }
        env.runOnNextFrame(onframe);

        (function () {
            function curTime() {
                return (new Date().getTime()) * 0.001;
            }

            var simStep = 0.01,
                todoTime = 0,
                last = curTime();

            function onidle() {
                var cur = curTime();
                todoTime += cur - last;
                last = cur;
                if (todoTime > 0.5) {
                    todoTime = 0.5;
                }
                if (todoTime < simStep) {
                    env.runOnNextFrame(onidle);
                    return;
                }
                todoTime -= simStep;
                simTimeSinceRedraw += simStep;
                w.step(simStep);
                env.runOnNextIdle(onidle);
            }
            env.runOnNextIdle(onidle);
        }());
    }

    init();
}
