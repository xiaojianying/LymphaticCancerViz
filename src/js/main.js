var template = {
    nodes: [
    {
        name: "1A",
        x: 600,
        y: 150
    },
    {
        name: "1B",
        x: 450,
        y: 150
    },
    {
        name: "2",
        x: 225,
        y: 200
    },
    {
        name: "3",
        x: 300,
        y: 300
    },
    {
        name: "4A",
        x: 300,
        y: 450
    },
    {
        name: "5A",
        x: 150,
        y: 300
    },
    {
        name: "5B",
        x: 150,
        y: 450
    },
    {
        name: "6",
        x: 600,
        y: 300
    },
    {
        name: "7A",
        x: 225,
        y: 100
    }
    ],
    // links: [{
    //     source: 0,
    //     target: 1
    // },
    // {
    //     source: 1,
    //     target: 2
    // },
    // {
    //     source: 2,
    //     target: 3
    // },
    // {
    //     source: 3,
    //     target: 4
    // },
    // {
    //     source: 4,
    //     target: 6
    // },
    // {
    //     source: 5,
    //     target: 6
    // },
    // {
    //     source: 5,
    //     target: 2
    // },
    // {
    //     source: 2,
    //     target: 8
    // },
    // {
    //     source: 1,
    //     target: 7
    // },
    // {
    // source: 0,
    // target: 7
    // }
    // ]
};

var sites = [

    {
        patient: '1',
        nodes: ['1B', '2']
    },
    {
        patient: '2',
        nodes: ['2']
    },
    {
        patient: '3',
        nodes: []
    },
    {
        patient: '4',
        nodes: ['2']
    },
    {
        patient: '5',
        nodes: ['4A', '2', '3']
    },
    {
        patient: '6',
        nodes: ['2', '3']
    },
    {
        patient: '7',
        nodes: []
    },
    {
        patient: '8',
        nodes: ['2']
    },
    {
        patient: '9',
        nodes: ['2']
    },
    {
        patient: '10',
        nodes: []
    },
    {
        patient: '11',
        nodes: ['7A', '2', '2']
    }

];

var groupPath = function(d) {
    console.log(d);
    return "M" +
        d3.geom.hull(d.values.map(function(i) { return [i.x, i.y]; }))
            .join("L")
        + "Z";
};

var fill = d3.scale.category10();

var groupFill = function(d, i) { return fill(i & 3); };


function createNetwork(div, data){

    var svg = d3.select(div)
        .append("svg")
        .attr("width", 1200)
        .attr("height", 800);

    var groups = d3.nest().key(function(d) {
        console.log(d);
        return d & 3; }).entries(data.nodes);

    // var links = svg.selectAll("link")
    //     .data(data.links)
    //     .enter()
    //     .append("line")
    //     .attr("class", "link")
    //     .attr("x1", function(l) {
    //         var sourceNode = data.nodes.filter(function(d, i) {
    //             return i == l.source
    //         })[0];
    //         d3.select(this).attr("y1", sourceNode.y);
    //         return sourceNode.x
    //     })
    //     .attr("x2", function(l) {
    //         var targetNode = data.nodes.filter(function(d, i) {
    //             return i == l.target
    //         })[0];
    //         d3.select(this).attr("y2", targetNode.y);
    //         return targetNode.x
    //     })
    //     .attr("fill", "none")
    //     .attr("stroke", "black");

    var nodes = svg.selectAll("circle.node");
        // .enter().append('g');

    nodes
        .data(data.nodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("cx", function(d) {
            return d.x
        })
        .attr("cy", function(d) {
            return d.y
        })
        .attr("r", 15)
        .attr("fill", function(d, i) {

            if(d.name == '1A') return '#feb24c';
            else if(d.name == '1B') return '#fd8d3c';
            else if(d.name == '2') return '#c7e9c0';
            else if(d.name == '3') return '#74c476';
            else if(d.name == '4A') return '#238b45';
            else if(d.name == '5A') return '#9ecae1';
            else if(d.name == '5B') return '#4292c6';
            else if(d.name == '6') return '#fee0d2';
            else if(d.name == '7A') return '#edf8b1';
        });

    svg.selectAll("path")
        .data(groups)
        .attr("d", groupPath)
        .enter().insert("path", "circle")
        .style("fill", groupFill)
        .style("stroke", groupFill)
        .style("stroke-width", 40)
        .style("stroke-linejoin", "round")
        .style("opacity", .2)
        .attr("d", groupPath);

    // nodes
    //     .append("text")
    //     .attr("x", function(d) {
    //         return d.x;
    //     })
    //     .attr("y", function(d) {
    //         return d.y;
    //     })
    //     .attr("dy", ".35em")
    //     .style({'text-anchor':'middle', 'fill':'black'})
    //     .text(function(d) {
    //         return d.name;
    //     });
}

function start(){

    d3.json("data/rankings.json", function(error, json) {
        if (error) return console.warn(error);

        json.forEach(function(patient){

            var patientNumber = parseInt(patient.id);
            console.log(sites[patientNumber-1]);

        });

    });

    createNetwork('#template', template);
}