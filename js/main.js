// Set map dimensions
const width = 960;
const height = 600;

// Colors based on margin of victory
const colorScale = d3.scaleThreshold()
    .domain([5, 10]) // Thresholds: <=5%, <=10%, >10%
    .range(["#add8e6", "#4682b4", "#00008b", "#f4cccc", "#e06666", "#a70000"]); // Light blue, blue, dark blue, light red, red, dark red

// SVG container
const svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

// Map projection and path generator
const projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale([1000]);

const path = d3.geoPath().projection(projection);

// Load data files
Promise.all([
    d3.json("data/usa_counties.geojson"), // GeoJSON file
    d3.csv("data/election_results.csv")   // Election data
]).then(([geoData, electionData]) => {
    // Normalize CSV FIPS codes (pad with leading zeros)
    electionData.forEach(d => {
        d.fips = d.county_fips.padStart(5, "0"); // Ensure 5-digit FIPS
        d.year = +d.year; // Convert year to integer
        d.candidatevotes = +d.candidatevotes;
        d.totalvotes = +d.totalvotes;
    });

    // Create a function to render the map based on a selected year
    function renderMap(year) {
        // Filter election data by year and compute margins
        const yearData = {};
        electionData.filter(d => d.year === year).forEach(d => {
            const margin = ((d.candidatevotes / d.totalvotes) * 100).toFixed(2);
            if (!yearData[d.fips] || +margin > yearData[d.fips].margin) {
                yearData[d.fips] = {
                    party: d.party,
                    margin: +margin
                };
            }
        });

        // Join GeoJSON data with election results
        geoData.features.forEach(feature => {
            const state = feature.properties.STATE.padStart(2, "0");
            const county = feature.properties.COUNTY.padStart(3, "0");
            const fips = state + county;
            feature.properties.election = yearData[fips] || { party: null, margin: 0 };
        });

        // Bind data and draw the map
        const counties = svg.selectAll("path")
            .data(geoData.features);

        counties.enter()
            .append("path")
            .merge(counties)
            .attr("d", path)
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .attr("fill", d => {
                const election = d.properties.election;
                if (election.party === "DEMOCRAT") {
                    return colorScale(election.margin);
                } else if (election.party === "REPUBLICAN") {
                    return colorScale(-election.margin); // Negative margins for red
                } else {
                    return "#ccc"; // Gray for no data
                }
            })
            .on("mouseover", (event, d) => {
                const election = d.properties.election;
                const tooltip = `
                    County: ${d.properties.NAME} <br>
                    Margin: ${election.margin}% <br>
                    Party: ${election.party || "No Data"}
                `;
                d3.select("#tooltip")
                    .style("visibility", "visible")
                    .html(tooltip)
                    .style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", () => {
                d3.select("#tooltip").style("visibility", "hidden");
            });

        counties.exit().remove();
    }

    // Dropdown change event
    d3.select("#year-select").on("change", function () {
        const selectedYear = +this.value;
        renderMap(selectedYear);
    });

    // Render default map
    renderMap(2020);
});
