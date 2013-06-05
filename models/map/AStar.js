/**
 * @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */
exports = Class(function () {
    this.init = function (opts) {
        this._map = opts.map;
        this._width = opts.map.getWidth();
        this._height = opts.map.getHeight();
        this._limit = this._width * this._height;

        this._acceptLength = Math.min(this._width >> 1, this._height >> 1);

        this._grid = [];
        for (var y = 0; y < this._height; y++) {
            for (var x = 0; x < this._width; x++) {
                this._grid.push({
                    parent: null,
                    value: y * this._width + x,
                    x: x,
                    y: y,
                    t: 0
                });
            }
        }

        this._neighbourList = [];
        for (var x = 0; x < 8; x++) {
            this._neighbourList.push({x: 0, y: 0});
        }

        this._t = 1;

        this._queue = [];
        this._currentSearch = null;
        this._currentPath = null;
        this._rect = {x: 0, y: 0, w: 1, h: 1};
    };

    this._valid = function (x, y) {
        this._rect.x = x;
        this._rect.y = y;
        return this._map.acceptRect(this._rect, this._conditions);
    };

    this._tile = function (index) {
        var tile = this._grid[index];
        var t = this._t;

        if (tile.t < t) {
            tile.f = 0;
            tile.g = 0;
            tile.t = t;
        }

        return tile;
    };

    this._startSearch = function (search) {
        this._result = [];
        this._path = [];
        this._end = this._tile(search.endY * this._width + search.endX);
        this._open = [search.startY * this._width + search.startX];
        this._startX = search.startX;
        this._startY = search.startY;
        this._conditions = search.conditions;

        this._t++;
    };

    this._findPath = function () {
        var result = this._result;
        var path = this._path;
        var end = this._end;
        var open = this._open;

        var grid = this._grid;
        var width = this._width;
        var neighbourList = this._neighbourList;

        var length = open.length;
        var max = this._limit;
        var min = -1;
        for (i = 0; i < length; i++) {
            if (grid[open[i]].f < max) {
                max = grid[open[i]].f;
                min = i;
            }
        };

        var node = this._tile(open.splice(min, 1)[0]);
        if (node.value === end.value) {
            var currentNode = node;
            while (!((currentNode.x === this._startX) && (currentNode.y === this._startY))) {
                result.push({x: currentNode.x, y: currentNode.y});
                currentNode = currentNode.parent;
            }
        } else {
            var i = this._neighbours(node.x, node.y);
            while (i) {
                var neighbour = neighbourList[--i];
                var currentNode = this._tile(neighbour.y * width + neighbour.x);
                if (!path[currentNode.value]) {
                    path[currentNode.value] = true;
                    currentNode.parent = node;
                    currentNode.g = this._manhattan(neighbour, node) + node.g;
                    currentNode.f = this._manhattan(neighbour, end) + currentNode.g;
                    open.push(currentNode.value);
                }
            }
        }
    };

    this.update = function () {
        if (!this._currentSearch && this._queue.length) {
            this._currentSearch = this._queue.shift();
            var currentSearch = this._currentSearch;
            this._startSearch(currentSearch);
            this._wrap = false;
        }

        if (!this._currentSearch) {
            return;
        }

        var currentSearch = this._currentSearch;

        for (i = 0; i < 100 && this._open.length; i++) {
            this._findPath();
        }
        if (!this._open.length) {
            if (currentSearch.wrap) {
                if (!this._currentPath.length) {
                    currentSearch.cb(this._result);
                } else if (!this._result.length) {
                    currentSearch.cb(this._currentPath);
                } else {
                    currentSearch.cb((this._currentPath.length < this._result.length) ? this._currentPath : this._result);
                }
                this._currentSearch = null;
            } else if (this._result.length && (this._result.length < this._acceptLength)) {
                // If we have a result without wrap and it has an acceptable length then quit searching...
                currentSearch.cb(this._result);
                this._currentSearch = null;
            } else {
                currentSearch.wrap = true;
                this._currentPath = this._result;
                this._startSearch(currentSearch);
                this._wrap = true;
            }
        }
    };

    this.findPath = function (startX, startY, endX, endY, conditions, cb) {
        this._queue.push({
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            cb: cb,
            wrap: false,
            conditions: conditions
        });
    };

    this.clear = function () {
        this._queue = [];
        this._currentSearch = null;
    };

    this._neighbours = function (x, y) {
        var neighbourList = this._neighbourList;
        var neighbourCount = 0;
        var neighbour;
        var width = this._width;
        var height = this._height;
        var x1Valid, x2Valid, y1Valid, y2Valid;
        var y1, y2, x1, x2;

        if (this._wrap) {
            x1 = (x + width - 1) % width;
            x2 = (x + width + 1) % width;
            y1 = (y + height - 1) % height;
            y2 = (y + height + 1) % height;
            x1Valid = this._valid(x1, y),
            x2Valid = this._valid(x2, y);
            y1Valid = this._valid(x, y1);
            y2Valid = this._valid(x, y2);
        } else {
            x1 = x - 1;
            x2 = x + 1;
            y1 = y - 1;
            y2 = y + 1;
            x1Valid = (x1 >= 0) && this._valid(x1, y),
            x2Valid = (x2 < width) && this._valid(x2, y);
            y1Valid = (y1 >= 0) && this._valid(x, y1);
            y2Valid = (y2 < height) && this._valid(x, y2);
        }

        if (x1Valid) {
            neighbour = neighbourList[neighbourCount];
            neighbour.x = x1;
            neighbour.y = y;
            neighbourCount++;
        }
        if (x2Valid) {
            neighbour = neighbourList[neighbourCount];
            neighbour.x = x2;
            neighbour.y = y;
            neighbourCount++;
        }

        if (y1Valid) {
            neighbour = neighbourList[neighbourCount];
            neighbour.x = x;
            neighbour.y = y1;
            neighbourCount++;

            if (x2Valid && this._valid(x2, y1)) {
                neighbour = neighbourList[neighbourCount];
                neighbour.x = x2;
                neighbour.y = y1;
                neighbourCount++;
            }
            if (x1Valid && this._valid(x1, y1)) {
                neighbour = neighbourList[neighbourCount];
                neighbour.x = x1;
                neighbour.y = y1;
                neighbourCount++;
            }
        }
        if (y2Valid) {
            neighbour = neighbourList[neighbourCount];
            neighbour.x = x;
            neighbour.y = y2;
            neighbourCount++;

            if (x2Valid && this._valid(x2, y2)) {
                neighbour = neighbourList[neighbourCount];
                neighbour.x = x2;
                neighbour.y = y2;
                neighbourCount++;
            }
            if (x1Valid && this._valid(x1, y2)) {
                neighbour = neighbourList[neighbourCount];
                neighbour.x = x1;
                neighbour.y = y2;
                neighbourCount++;
            }
        }

        return neighbourCount;
    };

    this._manhattan = function (point, end) {
        return Math.abs(point.x - end.x) + Math.abs(point.y - end.y);
    };
});
