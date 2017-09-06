(function() {
	window.direction = function(p1, p2) {
		return Math.atan2(p2.y - p1.y, p2.x - p1.x);
	}

	window.distance = function(p1, p2) {
		return Math.sqrt((p1.x-p2.x)*(p1.x-p2.x) + (p1.y-p2.y)*(p1.y-p2.y));
	}

	window.radToDeg = function(rad) {
		return rad * 180 / Math.PI;
	}
})(); // direction, distance, radToDeg

function $(selector) {
	return document.querySelector(selector);
}

class Option {
	constructor(name) {
		this.name = name;
		this._value;

		this.callbacks = [];
	}

	applyCallback() {
		this.callbacks = this.callbacks.concat([].slice.call(arguments));
	}

	activateCallbacks(newValue) { /*++++*/
		this.callbacks.forEach(function(callback) {
			callback(newValue);
		});
	}

	get value() {
		return this._value;
	}

	set value() {

	}
}