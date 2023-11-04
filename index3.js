class ParallelCoordinatesPlot {
  constructor(svg, width, height, axes, groupColumnValues, groupColumnName) {
    this.svg = svg;
    this.width = width;
    this.height = height;
    this.axes = axes;
    this.groupColumnValues = groupColumnValues;
    this.groupColumnName = groupColumnName;
    this.colors = this.selectColor(this.groupColumnValues.length);
    this.dragging = false;
    this.draggedAxis = null;
    this.axisOrder = axes.slice(); // Store a copy of the initial order of axes

    this.svg.call(
      d3.drag()
        .subject(() => this.findAxis(this.axisOrder, this.x, d3.event.x))
        .on("start", () => this.dragStart())
        .on("drag", () => this.drag())
        .on("end", () => this.dragEnd())
    );
  }

  loadData(data_link) {
    d3.csv(data_link, (data) => {
      this.data = data;
      this.initialize();
      this.plot();
    });
  }

  initialize() {
    this.color = d3
      .scaleOrdinal()
      .domain(this.groupColumnValues)
      .range(this.colors);
    this.y = {};
    for (let i = 0; i < this.axes.length; i++) {
      const name = this.axes[i];
      this.y[name] = d3
        .scaleLinear()
        .domain(
          d3.extent(this.data, function (d) {
            return +d[name];
          })
        )
        .range([this.height, 0]);
    }
    this.x = d3
      .scalePoint()
      .range([0, this.width])
      .padding(1)
      .domain(this.axes);
    this.highlight = this.highlight.bind(this);
    this.doNotHighlight = this.doNotHighlight.bind(this);
    this.path = this.path.bind(this);
  }

  selectColor(number) {
    const colors = [];
    for (let i = 0; i < number; i++) {
      const hue = i * 137.508; // use golden angle approximation
      colors.push(`hsl(${hue},50%,75%)`);
    }
    return colors;
  }

  highlight(selectedSpecie) {
    d3.selectAll(".line")
      .transition()
      .duration(200)
      .style("stroke", "lightgray")
      .style("opacity", "0.1");
    d3.selectAll(`.line${selectedSpecie}`)
      .each(function() {
        this.parentNode.appendChild(this); // move the selected species to the top of the SVG
      })
      .transition()
      .duration(200)
      .style("stroke", this.color(selectedSpecie))
      .style("opacity", "1");
  }

  doNotHighlight() {
    d3.selectAll(".line")
      .transition()
      .duration(200)
      .style("stroke", (d) => this.color(d[this.groupColumnName]))
      .style("opacity", "1");
  }

  path(d) {
    const kl = this.axes.map((p) => {
      return [this.x(p), this.y[p](d[p])];
    });
    return d3.line()(kl);
  }

  drawLines() {
    this.svg
      .selectAll(".line")
      .data(this.data)
      .enter()
      .append("path")
      .attr("class", (d) => `line line${d[this.groupColumnName]}`)
      .attr("d", this.path)
      .style("fill", "none")
      .style("stroke", (d) => this.color(d[this.groupColumnName]))
      .style("opacity", 0.5);
  }

  plot() {
    this.drawAxis();
    this.drawLines();
  }

  dragStart() {
    this.dragging = true;
    this.draggedAxis = this.findAxis(this.axisOrder, this.x, d3.event.x);
    this.svg.classed("move-cursor", true);
  }

  drag() {
    if (this.dragging && this.draggedAxis) {
      const newOrder = this.axisOrder.filter(axis => axis !== this.draggedAxis);
      const i = this.findAxisIndex(newOrder, this.x, d3.event.x);

      // Check if the dragged axis was the last one, and handle it correctly
      if (i === newOrder.length) {
        // If the dragged axis was the last one, push it to the end
        newOrder.push(this.draggedAxis);
      } else {
        newOrder.splice(i, 0, this.draggedAxis);
      }

      this.updateAxisOrder(newOrder);
    }
  }

  dragEnd() {
    this.dragging = false;
    this.draggedAxis = null;
    this.svg.classed("move-cursor", false); 
  }

  findAxis(axes, xScale, mouseX) {
    return axes.reduce((closest, axis) => {
      const distance = Math.abs(xScale(axis) - mouseX);
      return distance < closest.distance ? { axis, distance } : closest;
    }, { axis: null, distance: Infinity }).axis;
  }

  findAxisIndex(axes, xScale, mouseX) {
    return axes.findIndex(axis => axis === this.findAxis(axes, xScale, mouseX));
  }

  updateAxisOrder(newOrder) {
    this.axisOrder = newOrder;
    this.x.domain(newOrder);
    this.svg.selectAll(".axis").transition().duration(500)
      .attr("transform", (d) => `translate(${this.x(d)})`);
    this.svg.selectAll(".line").attr("d", this.path);
  }

  drawAxis() {
    const self = this;
    const val = (d) => this.y[d];
  
    const axisGroups = this.svg
      .selectAll(".axis")
      .data(this.axisOrder);
  
    axisGroups.exit().remove();
  
    const newAxisGroups = axisGroups.enter()
      .append("g")
      .attr("class", "axis")
      .attr("transform", (d) => `translate(${this.x(d)})`)
      .call(g => g
        .each(function (d) {
          d3.select(this).call(d3.axisLeft().ticks(5).scale(val(d)));
        })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text((d) => d)
        .style("fill", "black")
        .on("click", function (d) {
          const newOrder = [...self.axisOrder];
          newOrder.reverse();
          self.updateAxisOrder(newOrder);
        })
      );
  
    axisGroups.merge(newAxisGroups)
      .transition()
      .duration(500)
      .attr("transform", (d) => `translate(${this.x(d)})`);
  }
}