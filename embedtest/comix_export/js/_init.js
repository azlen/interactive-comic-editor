class Option {
	constructor(name) { /*++++*/
		this.name = name; // name used in inspector element
		// render UI element (with all extra arguments passed into this constructor, basically arguments minus "name")
		// create inspector element to display both name and input in inspector
		// initialize variables
		this.callbacks = [];
		this._value;
		// pull value from HTML to set the initial value in this UI element
	}
	applyCallback() { /*++++*/
		this.callbacks = this.callbacks.concat([].slice.call(arguments));
	}
	activateCallbacks(newValue) { /*++++*/
		this.callbacks.forEach(function(callback) {
			callback(newValue);
		});
	}
	get value() { /*++++*/
		return this._value;
	}
	set value(newValue) { /*++++*/
		if (this._value !== newValue) { // only set value + apply callbacks IF THE VALUE HAS ACTUALLY CHANGED
			this._value = newValue; // set value
			this.activateCallbacks(this._value); // activate callbacks
		}
		return this._value;
	}
}
class Handle {
	_updateRotation() {
		// rotation = direction between this handle and it's rotation handle (since rotation handle is relative to this handle all we need is direction from {0, 0})
		this.rotation = direction({
			x: 0,
			y: 0
		}, this.handle);
	}
	constructor(x, y) { /*++++*/
		this.x = x;
		this.y = y;
		this._x = x; // actual x position before constraints are applied
		this._y = y; // actual y position before constraints are applied
		this._origin = {
			x: 0,
			y: 0
		};
		this.resetOrigin();
		this.callbacks = [];
		this.constraints = [];
	}
	parent(handle) { /*++++*/
		let _origin = this._origin;
		this.origin = {
			// absolute origin, no matter how deeply nested
			get x() {
				return _origin.x + handle.x + handle.origin.x;
			},
			get y() {
				return _origin.y + handle.y + handle.origin.y;
			},
			set x(nx) {
				return _origin.x = nx
			},
			set y(ny) {
				return _origin.y = ny
			}
		};
		// when position of parent handle changes, update position of this handle
		let callback = function() {
			this.updatePosition(true);
		}.bind(this);
		handle.applyCallback(callback);
		// update position of this handle to pick up position of parent
		this.updatePosition(true);
	}
	resetOrigin() { /*++++*/
		let _origin = this._origin;
		this.origin = {
			get x() {
				return _origin.x
			},
			get y() {
				return _origin.y
			},
			set x(nx) {
				return _origin.x = nx
			},
			set y(ny) {
				return _origin.y = ny
			}
		};
	}
	getAbsolute() { /*++++*/
		return {
			// absolute position, no matter how deeply nested
			x: this.x + this.origin.x,
			y: this.y + this.origin.y
		}
	}
	applyCallback() { /*++++*/
		this.callbacks = this.callbacks.concat([].slice.call(arguments));
	}
	move(dx, dy, doActivateCallbacks) { /*++++*/
		this.setPosition(this._x + dx, this._y + dy, doActivateCallbacks);
	}
	setPosition(x, y, doActivateCallbacks) { /*++++*/
		this._x = x;
		this._y = y;
		this.updatePosition(doActivateCallbacks)
	}
	updatePosition(doActivateCallbacks) { /*++++*/
		// new position before constraints are applied
		let newPos = {
			x: this._x,
			y: this._y
		};
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
		if (doActivateCallbacks) {
			this.activateCallbacks();
		}
		// apply transformations so that we can see changes
	}
	activateCallbacks() { /*++++*/
		this.callbacks.forEach(function(callback) {
			callback(this);
		}.bind(this));
	}
	_initRotationHandle(rotation) { /*++++*/
		this.rotation = rotation || 0;
		// create rotation handle
		this.handle = new Handle(20, 0);
		this.handle.parent(this); // set position relative to this handle
		this.handle.applyCallback(this._updateRotation.bind(this));
	}
}
class RotationHandle extends Handle {
	constructor(x, y, rotation) {
		super(x, y);
		// yo, that was simple
		this._initRotationHandle();
	}
}
class Visual {
	constructor() {
		this._beforeRender.apply(this, arguments);
		this._render();
		this._afterRender.apply(this, arguments);
	}
	_beforeRender() { /* Override */ }
	_afterRender() { /* Override */ }
	_render() { /* Override */ }
}
class Entity {
	_updatePos() {
		let pos = this.pos /*.getAbsolute()*/ ;
		this.element.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
	}
	constructor() { /*++++*/
		this.handles = [];
		this.options = {};
		this._initPos();
	}
	addOption(option) { /*++++*/
		this.options[option.name] = option;
		return option;
	}
	addHandle(handle, snapOnShift) { /*++++*/
		this.handles.push(handle);
		return handle;
	}
	_initPos() { /*++++*/
		this.pos = this.addHandle(new Handle(0, 0));
		this.pos.applyCallback(this._updatePos.bind(this));
	}
	_beforeRender() { /*++++*/ }
	_afterRender() { /*++++*/ }
	_render() { /*++++*/ }
	destroy() { /*++++*/
		if (this.ondestroy) {
			this.ondestroy();
		}
		this.element.parentElement.removeChild(this.element);
	}
	_afterRender() { /*++++*/ }
	_render() { /*++++*/ }
	destroy() { /*++++*/
		if (this.ondestroy) {
			this.ondestroy();
		}
		this.element.parentElement.removeChild(this.element);
	}
	_render() { /*++++*/ }
	destroy() { /*++++*/
		if (this.ondestroy) {
			this.ondestroy();
		}
		this.element.parentElement.removeChild(this.element);
	}
	destroy() { /*++++*/
		if (this.ondestroy) {
			this.ondestroy();
		}
		this.element.parentElement.removeChild(this.element);
	}
}
class ArtBoard extends Entity {
	_updateType() {
		/*switch(this.options.type.value) {
			case 'desktop':
				this.options.width.value = 500;
				this.options.height.value = 300;
				break;
			case 'mobile':
				this.options.width.value = 200;
				this.options.height.value = 300;
				break;
		}*/
	}
	_updateScale() {
		this.board.setAttribute('width', this.options.width.value);
		this.board.setAttribute('height', this.options.height.value);
	}
	_beforeRender() { /*++++*/
		this.content = new ContainerEntity(this);
		this._initOptions();
	}
	_initOptions() { /*++++*/
		this.addOption(new Option('includeInExport'));
	}
}
class Panel extends Entity {
	_updateScale() {
		this.panel.setAttribute('width', this.scale.x);
		this.panel.setAttribute('height', this.scale.y);
	}
	_beforeRender() { /*++++*/
		this.content = new ContainerEntity(this);
		this._initScale();
	}
	_initScale() { /*++++*/
		this.scale = this.addHandle(new Handle(100, 100));
		this.scale.parent(this.pos);
		this.scale.applyCallback(this._updateScale.bind(this));
	}
}
class TextEntity extends Entity {
	_updateType(type) { /*++++*/
		switch (type) {
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
	_beforeRender() { /*++++*/
		this._initOptions();
		this.bubble = new TextEntityBubble(this);
		this.tail = new TextEntityTail(this);
	}
	_initOptions() { /*++++*/
		this.addOption(new Option('type'));
	}
	_updatePos() { /*++++*/
		this.bubble._updatePos();
		this.tail._updatePos();
	}
}
class Character extends Entity {
	_beforeRender() { /*++++*/
		this.head = new CharacterHead(this);
		this.body = new CharacterBody(this);
	}
}
class ImportEntity extends Entity {
	_updateImage() {
		let path = imageDirectory + this.options.image.value;
		this.image.setAttribute('href', path);
		let size = new Image();
		size.setAttribute('src', path);
		size.addEventListener('load', function() {
			this.imageSize = {
				width: size.width,
				height: size.height
			};
			if (this.ratioConstraint) this.scale.removeConstraint(this.ratioConstraint);
			this.ratioConstraint = constraints.keepRatio.bind(null, this.imageSize.width, this.imageSize.height);
			this.scale.applyConstraint(this.ratioConstraint);
			this.scale.setPosition(this.scale.x, 0, true);
		}.bind(this));
	}
	_updateScale() {
		if (this.imageSize) {
			this.image.setAttribute('width', this.scale.x);
			this.image.setAttribute('height', this.scale.y);
		}
	}
	_beforeRender() { /*++++*/
		this.imageSize = null;
		this.ratioConstraint = null;
	}
}
class SymbolicLinkEntity extends Entity {
	_updatePos() {
		if (!this.linkedEntity) return;
		this.element.setAttribute('transform', `translate(
			${this.pos.x - this.linkedEntity.pos.x},
			${this.pos.y - this.linkedEntity.pos.y}
		)`)
	}
	_afterRender(entity) { /*++++*/
		if (entity) this.linkEntity(entity);
	}
	linkEntity(entity) { /*++++*/
		this.linkedEntity = entity;
		while (this.linkedEntity.constructor === SymbolicLinkEntity) {
			this.linkedEntity = this.linkedEntity.linkedEntity;
		}
		this.linkedEntity.pos.applyCallback(this._updatePos.bind(this));
	}
}
class ContainerEntity extends Visual {}
class CharacterHead extends Visual {
	_updateColor() {
		let color = this.character.options.headColor.value;
		this.highlight.style.setProperty('fill', color);
		this.shadow.style.setProperty('fill', getShadowColor(color));
	}
	_updatePos() {
		this.foreground.setAttribute('transform', `translate(${this.pos.x}, ${this.pos.y})`);
		this.background.setAttribute('transform', `translate(${this.pos.x}, ${this.pos.y})`);
	}
	_beforeRender(character) { /*++++*/
		this.character = character;
		this.radius = 25;
		this._initHandles();
		this._initOptions();
		this.eyes = new CharacterEyes(this);
		this.hair = new CharacterHair(this);
		// this.glasses = new CharacterGlasses(this);
	}
	_initOptions() { /*++++*/
		this.character.addOption(new Option('headColor'));
	}
	_initHandles() { /*++++*/
		this.pos = this.character.addHandle(new Handle(55, 25));
		this.pos.parent(this.character.pos);
		this.pos.applyCallback(this._updatePos.bind(this));
	}
}
class CharacterHair extends Visual {
	_updatePos() {
		let pos = this.head.eyes.pos;
		this.hairCut.setAttribute('transform', `translate(${pos.x}, ${pos.y}) rotate(${radToDeg(pos.rotation)})`);
	}
	_updateType() {
		switch (this.head.character.options.HairType.value) {
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
	_beforeRender(head) { /*++++*/
		this.head = head;
		this.head.eyes.pos.applyCallback(this._updatePos.bind(this));
		this._initOptions();
	}
	_initOptions() { /*++++*/
		this.head.character.addOption(new Option('HairType'));
	}
}
class CharacterEyes extends Visual {
	_updatePos() {
		let x = this.pos.x;
		let y = this.pos.y;
		let rotation = radToDeg(this.pos.rotation);
		this.element.setAttribute('transform', `translate(${x}, ${y}) rotate(${rotation})`);
	}
	_beforeRender(head) { /*++++*/
		this.head = head;
		this._initHandles();
	}
	_initHandles() { /*++++*/
		this.pos = this.head.character.addHandle(new RotationHandle(0, 0));
		this.pos.parent(this.head.pos);
		this.pos.applyCallback(this._updatePos.bind(this));
		this.pos.handle.applyCallback(this._updatePos.bind(this));
	}
}
class CharacterBody extends Visual {
	_updateColor() {
		let color = this.character.options.BodyColor.value;
		this.highlight.style.setProperty('fill', color);
		this.shadow.style.setProperty('fill', getShadowColor(color, 5));
	}
	_updatePos() {
		this.element.setAttribute('transform', `translate(${this.pos.x}, ${this.pos.y})`);
	}
	_updatePath() {
		let top_length = 50,
			bot_length = 25;
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
	_beforeRender(character) { /*++++*/
		this.character = character;
		this._initHandles();
		this._initOptions();
		this._initLimbs();
	}
	_initOptions() { /*++++*/
		this.character.addOption(new Option('BodyColor'));
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
			'left_arm': new CharacterLimb(this, {
				x: -53,
				y: 96
			}, {
				x: -63,
				y: 38
			}),
			'right_arm': new CharacterLimb(this, {
				x: 65,
				y: 88
			}, {
				x: 26,
				y: 54
			}),
			'left_leg': new CharacterLimb(this, {
				x: -29,
				y: 203
			}, {
				x: 3,
				y: 130
			}),
			'right_leg': new CharacterLimb(this, {
				x: 31,
				y: 204
			}, {
				x: 30,
				y: 130
			})
		};
	}
}
class CharacterLimb extends Visual {
	_updatePath() { /*++++*/
		this.element.setAttribute('d', `
			M ${this.pos.x} ${this.pos.y}
			Q ${this.control2.x} ${this.control2.y} ${this.control1.x} ${this.control1.y}
		`);
	}
	_beforeRender(body, control1pos, control2pos) { /*++++*/
		this.body = body;
		this._pos = {
			x: 0,
			y: 0
		};
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
}
class TextEntityBubble extends Visual {
	_updateText(text) {
		this.text.innerHTML = text;
	}
	_updateShape(shape) {
		let replace = (shape !== undefined);
		shape = (this.textentity.options.shape.value || shape);
		let __setBubbleElement = (function(newElement) {
			this.element.parentElement.replaceChild(newElement, this.element);
			this.element = newElement;
		}).bind(this);
		switch (shape) {
			case 'roundedRectangle':
			case 'rectangle':
				if (replace) {
					__setBubbleElement(svg(`rect`, (shape === 'roundedRectangle' ? {
						rx: 10,
						ry: 10
					} : {})))
				};
				this.element.setAttribute('width', this.scale.x);
				this.element.setAttribute('height', this.scale.y);
				break;
			case 'ellipse':
				if (replace) {
					__setBubbleElement(svg(`ellipse`))
				};
				this.element.setAttribute('cx', this.scale.x / 2);
				this.element.setAttribute('cy', this.scale.y / 2);
				this.element.setAttribute('rx', this.scale.x / 2);
				this.element.setAttribute('ry', this.scale.y / 2);
				break;
			case '[none]':
				if (replace) {
					__setBubbleElement(svg('g'))
				}
		}
		this._updatePos();
	}
	_updateScale() {
		this._updateShape();
		this.textBounds.setAttribute('width', this.scale.x);
		this.textBounds.setAttribute('height', this.scale.y);
	}
	_beforeRender(textentity) { /*++++*/
		this.textentity = textentity;
		this._initHandles();
		this._initOptions();
	}
	_initOptions() { /*++++*/
		this.textentity.addOption(new Option('text')); // SHOULD WE CHANGE TO BORDER-TYPE?
	}
	_initHandles() { /*++++*/
		this.scale = this.textentity.addHandle(new Handle(100, 60));
		this.scale.parent(this.textentity.pos);
		this.scale.applyCallback(this._updateScale.bind(this));
	}
	_updatePos() { /*++++*/
		let pos = this.textentity.pos /*.getAbsolute()*/ ;
		this.element.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
		this.textBounds.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
	}
}
class TextEntityTail extends Visual {
	_updatePath() {
		if (!this.textentity.options.showTail.value) { // separate to different func?
			this.base.disable();
			this.tip.disable();
			this.element.classList.add('hidden');
		} else {
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
		this.textentity.addOption(new Option('showTail'));
	}
	_updatePos() { /*++++*/
		let pos = this.textentity.pos;
		this.element.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
	}
}