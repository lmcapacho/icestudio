//-- jshint rules                             
/* global placementCssIOTasks, placementCssTasks */



'use strict';

var os = require('os');
var sha1 = require('sha1');
var marked = require('marked');   // jshint unused:false
var openurl = require('openurl'); // jshint unused:false
var domCache = {};
const WIRE_WIDTH = 1.5;
const DARWIN = Boolean(os.platform().indexOf('darwin') > -1);

if (DARWIN) {
  var aceFontSize = '12';
} else {
  var aceFontSize = '14';
}

// Model element

joint.shapes.ice = {};
joint.shapes.ice.Model = joint.shapes.basic.Generic.extend({
  markup:
    '<g class="rotatable">\
             <g class="scalable">\
               <rect class="body"/>\
             </g>\
             <g class="leftPorts disable-port"/>\
             <g class="rightPorts"/>\
             <g class="topPorts disable-port"/>\
             <g class="bottomPorts"/>\
           </g>',
  portMarkup:
    '<g class="port port<%= index %>">\
                 <g class="port-default" id="port-default-<%= id %>-<%= port.id %>">\
                    <path/><rect/>\
                 </g>\
                 <path class="port-wire" id="port-wire-<%= id %>-<%= port.id %>"/>\
                 <text class="port-label"/>\
                 <circle class="port-body" r="0"/>\
               </g>',

  defaults: joint.util.deepSupplement(
    {
      type: 'ice.Model',
      size: {
        width: 1,
        height: 1,
      },
      leftPorts: [],
      rightPorts: [],
      topPorts: [],
      bottomPorts: [],
      attrs: {
        '.': {
          magnet: false,
        },
        '.body': {
          width: 1,
          height: 1,
          stroke: 'none',
        },
        '.port-body': {
          r: 16,
          opacity: 0,
        },
        '.leftPorts .port-body': {
          pos: 'left',
          type: 'input',
          magnet: false,
        },
        '.rightPorts .port-body': {
          pos: 'right',
          type: 'output',
          magnet: true,
        },
        '.topPorts .port-body': {
          pos: 'top',
          type: 'input',
          magnet: false,
        },
        '.bottomPorts .port-body': {
          pos: 'bottom',
          type: 'output',
          magnet: true,
        },
        '.port-label': {
          fill: '#777',
        },
        '.port-wire': {
          'stroke': '#777',
          'stroke-width': WIRE_WIDTH,
        },
        '.port-default': {
          display: 'none',
        },
        '.port-default rect': {
          'x': '-32',
          'y': '-8',
          'width': '16',
          'height': '16',
          'rx': '3',
          'ry': '3',
          'stroke': '#777',
          'stroke-width': 1,
          'fill': '#FBFBC9',
        },
        '.port-default path': {
          'd': 'M 0 0 L -20 0',
          'stroke': '#777',
          'stroke-width': WIRE_WIDTH,
        },
      },
    },
    joint.shapes.basic.Generic.prototype.defaults
  ),

  initialize: function () {
    this.updatePortsAttrs();
    this.processPorts();
    this.trigger('process:ports');
    this.on(
      'change:size change:leftPorts change:rightPorts change:topPorts change:bottomPorts',
      this.updatePortsAttrs,
      this
    );
    joint.shapes.basic.Generic.prototype.initialize.apply(this, arguments);
  },

  updatePortsAttrs: function (/*eventName*/) {
    if (this._portSelectors) {
      var newAttrs = _.omit(this.get('attrs'), this._portSelectors);
      this.set('attrs', newAttrs, { silent: true });
    }

    var attrs = {};
    this._portSelectors = [];

    _.each(
      ['left', 'right'],
      function (type) {
        var port = type + 'Ports';
        _.each(
          this.get(port),
          function (portName, index, ports) {
            var portAttributes = this.getPortAttrs(
              portName,
              index,
              ports.length,
              '.' + port,
              type,
              this.get('size').height
            );
            this._portSelectors = this._portSelectors.concat(
              _.keys(portAttributes)
            );
            _.extend(attrs, portAttributes);
          },
          this
        );
      },
      this
    );

    _.each(
      ['top', 'bottom'],
      function (type) {
        var port = type + 'Ports';
        _.each(
          this.get(port),
          function (portName, index, ports) {
            var portAttributes = this.getPortAttrs(
              portName,
              index,
              ports.length,
              '.' + port,
              type,
              this.get('size').width
            );
            this._portSelectors = this._portSelectors.concat(
              _.keys(portAttributes)
            );
            _.extend(attrs, portAttributes);
          },
          this
        );
      },
      this
    );

    this.attr(attrs, { silent: true });
  },

  getPortAttrs: function (port, index, total, selector, type, length) {
    var attrs = {};
    var gridsize = 8;
    var gridunits = length / gridsize;

    var portClass = 'port' + index;
    var portSelector = selector + '>.' + portClass;
    var portLabelSelector = portSelector + '>.port-label';
    var portWireSelector = portSelector + '>.port-wire';
    var portBodySelector = portSelector + '>.port-body';
    var portDefaultSelector = portSelector + '>.port-default';

    var portColor =
      typeof this.attributes.data.blockColor !== 'undefined'
        ? this.attributes.data.blockColor
        : 'lime';

    attrs[portSelector] = {
      ref: '.body',
    };

    attrs[portLabelSelector] = {
      text: port.label,
    };

    attrs[portWireSelector] = {};

    attrs[portBodySelector] = {
      port: {
        id: port.id,
        type: type,
        fill: portColor,
      },
    };

    attrs[portDefaultSelector] = {
      display: port.default && port.default.apply ? 'inline' : 'none',
    };

    if (type === 'leftPorts' || type === 'topPorts') {
      attrs[portSelector]['pointer-events'] = 'none';
      attrs[portWireSelector]['pointer-events'] = 'none';
    }

    var offset = port.size && port.size > 1 ? 4 : 1;
    var position = Math.round(((index + 0.5) / total) * gridunits) / gridunits;

    switch (type) {
      case 'left':
        attrs[portSelector]['ref-x'] = -16;
        attrs[portSelector]['ref-y'] = position;
        attrs[portLabelSelector]['dx'] = 0;
        attrs[portLabelSelector]['y'] = -5 - offset;
        attrs[portLabelSelector]['text-anchor'] = 'end';
        attrs[portWireSelector]['y'] = position;
        attrs[portWireSelector]['d'] = 'M 0 0 L 16 0';
        break;
      case 'right':
        attrs[portSelector]['ref-dx'] = 16;
        attrs[portSelector]['ref-y'] = position;
        attrs[portLabelSelector]['dx'] = 0;
        attrs[portLabelSelector]['y'] = -5 - offset;
        attrs[portLabelSelector]['text-anchor'] = 'start';
        attrs[portWireSelector]['y'] = position;
        attrs[portWireSelector]['d'] = 'M 0 0 L -16 0';
        break;
      case 'top':
        attrs[portSelector]['ref-y'] = -8;
        attrs[portSelector]['ref-x'] = position;
        attrs[portLabelSelector]['dx'] = -4;
        attrs[portLabelSelector]['y'] = -5 - offset;
        attrs[portLabelSelector]['text-anchor'] = 'start';
        attrs[portLabelSelector]['transform'] = 'rotate(-90)';
        attrs[portWireSelector]['x'] = position;
        attrs[portWireSelector]['d'] = 'M 0 0 L 0 8';
        break;
      case 'bottom':
        attrs[portSelector]['ref-dy'] = 8;
        attrs[portSelector]['ref-x'] = position;
        attrs[portLabelSelector]['dx'] = 4;
        attrs[portLabelSelector]['y'] = -5 - offset;
        attrs[portLabelSelector]['text-anchor'] = 'end';
        attrs[portLabelSelector]['transform'] = 'rotate(-90)';
        attrs[portWireSelector]['x'] = position;
        attrs[portWireSelector]['d'] = 'M 0 0 L 0 -8';
        break;
    }

    return attrs;
  },
});

joint.shapes.ice.ModelView = joint.dia.ElementView.extend({
  template: '',

  initialize: function () {
    _.bindAll(this, 'updateBox');
    joint.dia.ElementView.prototype.initialize.apply(this, arguments);

    this.$box = $(joint.util.template(this.template)());

    this.model.on('change', this.updateBox, this);
    this.model.on('remove', this.removeBox, this);

    this.updateBox();

    this.listenTo(this.model, 'process:ports', this.update);
  },

  setupResizer: function () {
    // Resizer
    if (!this.model.get('disabled')) {
      this.resizing = false;
      this.resizer = this.$box.find('.resizer');
      this.resizer.css('cursor', 'se-resize');
      this.resizer.on('mousedown', { self: this }, this.startResizing);
      $(document).on('mousemove', { self: this }, this.performResizing);
      $(document).on('mouseup', { self: this }, this.stopResizing);
    }
  },

  enableResizer: function () {
    if (!this.model.get('disabled')) {
      this.resizerDisabled = false;
      this.resizer.css('cursor', 'se-resize');
    }
  },

  disableResizer: function () {
    if (!this.model.get('disabled')) {
      this.resizerDisabled = true;
      this.resizer.css('cursor', 'move');
    }
  },

  apply: function () {},

  startResizing: function (event) {
    var self = event.data.self;

    if (self.resizerDisabled) {
      return;
    }
    self.model.graph.trigger('batch:start');

    self.resizing = true;
    self._clientX = event.clientX;
    self._clientY = event.clientY;
  },

  performResizing: function (event) {
    var self = event.data.self;

    if (!self.resizing || self.resizerDisabled) {
      return;
    }

    var type = self.model.get('type');
    var size = self.model.get('size');
    var state = self.model.get('state');
    var gridstep = 8;
    var minSize = { width: 64, height: 32 };
    if (type === 'ice.Code' || type === 'ice.Memory') {
      minSize = { width: 96, height: 64 };
    }

    var clientCoords = snapToGrid({ x: event.clientX, y: event.clientY });
    var oldClientCoords = snapToGrid({ x: self._clientX, y: self._clientY });

    var dx = clientCoords.x - oldClientCoords.x;
    var dy = clientCoords.y - oldClientCoords.y;

    var width = Math.max(size.width + dx, minSize.width);
    var height = Math.max(size.height + dy, minSize.height);

    if (width > minSize.width) {
      self._clientX = event.clientX;
    }

    if (height > minSize.height) {
      self._clientY = event.clientY;
    }

    self.model.resize(width, height);

    function snapToGrid(coords) {
      return {
        x: Math.round(coords.x / state.zoom / gridstep) * gridstep,
        y: Math.round(coords.y / state.zoom / gridstep) * gridstep,
      };
    }
  },

  stopResizing: function (event) {
    var self = event.data.self;

    if (!self.resizing || self.resizerDisabled) {
      return;
    }

    self.resizing = false;
    self.model.graph.trigger('batch:stop');
  },

  render: function () {
    joint.dia.ElementView.prototype.render.apply(this, arguments);
    this.paper.$el.append(this.$box);
    this.updateBox();
    return this;
  },

  renderPorts: function () {
    var $leftPorts = this.$('.leftPorts').empty();
    var $rightPorts = this.$('.rightPorts').empty();
    var $topPorts = this.$('.topPorts').empty();
    var $bottomPorts = this.$('.bottomPorts').empty();
    var portTemplate = _.template(this.model.portMarkup);
    var modelId = this.model.id;

    _.each(
      _.filter(this.model.ports, function (p) {
        return p.type === 'left';
      }),
      function (port, index) {
        $leftPorts.append(
          V(portTemplate({ id: modelId, index: index, port: port })).node
        );
      }
    );
    _.each(
      _.filter(this.model.ports, function (p) {
        return p.type === 'right';
      }),
      function (port, index) {
        $rightPorts.append(
          V(portTemplate({ id: modelId, index: index, port: port })).node
        );
      }
    );
    _.each(
      _.filter(this.model.ports, function (p) {
        return p.type === 'top';
      }),
      function (port, index) {
        $topPorts.append(
          V(portTemplate({ id: modelId, index: index, port: port })).node
        );
      }
    );
    _.each(
      _.filter(this.model.ports, function (p) {
        return p.type === 'bottom';
      }),
      function (port, index) {
        $bottomPorts.append(
          V(portTemplate({ id: modelId, index: index, port: port })).node
        );
      }
    );
  },

  update: function () {
    this.renderPorts();
    joint.dia.ElementView.prototype.update.apply(this, arguments);
  },

  updateBox: function () {},

  removeBox: function (/*event*/) {
    this.$box.remove();
  },

  updateScrollStatus: function (status) {
    if (this.editor) {
      this.editor.renderer.scrollBarV.element.style.visibility = status
        ? ''
        : 'hidden';
      this.editor.renderer.scrollBarH.element.style.visibility = status
        ? ''
        : 'hidden';
      this.editor.renderer.scroller.style.right = 0;
      this.editor.renderer.scroller.style.bottom = 0;
    }
  },
});

// Generic block

joint.shapes.ice.Generic = joint.shapes.ice.Model.extend({
  defaults: joint.util.deepSupplement(
    {
      type: 'ice.Generic',
    },
    joint.shapes.ice.Model.prototype.defaults
  ),
});

joint.shapes.ice.GenericView = joint.shapes.ice.ModelView.extend({
  // Image comments:
  // - img: fast load, no interactive
  // - object: slow load, interactive
  // - inline SVG: fast load, interactive, but...
  //               old SVG files have no viewBox, therefore no properly resize
  //               Inkscape adds this field saving as "Optimize SVG" ("Enable viewboxing")

  template:
    '\
  <div class="generic-block">\
    <div class="generic-content">\
      <div class="img-container"><img></div>\
      <label></label>\
      <span class="tooltiptext"></span>\
    </div>\
  </div>\
  ',

  events: {
    mouseover: 'mouseovercard',
    mouseout: 'mouseoutcard',
    mouseup: 'mouseupcard',
    mousedown: 'mousedowncard',
  },

  enter: false,

  mouseovercard: function (event /*, x, y*/) {
    if (event && event.which === 0) {
      // Mouse button not pressed
      this.showTooltip();
    }
  },

  mouseoutcard: function (/*event, x, y*/) {
    this.hideTooltip();
  },

  mouseupcard: function (/*event, x, y*/) {},

  mousedowncard: function (/*event, x, y*/) {
    this.hideTooltip();
  },

  showTooltip: function () {
    if (this.tooltip) {
      if (!this.openTimeout) {
        this.openTimeout = setTimeout(
          function () {
            this.tooltiptext.css('visibility', 'visible');
          }.bind(this),
          2000
        );
      }
    }
  },

  hideTooltip: function () {
    if (this.tooltip) {
      if (this.openTimeout) {
        clearTimeout(this.openTimeout);
        this.openTimeout = null;
      }
      this.tooltiptext.css('visibility', 'hidden');
    }
  },

  cache: { dom: {} },
  initialize: function () {
    joint.shapes.ice.ModelView.prototype.initialize.apply(this, arguments);

    this.tooltip = this.model.get('tooltip');
    this.tooltiptext = this.$box.find('.tooltiptext');
    this.tooltiptext.text(this.tooltip);

    if (this.tooltip.length > 13) {
      this.tooltiptext.addClass('tooltip-medium');
      this.tooltiptext.removeClass('tooltip-large');
    } else if (this.tooltip.length > 20) {
      this.tooltiptext.addClass('tooltip-large');
      this.tooltiptext.removeClass('tooltip-medium');
    } else {
      this.tooltiptext.removeClass('tooltip-medium');
      this.tooltiptext.removeClass('tooltip-large');
    }

    if (this.model.get('config')) {
      this.$box.find('.generic-content').addClass('config-block');
    }

    // Initialize content
    this.initializeContent();
  },

  initializeContent: function () {
    var image = this.model.get('image');
    var label = this.model.get('label');
    var ports = this.model.get('leftPorts');

    var imageSelector = this.$box.find('img');
    var labelSelector = this.$box.find('label');

    if (image) {
      imageSelector.attr('src', `file://${image}`);
      imageSelector.removeClass('hidden');
      labelSelector.addClass('hidden');
    } else {
      // Render label
      labelSelector.html(label);
      labelSelector.removeClass('hidden');
      imageSelector.addClass('hidden');
    }

    // Render clocks
    this.$box.find('.clock').remove();
    var n = ports.length;
    var gridsize = 8;
    var height = this.model.get('size').height;
    var contentSelector = this.$box.find('.generic-content');
    for (var i in ports) {
      var port = ports[i];
      if (port.clock) {
        var top =
          Math.round(((parseInt(i) + 0.5) * height) / n / gridsize) * gridsize -
          9;
        contentSelector.append(
          '\
          <div class="clock" style="top: ' +
            top +
            'px;">\
            <svg width="12" height="18"><path d="M-1 0 l10 8-10 8" fill="none" stroke="#555" stroke-width="1.2" stroke-linejoin="round"/>\
          </div>'
        );
      }
    }
    this.updateBox();
  },

  place: placementCssTasks,
  onUpdating: false,
  initialized: false,

  updateBox: function () {
    if (this.onUpdating === false) {
      this.onUpdating = true;
      let pendingTasks = [];
      let i, port;
      const bbox = this.model.getBBox();

      let data = this.model.get('data');
      const state = this.model.get('state');
      const rules = this.model.get('rules');
      const leftPorts = this.model.get('leftPorts');
      const rightPorts = this.model.get('rightPorts');
      const modelId = this.model.id;

      //-- temporalBypass permit for the momment bypass the optimal filter,
      //-- In the first render state not work properly and the render not works
      //-- correctly, until this is fixed, bypass the optimization
      //--
      let temporalBypass = true;
      if (temporalBypass || this.initialized === false) {
        this.initialized = true;
        // Render ports width
        let width = WIRE_WIDTH * state.zoom;
        // var pwires = this.$el[0].getElementsByClassName("port-wire");
        if (typeof this.pwires === 'undefined') {
          this.pwires = this.$el[0].getElementsByClassName('port-wire');
        }

        for (i = 0; i < this.pwires.length; i++) {
          pendingTasks.push({
            e: this.pwires[i],
            property: 'stroke-width',
            value: width + 'px',
          });
        }
        const nwidth = width * 3;
        let tokId = 'port-wire-' + modelId + '-';
        let dome;
        this.cacheDome = {};
        let ckey = '--';
        for (i = 0; i < leftPorts.length; i++) {
          port = leftPorts[i];
          if (port.size > 1) {
            ckey = tokId + port.id;
            dome =
              typeof this.cacheDome[ckey] !== 'undefined'
                ? this.cacheDome[ckey]
                : document.getElementById(tokId + port.id);
            this.cacheDome[ckey] = dome;

            pendingTasks.push({
              e: dome,
              property: 'stroke-width',
              value: nwidth + 'px',
            });
          }
        }

        for (i = 0; i < rightPorts.length; i++) {
          port = rightPorts[i];
          if (port.size > 1) {
            //dome = document.getElementById(tokId + port.id);
            ckey = tokId + port.id;
            dome =
              typeof this.cacheDome[ckey] !== 'undefined'
                ? this.cacheDome[ckey]
                : document.getElementById(tokId + port.id);
            this.cacheDome[ckey] = dome;

            pendingTasks.push({
              e: dome,
              property: 'stroke-width',
              value: nwidth + 'px',
            });
          }
        }

        // Render rules
        var portDefault, paths, rects, j;

        if (data && data.ports && data.ports.in) {
          tokId = 'port-default-' + modelId + '-';
          for (i = 0; i < data.ports.in.length; i++) {
            port = data.ports.in[i];
            //portDefault = document.getElementById(tokId + port.name);
            ckey = tokId + port.name;
            portDefault =
              typeof this.cacheDome[ckey] !== 'undefined'
                ? this.cacheDome[ckey]
                : document.getElementById(tokId + port.name);
            this.cacheDome[ckey] = dome;

            if (
              portDefault !== null &&
              rules &&
              port.default &&
              port.default.apply
            ) {
              pendingTasks.push({
                e: portDefault,
                property: 'display',
                value: 'inline',
              });

              paths = domCache[tokId + port.name + 'path'];
              if (!paths) {
                paths = portDefault.querySelectorAll('path');
                domCache[tokId + port.name + 'path'] = paths;
              }

              for (j = 0; j < paths.length; j++) {
                pendingTasks.push({
                  e: paths[j],
                  property: 'stroke-width',
                  value: width + 'px',
                });
              }
              rects = domCache[tokId + port.name + 'rect'];
              if (!rects) {
                rects = portDefault.querySelectorAll('rect');
                domCache[tokId + port.name + 'rect'] = rects;
              }

              for (j = 0; j < rects.length; j++) {
                pendingTasks.push({
                  e: rects[j],
                  property: 'stroke-width',
                  value: state.zoom + 'px',
                });
              }
            } else {
              pendingTasks.push({
                e: portDefault,
                property: 'display',
                value: 'none',
              });
            }
          }
        }
      }

      this.onUpdating = false;
      return this.place('.generic-content', bbox, state, pendingTasks);
    }
    return false;
  },
});
// Memory block

joint.shapes.ice.Memory = joint.shapes.ice.Model.extend({
  defaults: joint.util.deepSupplement(
    {
      type: 'ice.Memory',
      size: {
        width: 96,
        height: 104,
      },
    },
    joint.shapes.ice.Model.prototype.defaults
  ),
});

joint.shapes.ice.MemoryView = joint.shapes.ice.ModelView.extend({
  initialize: function () {
    _.bindAll(this, 'updateBox');
    joint.dia.ElementView.prototype.initialize.apply(this, arguments);

    var id = sha1(this.model.get('id')).toString().substring(0, 6);
    var editorLabel = 'editor' + id;

    // Select "ace-editor" theme depending on "uiTheme" profile variable
    var editorTheme;
    if (global.uiTheme === 'dark') {
      // DARK -> theme monokai
      editorTheme = 'monokai';
    } else {
      editorTheme = 'chrome'; // DEFAULT or LIGHT -> theme chrome
    }

    this.$box = $(
      joint.util.template(
        '\
      <div class="memory-block">\
        <div class="memory-content">\
          <div class="header">\
            <label></label>\
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 9.78"><path d="M2.22 4.44h3.56V3.11q0-.73-.52-1.26-.52-.52-1.26-.52t-1.26.52q-.52.52-.52 1.26v1.33zM8 5.11v4q0 .28-.2.47-.19.2-.47.2H.67q-.28 0-.48-.2Q0 9.38 0 9.11v-4q0-.28.2-.47.19-.2.47-.2h.22V3.11q0-1.28.92-2.2Q2.72 0 4 0q1.28 0 2.2.92.91.91.91 2.2v1.32h.22q.28 0 .48.2.19.2.19.47z"/></svg>\
          </div>\
        </div>\
        <div class="memory-editor" id="' +
          editorLabel +
          '"></div>\
        <script>\
          var ' +
          editorLabel +
          ' = ace.edit("' +
          editorLabel +
          '");\
          ' +
          editorLabel +
          '.setTheme("ace/theme/' +
          editorTheme +
          '");\
          ' +
          editorLabel +
          '.setHighlightActiveLine(false);\
          ' +
          editorLabel +
          '.setHighlightGutterLine(false);\
          ' +
          editorLabel +
          '.setOption("firstLineNumber", 0);\
          ' +
          editorLabel +
          '.setAutoScrollEditorIntoView(true);\
          ' +
          editorLabel +
          '.renderer.setShowGutter(true);\
          ' +
          editorLabel +
          '.renderer.$cursorLayer.element.style.opacity = 0;\
          ' +
          editorLabel +
          '.session.setMode("ace/mode/verilog");\
        </script>\
        <div class="resizer"/></div>\
      </div>\
      '
      )()
    );

    this.editorSelector = this.$box.find('.memory-editor');
    this.contentSelector = this.$box.find('.memory-content');
    this.headerSelector = this.$box.find('.header');

    this.model.on('change', this.updateBox, this);
    this.model.on('remove', this.removeBox, this);

    this.listenTo(this.model, 'process:ports', this.update);
    joint.dia.ElementView.prototype.initialize.apply(this, arguments);

    // Prevent paper from handling pointerdown.
    this.editorSelector.on('mousedown click', function (event) {
      event.stopPropagation();
    });

    this.updateBox();

    this.updating = false;
    this.prevZoom = 0;
    this.deltas = [];
    this.counter = 0;
    this.timer = null;
    var undoGroupingInterval = 200;

    var self = this;
    this.editor = ace.edit(this.editorSelector[0]);
    this.updateScrollStatus(false);
    this.editor.$blockScrolling = Infinity;
    this.editor.commands.removeCommand('touppercase');
    this.editor.session.on('change', function (delta) {
      if (!self.updating) {
        // Check consecutive-change interval
        if (Date.now() - self.counter < undoGroupingInterval) {
          clearTimeout(self.timer);
        }
        // Update deltas
        self.deltas = self.deltas.concat([delta]);
        // Launch timer
        self.timer = setTimeout(function () {
          var deltas = JSON.parse(JSON.stringify(self.deltas));
          // Set deltas
          self.model.set('deltas', deltas);
          // Reset deltas
          self.deltas = [];
          // Set data.list
          self.model.attributes.data.list = self.editor.session.getValue();
        }, undoGroupingInterval);
        // Reset counter
        self.counter = Date.now();
      }
    });
    this.editor.on('focus', function () {
      self.updateScrollStatus(true);
      $(document).trigger('disableSelected');
      self.editor.setHighlightActiveLine(true);
      self.editor.setHighlightGutterLine(true);
      // Show cursor
      self.editor.renderer.$cursorLayer.element.style.opacity = 1;
    });
    this.editor.on('blur', function () {
      self.updateScrollStatus(false);
      var selection = self.editor.session.selection;
      if (selection) {
        selection.clearSelection();
      }
      self.editor.setHighlightActiveLine(false);
      self.editor.setHighlightGutterLine(false);
      // Hide cursor
      self.editor.renderer.$cursorLayer.element.style.opacity = 0;
    });
    this.editor.on('paste', function (e) {
      if (e.text.startsWith('{"icestudio":')) {
        // Prevent paste blocks
        e.text = '';
      }
    });
    this.editor.on('mousewheel', function (event) {
      // Stop mousewheel event propagation when target is active
      if (
        document.activeElement.parentNode.id === self.editorSelector.attr('id')
      ) {
        // Enable only scroll
        event.stopPropagation();
      } else {
        // Enable only zoom
        event.preventDefault();
      }
    });

    this.setupResizer();

    // Apply data
    this.apply({ ini: true });
  },

  apply: function (opt) {
    this.applyName();
    this.applyLocal();
    this.applyValue(opt);
    this.applyFormat();
    if (this.editor) {
      this.editor.resize();
    }
  },

  applyName: function () {
    var name = this.model.get('data').name;
    this.$box.find('label').text(name);
  },

  applyLocal: function () {
    if (this.model.get('data').local) {
      this.$box.find('svg').removeClass('hidden');
    } else {
      this.$box.find('svg').addClass('hidden');
    }
  },

  applyValue: function (opt) {
    this.updating = true;
    var data = this.model.get('data');

    opt = opt || {};

    if (opt.ini) {
      this.editor.session.setValue(data.list);
    } else {
      // Set data.list
      this.model.attributes.data.list = this.editor.session.getValue();
    }
    setTimeout(
      function (self) {
        self.updating = false;
      },
      10,
      this
    );
  },

  applyFormat: function () {
    this.updating = true;

    var self = this;
    var data = this.model.get('data');
    var radix = data.format || 16; // Handle bad data that could happen in a previous .ice file
    this.editor.session.gutterRenderer = {
      getWidth: function (session, lastLineNumber, config) {
        return lastLineNumber.toString().length * config.characterWidth;
      },
      getText: function (session, row) {
        var text = row.toString(radix).toUpperCase();
        var config = self.editor.renderer.layerConfig;
        var size = config.lastRow.toString(radix).length;
        while (text.length < size) {
          text = '0' + text;
        }
        return (radix === 16 ? '0x' : '') + text;
      },
    };
    // this.editor.renderer.setShowGutter(false);
    this.editor.renderer.setShowGutter(true);

    this.updating = false;
  },

  update: function () {
    this.renderPorts();
    this.editor.setReadOnly(this.model.get('disabled'));
    joint.dia.ElementView.prototype.update.apply(this, arguments);
  },

  updateBox: function () {
    var bbox = this.model.getBBox();
    var data = this.model.get('data');
    var state = this.model.get('state');

    var pendingTasks = [];
    var editorUpdated = false;

    if (this.editor) {
      if (this.prevZoom !== state.zoom) {
        this.prevZoom = state.zoom;
        editorUpdated = true;

        pendingTasks.push(
          {
            e: this.editorSelector[0],
            property: 'top',
            value: 24 * state.zoom + 'px',
          },
          {
            e: this.editorSelector[0],
            property: 'margin',
            value: 7 * state.zoom + 'px',
          },
          {
            e: this.editorSelector[0],
            property: 'border-radius',
            value: 5 * state.zoom + 'px',
          },
          {
            e: this.editorSelector[0],
            property: 'border-width',
            value: state.zoom + 0.5 + 'px',
          }
        );

        var textLayers = this.$box[0].querySelectorAll('.ace_text-layer');
        for (var i = 0; i < textLayers.length; i++) {
          pendingTasks.push({
            e: textLayers[i],
            property: 'padding',
            value: '0px ' + Math.round(4 * state.zoom) + 'px',
          });
        }
      }

      if (editorUpdated) {
        this.editor.setFontSize(Math.round(aceFontSize * state.zoom));
        this.editor.renderer.$cursorLayer.$padding = Math.round(4 * state.zoom);
      }

      this.editor.resize();
    }

    var wireWidth = WIRE_WIDTH * state.zoom;
    var wires = this.$el[0].getElementsByClassName('port-wire');
    for (var j = 0; j < wires.length; j++) {
      pendingTasks.push({
        e: wires[j],
        property: 'stroke-width',
        value: wireWidth + 'px',
      });
    }

    var topOffset = data.name || data.local ? 0 : 24;
    pendingTasks.push(
      {
        e: this.contentSelector[0],
        property: 'left',
        value: Math.round((bbox.width / 2.0) * (state.zoom - 1)) + 'px',
      },
      {
        e: this.contentSelector[0],
        property: 'top',
        value:
          Math.round(
            ((bbox.height + topOffset) / 2.0) * (state.zoom - 1) + topOffset
          ) + 'px',
      },
      {
        e: this.contentSelector[0],
        property: 'width',
        value: Math.round(bbox.width) + 'px',
      },
      {
        e: this.contentSelector[0],
        property: 'height',
        value: Math.round(bbox.height - topOffset) + 'px',
      },
      {
        e: this.contentSelector[0],
        property: 'transform',
        value: 'scale(' + state.zoom + ')',
      }
    );

    if (data.name || data.local) {
      this.headerSelector.removeClass('hidden');
    } else {
      this.headerSelector.addClass('hidden');
    }

    pendingTasks.push(
      {
        e: this.$box[0],
        property: 'left',
        value: bbox.x * state.zoom + state.pan.x + 'px',
      },
      {
        e: this.$box[0],
        property: 'top',
        value: bbox.y * state.zoom + state.pan.y + 'px',
      },
      {
        e: this.$box[0],
        property: 'width',
        value: bbox.width * state.zoom + 'px',
      },
      {
        e: this.$box[0],
        property: 'height',
        value: bbox.height * state.zoom + 'px',
      }
    );

    requestAnimationFrame(() => {
      for (let task of pendingTasks) {
        if (task.e) {
          task.e.style[task.property] = task.value;
        }
      }
    });
  },
});

