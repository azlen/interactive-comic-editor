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

		x = e.clientX * viewBox.scale;
		y = e.clientY * viewBox.scale;
		down = true;

		if(callbacks.hasOwnProperty('mousedown')) {
			callbacks.mousedown();
		}
	}

	function _mousemove(e) {
		mouse.x = e.clientX * viewBox.scale;
		mouse.y = e.clientY * viewBox.scale;

		if(down) {
			dx = mouse.x - x;
			dy = mouse.y - y;

			if(callbacks.hasOwnProperty('mousemove')) {
				callbacks.mousemove(dx, dy);
			}

			x = mouse.x;
			y = mouse.y;
		}
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

	window.radToDeg = function(rad) {
		return rad * 180 / Math.PI;
	}
})(); // direction, distance, radToDeg

let handles, render, selected = null;

let paper = svg('svg.paper', [
	render = svg('g.render'),
	handles = svg('g.handles'),
]);

document.body.appendChild(paper);

var viewBox = {
	x: 0, y: 0,
	scale: 1,
}

/*draggable(paper, {
	mousemove: function(dx, dy) {
		console.log(dx, dy);
	}
});*/

paper.addEventListener('mousewheel', function(e) {
	e.preventDefault();
	e.stopPropagation();
	if(e.ctrlKey) {
		viewBox.scale += e.deltaY * viewBox.scale / 100;
		viewBox.scale = Math.min(Math.max(viewBox.scale, 0.1), 1)
	}else{
		viewBox.x += e.deltaX * viewBox.scale;
		viewBox.y += e.deltaY * viewBox.scale;
	}
	updateViewBox();	
});

function updateViewBox() {
	paper.setAttribute('viewBox', `
		${viewBox.x/* - paper.width.baseVal.value * viewBox.scale / 2*/},
		${viewBox.y/* - paper.height.baseVal.value * viewBox.scale / 2*/},
		${paper.width.baseVal.value * viewBox.scale},
		${paper.height.baseVal.value * viewBox.scale}
	`);
}

setTimeout(updateViewBox, 0);


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
	distance: function(dist, pos) {
		let dir = direction({x: 0, y: 0}, pos);
		pos.x = Math.cos(dir) * dist;
		pos.y = Math.sin(dir) * dist;
		return pos;
	}
}

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
		this.origin = {
			get x() { return handle.x + handle.origin.x; },
			get y() { return handle.y + handle.origin.y; }
		};
		handle.applyCallback(function() {
			this.move(0, 0, true);
		}.bind(this));
		this.move(0, 0, true);
	}

	applyCallback() {
		this.callbacks = this.callbacks.concat([].slice.call(arguments));
	}

	applyConstraint() {
		this.constraints = this.constraints.concat([].slice.call(arguments));
		this.move(0, 0);
	}

	applyTransformations() {
		let transform = `
			translate(${this.origin.x + this.x}, ${this.origin.y + this.y}) 
			rotate(${radToDeg(this.rotation || 0)})
		`;
		this.element.setAttribute('transform', transform);
	}

	move(dx, dy, doActivateCallbacks) {
		this.setPosition(this._x + dx, this._y + dy, doActivateCallbacks);
	}

	setPosition(x, y, doActivateCallbacks) {
		this._x = x;
		this._y = y;

		let newPos = {x: this._x, y: this._y};
		this.constraints.forEach(function(fn) {
			newPos = fn(newPos);
		});

		// this will waste some processing I guess but it fixes things!
		//if(this.x != newPos.x || this.y != newPos.y) {
		this.x = newPos.x;
		this.y = newPos.y;

		if(doActivateCallbacks) {
			this.activateCallbacks();
		}
		//}

		this.applyTransformations();
	}

	activateCallbacks() {
		this.callbacks.forEach(function(callback) {
			callback(this);
		}.bind(this));
	}

	show() {
		this.element.classList.remove('hidden');
		if(this.handle) this.handle.show();
	}

	hide() {
		this.element.classList.add('hidden');
		if(this.handle) this.handle.hide();
	}

	_initRotationalHandle(rotation) {
		this.rotation = rotation || 0;
		this.element.classList.add('rotation');

		this.handle = new Handle(20, 0);
		this.handle.parent(this);
		this.handle.applyConstraint(constraints.distance.bind(null, 20));
		this.handle.applyCallback(this._updateRotation.bind(this));
		this.handle.element.classList.add('rotationhandle');
	}

	_updateRotation() {
		this.rotation = direction({x: 0, y: 0}, this.handle);
		this.applyTransformations();
	}

	_render() {
		this.element = svg('g.handle', [
			svg('circle', {
				cx: 0, cy: 0, r: 7,
			}),
			svg('line', {
				x1: 0, y1: 0, x2: 7, y2: 0,
			})
		]);
		this.move(0, 0);

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

	destroy() {
		this.element.parentElement.removeChild(this.element);
		if(this.handle) this.handle.destroy();
	}
}

class RotationHandle extends Handle {
	constructor(x, y, rotation) {
		super(x, y);

		this._initRotationalHandle();
	}
}

class Entity {

	constructor() {
		this.handles = [];

		this.options = {
			class: '',
		};

		this._render();
		this._initPos();

		this._makeSelectable();
		this.select();
	}

	addHandle(handle) {
		this.handles.push(handle);
		return handle;
	}

	hideHandles() {
		this.handles.forEach(function(handle) {
			handle.hide();
		});
	}

	showHandles() {
		this.handles.forEach(function(handle) {
			handle.show();
		});
	}

	destroyHandles() {
		this.handles.forEach(function(handle) {
			handle.destroy();
		});
	}

	_makeSelectable() {
		this.element.addEventListener('click', this.select.bind(this), true);
	}

	select(e) {
		if(e) e.stopPropagation();
		if(selected != null) selected.deselect();
		this.showHandles();
		this.element.classList.add('selected');
		selected = this;
	}

	deselect() {
		this.hideHandles();
		this.element.classList.remove('selected');
	}

	_initPos() {
		this.pos = this.addHandle(new Handle(mouse.x, mouse.y));
		this.pos.applyCallback(this._updatePos.bind(this));
		this.pos.element.classList.add('move');
	}

	_updatePos() {
		this.element.setAttribute('x', this.pos.x - this.scale.x);
		this.element.setAttribute('y', this.pos.y - this.scale.y);
	}
	
	_render() {
		// Override
	}

	destroy() {
		this.element.parentElement.removeChild(this.element);
		this.destroyHandles();
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
		this.scale = this.addHandle(new Handle(100, 30));
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
		this.scale = this.addHandle(new Handle(100, 100));
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

class Character extends Entity {
	constructor() {
		super();

		this._initHeadHandles();
		this._initBodyHandles();

		this._applyTransformations();
	}

	_initAnatomy() {
		this.anatomy = {
			head: {
				radius: 25,
				eyes: {}
			},
			body: {handles:{}},
		};
	}

	_initHeadHandles() {
		let head = this.anatomy.head;
		head.pos = this.addHandle(new Handle(30, 0));
		head.pos.parent(this.pos);
		head.pos.applyCallback(this._updateHeadPos.bind(this));

		head.eyes.pos = this.addHandle(new RotationHandle(60, 25));
		head.eyes.pos.parent(head.pos);
		head.eyes.pos.applyCallback(this._updateEyePos.bind(this));
		head.eyes.pos.handle.applyCallback(this._updateEyePos.bind(this));

		this._updateHeadPos();
		this._updateEyePos();
	}
	
	_updateHeadPos() {
		let head = this.anatomy.head;
		let x = head.pos.x + head.radius;
		let y = head.pos.y + head.radius;
		head.element.setAttribute('transform', `translate(${x}, ${y})`);
	}

	_updateEyePos() {
		let head = this.anatomy.head;
		let x = head.eyes.pos.x - head.radius - 30;
		let y = head.eyes.pos.y - head.radius;
		let rotation = radToDeg(head.eyes.pos.rotation);
		head.eyes.element.setAttribute('transform', `translate(${x}, ${y}) rotate(${rotation})`);
	}

	_initBodyHandles() {

	}

	_updatePos() {
		this._applyTransformations();
	}

	_applyTransformations() {
		this.element.setAttribute('transform', `translate(${this.pos.x}, ${this.pos.y})`);
	}

	_render() {
		this._initAnatomy();

		this.element = svg('g.character', [
			this.anatomy.head.element = svg('g.headgroup', [
				svg('defs', [
					svg('clipPath #headClip', [
						svg('circle', { r: this.anatomy.head.radius - 1.8 })
					])
				]),

				svg('circle.head', {
					r: 25,
				}),
				svg('circle.light', {
					cx: 5, cy: -5, r: this.anatomy.head.radius,
					'clip-path': 'url(#headClip)'
				}),

				this.anatomy.head.eyes.element = svg('g.eyes', {
					'clip-path': 'url(#headClip)'
				}, [
					svg('ellipse', {
						cx: -7, rx: 3, ry: 9,
					}),
					svg('ellipse', {
						cx: 7, rx: 3, ry: 9,
					})
				])
			])
			
		]);

		render.appendChild(this.element);
	}
}

hotkeys('ctrl+q, ctrl+w, ctrl+e', function(event, handler) {
	switch(handler.key) {
		case 'ctrl+q': new Panel(); break;
		case 'ctrl+w': new Rect(); break;
		case 'ctrl+e': new Character(); break;
	}
});

hotkeys('ctrl+shift+x', function(event, handler) {
	if(selected != null) {
		selected.destroy();
		selected = null;
	}
});

paper.addEventListener('mousedown', function(e) {
	if(e.target === paper && selected != null) {
		selected.deselect();
		selected = null;
	}
});

new Character();
