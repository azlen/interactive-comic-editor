"use strict";

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
					for(let attr in l) {
						if(attr === 'style') {
							for(let style in l[attr]) {
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

(function() {
	var count = 0;

	window.id = function() {
		return count++;
	}
})(); // id

(function() {
	window.traverseLeafElements = function(element, func) {
	    let child = element.firstElementChild;
	    if(child === null) func(element)
	    while (child) {
	        traverseLeafElements(child, func);
	        child = child.nextElementSibling;
	    }
	}
})(); // traverseLeafElements

let panelMask, disruptMask, render, extraBorders, handles;
let selected = null;

let undoStack = [];
let redoStack = [];

let paper = svg('svg.paper', [	
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
		svg('filter #dilate-subtract', [
			svg('feFlood', { floodColor: 'black', result: 'floodBlack' }),
			svg('feMorphology', { in: 'SourceGraphic', operator: 'dilate', radius: 12.5, result: 'dilated' }),
			svg('feComposite', { in: 'floodBlack', in2: 'dilated', operator: 'in', result: 'subtraction' }),
			svg('feComposite', { in: 'subtraction', in2: 'SourceGraphic', operator: 'xor' })
		]),
		svg('filter #dilate-border', [
			svg('feFlood', { floodColor: '#333333', result: 'floodBlack' }),
			svg('feMorphology', { in: 'SourceGraphic', operator: 'dilate', radius: 12.5, result: 'dilated' }),
			svg('feMorphology', { in: 'dialated', operator: 'dilate', radius: 2, result: 'dilated2' }),
			svg('feComposite', { in: 'floodBlack', in2: 'dilated2', operator: 'in'/*, result: 'subtraction' */}),
			svg('feComposite', { in: 'subtraction', in2: 'SourceGraphic', operator: 'xor' })
		]),
		svg('mask #panelMask', { maskUnits: 'userSpaceOnUse' }, [
			panelMask = svg('g'),
			disruptMask = svg('g')
		]),
	]),
	
	render = svg('g.render'),
	extraBorders = svg('g.extraborders', { mask: 'url(#panelMask)' }),
	handles = svg('g.handles'),
]);

document.body.appendChild(paper);

let viewBox = {
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
	for(let item in selected.options) {		
		inspector.appendChild(selected.options[item].inspector_element);
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
	let data = localStorage.getItem('data');
	if(data !== null && data !== undoStack[undoStack.length - 1]) {
		undoStack.push(data);
	}

	localStorage.setItem('data', JSON.stringify(getSaveObject()))
}

function getSaveObject() {
	let s = {
		entities: []
	};
	for(let key in entities) {
		let entity = entities[key];
		let savedEntity = {
			type: entity.constructor.name,
			options: {},
			handles: entity.handles.map(function(handle) {
				return {x: handle.x, y: handle.y};
			})
		};
		for(let opt in entity.options) {
			savedEntity.options[opt] = entity.options[opt].value;
		}
		if(entity.hasOwnProperty('entities') && entity.entities.length > 0) {
			savedEntity.entities = entity.entities.map(function(ent) {
				return ent.id;
			})
		}
		s.entities.push(savedEntity);
	} 
	return s;
}

function load(s) {
	destroyAll();

	let _ids = [];

	for(let i in s.entities) {
		let entity = new (entityTypes[s.entities[i].type])();
		_ids.push(entity.id);
		for(let opt in s.entities[i].options) {
			entity.options[opt].value = s.entities[i].options[opt];
		}
		s.entities[i].handles.forEach(function(handle, j) {
			entity.handles[j].setPosition(handle.x, handle.y, true);
		});
	}

	for(let i in s.entities) {
		if(s.entities[i].hasOwnProperty('entities')) {
			s.entities[i].entities.forEach(function(ent_id) {
				entities[_ids[i]].toggleEntity(entities[ent_id]);
			})
		}
	}
}

function destroyAll() {
	for(let key in entities) {
		entities[key].destroy();
	}
	entities = {};
}

var UI = {};

UI._Element = class {
	constructor(name) {
		this.name = name;

		this._render.apply(this, [].slice.call(arguments, 1));
		this.inspector_element =  h('.item', `${this.name}: `, this.element);

		this.callbacks = [];
		this._value;

		this._html2value();
	}

	_html2value() {
		this.value = this.element.value;
	}

	_value2html() {
		this.element.value = this.value;
	}

	_changed() {
		this._html2value();
		save();
	}

	toggleWith(uiElement, value) {
		uiElement.applyCallback(function(newValue) {
			if(newValue === (value || true)) this.inspector_element.classList.remove('hidden')
			else this.inspector_element.classList.add('hidden');
		}.bind(this));
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
			this._value2html(this._value);
		}
		return this._value;
	}

	_render() {
		// Override
	}
}

UI.Input = class extends UI._Element {
	_render(initialValue) {
		this.element = h('input', { value: (initialValue || '') });	
		this.element.addEventListener('input', this._html2value.bind(this));
		this.element.addEventListener('change', this._changed.bind(this));
	}
}

UI.Textarea = class extends UI._Element {
	_render(initialValue) {
		this.element = h('textarea', { value: (initialValue || '') });
		this.element.addEventListener('input', this._html2value.bind(this));
		this.element.addEventListener('change', this._changed.bind(this));
	}
}

UI.Bool = class extends UI._Element {
	_html2value() {
		this.value = this.element.checked;
	}

	_value2html() {
		this.element.checked = this.value;
	}

	_render(initialValue) {
		this.element = h('input', { type: 'checkbox' });
		this.element.checked = initialValue || false;
		this.element.addEventListener('click', this._changed.bind(this));
	}
}

UI.Number = class extends UI._Element {
	_render() {
		this.element = h('input', { type: 'number' });
		this.element.addEventListener('change', this._changed.bind(this));
		this.element.addEventListener('input', this._html2value.bind(this));
	}
}

UI.Select = class extends UI._Element {
	_render(options) {
		this.element = h('select', options.map(function(option) {
			return h('option', { value: option }, option);
		}));
		this.element.addEventListener('change', this._changed.bind(this));
	}
}

UI.Slider = class extends UI._Element {
	_render(initialValue, boundsArray) {
		this.element = h('input', { type: 'range' });
		this.element.addEventListener('change', this._changed.bind(this));
	}
}

UI.File = class extends UI._Element {
	_html2value() {
		if(this.input.files[0] !== undefined) {
			this.value = this.input.files[0].name;
		}
		this._value2html();
	}

	_value2html() {
		this.text.textContent = this.value;
	}

	_render() {
		this.element = h('span', [
			this.text = h('span', { style: { 'font-weight': 400 } }),
			this.button = h('button', 'choose file'),
			this.input = h('input.hidden', { type: 'file' }),
		]);
		this.button.addEventListener('click', function() {
			this.input.click();
		}.bind(this))
		this.input.addEventListener('change', this._changed.bind(this));
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

		this.disabled = false;

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

	relativeTo(handle) {
		return {
			x: (this.x + this.origin.x) - (handle.x + handle.origin.x),
			y: (this.y + this.origin.y) - (handle.y + handle.origin.y)
		}
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

		if(hotkeys.isPressed(16)) {
			newPos = constraints.snapToGrid.apply(null, [12.5, newPos]);
		} // THIS IS PROBABLY STUPID, APPLIED TO ALL HANDLES! (including rotation OMG)

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

	disable() {
		this.disabled = true;
		if(this.handle) this.handle.disable();
		this.hide();
	}

	enable() {
		this.disabled = false;
		if(this.handle) this.handle.enable();
		this.show();
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
				save();
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

		this.options = {};

		this._render();
		this.element.setAttribute('id', `entity${this.id}`);
		this.element.setAttribute('data-id', this.id);
		this.element.setAttribute('data-type', this.constructor.name);

		this._initDisrupt();

		this._initPos();

		this._makeSelectable();
		this.select();

		save();
	}

	_generateID() {
		this.id = id();
		entities[this.id] = this;
	}

	addOption(uiElement) {
		this.options[uiElement.name] = uiElement;
		updateUI();
		return uiElement;
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
		this.element.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
	}

	_convertPointToLocalCoords(p) {
		let matrix = this.element.parentElement.getScreenCTM();
		return {
			x: (matrix.a * p.x) + (matrix.c * p.y) - matrix.e - viewBox.x,
			y: (matrix.b * p.x) + (matrix.d * p.y) - matrix.f - viewBox.y
		}
	}

	moveToBackLayer() {
		this.element.parentElement.insertBefore(this.element, this.element.parentElement.firstElementChild);
		// this.maskElement.parentElement.insertBefore(this.maskElement, this.maskElement.parentElement.firstElementChild);
	}

	moveBackLayer() {
		if(this.element.previousElementSibling) {
			this.element.parentElement.insertBefore(this.element, this.element.previousElementSibling);
			// this.maskElement.parentElement.insertBefore(this.maskElement, this.maskElement.previousElementSibling);
		}
	}

	moveForwardLayer() {
		if(this.element.nextElementSibling) {
			this.element.parentElement.insertBefore(this.element.nextElementSibling, this.element);
			// this.maskElement.parentElement.insertBefore(this.maskElement.nextElementSibling, this.maskElement);
		}
	}

	moveToFrontLayer() {
		this.element.parentElement.appendChild(this.element);
		// this.maskElement.parentElement.appendChild(this.maskElement);
	}

	_initDisrupt() {
		/* this.addOption(new UI.Bool('disruptPanel', false));
		this.options.disruptPanel.applyCallback(this._updateDisruptPanel.bind(this));

		this.addOption(new UI.Slider('disruptAmount'));
		this.options.disruptAmount.toggleWith(this.options.disruptPanel);

		this.maskElement = svg(`g.disrupt-mask`);
		disruptMask.appendChild(this.maskElement);

		this.extraBorder = svg('g');
		extraBorders.appendChild(this.extraBorder);

		traverseLeafElements(this.element, function(element) {
			if(element.tagName !== 'use' && !element.classList.contains('fill')) {
				if(element.getAttribute('id') === null) {
					element.setAttribute('id', id());
				}
				let bbox = element.getBoundingClientRect();
				let originalStrokeWidth = Number(getComputedStyle(element)['stroke-width'].slice(0, -2));
				let maskBorderID = id();
				let maskFillID = id();

				this.maskElement.insertBefore( svg(`use #${maskBorderID}`, {
					href: `#${element.getAttribute('id')}`,
					transform: `translate(${bbox.left}, ${bbox.top})`,
					stroke: 'black',
					fill: 'none',
					'stroke-width': originalStrokeWidth + 25
				}), this.maskElement.firstElementChild);
				this.maskElement.appendChild( svg(`use #${maskFillID}`, {
					href: `#${element.getAttribute('id')}`,
					transform: `translate(${bbox.left}, ${bbox.top})`,
					stroke: 'none',
					fill: 'white'
				}) );

				this.extraBorder.insertBefore( svg(`use`, {
					href: `#${maskBorderID}`,
					'stroke-width': originalStrokeWidth + 29
				}), this.extraBorder.firstElementChild );
				this.extraBorder.appendChild( svg(`use`, { href: `#${maskFillID}` }) );
			}
		}.bind(this));*/

		

		/*

		this.extraBorder = svg('use.disrupt-extra-border', {
			href: `#entity${this.id}`,
			// filter: 'url(#dilate-border)',
			'stroke': '#333333',
			'stroke-width': 16.5
		});
		*/
	}

	_updateDisruptPanel() {

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
		delete entities[this.id];

		save();
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

	_render() {
		this._initAnatomy();

		this.element = svg('g.character', [	
			this.anatomy.body.element = svg('g.bodygroup', [
				svg('defs', [
					this.anatomy.body.path.element = svg(`path #body${this.id}`),

					svg(`clipPath #bodyClip${this.id}`, [
						svg('use', { href: `#body${this.id}` })
					])
				]),

				svg('g.limbs', [
					this.anatomy.limbs.left_arm.element = svg('path.limb'),
					this.anatomy.limbs.right_arm.element = svg('path.limb'),
					this.anatomy.limbs.left_leg.element = svg('path.limb'),
					this.anatomy.limbs.right_leg.element = svg('path.limb'),
				]),

				svg('use.body-border', { href: `#body${this.id}` }),
				svg('g', { 'clip-path': `url(#bodyClip${this.id})` }, [
					svg('use.body-shadow', { href: `#body${this.id}`, filter: 'url(#noise)' }),
					svg('use.body-highlight', { href: `#body${this.id}`, filter: 'url(#blur)', x: 5, y: -5 }),
				]),
			]),

			this.anatomy.head.element = svg('g.headgroup', [
				svg('defs', [
					svg(`circle #head${this.id}`, {r: 25}),
					svg(`clipPath #headClip${this.id}`, [
						svg('use', { href: `#head${this.id}` })
						// svg('circle', { r: this.anatomy.head.radius - 2 })
					])
				]),

				svg('use.head-border', { href: `#head${this.id}`}),

				svg('g', {
					'clip-path': `url(#headClip${this.id})`
				}, [
					svg('use.head-shadow', { href: `#head${this.id}`, filter: 'url(#noise)' }),
					svg('use.head-highlight', { href: `#head${this.id}`, filter: 'url(#blur)', x: 5, y: -5 }),

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

class TextEntity extends Entity {
	constructor() {
		super();

		this.pos.applyCallback(this._updateTail.bind(this));

		this.conjoinedTo = null;

		this._initHandles();
		this._initUI();

		this._updatePos();
		this._updateScale();
		this._updateTail();
	}

	toggleJoinTextEntity(entity) {
		if(this.conjoinedTo === null) {
			this.conjoinedTo = entity;
			entity.bubbleContainer.appendChild(this.bubble);
			entity.tailContainer.appendChild(this.tail);
		}else{
			this.bubbleContainer.appendChild(this.bubble);
			this.tailContainer.appendChild(this.tail);
		}
	}

	_initUI() {
		this.addOption(new UI.Textarea('text'));
		this.options.text.applyCallback(this._updateText.bind(this));

		this.addOption(new UI.Select('type', [
			'speechBubble',
			'caption',
			'thoughtBubble',
			'whisperBubble',
			'shoutBubble',
			'CUSTOM',
		]));
		this.options.type.applyCallback(this._updateType.bind(this));

		this.addOption(new UI.Select('shape', [
			'roundedRectangle',
			'rectangle',
			'ellipse',
			'cloud', 
			'scream',
		]));
		this.options.shape.applyCallback(this._updateShape.bind(this));

		this.addOption(new UI.Bool('whisper', false)); // SHOULD WE CHANGE TO BORDER-TYPE?

		this.addOption(new UI.Bool('showTail', true));
		this.options.showTail.applyCallback(this._updateTail.bind(this));

		this.addOption(new UI.Select('tailType', [
			'default',
		]));
		this.options.tailType.toggleWith(this.options.showTail);
		this.options.showTail.applyCallback(this._updateTail.bind(this));

		this.addOption(new UI.Bool('curveTail', false));
		this.options.curveTail.toggleWith(this.options.showTail);
	}

	_updateType(type) {
		switch(type) {
			case 'speechBubble':
				this.options.shape.value = 'roundedRectangle';
				this.options.showTail.value = true;
				this.options.tailType.value = true;
				break;
			case 'caption':
				this.options.shape.value = 'rectangle';
				this.options.showTail.value = false;
				break;
		}
	}

	_updateShape(shape) {
		let replace = (shape !== undefined);
		shape = (this.options.shape.value || shape);
		let __setBubbleElement = (function (newElement) {
			this.bubble.parentElement.replaceChild(newElement, this.bubble);
			this.bubble = newElement;
		}).bind(this);
		switch(shape) {
			case 'roundedRectangle':
			case 'rectangle':
				if(replace) { __setBubbleElement(
					svg(`rect`, (shape === 'roundedRectangle' ? { rx: 10, ry: 10 } : {}) )
				) };
				this.bubble.setAttribute('width', this.scale.x);
				this.bubble.setAttribute('height', this.scale.y);
				break;
			case 'ellipse':
				if(replace) { __setBubbleElement(
					svg(`ellipse`)
				) };
				this.bubble.setAttribute('cx', this.scale.x / 2);
				this.bubble.setAttribute('cy', this.scale.y / 2);
				this.bubble.setAttribute('rx', this.scale.x / 2);
				this.bubble.setAttribute('ry', this.scale.y / 2);
				break;
		}
		this._updatePos();
	}

	_updateText(text) {
		this.text.textContent = text;
	}

	_initHandles() {
		this.scale = this.addHandle(new Handle(100, 60));
		this.scale.parent(this.pos);
		this.scale.applyCallback(this._updateScale.bind(this));

		this.tail_base = this.addHandle(new Handle(50, 30));
		this.tail_base.parent(this.pos);
		this.tail_base.applyCallback(this._updateTail.bind(this));

		this.tail_tip = this.addHandle(new Handle(this.pos.x + 50, this.pos.y + 100));
		this.tail_tip.applyCallback(this._updateTail.bind(this));
	}

	_updateScale() {
		this._updateShape();

		this.textBounds.setAttribute('width', this.scale.x);
		this.textBounds.setAttribute('height', this.scale.y);
	}

	_updateTail() {
		if(!this.options.showTail.value) { // separate to different func?
			this.tail_base.disable();
			this.tail_tip.disable();
			this.tail.classList.add('hidden');
		}else{
			this.tail_base.enable();
			this.tail_tip.enable();
			this.tail.classList.remove('hidden');
		}
		let relative_tip_pos = this.tail_tip.relativeTo(this.pos);
		let offsetX = Math.cos(direction(relative_tip_pos, this.tail_base) + Math.PI / 2) * 10;
		let offsetY = Math.sin(direction(relative_tip_pos, this.tail_base) + Math.PI / 2) * 10;
		this.tail.setAttribute('points', `
			${relative_tip_pos.x}, ${relative_tip_pos.y}
			${this.tail_base.x + offsetX}, ${this.tail_base.y + offsetY}
			${this.tail_base.x - offsetX}, ${this.tail_base.y - offsetY}
		`);
	}

	_updatePos() {
		let pos = this._convertPointToLocalCoords(this.pos);
		this.bubble.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
		this.textBounds.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
		this.tail.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
	}

	_render() {
		this.element = svg('g.speechbubble', [
			svg('defs', [
				this.bubbleContainer = svg(`g #bubble${this.id}`, [
					this.bubble = svg(`rect`, { rx: 10, ry: 10 }),
				]),
				this.tailContainer = svg(`g #tail${this.id}`, [
					this.tail = svg(`polygon`),
				]),
				svg(`clipPath #speechbubble${this.id}`, [
					svg('use', { href: `#bubble${this.id}`}),
					svg('use', { href: `#tail${this.id}`})
				])
			]),
			svg('use.bubble-border', { href: `#bubble${this.id}`}),
			svg('use.tail-border', { href: `#tail${this.id}`}),
			svg('use.bubble-fill', { href: `#bubble${this.id}`}),
			svg('use.tail-fill', { href: `#tail${this.id}`}),
			
		
			this.textBounds = svg('foreignObject', [
				this.text = h('p.text')
			])
		]);

		render.appendChild(this.element);
	}
}

class ImportEntity extends Entity {
	constructor() {
		super();

		this.pos._initRotationalHandle(0);

		this.addOption(new UI.File('image'));
	}

	_render() {
		this.element = svg('g',	[
			svg('rect.no-pointer-events', { width: 100, height: 100 }),
		]);

		render.appendChild(this.element);
	}
}

let entityTypes = {Panel, Character, TextEntity, ImportEntity};

hotkeys('ctrl+1, ctrl+2, ctrl+3, ctrl+4', function(event, handler) {
	switch(handler.key) {
		case 'ctrl+1': new Panel(); break;
		case 'ctrl+2': new TextEntity(); break;
		case 'ctrl+3': new Character(); break;
		case 'ctrl+4': new ImportEntity(); break;
	}
});

hotkeys('ctrl+a, ctrl+s, ctrl+d, ctrl+f', function(event, handler) {
	if(selected === null) return;
	switch(handler.key) {
		case 'ctrl+a': selected.moveToBackLayer(); break;
		case 'ctrl+s': selected.moveBackLayer(); break;
		case 'ctrl+d': selected.moveForwardLayer(); break;
		case 'ctrl+f': selected.moveToFrontLayer(); break;
	}
	updateUI();
});

hotkeys('ctrl+q, ctrl+w', function(event, handler) {
	let hoveredEntity = entities[mouse.target.getAttribute('data-id')];
	switch(handler.key) {
		case 'ctrl+q':
			if(mouse.target.classList.contains('panel') && selected != null) {
				hoveredEntity.toggleEntity(selected);
			}
			break;
		case 'ctrl+w':
			/*if(selected.constructor === TextEntity && hoveredEntity.constructor === TextEntity) {
				selected.joinTextEntity(hoveredEntity);
			}*/
			console.log(mouse.target);
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

hotkeys('ctrl+shift+m', function(event, handler) {
	if(confirm('Are you sure you want to clear the current save?')) {
		destroyAll();
		save();
	}
});

paper.addEventListener('mousedown', function(e) {
	if(e.target === paper && selected != null) {
		selected.deselect();
		selected = null;

		updateLayers();
		updateInspector();
	}
});

/*setInterval(function() {
	localStorage.setItem('data', JSON.stringify(save()));
}, 1000);*/

(function(){
	let data = localStorage.getItem('data');
	if(data !== null) {
		undoStack.push(data);
		load(JSON.parse(data));
	}
})(); // load current save



