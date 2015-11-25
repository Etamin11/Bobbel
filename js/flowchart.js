/*
 *  Copyright (c) 2015 Tobias Herrmann
 * 
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var globalX = 0; // mouse position X
var globalY = 0; // mouse position Y
var nts = {}; // NodeTemplates
var bobbelChart = null; // The one and only chart object
var bobbelBody = null; // The one an only body object
var bobbelConfig = null; // The one and only configuration object


/**
 * Body
 */
Body = function() {
	
	this.element = $('body');
	this.chartScrollLeft = 0;
	this.chartScrollTop = 0;
	this.chartPageX = 0;
	this.chartPageY = 0;
	this.element.mousemove(function(e) {
		
		this.mouseX = e.clientX;
		this.mouseY = e.clientY;
		this.chartScrollLeft = bobbelChart.element.scrollLeft();
		this.chartScrollTop = bobbelChart.element.scrollTop();
		var x = bobbelChart.element.width() + this.chartScrollLeft;
		var y = bobbelChart.element.height() + this.chartScrollTop;
		bobbelChart.svg.attr('width', x+'px');
		bobbelChart.svg.attr('height', y+'px');
		this.chartPageX = this.mouseX - bobbelChart.x1 + this.chartScrollLeft;
		this.chartPageY = this.mouseY - bobbelChart.y1 + this.chartScrollTop;
	
	}.bind(this));
	
	this.element.on('contextmenu', 'div', function(e){ return false; });
}
Body.prototype.element = null;
Body.prototype.mouseX = null;
Body.prototype.mouseY = null;
Body.prototype.chartScrollLeft = null;
Body.prototype.chartScrollTop = null;
Body.prototype.chartPageX = null;
Body.prototype.chartPageY = null;


/**
 * All kind of configuration
 */
Config = function() {
	
	this.elements = {};
	this.elements['text-error-load-chart'] = 'An error occurred while loading the flowchart!';
	this.elements['text-error-nodebar-addnode'] = 'nodebar.addNode: The following type is not as a template defined: ';
	this.elements['text-success-save'] = 'The flowchart was succesfully saved!';
	this.elements['text-error-server-save'] = 'The server responded following error while saving: ';
	this.elements['text-error-save'] = 'An error occurred while saving the flowchart!';
}
Config.prototype.elements = null
Config.prototype.setConfig = function(key, value) {
	this.elements[key] = value;
}
Config.prototype.getConfig = function(key, value) {
	return this.elements[key];
}

/**
 * Chart
 */
Flowchart = function() {
	
	this.id = null;
	this.nodes = new Array();
	this.links = new Array();
	this.sequence = 0;
	this.element = $('#fc-container');
	this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	this.svg = $(this.svg);
	this.svg.attr('height', '100%');
	this.svg.attr('width', '100%');
	this.element.append(this.svg);
	this.nb = null;
	this.tb = null;
	this.menuNode = null;
	this.menuLink = null;
	this.linkType = 0;
	this.orientation = 0;
	this.movability = 1;
	
	this.x1 = Math.round(this.element.position().left);
	this.y1 = Math.round(this.element.position().top);
	this.x2 = this.x1 + this.element.width();
	this.y2 = this.y1 + this.element.height();
	this.scrollLeft = 0;
	this.scrollTop = 0;
	
	// set globals
	bobbelChart = this;
	bobbelBody = new Body();
	bobbelConfig = new Config();
	
	// Unknow Template
	this.addNodeTemplateSvg('unknow-unknow', 'Unknow', 1000, '<text x="30" y="40" fill="red">?</text>');
};
Flowchart.prototype.id = null;
Flowchart.prototype.nodes = null;
Flowchart.prototype.links = null;
Flowchart.prototype.sequence = null;
Flowchart.prototype.element = null;
Flowchart.prototype.svg = null;
Flowchart.prototype.nb = null;
Flowchart.prototype.tb = null;
Flowchart.prototype.x1 = null;
Flowchart.prototype.y1 = null;
Flowchart.prototype.x2 = null;
Flowchart.prototype.y2 = null;
Flowchart.prototype.scrollLeft = null;
Flowchart.prototype.scrollTop = null;
Flowchart.prototype.menuNode = null;
Flowchart.prototype.menuLink = null;
Flowchart.prototype.linkType = null;
Flowchart.prototype.orientation = null;
Flowchart.prototype.movability = null;
Flowchart.prototype.addNode = function(name, x, y, type) {
	
	return this._setNode(name, x, y, type, this.getSequenze());
};
Flowchart.prototype.load = function(url) {
	
	this.clean();	
	$.get(url)
		.done(function(result) {
			if (result.length > 0) {
				var result = jQuery.parseJSON(result);
				this.id = result.id
				this.linkType = result.linkType;
				this.orientation = result.orientation;
				for (var i in result.nodes) {
					var data = result.nodes[i];
					this.setSequenze(data.nr);
					this._setNode(data.name, data.x, data.y, data.type, data.nr);
				}
				for (var i in result.links) {
					var data = result.links[i];
					this.setSequenze(data.nr);
					this._setLink(this.getNode(data.source), this.getNode(data.target), data.name, data.nr);
				}
			}
		}.bind(this))
		.fail(function() {
			showErrorbox(bobbelConfig.getConfig('text-error-load-chart'), true, 'swbx-message');
		});
}
Flowchart.prototype._setNode = function(name, x, y, type, nr) {
	
	if (typeof nts[type] == 'undefined') {
		type = 'unknow-unknow';
	}
	
	var node = new Node(name, x, y, nr, type);
	node.setMaxExitLinks(nts[type].mel)
	this.nodes.push(node);
	
	return node;
};
Flowchart.prototype.addLink = function(sourceNode, targedNode, name) {
	
	return this._setLink(sourceNode, targedNode, name, this.getSequenze());
};
Flowchart.prototype._setLink = function(sourceNode, targedNode, name, nr) {
	
	var link = new Link(sourceNode, targedNode, name, nr);
	this.links.push(link);
	
	return link;
};
Flowchart.prototype.getSequenze = function() {
	
	this.sequence++;
	return this.sequence;
}
Flowchart.prototype.setSequenze = function(nr) {
	
	if (nr > this.sequence) {
		this.sequence = nr;
	}
}
Flowchart.prototype.addNodebar = function() {
	
	this.nb = new Nb();
	return this.nb;
}
Flowchart.prototype.addToolbar = function() {
	
	this.tb = new Tb();
	return this.tb;
}
Flowchart.prototype.createMenuNode = function() {
	this.menuNode = new MenuNode();
	return this.menuNode;
}

Flowchart.prototype.createMenuLink = function() {
	this.menuLink = new MenuLink();
	return this.menuLink;
}
Flowchart.prototype.checkNodeMouseOver = function(x, y) {
	
	for (var i in this.nodes) {
		
		var node = this.nodes[i];
		if (x > node.x1 && x < node.x2 && y > node.y1 && y < node.y2) {
			return node;
		}
	}
}
Flowchart.prototype.getNode = function(id) {
	
	for (var i in this.nodes) {
		if (this.nodes[i].id == id) {
			return this.nodes[i];
		}
	}
}
Flowchart.prototype.getLink = function(id) {
	
	for (var i in this.links) {
		if (this.links[i].id == id) {
			return this.links[i];
		}
	}
}
Flowchart.prototype.clean = function() {
	
	for (var i in this.nodes) {
		this.nodes[i].remove();
	}
	for (var i in this.links) {
		this.links[i].remove();
	}
}
Flowchart.prototype.addNodeTemplateText = function(type, name, mel) {
	
	nts[type] = new NT('text', type, name, mel);
}
Flowchart.prototype.addNodeTemplateSvg = function(type, name, mel, svg) {
	
	nts[type] = new NT('svg', type, name, mel, svg);
}
Flowchart.prototype.switchLineType = function() {

	if (this.linkType == 0) {
		this.linkType = 1;
	}
	else {
		this.linkType = 0;
	}
	
	for (var i in this.links) {
		this.links[i].draw();
	}
}
Flowchart.prototype.switchOrientation = function() {
	
	if (this.orientation == 0) {
		this.orientation = 1;
	}
	else {
		this.orientation = 0;
	}
	
	for (var i in this.nodes) {
		this.nodes[i].changeOrientation()
		this.nodes[i].draw();
	}
	for (var i in this.links) {
		this.links[i].move();
	}
}
Flowchart.prototype.setConfig = function(key, value) {
	bobbelConfig.setConfig(key, value)
}
Flowchart.prototype.disableMovability = function() {
	this.movability = 0;
}

/**
 * Node-Template for nodes in the chart and node-bar
 * @param mainType text or svg
 * @param type single word id of the node
 * @param name text to display
 * @param mel max exit links
 * @param inner another inner content (svg)
  */
NT = function(mainType, type, name, mel, inner) {
	
	this.mainType = mainType;
	this.type = type;
	this.name = name;
	this.mel = mel;
	this.inner = inner;
}
NT.prototype.mainType = null;
NT.prototype.type = null;
NT.prototype.name = null;
NT.prototype.mel = null;
NT.prototype.inner = null;
NT.prototype.createNode = function(id, name) {

	var element = document.createElement('div');
	element = $(element);
	element.addClass('fc-node');
	element.addClass('fc-node-'+this.type);
	element.attr('id', id);
	var inner = this.createInnerNode(name);
	element.append(inner);
	
	return element;
}
NT.prototype.createInnerNode = function(name, orientation) {

	if (typeof name == 'undefined') {
		var name = this.name;
	}
	
	// Svg Node
	if (this.mainType == 'svg') {
		
		var inner = '<svg height="100%" width="100%">'
			+ this.inner
			+ '</svg>';
		
		if (bobbelChart.orientation == 0){
			inner += '<p class="fc-node-svg-text fc-node-svg-text_h">'+name+'</p>';
		} else {
			inner += '<p class="fc-node-svg-text fc-node-svg-text_v">'+name+'</p>';
		}
	}
	// Default Text Node
	else {
		
		var inner = document.createElement('p');
		inner = $(inner);
		inner.addClass('fc-node-'+this.type+'-text');
		inner.html(name);
	}
	
	return inner;
}

/**
 * Node
 * @param text to display
 * @param x position x
 * @param y position y
 * @param nr internal unique number
 * @param type id form node template
 * @param target bobblechart or body
 */
Node = function(name, x, y, nr, type, target) {
	
	this.name = name;
	this.nr = nr;
	this.id = 'fc-node-'+nr;
	this.x1 = x;
	this.y1 = y;
	this.element = null;
	this.width = null;
	this.height = null;
	this.x2 = null;
	this.y2 = null;
	this.type = type;
	this.maxExitLinks = 1000;
	this.onMove = false;
	this.target = bobbelChart;
	if (typeof target != 'undefined') {
		this.target = target;
	}
	this.draw();
};
Node.prototype.nr = null;
Node.prototype.id = null;
Node.prototype.name = null;
Node.prototype.x1 = null;
Node.prototype.y1 = null;
Node.prototype.x2 = null;
Node.prototype.y2 = null;
Node.prototype.width = null;
Node.prototype.height = null;
Node.prototype.element = null;
Node.prototype.type = null;
Node.prototype.maxExitLinks = null;
Node.prototype.onMove = null;
Node.prototype.target = null;
Node.prototype.draw = function() {
	
	// delete node
	if (this.element != null) {
		this.element.remove();
		delete(this.element);
		this.element = null;
	}
	
	var nt = nts[this.type];
	this.element = nt.createNode(this.id, this.name);
	this.element.css('left', this.x1);
	this.element.css('top', this.y1);
	this.element.mousedown(this.mouseClick.bind(this));
	this.target.element.append(this.element);
	this.width = this.element.width();
	this.height = this.element.height();
	this.x2 = this.x1 + this.width;
	this.y2 = this.y1 + this.height;
}
Node.prototype.changeOrientation = function() {
	var y = this.y1;
	var x = this.x1;
	this.x1 = y;
	this.y1 = x;
}
Node.prototype.mouseClick = function(e) {
	
	if (e.which == 1) {
		
		if (bobbelChart.movability == 1) {
			globalX = e.clientX;
			globalY = e.clientY;
			
			this.element.addClass('fc-move');
			this.target.element.mouseup(this.moveStop.bind(this));
			
			this.onMove = true;
			this.mouseMove();
		}
	}
	else if (e.which == 3) {
		
		this.showMenu(e);
	}
}
Node.prototype.mouseMove = function() {
	
	// provide necessary informations
	var x = bobbelBody.mouseX;
	var y = bobbelBody.mouseY;
	
	// calculate new position
	var offsetX = x - globalX;
	var offsetY = y - globalY;
	var x1MoveTo = this.x1 + offsetX;
	var y1MoveTo = this.y1 + offsetY;
	globalX = x;
	globalY = y;
	
	// check collision
	var result = this.checkCollision(x1MoveTo, y1MoveTo);
	x1MoveTo = result[0];
	y1MoveTo = result[1];
	
	// set new position
	this.element.css('left', x1MoveTo);
	this.element.css('top', y1MoveTo);
	this.x1 = x1MoveTo;
	this.y1 = y1MoveTo;
	this.x2 = x1MoveTo + this.width;
	this.y2 = y1MoveTo + this.height;
	
	// move links
	this.moveLinks();
	
	// Looping
	if (this.onMove) {
		setTimeout(this.mouseMove.bind(this), 50);
	}
}
Node.prototype.checkCollision = function(x1MoveTo, y1MoveTo) {
	
	var x2MoveTo = x1MoveTo + this.width;
	var y2MoveTo = y1MoveTo + this.height;
	
	for (var i in bobbelChart.nodes) {
		
		var node = bobbelChart.nodes[i];
		
		if (node.id != this.id) {
			
			if (y2MoveTo > (node.y1 - 10) && y1MoveTo < (node.y2 + 10) && (x2MoveTo < node.x1 || x1MoveTo > node.x2)) {
				
				if (x2MoveTo > (node.x1 - 10) && x1MoveTo < node.x1) {
					x2MoveTo = node.x1 - 10;
					x1MoveTo = x2MoveTo - this.width;
					// $('#fc-test').html('a');
				}
			
				else if (x2MoveTo > node.x2 && x1MoveTo < (node.x2 + 10)) {
					x1MoveTo = node.x2 + 10;
					x2MoveTo = x1MoveTo + this.width;
					// $('#fc-test').html('b');
				}
			}
			
			else if (x2MoveTo > (node.x1 - 10) && x1MoveTo < (node.x2 + 10) && (y2MoveTo < node.y1 || y1MoveTo > node.y2)) {
				
				if (y2MoveTo > (node.y1 - 10) && y1MoveTo < node.y1) {
					y2MoveTo = node.y1 - 10;
					y1MoveTo = y2MoveTo - this.height;
					// $('#fc-test').html('c');
				}
				
				else if (y2MoveTo > node.y2 && y1MoveTo < (node.y2 + 10)) {
					y1MoveTo = node.y2 + 10;
					y2MoveTo = y1MoveTo + this.height;
					// $('#fc-test').html('d');
				}
			}
		}
	}
	
	return [x1MoveTo, y1MoveTo];
}
Node.prototype.moveStop = function(eventMouseMove) {
	
	// provide necessary informations
	var x = eventMouseMove.clientX;
	var y = eventMouseMove.clientY;
	
	// calculate new position
	var offsetX = x - globalX;
	var offsetY = y - globalY;
	
	this.element.removeClass('fc-move');
	this.target.element.off('mouseup');

	this.onMove = false;
}
Node.prototype.moveLinks = function() {
	
	for (var y in bobbelChart.links) {
		var link = bobbelChart.links[y];
		if (this.id == link.sourceNode.id) {
			link.move();
		}
		if (this.id == link.targetNode.id) {
			link.move();
		}
	}
}
Node.prototype.showMenu = function(e) {
	
	if (bobbelChart.menuNode != null) {
		bobbelChart.menuNode.showMenu(this, e);
	}
}
Node.prototype.setName = function(name) {
	
	var nt = nts[this.type];
	var inner = nt.createInnerNode(name);
	this.element.html(inner);
	this.name = name;
}
Node.prototype.remove = function(remove) {
	
	this.element.remove();
	for (var i in this.target.nodes) {
		
		var node = this.target.nodes[i];
		if (this.id == node.id) {
			
			for (var y in this.target.links) {
				
				var link = this.target.links[y];
				if (this.id == link.sourceNode.id || this.id == link.targetNode.id) {
					this.target.links[y].remove();
					delete(this.target.links[y]);
				}
			}
			delete(this.target.nodes[i]);
		}
	}
	// ToDo: Remove object
}
Node.prototype.setMaxExitLinks = function(amount) {
	this.maxExitLinks = amount;
}
Node.prototype.export = function() {
	return {nr:this.nr, id:this.id, name:this.name, x:this.x1, y:this.y1, type:this.type};
}

/**
 * Link
 * @param source node
 * @param target node
 * @param name text to display
 * @param nr internal unique number
 */
Link = function(source, target, name, nr) {
	
	this.x1 = null;
	this.y1 = null;
	this.x2 = null;
	this.y2 = null;	
	this.sourceNode = source;
	this.targetNode = target;
	this.nr = nr;
	this.id = 'fc-link-'+nr;
	this.name = '';
	this.textElement = null;
	this.elementEnding1 = null;
	this.elementEnding2 = null;
	
	this.draw();
	
	this.setTextElement(name);
};
Link.prototype.nr = null;
Link.prototype.id = null;
Link.prototype.name = null;
Link.prototype.element = null;
Link.prototype.textElement = null;
Link.prototype.arrowElement = null;
Link.prototype.elementEnding1 = null;
Link.prototype.elementEnding2 = null;
Link.prototype.sourceNode = null;
Link.prototype.targetNode = null;
Link.prototype.x1 = null;
Link.prototype.y1 = null;
Link.prototype.x2 = null;
Link.prototype.y2 = null;
Link.prototype.mouseClick = function(eventMouseDown) {
	
	if (eventMouseDown.which == 3) {
		this.showMenu(eventMouseDown);
	}
}
Link.prototype.highlightingOn = function() {
	
	this.elementEnding1 = this.drawEnding(this.x1, this.y1);
	this.elementEnding2 = this.drawEnding(this.x2, this.y2);
}
Link.prototype.highlightingOff = function() {
	
	this.elementEnding1.remove();
	this.elementEnding2.remove();
	delete(this.elementEnding1);
	delete(this.elementEnding2);
}
Link.prototype.draw = function() {
	
	// delete line
	if (this.element != null) {
		this.element.remove();
		delete(this.element);
		this.element = null;
	}
	
	// create line
	this.element = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
	this.element = $(this.element);
	this.element.attr('id', this.id);
	this.element.attr('class', 'fc-link');
	this.element.mousedown(this.mouseClick.bind(this));
	this.element.mouseover(this.highlightingOn.bind(this));
	this.element.mouseout(this.highlightingOff.bind(this));
	bobbelChart.svg.append(this.element);
	
	// delete line
	if (this.arrowElement != null) {
		this.arrowElement.remove();
		delete(this.arrowElement);
		this.arrowElement = null;
	}
	
	// create arrow
	this.arrowElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
	this.arrowElement = $(this.arrowElement);
	this.arrowElement.attr('points', '');
	this.arrowElement.attr('class', 'fc-link fc-link-arrow');
	bobbelChart.svg.append(this.arrowElement);
	
	// set coordinates
	this.move();	
}
Link.prototype.drawEnding = function(x, y) {
	
	var element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	element = $(element);
	element.attr('cx', x);
	element.attr('cy', y);
	element.attr('class', 'fc-link-ending');
	element.attr('r', "5");
	
	bobbelChart.svg.append(element);
	
	return element;
}
Link.prototype.showMenu = function(e) {
	
	if (bobbelChart.menuLink != null) {
		bobbelChart.menuLink.showMenu(this, e);
	}
}
Link.prototype.move = function() {
	
	if (bobbelChart.orientation == 0) {
		// source
		this.x1 = ((this.sourceNode.x2 + this.sourceNode.x1) / 2) + 2;
		this.y1 = this.sourceNode.y2 + 2;
		
		// target
		this.x2 = ((this.targetNode.x2 + this.targetNode.x1) / 2) + 2;
		this.y2 = this.targetNode.y1;
	} else {
		// source
		this.x1 = this.sourceNode.x2+2;
		this.y1 = (this.sourceNode.y2 + this.sourceNode.y1) / 2;
		
		// target
		this.x2 = this.targetNode.x1+2;
		this.y2 = (this.targetNode.y2 + this.targetNode.y1) / 2;
	}
	
	if (bobbelChart.linkType == 0) {
		
		var move = this.x1+','+this.y1+' '+this.x2+','+this.y2;
		
		// create an arrow was due browser performace not possible
		if (this.arrowElement != null) {
			this.arrowElement.remove();
			delete(this.arrowElement);
			this.arrowElement = null;
		}
		
	} else {
		
		if (bobbelChart.orientation == 0) {
			
			// line back
			if (this.y2 - this.y1 < 30) {
				var xm = (this.x2 - this.x1) / 2;
				var move = this.x1+','+this.y1+' '+this.x1+','+(this.y1+20)+' '+(this.x1+xm)+','+(this.y1+20)+' '+(this.x1+xm)+','+(this.y2-20)+' '+this.x2+','+(this.y2-20)+' '+this.x2+','+this.y2;
			}
			// direkt
			else {
				var ym = (this.y2 + this.y1) / 2;
				var move = this.x1+','+this.y1+' '+this.x1+','+ym+' '+this.x2+','+ym+' '+this.x2+','+this.y2;
			}
			
			// arrow
			var attr = (this.x2-5)+','+(this.y2-10)+' '+(this.x2+5)+','+(this.y2-10)+' '+(this.x2)+','+(this.y2-2);
		} else {
			
			// line back
			if (this.x2 - this.x1 < 30) {
				var ym = (this.y2 - this.y1) / 2;
				var move = (this.x1+2)+','+this.y1+' '+(this.x1+20)+','+this.y1+' '+(this.x1+20)+','+(this.y1+ym)+' '+(this.x2-20)+','+(this.y1+ym)+' '+(this.x2-20)+','+this.y2+' '+this.x2+','+this.y2;
			}
			// direkt
			else {
				var xm = (this.x2 + this.x1) / 2;
				var move = (this.x1+2)+','+this.y1+' '+xm+','+this.y1+' '+xm+','+this.y2+' '+this.x2+','+this.y2;
			}			
			
			// arrow
			var attr = (this.x2-10)+','+(this.y2-5)+' '+(this.x2-10)+','+(this.y2+5)+' '+(this.x2-2)+','+(this.y2);			
		}
		
		this.arrowElement.attr('points', attr);
	}
	
	// move
	this.element.attr('points', move);
	
	// text
	this.setTextElementCoordinates();
}
Link.prototype.remove = function() {
	
	this.element.remove();
	if (this.arrowElement != null) {
		this.arrowElement.remove();
	}
	this.element.off();
	this.removeTextElement();
	for (var i in bobbelChart.links) {
		
		var link = bobbelChart.links[i];
		if (this.id == link.id) {
			delete(bobbelChart.links[i]);
		}
	}
	// ToDo: Remove Object
}
Link.prototype.setTextElement = function(name) {
	
	if (name == '' || typeof name == 'undefined') {
		this.removeTextElement();
	}
	else if (this.textElement != null) {
		this.textElement.html(name);
		this.name = name;
		this.setTextElementCoordinates();
	}
	else {
		this.textElement = document.createElement('div');
		this.textElement = $(this.textElement);
		this.textElement.addClass('fc-link-text');
		this.textElement.html(name);
		this.textElement.mousedown(this.mouseClick.bind(this));
		this.textElement.mouseover(this.highlightingOn.bind(this));
		this.textElement.mouseout(this.highlightingOff.bind(this));
		bobbelChart.element.append(this.textElement);
		this.setTextElementCoordinates();
		this.name = name;
	}
}
Link.prototype.setTextElementCoordinates = function() {
	
	if (this.textElement != null) {
		
		var x = (this.x2 + this.x1) / 2;
		var y = (this.y2 + this.y1) / 2;
		x = x - (this.textElement.width() / 2);
		y = y - (this.textElement.height() / 2);
		this.textElement.css('left', x);
		this.textElement.css('top', y);
	}
}
Link.prototype.removeTextElement = function() {
	
	if (this.textElement != null) {
		this.textElement.remove();
		this.textElement.off();
		delete(this.textElement);
		this.name = '';
	}
}
Link.prototype.export = function() {
	return {nr:this.nr, id:this.id, name:this.name, source:this.sourceNode.id, target:this.targetNode.id};
}

/**
 * Nodebar
 */
Nb = function() {
	
	this.nodes = {};
	this.element = $('#fc-nodebar');
}
Nb.prototype.nodes = null;
Nb.prototype.element = null;
Nb.prototype.addNode = function(type) {
	
	if (typeof nts[type] != 'undefined') {
		var nt = nts[type];
		this.nodes[type] = new NbNode(nt, this);
	}
	else {
		showErrorbox(bobbelConfig.getConfig('text-error-nodebar-addnode')+type);
	}
}
Nb.prototype.getNode = function(type) {
	
	return(this.nodes[type]);
}

/**
 * Nodebar Node
 * @param nt node template
 * @param nb node bar
 */
NbNode = function(nt, nb) {
	
	this.type = nt.type;
	this.name = nt.name;
	this.mel = nt.mel;
	this.nb = nb;
	this.id = 'fc-node-template-'+this.type;
	this.element = nt.createNode(this.id);
	this.element.mousedown(this.moveStart.bind(this));
	this.width = this.element.width();
	this.height = this.element.height();
	nb.element.append(this.element);
	this.width = this.element.width();
	this.height = this.element.height();	
}
NbNode.prototype.element = null;
NbNode.prototype.type = null;
NbNode.prototype.name = null;
NbNode.prototype.mel = null;
NbNode.prototype.id = null;
NbNode.prototype.nb = null;
NbNode.prototype.width = null;
NbNode.prototype.height = null;
NbNode.prototype.moveStart = function(e) {
	
	if (e.which == 1) {
		var x = e.pageX - (this.width / 2);
		var y = e.pageY - (this.height / 2);
		var newNode = new Node(this.name, x, y, bobbelChart.getSequenze(), this.type, bobbelBody);
		newNode.mouseClick(e);
		bobbelBody.element.mouseup(this.moveStop.bind({'nbNode':this, 'node':newNode}));
	}
}
NbNode.prototype.moveStop = function(e) {
	
	var x = e.pageX - (this.node.width / 2);
	var y = e.pageY - (this.node.height / 2);
	if (x > bobbelChart.x1 && x < bobbelChart.x2 && y > bobbelChart.y1 && y < bobbelChart.y2) {
		
		x = x - bobbelChart.x1 + bobbelBody.chartScrollLeft;
		y = y - bobbelChart.y1 + bobbelBody.chartScrollTop;
		newNode = bobbelChart.addNode(this.node.name, x, y, this.node.type);
		if (typeof this.nbNode.mel != 'undefined') {
			newNode.setMaxExitLinks(this.nbNode.mel);
		}
	}

	this.node.element.off('mouseup');
	this.node.remove();
}

/**
 * Menu Abstract
 */
Menu = function() {
	this.header = '';
	this.items = [];
}
Menu.prototype.showMenu = function(object, event) {
	
	if (this.header != '' && this.items.length > 0) {
		
		var x = bobbelBody.chartPageX - 10;
		var y = bobbelBody.chartPageY - 10;
		
		var container = document.createElement('div');
		container = $(container);
		container.addClass('fc-context-menu-container');
		container.css('left', x);
		container.css('top', y);
		container.mouseleave(function() {
			container.remove();
		});
		
		// Add Header
		var item = document.createElement('div');
		item = $(item);
		item.addClass('fc-context-menu-header');
		item.html(this.header);
		container.append(item);
		
		// Add Items
		for (var i in this.items) {
			
			// Check visibility of target function
			var func = this.items[i][1];
 			if (func(object)) {
				
				var itemElement = document.createElement('div');
				itemElement = $(itemElement);
				itemElement.addClass('fc-context-menu-item');
				itemElement.html(this.items[i][0]);
				itemElement.click(function(){
					
					var func = this[1][2];
					this[3].remove();
					func(this[2]);
					
				}.bind([this, this.items[i], object, container]));
			}
			else {
				var itemElement = document.createElement('div');
				itemElement = $(itemElement);
				itemElement.addClass('fc-context-menu-item-inactive');
				itemElement.html(this.items[i][0]);
			}
			container.append(itemElement);
		}
		bobbelChart.element.append(container);
	}
}
Menu.prototype.header = null;
Menu.prototype.items = null;
Menu.prototype.addHeader = function(header) {
	this.header = header;
}
Menu.prototype.addItem = function(title, itemActive, item) {
	var tmp = [title, itemActive, item];
	this.items.push(tmp);
}

/**
 * Node Menu
 */
MenuNode = function() {}
MenuNode.prototype = new Menu(); // inherited
MenuNode.prototype.constructor = Menu; // inherited
MenuNode.prototype.addItemAddNodeLink = function(title) {

	var itemActive = function(node) {
		
		var result = false
		
		// Count existing links
		var i = 0;
		for (var y in bobbelChart.links) {
			
			var link = bobbelChart.links[y];
			if (node.id == link.sourceNode.id) {
				i++;
			}
		}
		
		// Return Visibility
		if (i < node.maxExitLinks) {
			result = true;
		}
		
		return result;
	}
	
	var item = function(node) {

		var x = bobbelBody.chartPageX;
		var y = bobbelBody.chartPageY;
		var fakeNode = {x1: x, y1: y, x2: x, y2: y}
		var link = new Link(node, fakeNode, '', bobbelChart.getSequenze());
		
		bobbelChart.element.mousemove(function(e) {
			
			this.targetNode.x1 = bobbelBody.chartPageX;
			this.targetNode.y1 = bobbelBody.chartPageY;
			this.targetNode.x2 = bobbelBody.chartPageX;
			this.targetNode.y2 = bobbelBody.chartPageY;
			this.move();
		}.bind(link));
		
		var clickEvent = function() {
			bobbelChart.element.click(function(eventMouseClick) {
				
				var x = bobbelBody.chartPageX;
				var y = bobbelBody.chartPageY;
				bobbelChart.element.off('mousemove');
				bobbelChart.element.off('click');
				var nodeOver = bobbelChart.checkNodeMouseOver(bobbelBody.chartPageX, bobbelBody.chartPageY);
				if (typeof nodeOver == 'object') {
				
					this.targetNode = nodeOver
					this.move();
					bobbelChart.links.push(link);
				}
				else {
					link.remove();
				}
			}.bind(this));
		}.bind(link);
		window.setTimeout(clickEvent, 500);
	}
	
	this.addItem(title, itemActive, item);
}
MenuNode.prototype.addItemEditNodeName = function(title) {
	
	var itemActive = function(node) {
		return true;
	}
	
	var item = function(node) {
	
		showEditbox(node.name, 'Edit Name', function(value) {
			this.setName(value);
		}.bind(node));
	}
	
	this.addItem(title, itemActive, item);
}
MenuNode.prototype.addItemRemoveNode = function(title) {

	var itemActive = function(node) {
		return true;
	}
	
	var item = function(node) {
		node.remove();
	}
	
	this.addItem(title, itemActive, item);
}

/**
 * Link Menu
 */
MenuLink = function() {}
MenuLink.prototype = new Menu(); // inherited
MenuLink.prototype.constructor = Menu; // inherited
MenuLink.prototype.addItemEditLinkName = function(title) {
	
	var itemActive = function(link) {
		return true;
	}
	
	var item = function(link) {
		
		showEditbox(link.name, 'Edit Name', function(value) {
			this.setTextElement(value);
		}.bind(link));
	}
	
	this.addItem(title, itemActive, item);
}
MenuLink.prototype.addItemRemoveLink = function(title) {

	var itemActive = function(link) {
		return true;
	}
	
	var item = function(link) {
		link.remove();
	}
	
	this.addItem(title, itemActive, item);

}

/**
 * Toolbar
 */
Tb = function() {
	
	this.tools = {};
	this.element = $('#fc-toolbar');
}
Tb.prototype.tools = null;
Tb.prototype.element = null;
Tb.prototype.addTool = function(id, text, src, func) {
	
	var config = {
		src:src,
		txt:text,
	};
	this.tools[id] = new TbTool(id, config, this, func);
}
Tb.prototype.addToolSave = function(text, url) {
	
	var func = function() {
		
		var result = {
			id:bobbelChart.id,
			linkType:bobbelChart.linkType,
			orientation:bobbelChart.orientation,
			nodes:new Array(),
			links:new Array()
		};
		for (var i in bobbelChart.nodes) {
			result.nodes.push(bobbelChart.nodes[i].export());
		}
		for (var i in bobbelChart.links) {
			result.links.push(bobbelChart.links[i].export());
		}
		
		$.post(this.config.url, JSON.stringify(result))
			.done(function(result) {
				result = jQuery.parseJSON(result);
				if (!result.error) {
					bobbelChart.id = result.id;
					showMessagebox(bobbelConfig.getConfig('text-success-save'));
				}
				else {
					showErrorbox(bobbelConfig.getConfig('text-error-server-save')+result.message);
				}
			})
			.fail(function() {
				showErrorbox(bobbelConfig.getConfig('text-error-save'));
			});
	}
	
	var config = {
		src:'<polyline points="15,30 15,40 45,40 45,30" class="toolbar-node-line" />'
			+'<polyline points="30,15 30,35" class="toolbar-node-line" />'
			+'<polygon points="30,35 25,30 35,30" class="toolbar-node-line" />',
		txt:text,
		url:url
	};
	
	this.tools['save'] = new TbTool('save', config, this, func);
}
Tb.prototype.addToolLinkType = function(text) {
	
	var s1 = '27,19 38,28';
	var s2 = '38,32 31,43';
	var a1 = '27,19 27,23 38,23 38,28';
	var a2 = '38,32 38,37 31,37 31,43';
	
	var func = function() {
		
		if (bobbelChart.linkType == 0) {
			$('#tool-node-lt1').attr('points', this.s1);
			$('#tool-node-lt2').attr('points', this.s2);
		}
		else {
			$('#tool-node-lt1').attr('points', this.a1);
			$('#tool-node-lt2').attr('points', this.a2);
		}
		
		bobbelChart.switchLineType();
	
	}.bind({s1:s1,s2:s2,a1:a1,a2:a2});
	
	if (bobbelChart.linkType == 0) {
		var l1 = a1;
		var l2 = a2;
	}
	else {
		var l1 = s1;
		var l2 = s2;
	}
	
	var config = {
		src:'<circle cx="25" cy="17" r="3" class="toolbar-node" />'
			+'<circle cx="40" cy="30" r="3" class="toolbar-node" />'
			+'<circle cx="30" cy="45" r="3" class="toolbar-node" />'
			+'<polyline points="'+l1+'" class="toolbar-node-line" id="tool-node-lt1" />'
			+'<polyline points="'+l2+'" class="toolbar-node-line" id="tool-node-lt2" />',
		txt:text,
	};
	
	this.tools['linktype'] = new TbTool('linktype', config, this, func);
}
Tb.prototype.addToolOrientation = function(text) {
	
	var hl = '15,30 35,30';
	var ha = '45,29 35,34 35,24';
	var vl = '30,15 30,35';
	var va = '31,45 26,35 36,35';
	
	var func = function() {
		
		if (bobbelChart.orientation == 0) {
			$('#tool-node-o1').attr('points', this.vl);
			$('#tool-node-o2').attr('points', this.va);
		}
		else {
			$('#tool-node-o1').attr('points', this.hl);
			$('#tool-node-o2').attr('points', this.ha);
		}
		
		bobbelChart.switchOrientation();
	
	}.bind({hl:hl,ha:ha,vl:vl,va:va});
	
	if (bobbelChart.orientation == 0) {
		var l1 = hl;
		var l2 = ha;
	}
	else {
		var l1 = vl;
		var l2 = va;
	}
	
	var config = {
		src:'<polyline points="'+l1+'" class="toolbar-node-line" id="tool-node-o1" />'
			+'<polyline points="'+l2+'" class="toolbar-node-filled" id="tool-node-o2" />',
		txt:text,
	};
	
	this.tools['orientation'] = new TbTool('orientation', config, this, func);
}

/**
 * Toolbar Tool
 * @param name
 * @param config some configuration array (possible keys: src(svg), txt)
 * @param tb tool bar
 * @param func pre defined funtion
 */
TbTool = function(name, config, tb, func) {
	
	this.id = 'fc-toolbar-tool-'+name;
	this.name = name;
	this.config = config;
	this.func = func;
	this.tb = tb;
	
	this.element = document.createElement('div');
	this.element = $(this.element);
	this.element.attr('class', 'fc-toolbar-tool');
	this.element.attr('id', this.id);
	this.element.append('<span title="'+config.txt+'"><svg height="60" width="60"><circle cx="30" cy="30" r="25" class="toolbar-node" />'+config.src+'</svg></span>');
	
	this.element.click(this.mouseClick.bind(this));
	
	tb.element.append(this.element);
}
TbTool.prototype.element = null;
TbTool.prototype.type = null;
TbTool.prototype.name = null;
TbTool.prototype.config = null;
TbTool.prototype.func = null;
TbTool.prototype.id = null;
TbTool.prototype.tb = null;
TbTool.prototype.mouseClick = function(e) {
	this.func();
}

/**
 * Messagebox
 * @param content just text
 */
function showMessagebox(content) {
	
	var icon = '<svg height="80" width="80" viewBox="-7 -12 80 80">'
			 + '<circle cx="30" cy="30" r="25" class="swbx-box-color" />'
			 + '<text x="27" y="40" class="swbx-box-color">i</text>'
			 + '</svg>';
	
	var box = '<div id="inner-message" class="swbx-box-color swbx-inner-box-basics">'
			+ '<div id="swbx-box-icon">'+icon+'</div>'
			+ '<div id="message-text">'+content+'</div>'
			+ '<div class="clear"></div>'
			+ '<div>';
	
	showShadowbox(box, true, 'swbx-message swbx-box-basics');
}

/**
 * Errorbox
 * @param content just text
 */
function showErrorbox(content) {
	
	var icon = '<svg height="80" width="80" viewBox="-7 -12 80 80">'
			 + '<circle cx="30" cy="30" r="25" class="swbx-box-color-error" />'
			 + '<text x="27" y="40" class="swbx-box-color-error">!</text>'
			 + '</svg>';
	
	var box = '<div id="inner-message" class="swbx-box-color-error swbx-inner-box-basics">'
			+ '<div id="swbx-box-icon">'+icon+'</div>'
			+ '<div id="message-text">'+content+'</div>'
			+ '<div class="clear"></div>'
			+ '<div>';
	
	showShadowbox(box, true, 'swbx-message swbx-box-basics');
}

/**
 * Editbox
 * @param value field value
 * @param inputLable label
 * @param saveClosure pre defined function for save
 */
function showEditbox(value, inputLable, saveClosure) {
	
	var content = inputLable+'<br/><input id="edit-value" value="'+value+'" /><br/>'
				+ '<input type="button" name="Ok" value="ok" id="edit-ok" />'
				+ '<input type="button" name="Cancel" value="cancel" id="edit-cancel" />';
	
	var icon = '<svg height="80" width="80" viewBox="-7 -12 80 80">'
			 + '<circle cx="30" cy="30" r="25" class="swbx-box-color" />'
			 + '<text x="27" y="40" class="swbx-box-color" >i</text>'
			 + '</svg>';
	
	var box = '<div id="inner-edit" class="swbx-box-color swbx-inner-box-basics">'
			+ '<div id="swbx-box-icon">'+icon+'</div>'
			+ '<div id="edit-content">'+content+'</div>'
			+ '<div class="clear"></div>'
			+ '<div>';
	
	showShadowbox(box, true, 'swbx-edit swbx-box-basics');
	$('#edit-value').focus();
	
	$('#edit-value').keypress(function(e) {
		if (e.keyCode == 13) {
			saveClosure($('#edit-value').val());
			closeShadowbox();
		}
	});
	
	$('#edit-ok').click(function() {
		saveClosure($('#edit-value').val());
		closeShadowbox();
	});
	
	$('#edit-cancel').click(function() {
		closeShadowbox();
	});
}

/**
 * Shadowbox
 */
var swbxMouseOver = false;
function showShadowbox(content, clickClosable, cssClass) {

	if (typeof cssClass == 'undefined') {
		cssClass = 'swbx-content-default';
	}
	
	var body = $('body');
	body.prepend('<div id="swbx-spinner"><div id="swbx-spinner2">Please wait</div></div>');
	body.prepend('<div id="swbx-opacity">&nbsp;</div>');
	body.prepend('<div id="swbx-frame"><div id="swbx-frame2" class="'+cssClass+'">'+content+'</div></div>');
	
	if (clickClosable == true) {
		$('#swbx-frame').click(function(event) {
			if (!swbxMouseOver) {
				$('#swbx-frame').off();
				$('#swbx-frame2').off();
				closeShadowbox();
			}
		});
		$('#swbx-frame2').mouseover(function() {
			swbxMouseOver = true;
		});
		$('#swbx-frame2').mouseout(function() {
			swbxMouseOver = false;
		});
	}
	
	hideShadowboxSpinner();
}
function closeShadowbox() {
	$('#swbx-opacity').remove();
	$('#swbx-frame').remove();
	$('#swbx-spinner').remove();
}
function showShadowboxSpinner() {
	$('#swbx-spinner').show();
}
function hideShadowboxSpinner() {
	$('#swbx-spinner').hide();
}
