(function() {
	function _generateElement(args, el) {
		let e = null;
		let _tci = args.shift().split(/\s*(?=[\.#])/); // tag, class, id
		if(/\.|#/.test(_tci[0])) e = el('div');
		_tci.forEach(function(v) {
			if(!e) e = el(v)
			else if(v[0] === '.') e.classList.add(v.slice(1))
			else if(v[0] === '#') e.setAttribute('id', v.slice(1))
		});
		function item(l) {
			switch (l.constructor) {
				case Array:
					l.forEach(item);
					break;
				case Object:
					for(attr in l) {
						if(attr === 'style') {
							for(style in l[attr]) {
								e.style[style] = l[attr][style];
							}
						}else{
							e.setAttribute(attr, l[attr]);
						}
					}
					break;
				default:
					if(l.nodeType != undefined) e.appendChild(l)
    				else e.appendChild(document.createTextNode(l))
			}
		}
		while(args.length > 0) {
			item(args.shift());
		}
		return e;
	}

	window.h = function() {
		return _generateElement([].slice.call(arguments), function(tagName) {
			return document.createElement(tagName);
		});
	}

	window.svg = function() {
		return _generateElement([].slice.call(arguments), function(tagName) {
			return document.createElementNS('http://www.w3.org/2000/svg', tagName);
		});
	}
})(); // h, svg

(function() {

	let target, callbacks;
	let down, x, y, dx, dy;

	window.mouse = {x: 100, y: 100};

	function _mousedown(fns, e) {
		target = e.target;
		callbacks = fns;

		x = e.clientX;
		y = e.clientY;
		down = true;

		if(callbacks.hasOwnProperty('mousedown')) {
			callbacks.mousedown();
		}
	}

	function _mousemove(e) {
		if(down) {
			dx = e.clientX - x;
			dy = e.clientY - y;

			if(callbacks.hasOwnProperty('mousemove')) {
				callbacks.mousemove(dx, dy);
			}

			x = e.clientX;
			y = e.clientY;
		}	

		mouse.x = e.clientX;
		mouse.y = e.clientY;
	}

	function _mouseup(e) {
		if(down) {
			down = false;

			if(callbacks.hasOwnProperty('mouseup')) {
				callbacks.mouseup();
			}
		}
	}

	window.draggable = function(element, callbacks) {
		element.addEventListener('mousedown', _mousedown.bind(null, callbacks));
	}

	window.addEventListener('mousemove', _mousemove);
	window.addEventListener('mouseup', _mouseup);
})(); // draggable, mouse

(function() {
	window.direction = function(p1, p2) {
		return Math.atan2(p2.y - p1.y, p2.x - p1.x);
	}

	window.distance = function(p1, p2) {
		return Math.sqrt((p1.x-p2.x)*(p1.x-p2.x) + (p1.y-p2.y)*(p1.y-p2.y));
	}
})(); // direction, distance

let handles, render;

let paper = svg('svg.paper', [
	render = svg('g.render'),
	handles = svg('g.handles'),
]);

let constraints = {
	snapToGrid: function(gridSize, pos) {
		pos.x = Math.round(pos.x / gridSize) * gridSize;
		pos.y = Math.round(pos.y / gridSize) * gridSize;
		return pos;
	},
	minimum: function(x, y, pos) {
		pos.x = Math.max(pos.x, x);
		pos.y = Math.max(pos.y, y);
		return pos;
	},
	positive: function(pos) {
		return constraints.minimum(0, 0, pos);
	},
}

document.body.appendChild(paper);

class Handle {
	constructor(x, y) {
		this.x = x;
		this.y = y;

		this._x = x;
		this._y = y;

		this.origin = {x: 0, y: 0};

		this.callbacks = [];
		this.constraints = [];

		this._render();
	}

	parent(handle) {
		this.origin = handle;
		handle.applyCallback(function() {
			this.move(0, 0);
		}.bind(this));
		this.move(0, 0);
	}

	applyCallback() {
		this.callbacks = this.callbacks.concat([].slice.call(arguments));
	}

	applyConstraint() {
		this.constraints = this.constraints.concat([].slice.call(arguments));
	}

	move(dx, dy, activateCallbacks) {
		this.setPosition(this._x + dx, this._y + dy, activateCallbacks);
	}

	setPosition(x, y, activateCallbacks) {
		this._x = x;
		this._y = y;

		let newPos = {x: this._x, y: this._y};
		this.constraints.forEach(function(fn) {
			newPos = fn(newPos);
		});
		console.log(newPos);

		if(this.x != newPos.x || this.y != newPos.y) {
			this.x = newPos.x;
			this.y = newPos.y;

			if(activateCallbacks) {
				this.callbacks.forEach(function(callback) {
					callback(this);
				}.bind(this));
			}
		}

		this.element.setAttribute('cx', this.origin.x + this.x);
		this.element.setAttribute('cy', this.origin.y + this.y);
	}

	_render() {
		this.element = svg('circle.handle', {
			cx: this.x, cy: this.y, r: 7,
		});

		draggable(this.element, {
			mousemove: function(dx, dy) {
				this.move(dx, dy, true);
			}.bind(this),
			mouseup: function() {
				this.setPosition(this.x, this.y);
			}.bind(this)
		});

		handles.appendChild(this.element);
	}
}

class Entity {

	constructor() {
		this._render();

		this._initPos();
	}

	_initPos() {
		this.pos = new Handle(mouse.x, mouse.y);
		this.pos.applyCallback(this._updatePos.bind(this));
	}

	_updatePos() {
		this.element.setAttribute('x', this.pos.x - this.scale.x);
		this.element.setAttribute('y', this.pos.y - this.scale.y);
	}
	
	_render() {
		// Override
	}
}

class Rect extends Entity {

	constructor() {

		super();

		this._initScale();
		
		this._updateScale();
		this._updatePos();
	}

	_initScale() {
		this.scale = new Handle(100, 30);
		this.scale.parent(this.pos);
		this.scale.applyCallback(this._updateScale.bind(this), this._updatePos.bind(this));
		this.scale.applyConstraint(constraints.positive);
	}

	_updateScale() {
		this.element.setAttribute('width', this.scale.x * 2);
		this.element.setAttribute('height', this.scale.y * 2);
	}
	
	_render() {
		this.element = svg('rect', {fill: '#f00'});
		
		render.appendChild(this.element);
	}
}

class Panel extends Entity {

	constructor() {
		super();

		this.pos.applyConstraint(constraints.snapToGrid.bind(null, 25));

		this._initScale();

		this._updateScale();
		this._updatePos();
	}

	_updatePos() {
		this.element.setAttribute('x', this.pos.x);
		this.element.setAttribute('y', this.pos.y);
	}

	_initScale() {
		this.scale = new Handle(100, 100);
		this.scale.parent(this.pos);
		this.scale.applyCallback(this._updateScale.bind(this));
		this.scale.applyConstraint(constraints.minimum.bind(null, 50, 50));
		this.scale.applyConstraint(constraints.snapToGrid.bind(null, 25));
	}

	_updateScale() {
		this.element.setAttribute('width', this.scale.x);
		this.element.setAttribute('height', this.scale.y);
	}

	_render() {
		this.element = svg('rect.panel', {width: 100, height: 100});
		
		render.appendChild(this.element);
	}
}

hotkeys('ctrl+q,ctrl+w', function(event, handler) {
	switch(handler.key) {
		case 'ctrl+q': new Panel(); break;
		case 'ctrl+w': new Rect(); break;
	}
});

new Panel();
