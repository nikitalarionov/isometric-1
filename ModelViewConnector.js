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
import event.Emitter as Emitter;

import .models.item.DynamicModel as DynamicModel;

exports = Class(Emitter, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);

		this._gridView = opts.gridView;
		this._activeList = [];
		this._sleepList = [];
	};

	this.tick = function (dt) {
		var tickResult = DynamicModel.tickResult;
		var activeList = this._activeList;
		var sleepList = this._sleepList;
		var gridView = this._gridView;
		var i = activeList.length;

		while (i) {
			var modelInfo = activeList[--i];
			var model = modelInfo.model;
			var view = modelInfo.view;
			var removeView = false;
			var result = model.tick(dt);

			switch (result) {
				case tickResult.SLEEP:
					sleepList[model.getId()] = modelInfo;
					// Do not break!

				case tickResult.REMOVE:
					if (view) {
						removeView = view;
					}
					if (i === activeList.length - 1) {
						delete activeList[activeList.length - 1];
						activeList.length--;
					} else {
						delete activeList[i];
						activeList[i++] = activeList.pop();
					}
					break;

				case tickResult.CONTINUE:
					var opts = model.getOpts();
					var tileOnScreen = gridView.isTileVisible(opts.tileX, opts.tileY, opts.x, opts.y);

					model.setOnScreen(tileOnScreen);

					if (tileOnScreen) {
						if (!view) {
							var viewPool = gridView.getViewPool(modelInfo.layer);
							if (viewPool) {
								view = viewPool.obtainView();
								if (!view.updateCallback) {
									view.updateCallback = bind(view, 'onUpdate');
								}
								model.on('Update', view.updateCallback);
								view.create(opts, tileOnScreen);
								modelInfo.view = view;
							}
						}
						view && view.setTileOnScreen(opts, tileOnScreen);
					} else if (view) {
						removeView = view;
					}
					break;
			}

			if (removeView) {
				model.removeListener('Update', removeView.updateCallback);
				var viewPool = gridView.getViewPool(modelInfo.layer);
				viewPool.releaseView(removeView);
				modelInfo.view = null;
			}
		}
	};

	this.registerModel = function (model, layer) {
		this._activeList.push({
			model: model,
			view: null,
			layer: layer
		});
		this._sleepList[model.getId()] = false;
	};

	this.wakeupModel = function (model) {
		var modelInfo = this._sleepList[model.getId()];
		if (modelInfo) {
			this._activeList.push(modelInfo);
		} else {
			console.warn('Failed to wakeup model', model.getId());
		}
	};

	this.clear = function () {
		this._activeList = [];
		this._sleepList = [];		
	};
});