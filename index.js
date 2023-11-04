// Define a ParallelCoordinates class
class ParallelCoordinates {
  constructor(dataFile) {
    // this.data = [];
    this.width = document.body.clientWidth;
    this.height = Math.max(document.body.clientHeight - 540, 300);
    // this.margins = [60, 0, 10, 0];
    this.m = [60, 0, 10, 0];
    this.w = this.width - this.m[1] - this.m[3];
    this.h = this.height - this.m[0] - this.m[2];
    this.chartWidth = this.width - this.m[1] - this.m[3];
    this.chartHeight = this.height - this.m[0] - this.m[2];
    // Initialize other properties here
    this.svg = null; // The SVG container
    this.render_speed = 50;
    this.axis = d3.svg
      .axis()
      .orient("left")
      .ticks(1 + this.h / 50);
    this.xAxis = null; // X-axis
    this.yAxis = null; // Y-axis
    this.brushes = {}; // Object to store brush selections
    this.brush_count = 0; // Count of brushes currently active
    this.legend = null; // The legend
    this.dragging = {};
    this.xscale = d3.scale.ordinal().rangePoints([0, this.chartWidth], 1);
    this.yscale = {};
    this.dimensions = [];
    this.excludedGroups = [];
    this.colors = {};

    // Load data
    this.loadData(dataFile);
  }
  setupColors() {
    // iterate over all data in "group" column and put each unique value into an array
    const color = _.uniq(_.pluck(this.raw_data, "group"));
    const colors = [];
    for (let i = 0; i < color.length; i++) {
      const hue = i * 137.508; // use golden angle approximation
      colors[color[i]] = [hue, 50, 75];
    }
    this.colors = colors;
    // console.log(this.colors);
  }
  loadData(dataFile) {
    d3.csv(dataFile, (raw_data) => {
      // Data loading and processing logic
      const data = raw_data.map((d) => {
        for (const k in d) {
          if (!_.isNaN(raw_data[0][k] - 0) && k !== "id") {
            d[k] = parseFloat(d[k]) || 0;
          }
        }
        return d;
      });
      // console.log(data);
      this.data = data;
      // Scale chart and canvas height
      d3.select("#chart").style(
        "height",
        this.h + this.m[0] + this.m[2] + "px"
      );

      d3.selectAll("canvas")
        .attr("width", this.w)
        .attr("height", this.h)
        .style("padding", this.m.join("px ") + "px");
      this.raw_data = data;
      // Other setup methods
      this.setupColors();
      this.setupCanvas();
      this.setupDimensions();
      this.setupSVG();
      this.setupAxes();
      this.setupBrushes();
      this.setupLegend();
      this.brush();
      // Other initialization tasks
    });
  }

  setupDimensions() {
    // Extract the list of numerical dimensions and create a scale for each.
    this.xscale.domain(
      (this.dimensions = d3
        .keys(this.raw_data[0])
        .filter((k) => {
          if (_.isNumber(this.raw_data[0][k])) {
            this.yscale[k] = d3.scale
              .linear()
              .domain(d3.extent(this.raw_data, (d) => +d[k]))
              .range([this.h, 0]);
            return true; // Include this dimension
          } else {
            return false; // Exclude this dimension
          }
        })
        .sort())
    );
  }

  setupCanvas() {
    this.foreground = document.getElementById("foreground").getContext("2d");
    this.foreground.globalCompositeOperation = "destination-over";
    this.foreground.strokeStyle = "rgba(0,100,160,0.1)";
    this.foreground.lineWidth = 1.7;
    this.foreground.fillText("Loading...", this.w / 2, this.h / 2);

    this.highlighted = document.getElementById("highlight").getContext("2d");
    this.highlighted.strokeStyle = "rgba(0,100,160,1)";
    this.highlighted.lineWidth = 4;

    this.background = document.getElementById("background").getContext("2d");
    this.background.strokeStyle = "rgba(0,100,160,0.1)";
    this.background.lineWidth = 1.7;

    d3.selectAll("canvas")
      .attr("width", this.w)
      .attr("height", this.h)
      .style("padding", this.m.join("px ") + "px");
  }

  setupSVG() {
    // Create and configure the SVG element
    this.svg = d3
      .select("#chart")
      .style("height", this.chartHeight + this.m[0] + this.m[2] + "px")
      .append("svg")
      .attr("width", this.chartWidth + this.m[1] + this.m[3])
      .attr("height", this.chartHeight + this.m[0] + this.m[2])
      .append("svg:g")
      .attr("transform", "translate(" + this.m[3] + "," + this.m[0] + ")");
  }
  color(d, a) {
    var c = this.colors[d];
    return ["hsla(", c[0], ",", c[1], "%,", c[2], "%,", a, ")"].join("");
  }

  position(d) {
    var v = this.dragging[d];
    return v == null ? this.xscale(d) : v;
  }

  setupAxes() {
    self = this;
    // Add a group element for each dimension.
    this.axisGroups = this.svg
      .selectAll(".dimension")
      .data(this.dimensions)
      .enter()
      .append("svg:g")
      .attr("class", "dimension")
      .attr("transform", (d) => "translate(" + this.xscale(d) + ")")
      .call(
        d3.behavior
          .drag()
          .on("dragstart", (d) => {
            this.dragging[d] = this.xscale(d);
            this.dragged = false;
            d3.select("#foreground").style("opacity", "0.35");
          })
          .on("drag", function (d) {
            self.dragging[d] = Math.min(
              self.chartWidth,
              Math.max(0, self.dragging[d] + d3.event.dx)
            );
            self.dimensions.sort((a, b) => self.position(a) - self.position(b));
            self.xscale.domain(self.dimensions);
            self.axisGroups.attr(
              "transform",
              (d) => "translate(" + self.position(d) + ")"
            );
            self.brushCount++;
            self.dragged = true;

            // Feedback for axis deletion if dropped
            if (
              self.dragging[d] < 12 ||
              self.dragging[d] > this.chartWidth - 12
            ) {
              d3.select(this).select(".background").style("fill", "#b00");
            } else {
              d3.select(this).select(".background").style("fill", null);
            }
          })
          .on("dragend", function (d) {
            if (!self.dragged) {
              // no movement, invert axis
              var extent = self.invertAxis(d);
            } else {
              // reorder axes
              d3.select(this)
                .transition()
                .attr("transform", "translate(" + self.xscale(d) + ")");
              var extent = self.yscale[d].brush.extent();
            }

            // remove axis if dragged all the way left
            if (
              self.dragging[d] < 12 ||
              self.dragging[d] > this.chartWidth - 12
            ) {
              self.removeAxis(d, self.axisGroups);
            }

            // TODO required to avoid a bug
            self.xscale.domain(self.dimensions);
            self.updateTicks(d, extent);

            // rerender
            d3.select("#foreground").style("opacity", null);
            self.brush();
            delete self.dragged;
            delete self.dragging[d];
          })
      );

    // Add an axis and title.
    this.axisGroups
      .append("svg:g")
      .attr("class", "axis")
      .attr("transform", "translate(0,0)")
      .each(function (d) {
        d3.select(this).call(self.axis.scale(self.yscale[d]));
      })
      .append("svg:text")
      .attr("text-anchor", "middle")
      .attr("y", (d, i) => (i % 2 === 0 ? -14 : -30))
      .attr("x", 0)
      .attr("class", "label")
      .text(String)
      .append("title")
      .text("Click to invert. Drag to reorder");
  }
  removeAxis(d, g) {
    this.dimensions = _.difference(this.dimensions, [d]);
    this.xscale.domain(this.dimensions);
    g.attr("transform", (p) => {
      return "translate(" + this.position(p) + ")";
    });
    g.filter(function (p) {
      return p == d;
    }).remove();
    this.updateTicks();
  }
  brush() {
    const self = this; // Store a reference to the current instance
    this.brush_count++;
    const actives = self.dimensions.filter(function (p) {
      return !self.yscale[p].brush.empty();
    });
    const extents = actives.map(function (p) {
      return self.yscale[p].brush.extent();
    });

    // hack to hide ticks beyond extent
    const b = d3.selectAll(".dimension")[0].forEach(function (element, i) {
      const dimension = d3.select(element).data()[0];
      if (_.include(actives, dimension)) {
        const extent = extents[actives.indexOf(dimension)];
        d3.select(element)
          .selectAll("text")
          .style("font-weight", "bold")
          .style("font-size", "13px")
          .style("display", function () {
            const value = d3.select(this).data();
            return extent[0] <= value && value <= extent[1] ? null : "none";
          });
      } else {
        d3.select(element)
          .selectAll("text")
          .style("font-size", null)
          .style("font-weight", null)
          .style("display", null);
      }
      d3.select(element).selectAll(".label").style("display", null);
    });

    // bold dimensions with label
    d3.selectAll(".label").style("font-weight", function (dimension) {
      if (_.include(actives, dimension)) return "bold";
      return null;
    });

    // Get lines within extents
    const selected = [];
    // console.log(self.raw_data);
    self.raw_data
      .filter(function (d) {
        return !_.contains(self.excludedGroups, d.group);
      })
      .map(function (d) {
        return actives.every(function (p, dimension) {
          return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
        })
          ? selected.push(d)
          : null;
      });
    console.log(selected);

    // total by food group
    const tallies = _(selected).groupBy(function (d) {
      return d.group;
    });

    // include empty groups
    _(self.colors).each(function (v, k) {
      tallies[k] = tallies[k] || [];
    });
    console.log(tallies);
    self.legend
      .style("text-decoration", function (d) {
        return _.contains(self.excludedGroups, d) ? "line-through" : null;
      })
      .attr("class", function (d) {
        // console.log(d);
        if (!tallies[d]) {
          tallies[d] = [];
        }
        return tallies[d].length > 0 ? "row1" : "row1 off";
      });

    self.legend.selectAll(".color-bar").style("width", function (d) {
      return Math.ceil((600 * tallies[d].length) / self.raw_data.length) + "px";
    });

    self.legend.selectAll(".tally").text(function (d, i) {
      return tallies[d].length;
    });

    // Render selected lines
    self.paths(selected, self.foreground, this.brush_count, true);
  }
  data_table(sample) {
    // sort by first column
    var sample = sample.sort(function (a, b) {
      var col = d3.keys(a)[0];
      return a[col] < b[col] ? -1 : 1;
    });

    var table = d3
      .select("#data-list")
      .html("")
      .selectAll(".row1")
      .data(sample)
      .enter()
      .append("div")
      .on("mouseover", (d) => {
        this.highlight(d);
      })
      .on("mouseout", (d) => {
        this.unhighlight();
      });

    table
      .append("span")
      .attr("class", "color-block px-2")
      .style("background", function (d) {
        return self.color(d.group, 0.85);
      });
    table.append("span").text(function (d) {
        return d.name;
      });

  }
  highlight(d) {
    d3.select("#foreground").style("opacity", "0.25");
    d3.selectAll(".row1").style("opacity", function (p) {
      return d.group == p ? null : "0.3";
    });
    this.path(d, this.highlighted, this.color(d.group, 1));
  }

  // Remove highlight
  unhighlight() {
    d3.select("#foreground").style("opacity", null);
    d3.selectAll(".row1").style("opacity", null);
    this.highlighted.clearRect(0, 0, this.w, this.h);
  }
  paths(selected, ctx, count) {
    var n = selected.length,
      i = 0,
      opacity = d3.min([2 / Math.pow(n, 0.3), 1]),
      timer = new Date().getTime();
    var shuffled_data = _.shuffle(selected);

    this.data_table(shuffled_data);

    ctx.clearRect(0, 0, this.w + 1, this.h + 1);

    // render all lines until finished or a new brush event
    var animloop = () => {
      if (i >= n || count < self.brush_count) return true;
      var max = d3.min([i + self.render_speed, n]);
      self.render_range(shuffled_data, i, max, opacity);
      self.render_stats(max, n, this.render_speed);
      i = max;
      timer = self.optimize(timer); // adjusts render_speed
    };

    d3.timer(animloop);
  }
  optimize(timer) {
    var delta = new Date().getTime() - timer;
    this.render_speed = Math.max(
      Math.ceil((this.render_speed * 30) / delta),
      8
    );
    this.render_speed = Math.min(this.render_speed, 300);
    return new Date().getTime();
  }
  render_range(selection, i, max, opacity) {
    selection.slice(i, max).forEach((d) => {
      this.path(d, this.foreground, this.color(d.group, opacity));
    });
  }
  render_stats(i, n, render_speed) {
    d3.select("#rendered-count").text(i);
    d3.select("#rendered-bar").style("width", (100 * i) / n + "%");
    d3.select("#render-speed").text(render_speed);
  }

  updateTicks(d, extent) {
    self = this;
    // update brushes
    if (d) {
      var brush_el = d3.selectAll(".brush").filter(function (key) {
        return key == d;
      });
      // single tick
      if (extent) {
        // restore previous extent
        brush_el.call(
          (self.yscale[d].brush = d3.svg
            .brush()
            .y(self.yscale[d])
            .extent(extent)
            .on("brush", () => {
              this.brush();
            }))
        );
      } else {
        brush_el.call(
          (self.yscale[d].brush = d3.svg
            .brush()
            .y(self.yscale[d])
            .on("brush", () => {
              this.brush();
            }))
        );
      }
    } else {
      // all ticks
      d3.selectAll(".brush").each(function (d) {
        d3.select(this).call(
          (self.yscale[d].brush = d3.svg
            .brush()
            .y(self.yscale[d])
            .on("brush", () => {
              self.brush();
            }))
        );
      });
    }

    this.brush_count++;

    this.show_ticks();

    // update axes
    d3.selectAll(".axis").each(function (d, i) {
      // hide lines for better performance
      d3.select(this).selectAll("line").style("display", "none");

      // transition axis numbers
      d3.select(this)
        .transition()
        .duration(720)
        .call(self.axis.scale(self.yscale[d]));

      // bring lines back
      d3.select(this)
        .selectAll("line")
        .transition()
        .delay(800)
        .style("display", null);

      d3.select(this)
        .selectAll("text")
        .style("font-weight", null)
        .style("font-size", null)
        .style("display", null);
    });
  }

  path(d, ctx, color) {
    // ctx=ctx.getContext("2d");

    if (color) ctx.strokeStyle = color;
    ctx.beginPath();
    var x0 = this.xscale(0) - 15,
      y0 = this.yscale[this.dimensions[0]](d[this.dimensions[0]]); // left edge
    ctx.moveTo(x0, y0);
    this.dimensions.map((p, i) => {
      var x = this.xscale(p),
        y = this.yscale[p](d[p]);
      var cp1x = x - 0.88 * (x - x0);
      var cp1y = y0;
      var cp2x = x - 0.12 * (x - x0);
      var cp2y = y;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
      x0 = x;
      y0 = y;
    });
    ctx.lineTo(x0 + 15, y0); // right edge
    ctx.stroke();
  }
  show_ticks() {
    d3.selectAll(".axis g").style("display", null);
    //d3.selectAll(".axis path").style("display", null);
    d3.selectAll(".background").style("visibility", null);
    d3.selectAll("#show-ticks").attr("disabled", "disabled");
    d3.selectAll("#hide-ticks").attr("disabled", null);
  }
  hide_ticks() {
    d3.selectAll(".axis g").style("display", "none");
    //d3.selectAll(".axis path").style("display", "none");
    d3.selectAll(".background").style("visibility", "hidden");
    d3.selectAll("#hide-ticks").attr("disabled", "disabled");
    d3.selectAll("#show-ticks").attr("disabled", null);
  }
  invertAxis(d) {
    // save extent before inverting
    if (!this.yscale[d].brush.empty()) {
      var extent = this.yscale[d].brush.extent();
    }
    if (this.yscale[d].inverted == true) {
      this.yscale[d].range([this.h, 0]);
      d3.selectAll(".label")
        .filter(function (p) {
          return p == d;
        })
        .style("text-decoration", null);
      this.yscale[d].inverted = false;
    } else {
      this.yscale[d].range([0, this.h]);
      d3.selectAll(".label")
        .filter(function (p) {
          return p == d;
        })
        .style("text-decoration", "underline");
      this.yscale[d].inverted = true;
    }
    return extent;
  }
  setupBrushes() {
    // Add and store a brush for each axis.
    self = this;
    this.axisGroups
      .append("svg:g")
      .attr("class", "brush")
      .each(function (d) {
        d3.select(this).call(
          (self.yscale[d].brush = d3.svg
            .brush()
            .y(self.yscale[d])
            .on("brush", () => {
              self.brush();
            }))
        );
      })
      .selectAll("rect")
      .style("visibility", null)
      .attr("x", -23)
      .attr("width", 36)
      .append("title")
      .text("Drag up or down to brush along this axis");

    this.axisGroups
      .selectAll(".extent")
      .append("title")
      .text("Drag or resize this filter");
  }
  setupLegend() {
    // create legend
    var self = this;
    this.legend = d3
      .select("#legend")
      .html("")
      .selectAll(".row1")
      .data(_.keys(this.colors).sort())
      .enter()
      .append("div")
      .attr("title", "Hide group")
      .on("click", function (d) {
        // console.log(d);
        // toggle food group
        if (_.contains(self.excludedGroups, d)) {
          d3.select(this).attr("title", "Hide group");
          self.excludedGroups = _.difference(self.excludedGroups, [d]);
          self.brush();
        } else {
          d3.select(this).attr("title", "Show group");
          self.excludedGroups.push(d);
          self.brush();
        }
      });
      
      this.legend.append("span").text((d, i) => " "+d+"\t");
      this.legend
      .append("span")
      .style("background", (d, i) => this.color(d, 0.85))
      .attr("class", "color-bar");

      this.legend
        .append("span")
        .attr("class", "tally")
        .text((d, i) => 0);

  }

  actives() {
    const actives = this.dimensions.filter(
      (p) => !this.yscale[p].brush.empty()
    );
    const extents = actives.map((p) => this.yscale[p].brush.extent());
    const selected = [];
    this.raw_data
      .filter((d) => !_.contains(this.excludedGroups, d.group))
      .map((d) => {
        return actives.every((p, i) => {
          return extents[i][0] <= d[p] && d[p] <= extents[i][1];
        })
          ? selected.push(d)
          : null;
      });

    // free text search
    const query = d3.select("#search").node().value;
    if (query.length > 0) {
      selected = this.search(selected, query);
    }
    return selected;
  }
  // Other methods related to rendering, interaction, and more
}
const pc = new ParallelCoordinates("./refined1.csv");
d3.select("#hide-ticks").on("click", pc.hide_ticks);
d3.select("#show-ticks").on("click", pc.show_ticks);
