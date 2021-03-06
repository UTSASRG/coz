// Ensure the brower supports the File API
if (!(<any> window).File || !(<any> window).FileReader) {
  alert('The File APIs are not fully supported in this browser.');
}

let current_profile: Profile = undefined;

function get_min_points(): number {
  return (<any> d3.select('#minpoints_field').node()).value;
}

function display_warning(title: string, text: string): void {
  const warning = $(
    `<div class="alert alert-warning alert-dismissible" role="alert">
      <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      <strong>${title}:</strong> ${text}
    </div>`);
  $('#warning-area').append(warning);

  // Fade out after 5 seconds.
  setTimeout(() => {
    warning.fadeOut(500, () => {
      warning.alert('close');
    });
  }, 5000);
}

function update(resize?: boolean) {
  if (current_profile === undefined) return;

  // Enable the sortby field
  d3.select('#sortby_field').attr('disabled', null);

  // Draw plots
  current_profile.drawPlots(resize);

  // Draw the legend
  current_profile.drawLegend();

  let tooltip = d3.select("body")
  	.append("div")
  	.style("position", "absolute")
  	.style("z-index", "10")
  	.style("visibility", "hidden");

  // Shorten path strings
  let paths = d3.selectAll('.path')
    .classed('path', false).classed('shortpath', true)
    .text(function(d) {
      let parts = d.split('/');
      let filename = parts[parts.length-1];
      return filename;
    });
}

// Set a handler for the load profile button
d3.select('#load-profile-btn').on('click', function() {
  // Reset the filename field
  d3.select('#load-profile-filename').attr('value', '');

  // Disable the open button
  d3.select('#load-profile-open-btn').classed('disabled', true);
});

// Set a handler for the fake browse button
d3.select('#load-profile-browse-btn').on('click', function() {
  $('#load-profile-file').trigger('click');
});

// Set a handler for file selection
d3.select('#load-profile-file').on('change', function() {
  let file_browser = this;
  let open_button = d3.select('#load-profile-open-btn');

  d3.select('#load-profile-filename').attr('value', file_browser.value.replace(/C:\\fakepath\\/i, ''));

  open_button.classed('disabled', false)
    .on('click', function() {
      var reader = new FileReader();
      reader.onload = function(event) {
        let contents: string = (<any> event.target).result;
        current_profile = new Profile(contents, d3.select('#plot-area'), d3.select('#legend'), get_min_points, display_warning);
        update();
      };

      reader.onerror = function(event) {
        console.error("Unable to read file. Error code: " + (<any> event.target).error.code);
      };

      // Read the profile
      reader.readAsText(file_browser.files[0]);

      // Clear the file browser value
      file_browser.value = '';
    });
});

// Update the plots and minpoints display when dragged or clicked
d3.select('#minpoints_field').on('input', function() {
  d3.select('#minpoints_display').text(this.value);
  update();
});

d3.select('#sortby_field').on('change', update);

d3.select(window).on('resize', function() { update(true); });

let sample_profiles = ['blackscholes', 'dedup', 'ferret', 'fluidanimate', 'sqlite', 'swaptions'];
let sample_profile_objects: {[name: string]: Profile} = {};

let samples_sel = d3.select('#samples').selectAll('.sample-profile').data(sample_profiles)
  .enter().append('button')
    .attr('class', 'btn btn-sm btn-default sample-profile')
    .attr('data-dismiss', 'modal')
    .attr('loaded', 'no')
    .text(function(d) { return d; })
    .on('click', function(d) {
      let sel = d3.select(this);
      if (sel.attr('loaded') !== 'yes') {
        // Avoid race condition: Set first.
        sel.attr('loaded', 'yes');
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `profiles/${d}.coz`);
        xhr.onload = function() {
          current_profile = sample_profile_objects[d] =
            new Profile(xhr.responseText, d3.select('#plot-area'), d3.select('#legend'), get_min_points, display_warning);
          update();
        };
        xhr.onerror = function() {
          sel.attr('loaded', 'no');
          display_warning("Error", `Failed to load profile for ${d}.`);
        };
        xhr.send();
      } else {
        current_profile = sample_profile_objects[d];
        update();
      }
    });
