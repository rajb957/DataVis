class ParallelCoordinatesPlot {
  constructor(svg, width, height, axes, groupColumnValues, groupColumnName) {
    this.svg = svg;
    this.width = width;
    this.height = height;
    this.axes = axes;
    this.groupColumnValues = groupColumnValues;
    this.groupColumnName = groupColumnName;
    this.colors = this.selectColor(this.groupColumnValues.length);
    // this.loadData.bind(this);
    this.dragging = false; // To track whether an axis is being dragged
    this.draggedAxis = null; // To store the axis being dragged
    this.axisOrder = axes; // Store the initial order of axes

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
    for (let i in this.axes) {
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
    var colors=[]
    for (let i = 0; i < number; i++) {
      const hue = i * 137.508; // use golden angle approximation
      colors.push(`hsl(${hue},50%,75%)`);
    }
    return colors;
  }
  // selectColor(number) {
  //   var colors=[];
  //   for (let i = 0; i < 360; i += 360 / number) {
  //     const hue = i;
  //     const saturation = 90 + Math.random() * 10;
  //     const lightness = 50 + Math.random() * 10;
  //     const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  //     colors.push(color);
  //   }
  //   return colors;
  // }

  highlight(selectedSpecie) {
    //   const selectedSpecie = d[this.groupColumnName];
    //bring the selected line into the front
    console.log(selectedSpecie);
    d3.selectAll(".line")
      .transition()
      .duration(200)
      .style("stroke", "lightgray")
      .style("opacity", "0.1")
      // .lower();
    d3.selectAll(".line" + selectedSpecie).each(function() {
      this.parentNode.appendChild(this); // move the selected species to the top of the SVG
    })
      .transition()
      .duration(200)
      .style("stroke", this.color(selectedSpecie))
      .style("opacity", "1")
  }

  doNotHighlight() {
    d3.selectAll(".line")
      .transition()
      .duration(200)
      .style("stroke", (d) => this.color(d[this.groupColumnName]))
      .style("opacity", "1");
    // d3.selectAll(".line")
    //   .transition()
    //   .duration(200)
    //   .style("stroke", "lightgrey")
    //   .style("opacity", "0.2");
  }

  path(d) {
    var kl = this.axes.map((p) => {
      return [this.x(p), this.y[p](d[p])];
    });
    return d3.line()(kl);
  }

  drawLines() {
    this.svg
      .selectAll("myPath")
      .data(this.data)
      .enter()
      .append("path")
      .attr("class", (d) => "line line" + d[this.groupColumnName])
      .attr("d", this.path)
      .style("fill", "none")
      .style("stroke", (d) => this.color(d[this.groupColumnName]))
      .style("opacity", 0.5);
    //   .on("mouseover", this.highlight)
    //   .on("mouseleave", this.doNotHighlight);
  }

  // drawAxis() {
  //   console.log(this.x);
  //   var val = (d) => this.y[d];
  //   this.svg
  //     .selectAll("myAxis")
  //     .data(this.axes)
  //     .enter()
  //     .append("g")
  //     .attr("class", "axis")
  //     .attr("transform", (d) => "translate(" + this.x(d) + ")")
  //     .each(function (d) {
  //       d3.select(this).call(d3.axisLeft().ticks(5).scale(val(d)));
  //     })
  //     .append("text")
  //     .style("text-anchor", "middle")
  //     .attr("y", -9)
  //     .text((d) => d)
  //     .style("fill", "black");
  // }

  plot() {
    this.drawAxis();
    this.drawLines();
  }
  // Function to handle axis dragging start
  dragStart = () => { // Use arrow function to preserve 'this'
    this.dragging = true;
    this.draggedAxis = this.findAxis(this.axisOrder, this.x, d3.event.x);
    this.svg.classed("move-cursor", true);
  }

  // Function to handle axis dragging
  // Function to handle axis dragging
drag = () => {
  if (this.dragging && this.draggedAxis) {
    const newOrder = this.axisOrder.filter(axis => axis !== this.draggedAxis);
    const i = this.findAxisIndex(newOrder, this.x, d3.event.x);

    // Check if the dragged axis was the last one, and handle it correctly
    if (i === newOrder.length - 1) {
      // If the dragged axis was the last one, push it to the end
      newOrder.push(this.draggedAxis);
    } else {
      newOrder.splice(i, 0, this.draggedAxis);
    }

    this.updateAxisOrder(newOrder);
  }
}



  // Function to handle axis dragging end
  dragEnd = () => { // Use arrow function to preserve 'this'
    this.dragging = false;
    this.draggedAxis = null;
    this.svg.classed("move-cursor", false); 
  }

  // Function to find the closest axis to the drag position
  findAxis(axes, xScale, mouseX) {
    return axes.reduce((closest, axis) => {
      const distance = Math.abs(xScale(axis) - mouseX);
      return distance < closest.distance ? { axis, distance } : closest;
    }, { axis: null, distance: Infinity }).axis;
  }

  // Function to find the index of the closest axis
  findAxisIndex(axes, xScale, mouseX) {
    return axes.findIndex(axis => axis === this.findAxis(axes, xScale, mouseX));
  }

  // Function to update the axis order and redraw
  updateAxisOrder(newOrder) {
    this.axisOrder = newOrder;
    this.x.domain(newOrder);
    this.svg.selectAll(".axis").transition().duration(500)
      .attr("transform", (d) => "translate(" + this.x(d) + ")");
    this.svg.selectAll(".line").attr("d", this.path);
  }

  // ... (no changes in the selectColor, highlight, doNotHighlight, and path functions)

  // Update the drawAxis function to support interactive reordering
  drawAxis() {
    const self = this; // Store a reference to 'this' for later use
    const val = (d) => this.y[d];
  
    const axisGroups = this.svg
      .selectAll(".axis")
      .data(this.axisOrder);
  
    axisGroups.exit().remove(); // Remove old axes
  
    const newAxisGroups = axisGroups.enter()
      .append("g")
      .attr("class", "axis")
      .attr("transform", (d) => "translate(" + this.x(d) + ")")
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
          // Allow clicking an axis to reverse its order
          const newOrder = [...self.axisOrder];
          newOrder.reverse();
          self.updateAxisOrder(newOrder);
        })
      );
  
    axisGroups.merge(newAxisGroups)
      .transition()
      .duration(500)
      .attr("transform", (d) => "translate(" + this.x(d) + ")");
  }


}

// export default ParallelCoordinatesPlot;
