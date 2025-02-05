//-- jshint rules                             
/* global WIRE_WIDTH */

'use strict';

// Custom wire

joint.shapes.ice.Wire = joint.dia.Link.extend({
  markup: [
    '<path class="connection" d="M 0 0 0 0"/>',
    '<path class="connection-wrap" d="M 0 0 0 0"/>',
    '<path class="marker-source" d="M 0 0 0 0"/>',
    '<path class="marker-target" d="M 0 0 0 0"/>',
    '<g class="labels"/>',
    '<g class="marker-vertices"/>',
    '<g class="marker-bifurcations"/>',
    '<g class="marker-arrowheads"/>',
    '<g class="link-tools"/>',
  ].join(''),

  labelMarkup: [
    '<g class="label hidden">',
    '<rect x="-8" y="-6" width="16" height="12" rx="2" ry="2" fill="white" stroke="#777"/>',
    '<text fill="#555"/>',
    '</g>',
  ].join(''),

  bifurcationMarkup: [
    '<g class="marker-bifurcation-group" transform="translate(<%= x %>, <%= y %>)">',
    '<circle class="marker-bifurcation" idx="<%= idx %>" r="<%= r %>" fill="#777"/>',
    '</g>',
  ].join(''),

  arrowheadMarkup: [
    '<g class="marker-arrowhead-group marker-arrowhead-group-<%= end %>">',
    '<circle class="marker-arrowhead" end="<%= end %>" r="8"/>',
    '</g>',
  ].join(''),

  toolMarkup: [
    '<g class="link-tool">',
    '<g class="tool-remove" event="remove">',
    '<circle r="8" />',
    '<path transform="scale(.6) translate(-16, -16)" d="M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z" />',
    '<title>Remove link</title>',
    '</g>',
    '</g>',
  ].join(''),

  vertexMarkup: [
    '<g class="marker-vertex-group" transform="translate(<%= x %>, <%= y %>)">',
    '<circle class="marker-vertex" idx="<%= idx %>" r="8" />',
    '<path class="marker-vertex-remove-area" idx="<%= idx %>" transform="scale(.8) translate(5, -33)" d="M16,5.333c-7.732,0-14,4.701-14,10.5c0,1.982,0.741,3.833,2.016,5.414L2,25.667l5.613-1.441c2.339,1.317,5.237,2.107,8.387,2.107c7.732,0,14-4.701,14-10.5C30,10.034,23.732,5.333,16,5.333z"/>',
    '<path class="marker-vertex-remove" idx="<%= idx %>" transform="scale(.6) translate(11.5, -39)" d="M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z">',
    '<title>Remove vertex</title>',
    '</path>',
    '</g>',
  ].join(''),

  defaults: joint.util.deepSupplement(
    {
      type: 'ice.Wire',

      labels: [
        {
          position: 0.5,
          attrs: {
            text: {
              'text': '',
              'y': '4px',
              'font-weight': 'bold',
              'font-size': '11px',
              'text-anchor': 'middle',
            },
          },
        },
      ],

      attrs: {
        '.connection': {
          'stroke-width': WIRE_WIDTH,
          'stroke': '#777',
        },
      },

      router: { name: 'ice' },
      connector: { name: 'ice' },
    },
    joint.dia.Link.prototype.defaults
  ),
});

joint.shapes.ice.WireView = joint.dia.LinkView.extend({
  options: {
    shortLinkLength: 64,
    longLinkLength: 160,
    linkToolsOffset: 40,
  },

  initialize: function () {
    joint.dia.LinkView.prototype.initialize.apply(this, arguments);

    var self = this;

    setTimeout(function () {
      var size = self.model.get('size');

      if (!size) {
        // New wire
        var i,
          port,
          portName = self.model.get('source').port;
        var rightPorts = self.sourceView.model.get('rightPorts');
        // Initialize wire properties
        for (i in rightPorts) {
          port = rightPorts[i];
          if (portName === port.id) {
            size = port.size;
            // For wire size connection validation
            self.model.attributes.size = size;
            break;
          }
        }
      }

      self.updateWireProperties(size);
      self.updateBifurcations();
    }, 100);
  },

  apply: function () {
    // No operation required
  },

  render: function () {
    joint.dia.LinkView.prototype.render.apply(this, arguments);
    return this;
  },

  remove: function () {
    joint.dia.LinkView.prototype.remove.apply(this, arguments);
    this.updateBifurcations();
    return this;
  },

  update: function () {
    joint.dia.LinkView.prototype.update.apply(this, arguments);
    this.updateBifurcations();
    return this;
  },

  renderLabels: function () {
    if (!this._V.labels) {
      return this;
    }

    this._labelCache = {};
    var $labels = $(this._V.labels.node).empty();

    var labels = this.model.get('labels') || [];
    if (!labels.length) {
      return this;
    }

    var labelTemplate = joint.util.template(
      this.model.get('labelMarkup') || this.model.labelMarkup
    );
    // This is a prepared instance of a vectorized SVGDOM node for the label element resulting from
    // compilation of the labelTemplate. The purpose is that all labels will just `clone()` this
    // node to create a duplicate.
    var labelNodeInstance = V(labelTemplate());

    _.each(
      labels,
      function (label, idx) {
        if (typeof idx === 'undefined' || idx === null || idx === false) {
        }
        var labelNode = labelNodeInstance.clone().node;
        V(labelNode).attr('label-idx', idx);
        this._labelCache[idx] = V(labelNode);

        var $text = $(labelNode).find('text');
        var textAttributes = _.extend(
          { 'text-anchor': 'middle', 'font-size': 13 },
          joint.util.getByPath(label, 'attrs/text', '/')
        );

        $text.attr(_.omit(textAttributes, 'text'));

        if (label.attrs.text.text) {
          $(labelNode).removeClass('hidden');
        }

        if (!_.isUndefined(textAttributes.text)) {
          V($text[0]).text(textAttributes.text + '', {
            annotations: textAttributes.annotations,
          });
        }
        $labels.append(labelNode);
      },
      this
    );

    return this;
  },

  updateToolsPosition: function () {
    if (!this._V.linkTools) {
      return this;
    }

    var scale = '';
    var offset = this.options.linkToolsOffset;
    var connectionLength = this.getConnectionLength();

    if (!_.isNaN(connectionLength)) {
      // If the link is too short, make the tools half the size and the offset twice as low.
      if (connectionLength < this.options.shortLinkLength) {
        scale = 'scale(.5)';
        offset /= 2;
      }

      var toolPosition = this.getPointAtLength(connectionLength - offset);
      this._toolCache.attr(
        'transform',
        'translate(' + toolPosition.x + ', ' + toolPosition.y + ') ' + scale
      );
    }

    return this;
  },

  updateWireProperties: function (size) {
    if (size > 1) {
      this.$('.connection').css('stroke-width', WIRE_WIDTH * 3);
      this.model.label(0, { attrs: { text: { text: size } } });

      this.model.bifurcationMarkup = this.model.bifurcationMarkup.replace(
        /<%= r %>/g,
        WIRE_WIDTH * 4
      );
    } else {
      this.model.bifurcationMarkup = this.model.bifurcationMarkup.replace(
        /<%= r %>/g,
        WIRE_WIDTH * 2
      );
    }
  },

  updateConnection: function (opt) {
    opt = opt || {};

    // Necessary path finding
    var route = (this.route = this.findRoute(
      this.model.get('vertices') || [],
      opt
    ));
    // finds all the connection points taking new vertices into account

    this._findConnectionPoints(route);
    var pathData = this.getPathData(route);

    // The markup needs to contain a `.connection`
    this._V.connection.attr('d', pathData.full);
    if (this._V.connectionWrap) {
      this._V.connectionWrap.attr('d', pathData.wrap);
    }

    this._translateAndAutoOrientArrows(
      this._V.markerSource,
      this._V.markerTarget
    );
  },

  // cacheUpdateBifurcations:{},
  updateBifurcations: function () {
    if (this._V.markerBifurcations) {
      var self = this;
      var currentWire = this.model;
      var allWires = this.paper.model.getLinks();

      // Find all the wires in the same port
      var portWires = [];
      var wireSource = false;
      var cwireSource = false;
      var wireView = false;
      var markerBifurcations = false;

      for (var i = 0, n = allWires.length; i < n; i++) {
        wireSource = allWires[i].get('source');
        cwireSource = currentWire.get('source');
        if (
          wireSource.id === cwireSource.id &&
          wireSource.port === cwireSource.port
        ) {
          // Wire with the same source of currentWire
          wireView = self.paper.findViewByModel(allWires[i]);
          // Clean the wire bifurcations
          markerBifurcations = $(wireView._V.markerBifurcations.node).empty();
          portWires.push({
            id: allWires[i].get('id'),
            view: wireView,
            markers: markerBifurcations,
          });
        }
      }

      var points = [];

      // Update all the portWires combinations
      if (portWires.length > 0) {
        var markupTemplate = joint.util.template(
          this.model.get('bifurcationMarkup') || this.model.bifurcationMarkup
        );
        var A, B, nW;
        for (A = 0, nW = portWires.length; A < nW; A++) {
          //        _.each(portWires, function (wireA) {
          for (B = 0; B < nW; B++) {
            //         _.each(portWires, function (wireB) {
            if (portWires[A].id !== portWires[B].id) {
              // Not the same wire
              findBifurcations(
                portWires[A].view,
                portWires[B].view,
                portWires[A].markers
              );
            }
          }
        }
      }

      /* jshint -W082 */

      function findBifurcations(wireA, wireB, markersA) {
        // Find the corners in A that intersects with any B segment
        var vA = v(wireA);
        var vB = v(wireB);

        if (vA.length > 2) {
          for (var i = 1; i < vA.length - 1; i++) {
            if (vA[i - 1].x !== vA[i + 1].x && vA[i - 1].y !== vA[i + 1].y) {
              // vA[i] is a corner
              for (var j = 0; j < vB.length - 1; j++) {
                // Eval if intersects any segment of wire vB
                if (evalIntersection(vA[i], [vB[j], vB[j + 1]])) {
                  // Bifurcation found!
                  var point = vA[i];
                  if (!contains(point, points)) {
                    points.push(point);
                    let mt = markupTemplate(point);
                    mt = mt.replace('r=""', 'r="1.5"');
                    markersA.append(V(mt).node);
                  }
                }
              }
            }
          }
        }
      }

      function contains(point, points) {
        var found = false;
        var np = points.length;

        for (var i = 0; i < np; i++) {
          if (points[i].x === point.x && points[i].y === point.y) {
            found = true;
            return;
          }
        }
        return found;
      }

      function v(wire) {
        var v = [];
        v.push(wire.sourcePoint);
        v = v.concat(wire.route);
        v.push({
          x: wire.targetPoint.x + 9,
          y: wire.targetPoint.y,
        });
        return v;
      }

      function evalIntersection(point, segment) {
        if (segment[0].x === segment[1].x) {
          // Vertical
          return (
            point.x === segment[0].x &&
            point.y > Math.min(segment[0].y, segment[1].y) &&
            point.y < Math.max(segment[0].y, segment[1].y)
          );
        } else {
          // Horizontal
          return (
            point.y === segment[0].y &&
            point.x > Math.min(segment[0].x, segment[1].x) &&
            point.x < Math.max(segment[0].x, segment[1].x)
          );
        }
      }

      /* jshint +W082 */
    }

    return this;
  },
});
