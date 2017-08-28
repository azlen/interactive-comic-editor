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

	window.mouse = {x: 100, y: 100, target: null};

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
		mouse.target = e.target;

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
	function _globalPosition(point) {
		return {
			x: point.x + (!!point.origin ? point.origin.x : 0),
			y: point.y + (!!point.origin ? point.origin.y : 0)
		}
	}

	window.direction = function(p1, p2) {
		// let p1_G = _globalPosition(p1);
		// let p2_G = _globalPosition(p2);
		let p1_G = p1;
		let p2_G = p2;
		return Math.atan2(p2_G.y - p1_G.y, p2_G.x - p1_G.x);
	}

	window.distance = function(p1, p2) {
		// let p1_G = _globalPosition(p1);
		// let p2_G = _globalPosition(p2);
		let p1_G = p1;
		let p2_G = p2;
		return Math.sqrt((p1_G.x-p2_G.x)*(p1_G.x-p2_G.x) + (p1_G.y-p2_G.y)*(p1_G.y-p2_G.y));
	}

	window.radToDeg = function(rad) {
		return rad * 180 / Math.PI;
	}
})(); // direction, distance, radToDeg

(function() {
	var count = 0;

	window.id = function() {
		return (count++).toString(36);
	}
})(); // id

let handles, render, selected = null;

let paper = svg('svg.paper', { 'version':'1.1', 'xmlns:xlink':'http://www.w3.org/1999/xlink' }, [	
	svg('defs', [
		svg('filter #blur', [
			svg('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 4, result: 'blur' }),
		]),
		svg('filter #noise', [
			svg('feTurbulence', { type: 'fractalNoise', baseFrequency: 1.75, result: 'noisy' }),
			// svg('feColorMatrix', { type: 'saturate', values: 0 }),
			svg('feBlend', { in: 'SourceGraphic', in2: 'noisy', mode: 'multiply', result: 'blend' }),
			svg('feBlend', { in: 'blend', in2: 'noisy', mode: 'multiply', result: 'blend2' }),
			svg('feBlend', { in: 'blend2', in2: 'noisy', mode: 'multiply' }),
		]),
		svg('filter #dialate-subtract', [

		]),
		svg('filter #dialate-border', [

		]),
		panelMask = svg('mask #panelMask', { maskUnits: 'userSpaceOnUse' })
	]),
	render = svg('g.render'),
	extraBorders = svg('g.extraborders', { mask: 'url(#panelMask)' }),
	handles = svg('g.handles'),
]);

document.body.appendChild(paper);

var viewBox = {
	x: 0, y: 0,
	scale: 1,
}

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

let inspector = document.querySelector('.inspector .content');
let layers = document.querySelector('.layers .content');

window.addEventListener('resize', updateViewBox);

function clearChildren(element) {
	[].slice.call(element.children).forEach(function(child) {
		element.removeChild(child);
	});
}

function updateInspector() {
	// clear inspector
	clearChildren(inspector);
	// don't add if nothing selected
	if(selected === null) return;
	// add items to inspector
	for(item in selected.options) {
		var el = h('.item', `${item}: `, selected.options[item].element);
		
		inspector.appendChild(el);
	}
}

function updateLayers() {
	// clear layers
	clearChildren(layers);
	// add layers
	let children = selected !== null ? selected.element.parentElement.children : render.children;
	[].slice.call(children).forEach(function(element) {
		let selected = element.classList.contains('selected') ? '.selected' : '';
		layers.appendChild(h(`.layer${selected}`, [
			`${element.getAttribute('data-type')} `,
			h('i',`(${element.tagName})`)
		]));
	});
}

function updateUI() {
	updateLayers();
	updateInspector();
}

function save() {
	let s = {
		entities: entities.map(function(entity) {})
	};
	return s;
}

var UI = {};

UI._Element = class {
	constructor() {
		this._render();

		this.callbacks = [];
		this._value;

		this._updateValue();
	}

	applyCallback() {
		this.callbacks = this.callbacks.concat([].slice.call(arguments));
	}

	activateCallbacks(newValue) {
		this.callbacks.forEach(function(callback) {
			callback(newValue);
		});
	}

	get value() {
		return this._value;
	}
 
	set value(newValue) {
		if(this._value != newValue) {
			this._value = newValue;
			this.activateCallbacks(this._value);
		}
		return this._value;
	}

	_render() {
		// Override
	}
}

UI.Input = class extends UI._Element {
	_updateValue() {
		setTimeout(function() {
			this.value = this.element.value;
		}.bind(this), 0);
	}

	_render() {
		this.element = h('input');	
		this.element.addEventListener('keyup', this._updateValue.bind(this));
	}
}

UI.Textarea = class extends UI._Element {
	_updateValue() {
		this.value = this.element.value;
	}

	_render() {
		this.element = h('textarea');
		this.element.addEventListener('input', this._updateValue.bind(this));
		this.element.addEventListener('change', this._updateValue.bind(this));
	}
}

UI.Bool = class extends UI._Element {
	_updateValue() {
		this.value = this.element.value;
	}

	_render() {
		this.element = h('input', { type: 'checkbox' });
		this.element.addEventListener('click', this._updateValue.bind(this));
	}
}

UI.Number = class extends UI._Element {
	_updateValue() {
		this.value = this.element.value;
	}

	_render() {
		this.element = h('input', { type: 'number' });
		this.element.addEventListener('change', this._updateValue.bind(this));
		this.element.addEventListener('keyup', this._updateValue.bind(this));
	}
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


let entities = {};

class Entity {
	constructor() {
		this._generateID();

		this.handles = [];

		this.options = {
			class: new UI.Input()
		};

		this._render();
		this.element.setAttribute('data-id', this.id);
		this.element.setAttribute('data-type', this.constructor.name);

		this._initPos();

		this._makeSelectable();
		this.select();
	}

	_generateID() {
		this.id = id();
		entities[this.id] = this;
	}

	addOption(name, type) {
		this.options[name] = type;
		updateUI();
		return type;
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
		// if(e) e.stopPropagation();
		if(selected != null) selected.deselect();
		this.showHandles();
		this.element.classList.add('selected');
		selected = this;

		this._updatePos();

		updateUI();
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
		let pos = this._convertPointToLocalCoords(this.pos);
		this.element.setAttribute('x', pos.x - this.scale.x);
		this.element.setAttribute('y', pos.y - this.scale.y);
	}

	_convertPointToLocalCoords(p) {
		let matrix = this.element.parentElement.getScreenCTM();
		return {
			x: (matrix.a * p.x) + (matrix.c * p.y) - matrix.e - viewBox.x,
			y: (matrix.b * p.x) + (matrix.d * p.y) - matrix.f - viewBox.y
		}
	}
	
	_render() {
		// Override
	}

	destroy() {
		if(this.ondestroy) {
			this.ondestroy();
		}
		this.element.parentElement.removeChild(this.element);
		this.destroyHandles();
	}
}

class Panel extends Entity {

	constructor() {
		super();

		this.pos.applyConstraint(constraints.snapToGrid.bind(null, 12.5));

		this.entities = [];

		this._initScale();

		this._updateScale();
		this._updatePos();
	}

	toggleEntity(entity) {
		let index = this.entities.indexOf(entity);
		if(index != -1) {
			render.appendChild(entity.element);
			this.entities.splice(index, 1);
		}else{
			this.content.appendChild(entity.element);
			this.entities.push(entity);
		}
		entity._updatePos();
		updateLayers();
	}

	_updatePos() {
		let pos = this._convertPointToLocalCoords(this.pos);
		this.panel.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
		this.content.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

		(this.entities || []).forEach(function(entity) {
			entity._updatePos();
		});
	}

	_initScale() {
		this.scale = this.addHandle(new Handle(100, 100));
		this.scale.parent(this.pos);
		this.scale.applyCallback(this._updateScale.bind(this));
		this.scale.applyConstraint(constraints.minimum.bind(null, 50, 50));
		this.scale.applyConstraint(constraints.snapToGrid.bind(null, 12.5));
	}

	_updateScale() {
		this.panel.setAttribute('width', this.scale.x);
		this.panel.setAttribute('height', this.scale.y);
	}

	_render() {
		this.element = svg('g', { mask: 'url(#panelMask)' }, [
			svg('defs', [
				this.panel = svg(`rect #panel${this.id}`, { width: 100, height: 100 }),

				svg(`clipPath #panelClip${this.id}`, [
					svg('use', { href: `#panel${this.id}` })
				])
			]),

			svg('g', { 'clip-path': `url(#panelClip${this.id})` }, [
				svg('use.panel', { href: `#panel${this.id}`, 'data-id': this.id }),
				this.content = svg('g.content'),
				svg('use.panel-border', { href: `#panel${this.id}`, 'data-id': this.id }),
			])
		]);

		this.maskElement = svg('use.panel-mask', {
			href: `#panel${this.id}`,
			fill: 'white'
		});
		panelMask.insertBefore(this.maskElement, panelMask.firstChild);
		
		render.appendChild(this.element);
	}

	ondestroy() {
		this.maskElement.parentElement.removeChild(this.maskElement);
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
			body: {
				path: {},
			},
			limbs: {
				left_arm: {},
				right_arm: {},
				left_leg: {},
				right_leg: {}
			}
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
		let body = this.anatomy.body;
		body.pos = this.addHandle(new RotationHandle(55, 65));
		body.pos.parent(this.pos);
		body.pos.applyCallback(this._updateBodyPos.bind(this));
		body.pos.handle.applyCallback(this._updateBodyPath.bind(this));

		body.control1 = this.addHandle(new RotationHandle(0, 100));
		body.control1.parent(body.pos);
		body.control1.applyCallback(this._updateBodyPath.bind(this));
		body.control1.handle.applyCallback(this._updateBodyPath.bind(this));

		body.control2 = this.addHandle(new Handle(-13, 51));
		body.control2.parent(body.pos);
		body.control2.applyCallback(this._updateBodyPath.bind(this));

		this._initLimbHandles();

		this._updateBodyPos();
		this._updateBodyPath();
	}

	_updateBodyPos() {
		let body = this.anatomy.body;
		let x = body.pos.x;
		let y = body.pos.y;
		body.element.setAttribute('transform', `translate(${x}, ${y})`);
	}

	_updateBodyPath() {
		let body = this.anatomy.body;
		let top_length = 50, bot_length = 25;
		let p1 = {
			x: Math.cos(body.pos.rotation) * top_length / 2,
			y: Math.sin(body.pos.rotation) * top_length / 2
		}
		let p2 = {
			x: body.control1.x + Math.cos(body.control1.rotation) * bot_length / 2,
			y: body.control1.y + Math.sin(body.control1.rotation) * bot_length / 2
		}
		let p3 = {
			x: body.control1.x - Math.cos(body.control1.rotation) * bot_length / 2,
			y: body.control1.y - Math.sin(body.control1.rotation) * bot_length / 2
		}
		let p4 = {
			x: -p1.x,
			y: -p1.y
		}
		let controlA = {
			x: body.control2.x + Math.cos((body.pos.rotation + body.control1.rotation) / 2) * (top_length + bot_length) / 4,
			y: body.control2.y + Math.sin((body.pos.rotation + body.control1.rotation) / 2) * (top_length + bot_length) / 4,
		}
		let controlB = {
			x: body.control2.x - Math.cos((body.pos.rotation + body.control1.rotation) / 2) * (top_length + bot_length) / 4,
			y: body.control2.y - Math.sin((body.pos.rotation + body.control1.rotation) / 2) * (top_length + bot_length) / 4,
		}

		this.anatomy.limbs.left_arm.pos = p4;
		this.anatomy.limbs.right_arm.pos = p1;
		this.anatomy.limbs.left_leg.pos = p3;
		this.anatomy.limbs.right_leg.pos = p2;

		this._updateLimbs();

		body.path.element.setAttribute('d', `
			M ${p1.x} ${p1.y}
			Q ${controlA.x} ${controlA.y} ${p2.x} ${p2.y}
			L ${p3.x} ${p3.y}
			Q ${controlB.x} ${controlB.y} ${-p1.x} ${-p1.y}
			Z
		`);
	}

	_initLimbHandles() {
		let limbs = this.anatomy.limbs;
		let iHP = { // initialHandlePositions
			'left_arm': [{x: -53, y: 96}, {x: -63, y: 38}],
			'right_arm': [{x: 65, y: 88}, {x: 26, y: 54}],
			'left_leg': [{x: -29, y: 203}, {x: 3, y: 130}],
			'right_leg': [{x: 31, y: 204}, {x: 30, y: 130}],
		};
		for(let limb in iHP) {
			limbs[limb].control1 = this.addHandle(new Handle(iHP[limb][0].x, iHP[limb][0].y));
			limbs[limb].control1.parent(this.anatomy.body.pos);
			limbs[limb].control1.applyCallback(this._updateLimb.bind(this, limbs[limb]));

			limbs[limb].control2 = this.addHandle(new Handle(iHP[limb][1].x, iHP[limb][1].y));
			limbs[limb].control2.parent(this.anatomy.body.pos);
			limbs[limb].control2.applyCallback(this._updateLimb.bind(this, limbs[limb]));

			// this._updateLimb(limbs[limb]);
		}
	}

	_updateLimb(limb) {
		limb.element.setAttribute('d', `
			M ${limb.pos.x} ${limb.pos.y}
			Q ${limb.control2.x} ${limb.control2.y} ${limb.control1.x} ${limb.control1.y}
		`);
	}

	_updateLimbs() {
		for(let limb in this.anatomy.limbs) {
			this._updateLimb(this.anatomy.limbs[limb]);
		}
	}

	_updatePos() {
		this._applyTransformations();
	}

	_applyTransformations() {
		let pos = this._convertPointToLocalCoords(this.pos);
		this.element.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
	}

	_render() {
		this._initAnatomy();

		this.element = svg('g.character', [	
			this.anatomy.body.element = svg('g.bodygroup', [
				svg('defs', [
					this.anatomy.body.path.element = svg(`path #body${this.id}`),

					svg(`clipPath #bodyClip${this.id}`, [
						svg('use', { 'xlink:href': `#body${this.id}` })
					])
				]),

				svg('g.limbs', [
					this.anatomy.limbs.left_arm.element = svg('path.limb'),
					this.anatomy.limbs.right_arm.element = svg('path.limb'),
					this.anatomy.limbs.left_leg.element = svg('path.limb'),
					this.anatomy.limbs.right_leg.element = svg('path.limb'),
				]),

				svg('use.body-border', { 'xlink:href': `#body${this.id}` }),
				svg('g', { 'clip-path': `url(#bodyClip${this.id})` }, [
					svg('use.body-shadow', { 'xlink:href': `#body${this.id}`, filter: 'url(#noise)' }),
					svg('use.body-highlight', { 'xlink:href': `#body${this.id}`, filter: 'url(#blur)', x: 5, y: -5 }),
				]),
			]),

			this.anatomy.head.element = svg('g.headgroup', [
				svg('defs', [
					svg(`circle #head${this.id}`, {r: 25}),
					svg(`clipPath #headClip${this.id}`, [
						svg('use', { 'xlink:href': `#head${this.id}` })
						// svg('circle', { r: this.anatomy.head.radius - 2 })
					])
				]),

				svg('use.head-border', { 'xlink:href': `#head${this.id}`}),

				svg('g', {
					'clip-path': `url(#headClip${this.id})`
				}, [
					svg('use.head-shadow', { 'xlink:href': `#head${this.id}`, filter: 'url(#noise)' }),
					svg('use.head-highlight', { 'xlink:href': `#head${this.id}`, filter: 'url(#blur)', x: 5, y: -5 }),

					this.anatomy.head.eyes.element = svg('g.eyes', {
						
					}, [
						svg('ellipse', {
							cx: -7, rx: 3, ry: 9,
						}),
						svg('ellipse', {
							cx: 7, rx: 3, ry: 9,
						})
					])
				])
				
				/*,*/

				
			]),
		]);

		render.appendChild(this.element);
	}
}

class SpeechBubble extends Entity {
	constructor() {
		super();

		this._initHandles();
		this._initUI();

		this._updatePos();
		this._updateScale();
		this._updateStem();
	}

	_initUI() {
		let text = this.addOption('text', new UI.Textarea());
		text.applyCallback(this._updateText.bind(this));
	}

	_updateText(text) {
		this.text.textContent = text;
	}

	_initHandles() {
		this.scale = this.addHandle(new Handle(100, 60));
		this.scale.parent(this.pos);
		this.scale.applyCallback(this._updateScale.bind(this));

		this.stem_base = this.addHandle(new Handle(50, 30));
		this.stem_base.parent(this.pos);
		this.stem_base.applyCallback(this._updateStem.bind(this));

		this.stem_tip = this.addHandle(new Handle(50, 100));
		this.stem_tip.parent(this.pos);
		this.stem_tip.applyCallback(this._updateStem.bind(this));
	}

	_updateScale() {
		this.bubble.setAttribute('width', this.scale.x);
		this.bubble.setAttribute('height', this.scale.y);

		this.textBounds.setAttribute('width', this.scale.x);
		this.textBounds.setAttribute('height', this.scale.y);
	}

	_updateStem() {
		let offsetX = Math.cos(direction(this.stem_tip, this.stem_base) + Math.PI / 2) * 10;
		let offsetY = Math.sin(direction(this.stem_tip, this.stem_base) + Math.PI / 2) * 10;
		this.stem.setAttribute('points', `
			${this.stem_tip.x}, ${this.stem_tip.y}
			${this.stem_base.x + offsetX}, ${this.stem_base.y + offsetY}
			${this.stem_base.x - offsetX}, ${this.stem_base.y - offsetY}
		`)
	}

	_updatePos() {
		this._applyTransformations();
	}

	_applyTransformations() {
		let pos = this._convertPointToLocalCoords(this.pos);
		this.element.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
	}

	_render() {
		this.element = svg('g.speechbubble', [
			svg('defs', [
				this.bubble = svg(`rect #bubble${this.id}`, { rx: 10, ry: 10 }),
				this.stem = svg(`polygon #stem${this.id}`),
				svg(`clipPath #speechbubble${this.id}`, [
					svg('use', { href: `#bubble${this.id}`}),
					svg('use', { href: `#stem${this.id}`})
				])
			]),
			svg('use.bubble', { href: `#bubble${this.id}`}),
			svg('use.stem', { href: `#stem${this.id}`}),
			svg('rect.fill', { 'clip-path': `url(#speechbubble${this.id})`, x: -1000, y: -1000, width: 2000, height: 2000 }),
		
			this.textBounds = svg('foreignObject', [
				this.text = h('p.text')
			])
		]);

		render.appendChild(this.element);
	}
}

class Caption extends Entity {
	constructor() {
		super();

		this.pos.applyConstraint(constraints.snapToGrid.bind(this, 12.5));

		this._initScale();
		this._initUI();

		this._updateScale();
	}

	_initUI() {
		let text = this.addOption('text', new UI.Textarea());
		text.applyCallback(this._updateText.bind(this));
	}

	_updateText(text) {
		this.text.textContent = text;
	}

	_initScale() {
		this.scale = this.addHandle(new Handle(100, 50));
		this.scale.parent(this.pos);
		this.scale.applyConstraint(constraints.snapToGrid.bind(this, 12.5));
		this.scale.applyCallback(this._updateScale.bind(this));
	}

	_updateScale() {
		this.rectangle.setAttribute('width', this.scale.x);
		this.rectangle.setAttribute('height', this.scale.y);

		this.textBounds.setAttribute('width', this.scale.x);
		this.textBounds.setAttribute('height', this.scale.y);
	}

	_updatePos() {
		this.rectangle.setAttribute('transform', `translate(${this.pos.x}, ${this.pos.y})`);
		this.textBounds.setAttribute('transform', `translate(${this.pos.x}, ${this.pos.y})`);
	}

	_render() {
		this.element = svg('g.captiongroup', [
			svg('defs', [
				this.rectangle = svg(`rect #caption${this.id}`),
			]),
			svg('use.caption', { href: `#caption${this.id}` }),
			this.textBounds = svg('foreignObject', [
				this.text = h('p.text')
			])
		]);

		this.maskElement = svg('use.caption-mask', { 
			href: `#caption${this.id}`,
			stroke: `black`,
			'stroke-width': 12.5
		});
		panelMask.appendChild(this.maskElement);

		this.extraBorder = svg('use.caption-extra-border', {
			href: `#caption${this.id}`,
			stroke: '#333333',
			'stroke-width': 16.5
		});
		extraBorders.appendChild(this.extraBorder);

		render.appendChild(this.element);
	}

	ondestroy() {
		this.maskElement.parentElement.removeChild(this.maskElement);
		this.extraBorder.parentElement.removeChild(this.extraBorder);
	}
}

hotkeys('ctrl+1, ctrl+2, ctrl+3, ctrl+4', function(event, handler) {
	switch(handler.key) {
		case 'ctrl+1': new Panel(); break;
		case 'ctrl+2': new Caption(); break;
		case 'ctrl+3': new Character(); break;
		case 'ctrl+4': new SpeechBubble(); break;
	}
});

hotkeys('ctrl+q, ctrl+w, ctrl+e, ctrl+r', function(event, handler) {
	if(selected === null) return;
	var el = selected.element;
	var p = el.parentElement;
	switch(handler.key) {
		case 'ctrl+q': p.insertBefore(el, p.children[0]); break;
		case 'ctrl+w': if(el.previousElementSibling) p.insertBefore(el, el.previousElementSibling); break;
		case 'ctrl+e': if(el.nextElementSibling) p.insertBefore(el.nextElementSibling, el); break;
		case 'ctrl+r': p.appendChild(el); break;
	}
	updateUI();
});

hotkeys('ctrl+a', function(event, handler) {
	switch(handler.key) {
		case 'ctrl+a':
			if(mouse.target.classList.contains('panel') && selected != null) {
				entities[mouse.target.getAttribute('data-id')].toggleEntity(selected);
			}
			break;
	}
})

hotkeys('ctrl+shift+x', function(event, handler) {
	if(selected != null) {
		selected.destroy();
		selected = null;
	}
	updateUI();
});

paper.addEventListener('mousedown', function(e) {
	if(e.target === paper && selected != null) {
		selected.deselect();
		selected = null;

		updateLayers();
		updateInspector();
	}
});
