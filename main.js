"use strict";

/* --------------------================-------------------- */
/*                    Utility  Functions                    */
/* --------------------================-------------------- */

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
		if(!p2) { p2=p1; p1={x:0,y:0} };
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

/*(function() {
	window.shadeBlend = function(p,c0,c1) {
		var n=p<0?p*-1:p,u=Math.round,w=parseInt;
		if(c0.length>7){
			var f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
			return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")"
		}else{
			var f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
			return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1)
		}
	}
})();*/

(function() {
	window.traverseLeafElements = function(element, func) {
	    let child = element.firstElementChild;
	    if(child === null) func(element)
	    while (child) {
	        traverseLeafElements(child, func);
	        child = child.nextElementSibling;
	    }
	}

	window.getClosestEntityID = function(element) {
		while(element) {
			if(element.hasAttribute('data-id')) {
				return element.getAttribute('data-id');
			}
			element = element.parentElement;
		}
		return null;
	}
})(); // traverseLeafElements, getClosestEntityID


function getShadowColor(color, darkness) {
	let colorA = tinycolor(color).spin(-30).darken(darkness || 15);
	let colorB = tinycolor(color).spin(30).darken(darkness || 15);
	let shadowColor = colorA.getBrightness() < colorB.getBrightness() ? colorA : colorB;
	return shadowColor.toString();
}


/* --------------------================-------------------- */
/*                        Init Vars                         */
/* --------------------================-------------------- */

let defs, panelMask, disruptMask, render, extraBorders, handles;
let selected = null;

let imageDirectory = '../images/';
imageDirectory = '/Documents/Explorable Explanations/Backwords/images/'

let undoStack = [];
let redoStack = [];
let clipBoard = null;

let paper = svg('svg.paper', [	
	defs = svg('defs', [
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
		svg('filter #sketchy', [
			svg('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.05, numOctaves: 3, result: 'texture' }),
			svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'texture', scale: 4, result: 'displacement' }),
		]),
		/*svg('filter #dilate-subtract', [
			svg('feFlood', { floodColor: 'black', result: 'floodBlack' }),
			svg('feMorphology', { in: 'SourceGraphic', operator: 'dilate', radius: 12.5, result: 'dilated' }),
			svg('feComposite', { in: 'floodBlack', in2: 'dilated', operator: 'in', result: 'subtraction' }),
			svg('feComposite', { in: 'subtraction', in2: 'SourceGraphic', operator: 'xor' })
		]),
		svg('filter #dilate-border', [
			svg('feFlood', { floodColor: '#333333', result: 'floodBlack' }),
			svg('feMorphology', { in: 'SourceGraphic', operator: 'dilate', radius: 12.5, result: 'dilated' }),
			svg('feMorphology', { in: 'dialated', operator: 'dilate', radius: 2, result: 'dilated2' }),
			svg('feComposite', { in: 'floodBlack', in2: 'dilated2', operator: 'in'}), // result: 'subtraction'
			// svg('feComposite', { in: 'subtraction', in2: 'SourceGraphic', operator: 'xor' })
		]),*/
		svg('mask #panelMask', { maskUnits: 'userSpaceOnUse' }, [
			panelMask = svg('g'),
			disruptMask = svg('g')
		]),
	]),
	
	render = svg('g.render'),
	extraBorders = svg('g.extraborders', { mask: 'url(#panelMask)' }),
	handles = svg('g.handles'),
]);

let viewBox = {
	x: 0, y: 0,
	scale: 1,
}

let inspector = document.querySelector('.inspector .content');
let layers = document.querySelector('.layers .content');

/* --------------------================-------------------- */
/*                        Functions                         */
/* --------------------================-------------------- */

function updateViewBox() {
	paper.setAttribute('viewBox', `
		${viewBox.x/* - paper.width.baseVal.value * viewBox.scale / 2*/},
		${viewBox.y/* - paper.height.baseVal.value * viewBox.scale / 2*/},
		${paper.width.baseVal.value * viewBox.scale},
		${paper.height.baseVal.value * viewBox.scale}
	`);
}

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
	let data = JSON.stringify(getSaveObject());
	undoStack.push(data);
	redoStack = [];

	localStorage.setItem('data', data);
}

function saveToFileSystem() {
	download(JSON.stringify(getSaveObject()), `COMIX_${new Date() * 1}.json`);
}

function download(text, filename) {
	let blob = new Blob([text], {type: "text/plain;charset=utf-8"});
	saveAs(blob, filename);
}

function getSaveObject() {
	let s = {
		entities: []
	};
	for(let key in entities) {
		let entity = entities[key];
		s.entities.push(getSavedEntityObject(entity));
	} 
	return s;
}

function getSavedEntityObject(entity) {
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
	if(entity.hasOwnProperty('content') && entity.content.entities.length > 0) {
		savedEntity.entities = entity.content.entities.map(function(ent) {
			return ent.id;
		})
	}
	if(entity.currentPanel !== null) {
		savedEntity.currentPanel = entity.currentPanel.id;
	}
	return savedEntity;
}

function load(s) {
	destroyAll();

	let _ids = [];

	for(let i in s.entities) {
		let entity = createEntityFromSaveObject(s.entities[i]);
		_ids.push(entity.id);
	}
}

function createEntityFromSaveObject(s) {
	let entity = new (entityTypes[s.type])();
	
	for(let opt in s.options) {
		entity.options[opt].value = s.options[opt];
	}
	s.handles.forEach(function(handle, j) {
		entity.handles[j].setPosition(handle.x, handle.y, true);
	});

	if(s.hasOwnProperty('entities')) {
		s.entities.forEach(function(ent_id) {
			if(entities.hasOwnProperty(ent_id)) {
				entity.content.toggleEntity(entities[ent_id]);
			}
		})
	}

	if(s.hasOwnProperty('currentPanel') && entities.hasOwnProperty(s.currentPanel)) {
		entities[s.currentPanel].content.toggleEntity(entity);
	}

	return entity;
}

function undo() {
	if(undoStack.length <= 1) return;
	let data = undoStack.pop();
	console.log('UNDO: ', data)
	if(data !== undefined) {
		redoStack.push(data);
		load(JSON.parse(undoStack[undoStack.length - 1]));

		localStorage.setItem('data', undoStack[undoStack.length - 1]);
	}
}

function redo() {
	let data = redoStack.pop();
	console.log('REDO: ', data);
	if(data !== undefined) {
		undoStack.push(data);
		load(JSON.parse(data));

		localStorage.setItem('data', data);
	}
}

function cut() {
	copy();
	selected.destroy();

	save();
}

function copy() {
	clipBoard = getSavedEntityObject(selected);
}

function paste() {
	if(clipBoard === null) return;
	let entity = createEntityFromSaveObject(clipBoard, true);
	entity.pos.setPosition(mouse.x, mouse.y, true);

	save();
}

function exportAll() {
	JSZipUtils.getBinaryContent('_export.zip', function(err, data) {
	    if(err) {
	        throw err; // or handle err
	    }

	    // let zip = new JSZip(data);

	    JSZip.loadAsync(data, { createFolders: true }).then(function (zip) {

	    	zip = zip.folder('_export');

	    	
			let js = zip.folder('js');

			Promise.resolve(zip)
				.then(exportJS)
				.then(exportImages)
				.then(exportHTML)
				.then(function() {
					zip.generateAsync({type:"blob"}).then(function(content) {
						saveAs(content, "COMIX_EXPORT.zip");
					});
				});
	    });
	});
}

function exportImages(zip) {
	let promise = Promise.resolve(zip);

	let imageFolder = zip.folder('images');

	let images = [].slice.call(paper.querySelectorAll('image'));
	for(let i in images) {
		let href = images[i].getAttribute('href');
		let name = href.replace(/.*\//, '');

		promise = promise.then(function(zip) {
			return new Promise(function(resolve, reject) {
				JSZipUtils.getBinaryContent(href, function (err, data) {
					if(err) {
						throw err; // or handle the error
					}
					zip.folder('images').file(name, data, {binary:true});
					console.log('IMAGE');
					resolve(zip);
				});
			});
		});
	}

	console.log(promise);

	return promise;
}

function exportHTML(zip) {
	let headElement, svgElement;
	let htmlElement = h('html', [
		headElement = h('head'),
		h('body', [
			svgElement = svg('svg.paper'),
			h('script', {src: 'js/_util.js'}),
			h('script', {src: 'js/_init.js'}),
		])
	]);
	headElement.innerHTML = document.head.innerHTML;
	svgElement.innerHTML = defs.outerHTML + render.outerHTML;
	
	let images = [].slice.call(svgElement.querySelectorAll('image'));
	for(let i in images) {
		let href = images[i].getAttribute('href');
		let name = href.replace(/.*\//, '');

		images[i].setAttribute('href', 'images/' + name);
	}

	zip.file('index.html', htmlElement.outerHTML)

	return zip;
}

function exportJS(zip) {
	let _classes = {};
	let _entityCode = [];

	let jsFolder = zip.folder('js');

	// initialize class objects and add update functions
	function addClass(_CLASS, opts) {
		opts = Object.assign({}, opts);
		if(opts.saveWhole) {
			_classes[_CLASS.name] = _CLASS.toString();
		} else {
			let c = _classes[_CLASS.name] = {
				fns: {}
			};

			let input = _CLASS.toString();
			let callbackRegex = /([^\t]+)\.applyCallback\(this\.([^;\n]+)\.bind\((.*)\)\)/g; // match instances of calling .applyCallback()
			let plusRegex = /((?:(?:set|get) )?\w*)\(.*\)\s*\{?\s*\/\*\++\*\/|\/\*\++\*\/\s*((?:(?:set|get) )?\w*)/g;
			let optionRegex = /(this.*addOption)\(.*\((['"]\w+['"])[\s\S]*;/g

			function addClassFunction(name) {
				// if(name === 'constructor') {
				let fn_regex = new RegExp(String.raw`${name}\([^\(\)]*\)\s*\{[\s\S]*?\n\t\}`);
				let match = _CLASS.toString().match(fn_regex);
				if(match !== null) {
					let fn_str = match[0].replace(optionRegex, '$1(new Option($2));')
					if(name === 'constructor') {
						c.fns[`_${name}`] = fn_str;
					} else {
						c.fns[name] = fn_str;
					}
					
				}
				/*} else {
					if(!_CLASS.prototype.hasOwnProperty(name)) return;
					let fn = _CLASS.prototype[name];
					c.fns[fn.name] = fn.toString();
				}*/
			}

			c.def = opts.def || input.match(/^.*?(?=\{)/)[0];

			let matches;
			
			while(matches = callbackRegex.exec(input)) {
				addClassFunction(matches[2]);
			}

			while(matches = plusRegex.exec(input)) {
				addClassFunction(matches[1] || matches[2]);
			}
		}
	}
	addClass(UI._Element, {def: 'class Option '})
	addClass(Handle);
	addClass(RotationHandle, {saveWhole: true});
	addClass(Visual, {saveWhole: true});
	addClass(Entity);
	Object.values(Object.assign({}, entityTypes, subEntityTypes)).forEach(addClass);

	// find vars for class constructors
	let _id = 0;
	function addClassVars(entity, parent, crumb) {
		crumb = crumb || '';

		let c = _classes[entity.constructor.name];
		// if(!c.init) {
		c.init = [];
		c.args = [];
		c.isEntityType = true;

		if(crumb === '') {
			crumb = `v${_id++}`;
			_entityCode.push(`
				let ${crumb} = new ${entity.constructor.name}();
			`);
		}

		function iterateOverVars(obj, crumb2) {
			crumb2 = crumb2 || ''
			Object.keys(obj).forEach(function(variableName) {
				let v = obj[variableName];
				if(v) {
					if(v.tagName) { // variable is element
						if(!v.hasAttribute('id')) v.setAttribute('id', `E${_id++}`);

						_entityCode.push(`
							${crumb}${crumb2}.${variableName} = $("#${v.getAttribute('id')}");
						`);
					} else if(v.constructor === Handle) {
						
					} else if(subEntityTypes.hasOwnProperty(v.constructor.name)) {
						if(v !== parent) {
							addClassVars(v, entity, `${crumb}${crumb2}.${variableName}`);
						}
					} else if(v.constructor === Object) {
						iterateOverVars(v, `${crumb2 || ''}.${variableName}`);
					}
				}
			});
		}
		
		iterateOverVars(entity);
		// }
	}
	Object.values(entities).forEach(function(entity) {
		addClassVars(entity);
	});

	// generate final class strings
	let generatedClasses = Object.values(_classes).map(function(c) {
		if(c.constructor === String) return c;
		let output = `${c.def} {
			${Object.values(c.fns).join('\n\n')}
		}`;
		return output;

	}).join('\n\n').replace(/.*\/\*~+\*\/.*/g, ''); // |\/\*\++\*\/
	
	let finalCode = `
		${generatedClasses}
		${_entityCode.join('')}
	`

	jsFolder.file('_init.js', js_beautify(finalCode, {
		"indent_with_tabs": true,
		"preserve_newlines": false,
	}));

	return zip;
}

function destroyAll() {
	for(let key in entities) {
		entities[key].destroy();
	}
	entities = {};
}

/* --------------------================-------------------- */
/*                            UI                            */
/* --------------------================-------------------- */

var UI = {};

UI._Element = class { // UI element base class 
	constructor(name) { /*++++*/
		this.name = name; // name used in inspector element

		// render UI element (with all extra arguments passed into this constructor, basically arguments minus "name")
		/*~~~*/ this._render.apply(this, [].slice.call(arguments, 1));
		// create inspector element to display both name and input in inspector
		/*~~~*/ this.inspector_element =  h('.item', `${this.name}: `, this.element);

		// initialize variables
		this.callbacks = [];
		this._value;

		// pull value from HTML to set the initial value in this UI element
		/*~~~*/ this._html2value();
	}

	_html2value() { // set value to element value
		this.value = this.element.value;
	}

	_value2html() { // set element value to value
		this.element.value = this.value;
	}

	_changed() { // _html2value w/ save, which pushes changes to undoStack
		this._html2value();
		save();
	}

	toggleWith(uiElement, value) {
		// show this UI element when other UI element is equal to a certain value
		value = value || true; // default value: true (e.g., bool UI elements)
		// Apply callback to other UI element to check its value onchange
		uiElement.applyCallback(function(newValue) {
			if(newValue === value) { // if value is present, show this UI element
				this.inspector_element.classList.remove('hidden');
			} else { // if value is NOT present, hide this UI element
				this.inspector_element.classList.add('hidden')
			};
		}.bind(this));
	}

	// add (one or multiple) callback(s) to trigger when value changes for this UI element
	applyCallback() { /*++++*/
		this.callbacks = this.callbacks.concat([].slice.call(arguments));
	}

	// activate each callback on this UI element and feed it new value
	activateCallbacks(newValue) { /*++++*/
		this.callbacks.forEach(function(callback) {
			callback(newValue);
		});
	}

	// get value of this UI element
	get value() { /*++++*/
		return this._value;
	}
 	
 	// set value of this UI element and activate callbacks listening for changes
	set value(newValue) { /*++++*/
		if(this._value !== newValue) { // only set value + apply callbacks IF THE VALUE HAS ACTUALLY CHANGED
			this._value = newValue; // set value
			this.activateCallbacks(this._value); // activate callbacks
			/*~~~*/ this._value2html(this._value); // update HTML value (in case value has been set through javascript)
		}
		return this._value;
	}

	_render() {}
}

UI.Input = class extends UI._Element { // single-line text input
	_render(initialValue) {
		this.element = h('input', { value: (initialValue || '') });	

		this.element.addEventListener('input', this._html2value.bind(this));
		this.element.addEventListener('change', this._changed.bind(this));
	}
}

UI.Textarea = class extends UI._Element { // multiline text input 
	_render(initialValue) {
		this.element = h('textarea', { value: (initialValue || '') });
		this.element.addEventListener('input', this._html2value.bind(this));
		this.element.addEventListener('change', this._changed.bind(this));
	}
}

UI.Bool = class extends UI._Element { // checkbox 
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

UI.Number = class extends UI._Element { // number input
	_render(initialValue) {
		this.element = h('input', { type: 'number', value: initialValue || 0 });
		this.element.addEventListener('change', this._changed.bind(this));
		this.element.addEventListener('input', this._html2value.bind(this));
	}
}

UI.Select = class extends UI._Element { // select box 
	_render(options) {
		this.element = h('select', options.map(function(option) {
			return h('option', { value: option }, option);
		}));
		this.element.addEventListener('change', this._changed.bind(this));
	}
}

UI.Slider = class extends UI._Element { // range input
	_render(initialValue, boundsArray) {
		this.element = h('input', { type: 'range' });
		this.element.addEventListener('change', this._changed.bind(this));
	}
}

UI.File = class extends UI._Element { // file input
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

UI.Color = class extends UI._Element { // color input 
	_render(initialValue) {
		this.element = h('input', { type: 'color', value: initialValue });
		this.element.addEventListener('change', this._changed.bind(this));
	}
}

/* --------------------================-------------------- */
/*                       Constraints                        */
/* --------------------================-------------------- */

let constraints = {
	shiftActivate: function(constraint, pos) {
		if(hotkeys.isPressed(16)) {
			return constraint(pos);
		}else{
			return pos
		};
	},
	shiftDeactivate: function(constraint, pos) {
		if(!hotkeys.isPressed(16)) {
			return constraint(pos);
		}else{
			return pos
		};
	},
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
	},
	keepRatio: function(x, y, pos) {
		if(pos.x > pos.y) pos.y = pos.x * x / y
		else pos.x = pos.y * y / x;
		return pos;
	}
}

/* --------------------================-------------------- */
/*                         Handles                          */
/* --------------------================-------------------- */

class Handle {
	constructor(x, y) { /*++++*/
		this.x = x;
		this.y = y;

		this._x = x; // actual x position before constraints are applied
		this._y = y; // actual y position before constraints are applied

		this.origin = {x: 0, y: 0};
		/*~~~*/ this._offset = {x: 0, y: 0}; // rendering offset of handle, does not affect absolute position. Used so that some handles don't overlap important bits you're editing...

		this.callbacks = [];
		this.constraints = [];

		/*~~~*/ this.disabled = false;
		/*~~~*/ this.dragging = false;

		/*~~~*/ this._render();
	}

	// make position of this handle relative to specified parent handle
	parent(handle) { /*++++*/
		this.origin = {
			// absolute origin, no matter how deeply nested
			get x() { return handle.x + handle.origin.x; },
			get y() { return handle.y + handle.origin.y; }
		};
		// when position of parent handle changes, update position of this handle
		let callback = function() {
			this.updatePosition(true);
		}.bind(this);
		handle.applyCallback(callback);

		/*~~~*/ this.detachParent = function() {
		/*~~~*/ 	handle.removeCallback(callback);
		/*~~~*/ 	this.updatePosition(true);
		/*~~~*/ }.bind(this);

		// update position of this handle to pick up position of parent
		this.updatePosition(true);
	}

	detachParent() {}

	// change offset of handle rendering, ONLY affects VISUAL POSITION of handle NOT THE ACTUAL POSITION
	offset(x, y) {
		this._offset.x += x;
		this._offset.y += y;
		if(this.handle) {
			this.handle._offset = this._offset;
			this.handle.applyTransformations();
		}
		this.applyTransformations(); // update transform of handle with new offset
	}

	// get absolute position of handle
	getAbsolute() { /*++++*/
		return {
			// absolute position, no matter how deeply nested
			x: this.x + this.origin.x,
			y: this.y + this.origin.y
		}
	}

	// check position of this handle relative to another handle
	// this is useful if you want to check the direction between two handles with different parents
	relativeTo(handle) { 
		return {
			// absolute positions, no matter how deeply nested
			x: this.getAbsolute().x - handle.getAbsolute().x,
			y: this.getAbsolute().y - handle.getAbsolute().y
		}
	}

	// add (one or multiple) callback(s) which are called when position of this handle changes
	applyCallback() { /*++++*/
		this.callbacks = this.callbacks.concat([].slice.call(arguments));
	}

	removeCallback(c) {
		[].slice.call(arguments).forEach(function(fn) {
			this.callbacks.splice(this.callbacks.indexOf(fn), 1);
		}.bind(this));
	}

	// add (one or multple) constraints which can modify the position of this handle when it moves
	applyConstraint() {
		this.constraints = this.constraints.concat([].slice.call(arguments));
		this.updatePosition(); // update position to reflect addition of new constraint(s)
	}

	// remove constraint with same constraint function applied (this works because we call bind on each constraint which creates a unique function)
	removeConstraint() {
		[].slice.call(arguments).forEach(function(fn) {
			this.constraints.remove(fn);
		}.bind(this));
		this.updatePosition(); // update position to reflect removal of constraint
	}

	// apply transforms to this handle
	applyTransformations() {
		// transforms are absolute positions
		let transform = `
			translate(${this.origin.x + this.x + this._offset.x}, ${this.origin.y + this.y + this._offset.y}) 
			rotate(${radToDeg(this.rotation || 0)})
		`;
		this.element.setAttribute('transform', transform);
	}

	// move this handle by (dx, dy), w/ constraints applied of course
	move(dx, dy, doActivateCallbacks) { /*++++*/
		this.setPosition(this._x + dx, this._y + dy, doActivateCallbacks);
	}

	// set position of this handle to (x, y), w/ constraints applied of course
	setPosition(x, y, doActivateCallbacks) { /*++++*/
		this._x = x;
		this._y = y;

		this.updatePosition(doActivateCallbacks)
	}

	// update position of handle and apply constraints
	updatePosition(doActivateCallbacks) { /*++++*/
		// new position before constraints are applied
		let newPos = {x: this._x, y: this._y};

		// apply constraints only if being dragged
		// if(this.dragging) { // BUG: for some reason this doesn't work?
		this.constraints.forEach(function(fn) {
			newPos = fn(newPos); // each constraint modifies position
		});
		// }

		// set position to constraint-modified position
		this.x = newPos.x;
		this.y = newPos.y;

		// there are some cases in which we don't want to update callbacks when we update position
		if(doActivateCallbacks) {
			this.activateCallbacks();
		}

		// apply transformations so that we can see changes
		/*~~~*/ this.applyTransformations();
	}

	// activate all callbacks, passing this handle as an argument
	activateCallbacks() { /*++++*/
		this.callbacks.forEach(function(callback) {
			callback(this);
		}.bind(this));
	}

	// show this handle
	show() {
		if(this.disabled) return; // do not show if disabled

		this.element.classList.remove('hidden');
		if(this.handle) this.handle.show(); // show rotation handle if exists
	}

	// hide this handle
	hide() {
		this.element.classList.add('hidden');
		if(this.handle) this.handle.hide(); // hide rotation handle if exists
	}

	// disable this handle, does not allow it to be shown
	disable() {
		this.disabled = true;
		if(this.handle) this.handle.disable(); // disable rotation handle if exists
		this.hide(); // hide handle, will not unhide until handle is enabled again
	}

	// enable this handle, allowing it to show/hide normally
	enable() {
		this.disabled = false;
		if(this.handle) this.handle.enable(); // enable rotation handle if exists
		this.show(); // show handle, now acts normally
	}

	// add rotation to this handle, controlled by child rotation handle
	_initRotationHandle(rotation) { /*++++*/
		this.rotation = rotation || 0;
		/*~~~*/ this.element.classList.add('rotation');

		// create rotation handle
		this.handle = new Handle(20, 0);
		this.handle.parent(this); // set position relative to this handle
		/*~~~*/ this.handle.applyConstraint(constraints.distance.bind(null, 20)); // constrain to circle around this handle (r=20px)
		this.handle.applyCallback(this._updateRotation.bind(this));
		/*~~~*/ this.handle.element.classList.add('rotationhandle');
	}

	// update rotation
	_updateRotation() {
		// rotation = direction between this handle and it's rotation handle (since rotation handle is relative to this handle all we need is direction from {0, 0})
		this.rotation = direction({x: 0, y: 0}, this.handle);
		/*~~~*/ this.applyTransformations(); // apply new rotation to this handle
	}

	_render() {
		this.element = svg('g.handle', [
			svg('circle', {
				cx: 0, cy: 0, r: 7,
			}),
			// create line pointing in rotation direction (only shown when rotation handle is activated)
			svg('line', {
				x1: 0, y1: 0, x2: 7, y2: 0,
			})
		]);
		this.updatePosition();

		// make this handle draggable
		draggable(this.element, {
			mousedown: function() {
				this.dragging = true;
			}.bind(this),
			mousemove: function(dx, dy) {
				this.move(dx, dy, true);
			}.bind(this),
			mouseup: function() {
				this.setPosition(this.x, this.y);
				this.dragging = false;
				save();
			}.bind(this)
		});

		// append this element to handles element
		handles.appendChild(this.element);
	}

	// destroy this handle
	destroy() {
		this.element.parentElement.removeChild(this.element); // remove handle from it's parent
		if(this.handle) this.handle.destroy(); // destroy rotation handle if exists
	}
}

class RotationHandle extends Handle {
	constructor(x, y, rotation) {
		super(x, y);

		// yo, that was simple
		this._initRotationHandle();
	}
}

/* --------------------================-------------------- */
/*                         Entities                         */
/* --------------------================-------------------- */

let entities = {};

class Visual {
	constructor() {
		this._beforeRender.apply(this, arguments);
		this._render();
		this._afterRender();
	}

	_beforeRender() { /* Override */ }
	_afterRender() { /* Override */ }
	_render() { /* Override */ }
}

class Entity {
	constructor() { /*++++*/
		/*~~~*/ this._generateID();

		this.handles = [];
		this.options = {};

		this.currentPanel = null;

		this._initPos();

		this._beforeRender();
		this._render();
		this._afterRender();

		/*~~~*/ this.element.setAttribute('id', `entity${this.id}`);
		/*~~~*/ this.element.setAttribute('data-id', this.id);
		/*~~~*/ this.element.setAttribute('data-type', this.constructor.name);

		/*~~~*/ this._makeSelectable();
		/*~~~*/ this.select();
	}

	_generateID() {
		this.id = id();
		entities[this.id] = this;
	}

	addOption(option) { /*++++*/
		this.options[option.name] = option;
		/*~~~*/ updateUI();
		return option;
	}

	addHandle(handle, snapOnShift) { /*++++*/
		this.handles.push(handle);
		/*~~~*/ if(snapOnShift !== false) {
		/*~~~*/ 	handle.applyConstraint(constraints.shiftActivate.bind(null, constraints.snapToGrid.bind(null, 12.5)));
		/*~~~*/ }
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

	_initPos() { /*++++*/
		this.pos = this.addHandle(new Handle(0, 0));
		this.pos.applyCallback(this._updatePos.bind(this));
		/*~~~*/ this.pos.element.classList.add('move');
	}

	_updatePos() {
		let pos = this.pos.getAbsolute();
		/*~~~*/ // pos = this._convertPointToLocalCoords(this.pos);
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

	_beforeRender() { /*++++*/ }
	_afterRender() { /*++++*/ }
	_render() { /*++++*/ }

	destroy() { /*++++*/
		if(this.ondestroy) {
			this.ondestroy();
		}
		this.element.parentElement.removeChild(this.element);
		/*~~~~*/ this.destroyHandles();
		/*~~~~*/ delete entities[this.id];
	}
}

class ArtBoard extends Entity {
	_beforeRender() { /*++++*/
		this.pos.applyConstraint(constraints.snapToGrid.bind(null, 12.5));

		this.content = new ContainerEntity(this);

		this._initOptions();
	}

	_afterRender() {
		this._updateScale();
	}

	_initOptions() {
		this.addOption(new UI.Select('size', ['desktop', 'mobile']));

		this.addOption(new UI.Number('width', 100));
		this.options.width.applyCallback(this._updateScale.bind(this));

		this.addOption(new UI.Number('height', 100));
		this.options.height.applyCallback(this._updateScale.bind(this));
	}

	_updateScale() {
		this.board.setAttribute('width', this.options.width.value);
		this.board.setAttribute('height', this.options.height.value);
	}

	_render() {
		this.element = svg('g', [
			svg('defs', [
				this.board = svg(`rect #artBoard${this.id}`),

				svg(`clipPath #artBoardClip${this.id}`, [
					svg('use', { href: `#artBoard${this.id}` })
				])
			]),
			svg('g', { 'clip-path': `url(#artBoardClip${this.id})` }, [
				svg('use.panel', { href: `#artBoard${this.id}`, 'data-id': this.id }),
				this.content.element,
				svg('use.panel-border', { href: `#artBoard${this.id}`, 'data-id': this.id }),
			])
		]);

		render.appendChild(this.element);
	}

	destroy() { }
}

class Panel extends Entity {
	_beforeRender() { /*++++*/
		this.pos.applyConstraint(constraints.snapToGrid.bind(null, 12.5));

		this.content = new ContainerEntity(this);

		this._initScale();
	}

	_afterRender() {
		this._updateScale();
		this._updatePos();
	}

	_updatePos() {
		let pos = this.pos.getAbsolute();
		/*~~~*/ // pos = this._convertPointToLocalCoords(this.pos);
		this.panel.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
		// this.content.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

		(this.content.entities || []).forEach(function(entity) {
			entity.pos.updatePosition(true);
		});
	}

	_initScale() { /*++++*/
		this.scale = this.addHandle(new Handle(100, 100));
		this.scale.parent(this.pos);
		this.scale.applyCallback(this._updateScale.bind(this));
		/*~~~*/ this.scale.applyConstraint(constraints.minimum.bind(null, 50, 50));
		/*~~~*/ this.scale.applyConstraint(constraints.snapToGrid.bind(null, 12.5));
	}

	_updateScale() {
		this.panel.setAttribute('width', this.scale.x);
		this.panel.setAttribute('height', this.scale.y);
	}

	_render() {
		this.element = svg('g', { mask: 'url(#panelMask)' }, [
			svg('defs', [
				this.panel = svg(`rect #panel${this.id}`),

				svg(`clipPath #panelClip${this.id}`, [
					svg('use', { href: `#panel${this.id}` })
				])
			]),

			svg('g', { 'clip-path': `url(#panelClip${this.id})` }, [
				svg('use.panel', { href: `#panel${this.id}`, 'data-id': this.id }),
				this.content.element,
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

class ContainerEntity extends Visual {
	_beforeRender(parentElement) {
		this.parentElement = parentElement

		this.entities = [];
	}

	toggleEntity(entity) {
		if(entity === this.parentElement) return;
		let index = this.entities.indexOf(entity);
		if(index != -1) {
			render.appendChild(entity.element);
			entity.currentPanel = null;
			entity.pos.detachParent();
			this.entities.splice(index, 1);
		}else{
			this.element.appendChild(entity.element);
			entity.currentPanel = this;
			entity.pos.parent(this.parentElement.pos);
			this.entities.push(entity);
		}
		entity.pos.updatePosition();
		updateLayers();
	}

	_render() {
		this.element = svg('g.content');
	}
}

class Character extends Entity {
	_beforeRender() { /*++++*/
		this.head = new CharacterHead(this);
		this.body = new CharacterBody(this);
	}

	_render() {
		this.element = svg('g.character', [	
			this.head.background,
			this.body.element,
			this.head.foreground,
		]);

		render.appendChild(this.element);
	}
}

class CharacterHead extends Visual {
	_beforeRender(character) { /*++++*/
		this.character = character;

		this.radius = 25;

		this._initHandles();
		this._initOptions();

		this.eyes = new CharacterEyes(this);
		this.hair = new CharacterHair(this);
		// this.glasses = new CharacterGlasses(this);
	}

	_afterRender() {
		this._updatePos();
		this._updateColor();
	}

	_initOptions() { /*++++*/
		this.character.addOption(new UI.Color('headColor', '#FFE58C'));
		this.character.options.headColor.applyCallback(this._updateColor.bind(this));
	}

	_initHandles() { /*++++*/
		this.pos = this.character.addHandle(new Handle(55, 25));
		this.pos.parent(this.character.pos);
		/*~~~*/ this.pos.offset(-this.radius, -this.radius);
		this.pos.applyCallback(this._updatePos.bind(this));
	}
	
	_updatePos() {
		this.foreground.setAttribute('transform', `translate(${this.pos.x}, ${this.pos.y})`);
		this.background.setAttribute('transform', `translate(${this.pos.x}, ${this.pos.y})`);
	}

	_updateColor() {
		let color = this.character.options.headColor.value;

		this.highlight.style.setProperty('fill', color);
		this.shadow.style.setProperty('fill', getShadowColor(color));
	}

	_render() {
		this.background = svg('g.headgroup', [
			this.hair.back
		]);

		this.foreground = svg('g.headgroup', [
			svg('defs', [
				svg(`circle #head${this.character.id}`, {r: 25}),
				svg(`clipPath #headClip${this.character.id}`, [
					svg('use', { href: `#head${this.character.id}` })
				]),
			]),

			svg('use.head-border', { href: `#head${this.character.id}`}),

			svg('g', {
				'clip-path': `url(#headClip${this.character.id})`
			}, [
				this.shadow = svg('use.head-shadow', { href: `#head${this.character.id}`, filter: 'url(#noise)' }),
				this.highlight = svg('use.head-highlight', { href: `#head${this.character.id}`, filter: 'url(#blur)', x: 5, y: -5 }),
			
				this.eyes.element
			]),

			// this.glasses.lenses,

			this.hair.front
		]);
	}
}

class CharacterHair extends Visual {
	_beforeRender(head) { /*++++*/
		this.head = head;

		this.head.eyes.pos.applyCallback(this._updatePos.bind(this));
		
		this._initOptions();
	}

	_afterRender() {		
		this._updateType();
	}

	_initOptions() { /*++++*/
		this.head.character.addOption(new UI.Select('HairType', ['[none]', 'A', 'B']));
		this.head.character.options.HairType.applyCallback(this._updateType.bind(this));

		this.head.character.addOption(new UI.Color('HairColor', '#333333'));
		this.head.character.options.HairColor.applyCallback(this._updateColor.bind(this));
	}

	_updateType() {
		switch(this.head.character.options.HairType.value) {
			case '[none]':
				this.hairClip.setAttribute('d', '');
				this.hairCut.setAttribute('d', '');
				break
			case 'A': 
				this.hairClip.setAttribute('d', 'M27,0c0,1.2.38,4.88,0.38,6.4,0,2.07-.39,2.89-0.61,5.5s0.61,9.87.61,12.16c0,3.48,2.29,21-.38,27.94C24.55,58.39,6.85,65,0,65s-23.24-3.78-27-13c-1.53-3.73-.06-9.15-0.46-17.33-0.22-4.56.46-6.93,0.46-11.22S-27.46,14-27.46,10-27,3.19-27,0c0-16.57,12.09-30,27-30S27-16.57,27,0Z');
				this.hairCut.setAttribute('d', 'M-146.72-61.86H156.72V81.86H17.17c5-73.57,1.28-83,1.26-83.16C17.94-4.72,16-8.71,12.65-13.56c-1.5-2.19-.76-4.1-1.77-5.16C8.19-21.5,4.62-20.06.28-20.06s-7.78-1.39-10.07.37c-1.81,1.39-1,2.55-2.26,4.75-3.5,6.21-4.45,5.53-5.39,9.17,0.18-.7-3.43,23-0.3,87.63h-129V-61.86Z');
				break;
			case 'B':
				this.hairClip.setAttribute('d', 'M30-2.11a30,30,0,0,1-30,30,30,30,0,0,1-30-30c0-8.36,5.31-15.05,7.46-20.42,0.61-1.53-1.6-2.46-1.6-2.46a96.43,96.43,0,0,1,12-4.56c3-.79,7.81-2.55,12.13-2.55A29.86,29.86,0,0,1,16.77-27a1.26,1.26,0,0,0,1.9-1.3c-0.3-1.66-2.31-2.8-2.31-2.8s4.9,2,6.37,8.68C23.91-17,30-8.45,30-2.11Z');
				this.hairCut.setAttribute('d', 'M0-20.78s-9.26,1-9.78,5.22,4.6,2.6,4.6,2.6S-7.43-7.2-13.59-7.24a8.08,8.08,0,0,1-7.79-5.2s0.82,7.56-2.43,10.33-8,3.85-8.66,9.93a68.29,68.29,0,0,1-6.41,20.45c-2.94,5.72-12.47,22-23.21,24.43s-82.06,0-82.06,0V-70.93H126.73V53.77s-43.62,5.92-61.26,0S45,34.86,42.27,25.11,40,8.5,34.73,4.83s-9.31-5.32-13.1-9S18-16.94,11.23-20C0-25,0-20.78,0-20.78Z');
				break;
		}
	}

	_updateColor() {
		let color = this.head.character.options.HairColor.value;
		this.frontInner.style.setProperty('fill', color);
		this.backInner.style.setProperty('fill', tinycolor(color).darken(50).toString());
	}

	_updatePos() {
		let pos = this.head.eyes.pos;
		this.hairCut.setAttribute('transform', `translate(${pos.x}, ${pos.y}) rotate(${radToDeg(pos.rotation)})`);
	}

	_render() {
		this.back = svg('g', {
			'clip-path': `url(#hairClip${this.head.character.id})`
		}, [
			svg('defs', [
				this.hairClip = svg(`path #hairClipPath${this.head.character.id}`),
				this.hairCut = svg(`path #hairCutPath${this.head.character.id}`),
				svg(`clipPath #hairClip${this.head.character.id}`, [
					svg('use', {
						href: `#hairClipPath${this.head.character.id}`
					}),
				]),
				svg(`clipPath #hairCut${this.head.character.id}`, {
					'clip-path': `url(#hairClip${this.head.character.id})`,
				}, [
					svg('use', { href: `#hairCutPath${this.head.character.id}`}),
				])
			]),

			this.backInner = svg('use.hair-back', {
				href: `#hairCutPath${this.head.character.id}`,
				transform: 'translate(50, 0)'
			})
		]);
		
		this.front = svg('g', {
			'clip-path': `url(#hairCut${this.head.character.id})`
		}, [
			this.frontInner = svg('use.hair-front', { href: `#hairCutPath${this.head.character.id}` }),
			svg('use.hair-border', { href: `#hairClipPath${this.head.character.id}` })
		])
	}
}

class CharacterEyes extends Visual {
	_beforeRender(head) { /*++++*/
		this.head = head;

		this._initHandles();
	}

	_afterRender() {
		this._updatePos();
	}

	_initHandles() { /*++++*/
		this.pos = this.head.character.addHandle(new RotationHandle(0, 0));
		this.pos.parent(this.head.pos);
		/*~~~*/ this.pos.offset(30, 0);
		this.pos.applyCallback(this._updatePos.bind(this));
		this.pos.handle.applyCallback(this._updatePos.bind(this));
	}

	_updatePos() {
		let x = this.pos.x;
		let y = this.pos.y;
		let rotation = radToDeg(this.pos.rotation);
		this.element.setAttribute('transform', `translate(${x}, ${y}) rotate(${rotation})`);
	}

	_render() {
		this.element = svg('g.eyes', [
			svg('ellipse', {
				cx: -8, rx: 3, ry: 9,
			}),
			svg('ellipse', {
				cx: 8, rx: 3, ry: 9,
			})
		]);
		return this.element;
	}
}

class CharacterGlasses {
	constructor(head) {
		this.head = head;

		this.head.eyes.pos.applyCallback(this._updatePos.bind(this));

		this._render();
	}

	_updatePos() {
		let pos = this.head.eyes.pos;
		this.lenses.setAttribute('transform', `translate(${pos.x}, ${pos.y})`)
	}

	_render() {
		this.lenses = svg('g.glassesgroup', [
			svg('defs', [
				svg(`g #lenses${this.head.character.id}`, [
					svg('rect.lens', { x: -18, y: -5, width: 16, height: 10, rx: 3, ry: 3 }),
					svg('rect.lens', { x: 2, y: -5, width: 16, height: 10, rx: 3, ry: 3 }),
				])
			]),
			svg('use.lenses', { href: `#lenses${this.head.character.id}`})
		]);
	}
}

class CharacterBody extends Visual {
	_beforeRender(character) { /*++++*/
		this.character = character;

		
		this._initHandles();
		this._initOptions();
		this._initLimbs();
	}

	_afterRender() {
		this._updatePos();
		this._updatePath();
		this._updateColor();
	}

	_initOptions() { /*++++*/
		this.character.addOption(new UI.Color('BodyColor', '#FF8000'));
		this.character.options.BodyColor.applyCallback(this._updateColor.bind(this));
	}

	_initHandles() { /*++++*/
		this.pos = this.character.addHandle(new RotationHandle(55, 65));
		this.pos.parent(this.character.pos);
		this.pos.applyCallback(this._updatePos.bind(this));
		this.pos.handle.applyCallback(this._updatePath.bind(this));

		this.control1 = this.character.addHandle(new RotationHandle(0, 100));
		this.control1.parent(this.pos);
		this.control1.applyCallback(this._updatePath.bind(this));
		this.control1.handle.applyCallback(this._updatePath.bind(this));

		this.control2 = this.character.addHandle(new Handle(-13, 51));
		this.control2.parent(this.pos);
		this.control2.applyCallback(this._updatePath.bind(this));
	}

	_initLimbs() { /*++++*/
		this.limbs = {
			'left_arm': new CharacterLimb(this, {x: -53, y: 96}, {x: -63, y: 38}),
			'right_arm': new CharacterLimb(this, {x: 65, y: 88}, {x: 26, y: 54}),
			'left_leg': new CharacterLimb(this, {x: -29, y: 203}, {x: 3, y: 130}),
			'right_leg': new CharacterLimb(this, {x: 31, y: 204}, {x: 30, y: 130})
		};
	}

	_updatePos() {
		this.element.setAttribute('transform', `translate(${this.pos.x}, ${this.pos.y})`);
	}

	_updateColor() {
		let color = this.character.options.BodyColor.value;
		this.highlight.style.setProperty('fill', color);
		this.shadow.style.setProperty('fill', getShadowColor(color, 5));
	}

	_updatePath() {
		let top_length = 50, bot_length = 25;
		let p1 = {
			x: Math.cos(this.pos.rotation) * top_length / 2,
			y: Math.sin(this.pos.rotation) * top_length / 2
		}
		let p2 = {
			x: this.control1.x + Math.cos(this.control1.rotation) * bot_length / 2,
			y: this.control1.y + Math.sin(this.control1.rotation) * bot_length / 2
		}
		let p3 = {
			x: this.control1.x - Math.cos(this.control1.rotation) * bot_length / 2,
			y: this.control1.y - Math.sin(this.control1.rotation) * bot_length / 2
		}
		let p4 = {
			x: -p1.x,
			y: -p1.y
		}
		let controlA = {
			x: this.control2.x + Math.cos((this.pos.rotation + this.control1.rotation) / 2) * (top_length + bot_length) / 4,
			y: this.control2.y + Math.sin((this.pos.rotation + this.control1.rotation) / 2) * (top_length + bot_length) / 4,
		}
		let controlB = {
			x: this.control2.x - Math.cos((this.pos.rotation + this.control1.rotation) / 2) * (top_length + bot_length) / 4,
			y: this.control2.y - Math.sin((this.pos.rotation + this.control1.rotation) / 2) * (top_length + bot_length) / 4,
		}

		this.path.setAttribute('d', `
			M ${p1.x} ${p1.y}
			Q ${controlA.x} ${controlA.y} ${p2.x} ${p2.y}
			L ${p3.x} ${p3.y}
			Q ${controlB.x} ${controlB.y} ${-p1.x} ${-p1.y}
			Z
		`);

		this.limbs.left_arm.pos = p4;
		this.limbs.right_arm.pos = p1;
		this.limbs.left_leg.pos = p3;
		this.limbs.right_leg.pos = p2;
	}

	_render() {
		this.element = svg('g.bodygroup', [
			svg('defs', [
				this.path = svg(`path #body${this.character.id}`),

				svg(`clipPath #bodyClip${this.character.id}`, [
					svg('use', { href: `#body${this.character.id}` })
				])
			]),

			svg('g.limbs', [
				this.limbs.left_arm.element,
				this.limbs.right_arm.element,
				this.limbs.left_leg.element,
				this.limbs.right_leg.element,
			]),

			svg('use.body-border', { href: `#body${this.character.id}` }),
			svg('g', { 'clip-path': `url(#bodyClip${this.character.id})` }, [
				this.shadow = svg('use.body-shadow', { href: `#body${this.character.id}`, filter: 'url(#noise)' }),
				this.highlight = svg('use.body-highlight', { href: `#body${this.character.id}`, filter: 'url(#blur)', x: 5, y: -5 }),
			]),
		]);
	}
}

class CharacterLimb extends Visual {
	_beforeRender(body, control1pos, control2pos) { /*++++*/
		this.body = body;
		this._pos = {x: 0, y: 0};

		this._initHandles(control1pos, control2pos);
	}

	get pos() { /*++++*/
		return this._pos;
	}

	set pos(newPos) { /*++++*/
		this._pos = newPos;
		this._updatePath();
		return this._pos;
	}

	_initHandles(control1pos, control2pos) { /*++++*/
		this.control1 = this.body.character.addHandle(new Handle(control1pos.x, control1pos.y));
		this.control1.parent(this.body.pos);
		this.control1.applyCallback(this._updatePath.bind(this));

		this.control2 = this.body.character.addHandle(new Handle(control2pos.x, control2pos.y));
		this.control2.parent(this.body.pos);
		this.control2.applyCallback(this._updatePath.bind(this));
	}

	_updatePath() { /*++++*/
		this.element.setAttribute('d', `
			M ${this.pos.x} ${this.pos.y}
			Q ${this.control2.x} ${this.control2.y} ${this.control1.x} ${this.control1.y}
		`);
	}

	_render() {
		this.element = svg('path.limb');
	}
}

class TextEntity extends Entity {
	_beforeRender() { /*++++*/
		this.conjoinedTo = null;

		this._initOptions();

		this.bubble = new TextEntityBubble(this);
		this.tail = new TextEntityTail(this);
	}

	_afterRender() {
		this._updatePos();
	}

	toggleJoinTextEntity(entity) {
		if(this.conjoinedTo === null) {
			this.conjoinedTo = entity;
			entity.bubbleContainer.appendChild(this.bubble.element);
			entity.tailContainer.appendChild(this.tail.element);
		}else{
			this.bubbleContainer.appendChild(this.bubble.element);
			this.tailContainer.appendChild(this.tail.element);
		}
	}

	_initOptions() { /*++++*/
		this.addOption(new UI.Select('type', [
			'speechBubble',
			'caption',
			'thoughtBubble',
			'whisperBubble',
			'shoutBubble',
			'CUSTOM',
		]));
		this.options.type.applyCallback(this._updateType.bind(this));
	}

	_updateType(type) { /*++++*/
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

	_updatePos() { /*++++*/
		this.bubble._updatePos();
		this.tail._updatePos();
	}

	_render() {
		this.element = svg('g.speechbubble', [
			svg('defs', [
				this.bubbleContainer = svg(`g #bubble${this.id}`, [
					this.bubble.element,
				]),
				this.tailContainer = svg(`g #tail${this.id}`, [
					this.tail.element,
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
			
		
			this.bubble.textBounds
		]);

		render.appendChild(this.element);
	}
}

class TextEntityBubble extends Visual {
	_beforeRender(textentity) { /*++++*/
		this.textentity = textentity;

		this._initHandles();
		this._initOptions();
	}

	_initOptions() { /*++++*/
		this.textentity.addOption(new UI.Textarea('text'));
		this.textentity.options.text.applyCallback(this._updateText.bind(this));

		this.textentity.addOption(new UI.Select('shape', [
			'roundedRectangle',
			'rectangle',
			'ellipse',
			//'cloud', 
			//'scream',
			'[none]'
		]));
		this.textentity.options.shape.applyCallback(this._updateShape.bind(this));

		this.textentity.addOption(new UI.Bool('whisper', false)); // SHOULD WE CHANGE TO BORDER-TYPE?
	}

	_initHandles() { /*++++*/
		this.scale = this.textentity.addHandle(new Handle(100, 60));
		this.scale.parent(this.textentity.pos);
		this.scale.applyCallback(this._updateScale.bind(this));
	}

	_updateText(text) {
		this.text.textContent = text;
	}

	_updatePos() { /*++++*/
		let pos = this.textentity.pos.getAbsolute();
		/*~~~*/ // pos = this._convertPointToLocalCoords(this.pos);
		this.element.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
		this.textBounds.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
	}

	_updateShape(shape) {
		let replace = (shape !== undefined);
		shape = (this.textentity.options.shape.value || shape);
		let __setBubbleElement = (function (newElement) {
			this.element.parentElement.replaceChild(newElement, this.element);
			this.element = newElement;
		}).bind(this);
		switch(shape) {
			case 'roundedRectangle':
			case 'rectangle':
				if(replace) { __setBubbleElement(
					svg(`rect`, (shape === 'roundedRectangle' ? { rx: 10, ry: 10 } : {}) )
				) };
				this.element.setAttribute('width', this.scale.x);
				this.element.setAttribute('height', this.scale.y);
				break;
			case 'ellipse':
				if(replace) { __setBubbleElement(
					svg(`ellipse`)
				) };
				this.element.setAttribute('cx', this.scale.x / 2);
				this.element.setAttribute('cy', this.scale.y / 2);
				this.element.setAttribute('rx', this.scale.x / 2);
				this.element.setAttribute('ry', this.scale.y / 2);
				break;
			case '[none]':
				if(replace) { __setBubbleElement(
					svg('g')
				) }
		}
		this._updatePos();
	}

	_updateScale() {
		this._updateShape();

		this.textBounds.setAttribute('width', this.scale.x);
		this.textBounds.setAttribute('height', this.scale.y);
	}

	_render() {
		this.element = svg(`rect`, { rx: 10, ry: 10 });

		this.textBounds = svg('foreignObject', [
			h('div.text', [
				this.text = h('div')
			])
		]);
	}
}

class TextEntityTail extends Visual {
	_beforeRender(textentity) { /*++++*/
		this.textentity = textentity;

		this._initHandles();
		this._initOptions();
	}

	_initHandles() { /*++++*/
		this.base = this.textentity.addHandle(new Handle(50, 30));
		this.base.parent(this.textentity.pos);
		this.base.applyCallback(this._updatePath.bind(this));

		this.tip = this.textentity.addHandle(new Handle(100, 100));
		this.tip.parent(this.textentity.pos);
		this.tip.applyCallback(this._updatePath.bind(this));
		
		this.textentity.pos.applyCallback(this._updatePath.bind(this));
	}

	_initOptions() { /*++++*/
		this.textentity.addOption(new UI.Bool('showTail', true));
		this.textentity.options.showTail.applyCallback(this._updatePath.bind(this));

		this.textentity.addOption(new UI.Select('tailType', [
			'default',
		]));
		this.textentity.options.tailType.toggleWith(this.textentity.options.showTail);
		this.textentity.options.showTail.applyCallback(this._updatePath.bind(this));

		this.textentity.addOption(new UI.Bool('curveTail', false));
		this.textentity.options.curveTail.toggleWith(this.textentity.options.showTail);
	}

	_updatePos() { /*++++*/
		let pos = this.textentity.pos;
		this.element.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
	}

	_updatePath() {
		if(!this.textentity.options.showTail.value) { // separate to different func?
			this.base.disable();
			this.tip.disable();
			this.element.classList.add('hidden');
		}else{
			this.base.enable();
			this.tip.enable();
			this.element.classList.remove('hidden');
		}
		// let relative_tip_pos = this.tip.relativeTo(this.textentity.pos);
		// let relative_base_pos = this.base.
		let offsetX = Math.cos(direction(this.tip, this.base) + Math.PI / 2) * 10;
		let offsetY = Math.sin(direction(this.tip, this.base) + Math.PI / 2) * 10;
		this.element.setAttribute('points', `
			${this.tip.x}, ${this.tip.y}
			${this.base.x + offsetX}, ${this.base.y + offsetY}
			${this.base.x - offsetX}, ${this.base.y - offsetY}
		`);
	}

	_render() {
		this.element = svg(`polygon`);
	}
}

class ImportEntity extends Entity {
	_beforeRender() { /*++++*/
		this.imageSize = null;
		this.ratioConstraint = null;
	}

	_afterRender() {
		this.pos._initRotationHandle(0);

		this.addOption(new UI.File('image'));
		this.options.image.applyCallback(this._updateImage.bind(this));

		this._initScale();

		this._updateScale();
	}

	_initScale() {
		this.scale = this.addHandle(new Handle(100, 100));
		this.scale.parent(this.pos);
		this.scale.applyCallback(this._updateScale.bind(this));
	}

	_updateScale() {
		if(this.imageSize) {
			this.image.setAttribute('width', this.scale.x);
			this.image.setAttribute('height', this.scale.y);
		}
	}

	_updateImage() {
		let path = imageDirectory + this.options.image.value;
		this.image.setAttribute('href', path);

		let size = new Image();
		size.setAttribute('src', path);

		size.addEventListener('load', function() {
			this.imageSize = { width: size.width, height: size.height };

			if( this.ratioConstraint ) this.scale.removeConstraint(this.ratioConstraint);
			this.ratioConstraint = constraints.keepRatio.bind(null, this.imageSize.width, this.imageSize.height);
			this.scale.applyConstraint(this.ratioConstraint);

			this.scale.setPosition(this.scale.x, 0, true);
		}.bind(this));
	}

	_render() {
		this.element = svg('g',	[
			this.image = svg('image')
		]);

		render.appendChild(this.element);
	}
}

let entityTypes = {ArtBoard, Panel, TextEntity, Character, ImportEntity};
let subEntityTypes = {ContainerEntity, CharacterHead, CharacterHair, CharacterEyes,/* CharacterGlasses,*/ CharacterBody, CharacterLimb, TextEntityBubble, TextEntityTail}

/* --------------------================-------------------- */
/*                         Hotkeys                          */
/* --------------------================-------------------- */

// CREATE: PANEL, TEXTENTITY, CHARACTER, IMPORTENTITY
hotkeys('ctrl+1, ctrl+2, ctrl+3, ctrl+4', function(event, handler) {
	let entity;
	switch(handler.key) {
		case 'ctrl+1': entity = new Panel(); break;
		case 'ctrl+2': entity = new TextEntity(); break;
		case 'ctrl+3': entity = new Character(); break;
		case 'ctrl+4': entity = new ImportEntity(); break;
	}
	entity.pos.setPosition(mouse.x, mouse.y, true);
	save();
});

// MOVE: BACK, BACK1, FORWARD1, FRONT
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

// TOGGLE_CHILD, TOGGLE_JOIN
hotkeys('ctrl+q, ctrl+w', function(event, handler) {
	let hoveredEntity = entities[getClosestEntityID(mouse.target)];
	switch(handler.key) {
		case 'ctrl+q':
			if(mouse.target.classList.contains('panel') && selected != null) {
				hoveredEntity.content.toggleEntity(selected);
			}
			save();
			break;
		case 'ctrl+w':
			if(selected.constructor === TextEntity && hoveredEntity.constructor === TextEntity) {
				selected.toggleJoinTextEntity(hoveredEntity);
			}
			break;

	}
})

// DELETE
hotkeys('ctrl+shift+x', function(event, handler) {
	if(selected != null) {
		selected.destroy();
		selected = null;
	}
	updateUI();
	save();
});

// RESET
hotkeys('ctrl+shift+m', function(event, handler) {
	if(confirm('Are you sure you want to clear the current save?')) {
		destroyAll();
		let workspace = new ArtBoard();
		save();
	}
});

// UNDO, REDO
hotkeys('cmd+z, cmd+shift+z', function(event, handler) {
	switch(handler.key) {
		case 'cmd+z': undo(); break;
		case 'cmd+shift+z': redo(); break;
	}
});

// CUT, COPY, PASTE
hotkeys('cmd+x, cmd+c, cmd+v', function(event, handler) {
	switch(handler.key) {
		case 'cmd+x': cut(); break;
		case 'cmd+c': copy(); break;
		case 'cmd+v': paste(); break;
	}
});

// SAVE, OPEN, EXPORT
hotkeys('cmd+s, cmd+o, ctrl+p', function(event, handler) {
	event.preventDefault();
	switch(handler.key) {
		case 'cmd+s': saveToFileSystem(); break;
		case 'cmd+o': loadFromFileSystem(); break;
		case 'ctrl+p': exportHTML(); break;
	}
})

/* --------------------================-------------------- */
/*                          Events                          */
/* --------------------================-------------------- */

// deselect entities when clicking background
paper.addEventListener('mousedown', function(e) {
	if(e.target === paper && selected !== null) {
		selected.deselect(); // hides handles and such
		selected = null; // no longer selected

		updateUI();
	}
});

// zoom + pan
paper.addEventListener('mousewheel', function(e) {
	// prevent default zoom / scroll events
	e.preventDefault();
	e.stopPropagation();
	// mousewheel event w/ e.ctrlKey in Chrome is actually pinch-zoom
	if(e.ctrlKey) { // zoom
		viewBox.scale += e.deltaY * viewBox.scale / 100;
		viewBox.scale = Math.min(Math.max(viewBox.scale, 0.1), 1)
	}else{ // pan
		viewBox.x += e.deltaX * viewBox.scale; // multiply by scale to always pan at same rate
		viewBox.y += e.deltaY * viewBox.scale;
	}
	updateViewBox();	
});

// resize viewBox whenever screen resizes, keeps SVG same size
window.addEventListener('resize', updateViewBox);
window.addEventListener('load', updateViewBox);

/* --------------------================-------------------- */
/*                        Initialize                        */
/* --------------------================-------------------- */

// load current save from localStorage
(function(){
	let data = localStorage.getItem('data'); // get save data
	if(data !== null) {
		undoStack.push(data); // TODO: is this needed anymore
		load(JSON.parse(data)); // load data
	}
})();

// add svg element to document
document.body.appendChild(paper);

/* --------------------================-------------------- */
/*                            Fin                           */
/* --------------------================-------------------- */


