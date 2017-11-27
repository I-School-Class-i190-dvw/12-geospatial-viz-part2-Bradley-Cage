// Lecture 12 - Geospatial data contiuned - Bradley Cage

// Set up our width and height, but use the max window size (or a default 960x500 if the window is too small)
var width = Math.max(960, window.innerWidth),
    height = Math.max(500, window.innerHeight);

// Define pi constants to save retyping it each time
var pi = Math.PI,
    tau = 2 * pi;

// Select the geomercator projection and scale it to 1/2pi
var projection = d3.geoMercator()
  .scale(1 / tau)
  .translate([0, 0]);

// We bind a geopath to the projection, we'll use this later
var path = d3.geoPath()
  .projection(projection);

// Create the render area for our tiles
var tile = d3.tile()
  .size([width, height]);

// This create our zoom feature and sets limits on the scale, 1:2^11 and 1:2^24 
var zoom = d3.zoom()
  .scaleExtent([
    1 << 11,
    1 << 24
  ])
  .on('zoom', zoomed);

// Create a sqrt scale to show the magnitude of each quake
var radius = d3.scaleSqrt().range([0, 10]);

// Append our svg to the html body
var svg = d3.select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

// Add a group element to our svg, we'll use for the rasterized tiles
var raster = svg.append('g');

// -- Chris's comments here -- 
// render to a single path:
// var vector = svg.append('path');
// render to multiple paths:
var vector = svg.selectAll('path');

// Perform all of our json processing inside the function
d3.json('data/earthquakes_4326_cali.geojson', function(error, geojson) {
  if (error) throw error; // Standard and naive error handling, good enough for now

  // Set the domain of the sqrt range to be from zero to the largest quake magnitude
  radius.domain([0, d3.max(geojson.features, function(d) { return d.properties.mag; })]);
  
  // Here we actually draw a point with a specified radius for every earthquake data point
  path.pointRadius(function(d) {
    return radius(d.properties.mag);
  });
  
  // -- Chris's comments --
  // render to a single path:
  // vector = vector.datum(geojson);
  // render to multiple paths:
  vector = vector
    .data(geojson.features)
    .enter().append('path')
    .attr('d', path)
    .on('mouseover', function(d) { console.log(d); });
  
  // Set up a default center for our projection in lat/lon
  var center = projection([-119.665, 37.414]);
  
  // Call our zoom element and use this to set our default zoom and position
  svg.call(zoom)
    .call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(1 << 14)
        .translate(-center[0], -center[1])
    );
});

// Here we handle our zooming in and out
function zoomed() {

  // Create an transform based on our transformation 
  var transform = d3.event.transform;
  
  // Rescale the new tiles based on our new hieght
  var tiles = tile
    .scale(transform.k)
    .translate([transform.x, transform.y])
    ();
    
  // Update our projection to handle the fact that we have now zoomed in, and translate to the correct view
  projection
    .scale(transform.k / tau)
    .translate([transform.x, transform.y]);
  
  // Set the new path
  vector.attr('d', path);
  
  // Get updated rasterized tile images
  var image = raster
    .attr('transform', stringify(tiles.scale, tiles.translate))
    .selectAll('image')
    .data(tiles, function(d) { return d; });
  
  // Remove any images that are no longer in the render
  image.exit().remove();
  
  // Add new images to the render with the proper call to the image server (annoying string manipulation needed).
  // After fetching the images set them to the appropriate size
  image.enter().append('image')
    .attr('xlink:href', function(d) {
      return 'http://' + 'abc'[d[1] % 3] + '.basemaps.cartocdn.com/rastertiles/voyager/' +
        d[2] + "/" + d[0] + "/" + d[1] + ".png";
    })
    .attr('x', function(d) { return d[0] * 256; })
    .attr('y', function(d) { return d[1] * 256; })
    .attr('width', 256)
    .attr('height', 256);
}

// Here we manipulate strings to form the proper translate command based on our scale and location
function stringify(scale, translate) {
  var k = scale / 256,
      r = scale % 1 ? Number : Math.round;
  return "translate(" + r(translate[0] * scale) + "," + r(translate[1] * scale) + ") scale(" + k + ")";
}