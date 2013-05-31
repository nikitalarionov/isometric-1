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
import device;

import event.Emitter as Emitter;

import ..GridProperties;

var GridMiniMapBuffer = Class([Emitter, GridProperties], function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);

		this._canvas = null;
		this._ctx = null;
		this._updateRects = [];

		this.initProperties(opts);
	};

	this._initViewport = function () {
		var viewportWidth = 1024;
		var viewportHeight = 512;

		this._tileWidth = Math.ceil(viewportWidth / this._gridWidth);
		this._tileHeight = Math.ceil(viewportHeight / (this._gridHeight * 0.5));

		viewportWidth -= this._tileWidth * 2;
		viewportHeight -= this._tileHeight * 2;
		this._tileWidth = Math.floor(viewportWidth / this._gridWidth);
		this._tileHeight = Math.floor(viewportHeight / (this._gridHeight * 0.5));

		viewportWidth = Math.ceil(this._tileWidth * (this._gridWidth + 1));
		viewportHeight = Math.ceil(this._tileHeight * (this._gridHeight + 1) * 0.5);

		this._viewport = {
			x: this._tileWidth * 0.5,
			y: this._tileHeight * 0.5,
			w: (this._gridWidth - 1) * this._tileWidth,
			h: (this._gridHeight - 1) * this._tileHeight * 0.5
		};
	};

	this._buildMap = function (data) {
		this._buildViewProperties(data);
		this._initViewport();

		if (this._total === 0xFFFFFF) {
			this._total = this._gridHeight * this._gridWidth;
		}

	    var Canvas = device.get('Canvas');
        this._canvas = new Canvas({width: 1024, height: 1024});
        this._ctx = this._canvas.getContext('2d');
		this._ctx.clearRect(0, 0, 1024, 1024);

		this._ctx.fillStyle = 'rgb(0,120,255)';
		this._ctx.fillRect(this._viewport.x, this._viewport.y, this._viewport.w, this._viewport.h);
	};

	this._renderTiles = function (layer, x, y) {
		var ctx = this._ctx;
		var gridHeight = this._gridHeight;
		var gridWidth = this._gridWidth;
		var tileWidth = this._tileWidth;
		var tileHeight = this._tileHeight;
		var tileGroups = this._tileGroups;

		var offsetX = (y & 1) * tileWidth * 0.5;

		var a = ~~(y * 0.5);
		var b = gridWidth - a;
		var c = y + gridHeight - a;
		var d = (x + b) % gridWidth;
		var e = (x + c) % gridHeight;

		var tile = this._grid[e][d][layer];

		var image = tileGroups.getImage(tile);

		if (image) {
			ctx.save();

			var imageX = offsetX + x * tileWidth;
			var imageY = y * tileHeight * 0.5;

			if (image.flipX || image.flipY) {
				ctx.scale(
					image.flipX ? -1 : 1,
					image.flipY ? -1 : 1
				);
				imageX = image.flipX ? -imageX - tileWidth : imageX;
				imageY = image.flipY ? -imageY - tileHeight : imageY;
			}

			image.render(ctx, imageX, imageY + layer * 512, tileWidth, tileHeight);
			ctx.restore();
		}
	};

	this._gridToPoint = function (x, y) {
		var viewport = this._viewport;
		var minX = viewport.x;
		var maxX = viewport.x + viewport.w;
		var minY = viewport.y;
		var maxY = viewport.y + viewport.h;
		var w = this._tileWidth * 0.5;
		var h = this._tileHeight * 0.5;

		for (i = -1; i < 2; i++) {
			for (j = -1; j < 2; j++) {
				var a = x + i * this._gridWidth;
				var b = y + j * this._gridHeight;
				var c = (a * w) + (b * w);
				var d = (b * h) - (a * h);

				if ((c >= minX) && (c <= maxX) && (d >= minY) && (d <= maxY)) {
					return {x: a, y: b};
				}
			}
		}

		return false;
	};

	this._renderTile = function (layer, x, y) {
		var ctx = this._ctx;
		var gridHeight = this._gridHeight;
		var gridWidth = this._gridWidth;
		var tileWidth = this._tileWidth;
		var tileHeight = this._tileHeight;
		var tileGroups = this._tileGroups;
		var point = this._gridToPoint((x + gridWidth) % gridWidth, (y + gridHeight) % gridHeight);

		if (!point) {
			return;
		}

		var tile = this._grid[y][x][layer];
		var image = tileGroups.getImage(tile);

		if (image) {
			ctx.save();

			x = this._viewport.x + point.x;
			y = this._viewport.y + point.y + layer * 512;

			if (image.flipX || image.flipY) {
				ctx.scale(
					image.flipX ? -1 : 1,
					image.flipY ? -1 : 1
				);
				x = image.flipX ? -x - tileWidth : x;
				y = image.flipY ? -y - tileHeight : y;
			}

			image.render(ctx, x, y, tileWidth, tileHeight);
			ctx.restore();
		}
	};

	this.updateLayer = function (layer) {
		this._layer = layer;
		this._index = 0;
		this._total = 0xFFFFFF;
	};

	this.updateRect = function (layer, rect) {
		this._updateRects.push({
			layer: layer,
			rect: {x: rect.x - 1, y: rect.y - 1, w: rect.w + 2, h: rect.h + 2},
			index: 0,
			total: rect.h * rect.h
		});
	};

	this.onUpdate = function (data) {
		this._needsBuild && this._buildMap(data);

		if (this._index < this._total) {
			var gridWidth = this._gridWidth;

			for (var i = 0; (i < 50) && (this._index < this._total); i++) {
				var x = this._index % gridWidth;
				var y = (this._index / gridWidth) | 0;

				this._renderTiles(this._layer, x, y);
				this._index++;
			}
		} else if (this._updateRects.length) {
			var updateRect = this._updateRects[0];
			var rect = updateRect.rect;
			for (var i = 0; (i < 10) && (updateRect.index < updateRect.total); i++) {
				var x = rect.x + updateRect.index % updateRect.rect.w;
				var y = rect.y + (updateRect.index / updateRect.rect.w) | 0;

				this._renderTile(updateRect.layer, x, y);
				updateRect.index++;
			}
			if (updateRect.index >= updateRect.total) {
				this._updateRects.shift();
			}
		}
	};

	this.getCanvas = function () {
		return this._canvas;
	};

	this.getViewport = function () {
		return this._viewport;
	};
});

var gridMiniMapBuffer = null;

exports = function (opts) {
	if (!gridMiniMapBuffer) {
		gridMiniMapBuffer = new GridMiniMapBuffer(opts);
	}
	return gridMiniMapBuffer;
};