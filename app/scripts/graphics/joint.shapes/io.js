//-- jshint rules                             
/* global sha1, placementCssIOTasks, WIRE_WIDTH */

'use strict';


// I/O blocks

joint.shapes.ice.IO = joint.shapes.ice.Model.extend({
  defaults: joint.util.deepSupplement(
    joint.shapes.ice.Model.prototype.defaults
  ),

  initialize: function () {
    this.updateSize();
    this.on('change:data', this.updateSize, this);
    joint.shapes.ice.Model.prototype.initialize.apply(this, arguments);
  },

  updateSize: function () {
    const fontSize = 14;

    const name = this.get('data').name;
    const pins = this.get('data').pins;

    let text = name;

    for (var i in pins) {
      if (pins[i].name.length > text.length) {
        text = pins[i].name;
      }
    }

    const context = document.createElement('canvas').getContext('2d');
    context.font = `${fontSize}px Monaco`;
    const textWidth = context.measureText(text).width;
    const newWidth = Math.round(Math.max(textWidth + 50, 96));
    this.resize(newWidth, this.size().height);
  },
});

joint.shapes.ice.Input = joint.shapes.ice.IO.extend({
  defaults: joint.util.deepSupplement(
    {
      type: 'ice.Input',
      size: {
        width: 96,
        height: 64,
      },
    },
    joint.shapes.ice.IO.prototype.defaults
  ),
});

joint.shapes.ice.Output = joint.shapes.ice.IO.extend({
  defaults: joint.util.deepSupplement(
    {
      type: 'ice.Output',
      size: {
        width: 96,
        height: 64,
      },
    },
    joint.shapes.ice.Model.prototype.defaults
  ),
});

joint.shapes.ice.InputLabel = joint.shapes.ice.IO.extend({
  markup:
    '<g class="rotatable">\
             <g class="scalable">\
               <rect class="body" />\
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

  //<polygon  class="input-virtual-terminator" points="0 -5,0 34,20 16" style="fill:white;stroke:<%= port.fill %>;stroke-width:3" transform="translate(100 -15)"/>\
  defaults: joint.util.deepSupplement(
    {
      type: 'ice.Output',
      size: {
        width: 96,
        height: 64,
      },
    },
    joint.shapes.ice.Model.prototype.defaults
  ),
});

joint.shapes.ice.OutputLabel = joint.shapes.ice.IO.extend({
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

  //<polygon points="1 0,15 15,0 30,30 30,30 0" style="fill:lime;stroke-width:1" transform="translate(-122 -15)"/>\
  defaults: joint.util.deepSupplement(
    {
      type: 'ice.Input',
      size: {
        width: 96,
        height: 64,
      },
    },
    joint.shapes.ice.Model.prototype.defaults
  ),
});

joint.shapes.ice.IOView = joint.shapes.ice.ModelView.extend({
  initialize: function () {
    _.bindAll(this, 'updateBox');
    joint.dia.ElementView.prototype.initialize.apply(this, arguments);
    let modelId = this.model.get('id');
    this.id = sha1(modelId).toString().substring(0, 6);
    let comboId = 'combo' + this.id;
    let virtual = this.model.get('data').virtual || this.model.get('disabled');

    let selectCode = '';
    let selectScript = '';
    let data = this.model.get('data');
    let name = data.name + (data.range || '');

    if (data.pins) {
      for (var i in data.pins) {
        selectCode += '<select id="' + comboId + data.pins[i].index + '"';
        selectCode += 'class="select2" i="' + i + '">';
        selectCode += '</select>';

        selectScript += '$("#' + comboId + data.pins[i].index + '").select2(';
        selectScript +=
          '{placeholder: "", allowClear: true, dropdownCssClass: "bigdrop",';
        // Match only words that start with the selected search term
        // http://stackoverflow.com/questions/31571864/select2-search-match-only-words-that-start-with-search-term
        selectScript += 'matcher: function(params, data) {';
        selectScript += '  params.term = params.term || "";';
        selectScript +=
          '  if (data.text.toUpperCase().indexOf(params.term.toUpperCase()) == 0) { return data; }';
        selectScript += '  return false; } });';
      }
    }

    this.$box = $(
      joint.util.template(
        '\
      <div class="io-block" data-blkid="' +
          modelId +
          '">\
        <div class="io-virtual-content' +
          (virtual ? '' : ' hidden') +
          '">\
          <div class="header">\
            <label>' +
          name +
          '</label>\
            <svg viewBox="0 0 12 18"><path d="M-1 0 l10 8-10 8" fill="none" stroke-width="2" stroke-linejoin="round"/>\
          </div>\
        </div>\
        <div class="io-fpga-content' +
          (virtual ? ' hidden' : '') +
          '">\
          <div class="header">\
            <label>' +
          name +
          '</label>\
            <svg viewBox="0 0 12 18"><path d="M-1 0 l10 8-10 8" fill="none" stroke-width="2" stroke-linejoin="round"/>\
          </div>\
          <div>' +
          selectCode +
          '</div>\
          <script>' +
          selectScript +
          '</script>\
        </div>\
      </div>\
      '
      )()
    );

    this.virtualContentSelector = this.$box.find('.io-virtual-content');
    this.fpgaContentSelector = this.$box.find('.io-fpga-content');
    this.headerSelector = this.$box.find('.header');

    let vcs = domCache[this.id + this.cid + '.io-virtual-content'];
    if (!vcs) {
      vcs = this.$box[0].querySelectorAll('.io-virtual-content');
      domCache[this.id + this.cid + '.io-virtual-content'] = vcs;
    }

    let fcs = domCache[this.id + this.cid + '.io-fpga-content'];
    if (!fcs) {
      fcs = this.$box[0].querySelectorAll('.io-fpga-content');
      domCache[this.id + this.cid + '.io-fpga-content'] = fcs;
    }

    this.nativeDom = {
      box: this.$box[0],
      virtualContentSelector: vcs,
      fpgaContentSelector: fcs,
    };

    this.model.on('change', this.updateBox, this);
    this.model.on('remove', this.removeBox, this);

    this.listenTo(this.model, 'process:ports', this.update);
    joint.dia.ElementView.prototype.initialize.apply(this, arguments);

    // Prevent paper from handling pointerdown.
    var self = this;
    var selector = this.$box.find('.select2');
    selector.on('mousedown click', function (event) {
      event.stopPropagation();
    });
    selector.on('change', function (event) {
      if (!self.updating) {
        var target = $(event.target);
        var i = target.attr('i');
        var name = target.find('option:selected').text();
        var value = target.val();
        var data = JSON.parse(JSON.stringify(self.model.get('data')));
        if (name !== null && value !== null) {
          data.pins[i].name = name;
          data.pins[i].value = value;
          self.model.set('data', data);
        }
      }
    });

    this.updateBox();

    this.updating = false;

    // Apply data
    if (!this.model.get('disabled')) {
      this.applyChoices();
      this.applyValues();
      this.applyShape();
    }
    this.applyClock();
  },

  applyChoices: function () {
    var data = this.model.get('data');
    if (data.pins) {
      for (var i in data.pins) {
        this.$box
          .find('#combo' + this.id + data.pins[i].index)
          .empty()
          .append(this.model.get('choices'));
      }
    }
  },

  applyValues: function () {
    this.updating = true;
    var data = this.model.get('data');
    for (var i in data.pins) {
      var index = data.pins[i].index;
      var value = data.pins[i].value;
      var name = data.pins[i].name;
      var comboId = '#combo' + this.id + index;
      var comboSelector = this.$box
        .filter(function () {
          return $(this).text() === name;
        })
        .val();

      if (comboSelector) {
        // Select by pin name
        comboSelector.attr('selected', true);
      } else {
        // If there was a pin rename use the pin value
        comboSelector = this.$box.find(comboId);
        comboSelector.val(value).change();
      }
    }
    this.updating = false;
  },

  applyShape: function () {
    var data = this.model.get('data');
    var name = data.name + (data.range || '');
    var virtual = data.virtual || this.model.get('disabled') || subModuleActive;
    var $label = this.$box.find('label');

    $label.text(name || '');

    if (virtual) {
      // Virtual port (green)
      this.fpgaContentSelector.addClass('hidden');
      this.virtualContentSelector.removeClass('hidden');

      if (typeof data.blockColor !== 'undefined') {
        // remove all previous "color-*" classes (ok with undo/redo commands)
        for (
          let i = 0;
          i < this.virtualContentSelector[0].classList.length;
          i++
        ) {
          let colorClass = this.virtualContentSelector[0].classList[i];
          if (colorClass.startsWith('color-')) {
            this.virtualContentSelector[0].classList.remove(colorClass);
          }
        }
        this.virtualContentSelector.addClass('color-' + data.blockColor);
      }

      this.model.attributes.size.height = 64;
    } else {
      // FPGA I/O port (yellow)
      this.virtualContentSelector.addClass('hidden');
      this.fpgaContentSelector.removeClass('hidden');
      if (data.pins) {
        this.model.attributes.size.height = 32 + 32 * data.pins.length;
      }
    }
  },

  applyClock: function () {
    if (this.model.get('data').clock) {
      this.$box.find('svg').removeClass('hidden');
    } else {
      this.$box.find('svg').addClass('hidden');
    }
  },

  clearValues: function () {
    this.updating = true;
    var name = '';
    var value = '0';
    var data = JSON.parse(JSON.stringify(this.model.get('data')));
    for (var i in data.pins) {
      var index = data.pins[i].index;
      var comboId = '#combo' + this.id + index;
      var comboSelector = this.$box.find(comboId);
      comboSelector.val(value).change();
      data.pins[i].name = name;
      data.pins[i].value = value;
    }
    this.model.set('data', data);
    this.updating = false;
  },

  apply: function () {
    this.applyChoices();
    this.applyValues();
    this.applyShape();
    this.applyClock();
    this.render();
  },

  update: function () {
    this.renderPorts();
    joint.dia.ElementView.prototype.update.apply(this, arguments);
  },
  place: placementCssIOTasks,
  pendingRender: false,
  updateBox: function () {
    const size = this.model.get('size');
    this.virtualContentSelector.width(size.width);
    var pendingTasks = [];
    var i, j, port;
    var bbox = this.model.getBBox();
    var data = this.model.get('data');
    var state = this.model.get('state');
    var rules = this.model.get('rules');
    var leftPorts = this.model.get('leftPorts');
    var rightPorts = this.model.get('rightPorts');
    var modelId = this.model.id;
    var portDefault, tokId, dome;
    var paths, rects;
    var width = WIRE_WIDTH * state.zoom;

    var pwires = this.$el[0].getElementsByClassName('port-wire');
    for (i = 0; i < pwires.length; i++) {
      pendingTasks.push({
        e: pwires[i],
        property: 'stroke-width',
        value: width + 'px',
      });
    }
    // Set buses
    var nwidth = width * 3;
    tokId = 'port-wire-' + modelId + '-';
    let ckey = '--';
    this.cacheDome = {};
    for (i = 0; i < leftPorts.length; i++) {
      port = leftPorts[i];
      if (port.size > 1) {
        //dome = document.getElementById(tokId + port.id);
        ckey = tokId + port.id;
        dome =
          typeof this.cacheDome[ckey] !== 'undefined'
            ? this.cacheDome[ckey]
            : document.getElementById(ckey);
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
        // dome = document.getElementById(tokId + port.id);
        ckey = tokId + port.id;
        dome =
          typeof this.cacheDome[ckey] !== 'undefined'
            ? this.cacheDome[ckey]
            : document.getElementById(ckey);
        this.cacheDome[ckey] = dome;

        pendingTasks.push({
          e: dome,
          property: 'stroke-width',
          value: nwidth + 'px',
        });
      }
    }
    // Render rules
    if (data && data.ports && data.ports.in) {
      tokId = 'port-default-' + modelId + '-';
      for (i = 0; i < data.ports.in.length; i++) {
        port = data.ports.in[i];
        ckey = tokId + port.name;
        portDefault =
          typeof this.cacheDome[ckey] !== 'undefined'
            ? this.cacheDome[ckey]
            : document.getElementById(ckey);
        this.cacheDome[ckey] = portDefault;

        // portDefault = document.getElementById(tokId + port.name);
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

          paths = portDefault.querySelectorAll('path');
          for (j = 0; j < paths.length; j++) {
            pendingTasks.push({
              e: paths[j],
              property: 'stroke-width',
              value: width + 'px',
            });
          }

          rects = portDefault.querySelectorAll('rect');
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
    //
    return this.place(data, bbox, state, pendingTasks);
  },

  drawPendingTasks: function (tasks) {
    let _this = this;
    function applyDrawPendingTasks() {
      var i = tasks.length;
      for (i = 0; i < tasks.length; i++) {
        if (_this.tasks[i].e !== null) {
          tasks[i].e.style[tasks[i].property] = tasks[i].value;
        }
      }
    }
    requestAnimationFrame(applyDrawPendingTasks);
  },

  removeBox: function () {
    // Close select options on remove
    this.$box.find('select').select2('close');
    this.$box.remove();
  },
});

joint.shapes.ice.InputView = joint.shapes.ice.IOView;
joint.shapes.ice.OutputView = joint.shapes.ice.IOView;


