"use strict";

var App = App || {};

function patient_sort(key, left, right) {
  return parseInt(left[key]) === parseInt(right[key]) ? 0 :
    (parseInt(left[key]) < parseInt(right[key]) ? -1 : 1);
}

/*** KO Class ***/
function Patients() {
  let self = this,
      dropdown = document.getElementById("clusterLabel");

  App.changePatient = function(patient) {
    /* Get the selected patient */
    let selected_patient = _.find(self.patients(), {id:patient.patient});
    /* Change the current patient to the selected one */
    self.currentPatient(selected_patient);
  };

  function setupClusterObservables() {
    self.clusters = ko.observableArray();
    self.currentCluster = ko.observable();

    let cluster_groups = [];
    _.keys(App.sites[0].clusters).forEach(function(name){
      let cluster_names = [];
      _.range(1, parseInt(name.replace(/[^0-9]/g, ''))+1).forEach(function(c){
        cluster_names.push({cluster: c, name: name});
      });
      cluster_groups.push({name:name, count:cluster_names, group: name.split("_")[0]})
    });

    self.cluster_groups = [cluster_groups];
    self.sortingAlgorithms = ko.observableArray(["Tanimoto Weighted"]);//, "Jaccard", "Tanimoto Nodes"]);
  }

  function setupPredictionObservables() {
    self.predictions = ko.observableArray();
    self.currentPrediction = ko.observable();
    self.currentPredictionVariable = ko.observable();

    let prediction_groups = [];
    for(let i = 0; i < 20; i++){
      prediction_groups.push(parseFloat(i)/20);
    }

    self.prediction_groups = [];
    prediction_groups.forEach(function(p,i){
      if(i === 0) return;
      let group = "" + (prediction_groups[i-1]) + " <= p < " + p;
      self.prediction_groups.push(group);
    });

    let enjoyment_groups = [];
    for(let i = 0; i < 10; i++){
      enjoyment_groups.push(parseFloat(i));
    }
    self.enjoyment_groups = [];
    enjoyment_groups.forEach(function(p,i){
      if(i === 0) return;
      let group = "" + (enjoyment_groups[i-1]) + " <= p < " + p;
      self.enjoyment_groups.push(group);
    });
  }

  function setupPatients() {
    self.patients.removeAll();
    App.data.forEach(function (patient) {
      self.patients.push(_.clone(patient));
    });
  }

  function setupObservables() {
    /* Determine how many nodes will fit onto the screen in a single row */
    self.maxNodes = parseInt(window.innerWidth / (App.graphSVGWidth + 2 * App.padding));

    /* Setup the drop down data */
    setupClusterObservables();
    setupPredictionObservables();

    // rankings of the patients
    self.rankings = ko.observableArray();
    self.patients = ko.observableArray();

    setupPatients();

    /* Menu captions */
    self.optionsCaption = ko.observable('Select a Patient');
    self.clusterCaption = ko.observable('Select a Cluster');
    self.predictionCaption = ko.observable('Select a Variable');
    self.predictionProbCaption = ko.observable('Select a Probability');

    /* Menu drop-downs */
    self.predictionVariable = ko.observableArray(["Feeding Tube","Aspirating","Enjoyment"]);
    self.selections = ko.observableArray(["By Patient","By Cluster", "By Prediction"]);
    self.numberToDisplay = ko.observableArray([50, 100, 'All']);

    /* Current menu selections */
    self.currentPatient = ko.observable(undefined);
    self.currentSorting = ko.observable(self.sortingAlgorithms[0]);
    self.currentDisplay = ko.observable(self.numberToDisplay[0]);
    self.currentType    = ko.observable(self.selections[0]);
  }

  function filterPatients(patient) {
    // filter the patients based on similarity
    patient.similarity.forEach(function (id, i) {
      let p  = _.find(self.patients(), {id: id});
      if(!p) return;

      let site = _.find(App.sites, {patient: id});

      /* I just want the first 50, etc */
      if (self.rankings().length >= parseInt(self.currentDisplay()) || !site) return;

      /* Filter by cluster grouping */
      if(self.currentCluster()){
        let cluster = parseInt(site.clusters[self.currentCluster().name]);
        if(self.currentCluster().value !== cluster) return;
      }

      site.score = patient.scores[i].toFixed(5);
      self.rankings.push(site);
    });
  }

  function placeSelectedPatientFirst(patient) {
    /* Ensure the patient is first */
    let pat = _.find(self.rankings(), {patient: patient.id});
    let index =self.rankings().indexOf(pat);
    if(index > 0){
      self.rankings.remove(pat);
      self.rankings.unshift(pat);
    }

    self.rankings().sort(function(l,r){
      if(l.patient === patient.id) return true;
      if(l.score !== r.score){
        return r.score - l.score;
      }
      else{
        let a = (l.position === "Right") ? 2 : (l.position === "Left") ? 1 : 0;
        let b = (r.position === "Right") ? 2 : (r.position === "Left") ? 1 : 0;
        return b-a;
      }
    });
  }

  function changeCurrentPatient(newValue) {
    if(!newValue) return;

    /* Clear the default caption if it exists */
    self.optionsCaption(undefined);

    if(self.currentType() === "By Patient"){
      //dropdown.firstChild.textContent = "ChiSquared Cluster";
      self.currentCluster(undefined);

      let site = _.find(App.sites, {patient: newValue.id}),
          patient_clusters = [];

      self.clusters().forEach(function(c){
        patient_clusters.push(c.name + "_" + site.clusters[c.name]);
      });
      newValue.clusters = patient_clusters;
    }
    // clear the array
    self.rankings.removeAll();

    let current = _.find(App.data, {id: newValue.id});

    filterPatients(current);
    placeSelectedPatientFirst(current);

    // Render to the screen
    App.createVisualizations(self.rankings());
  }

  function changeCurrentSorting(newValue) {
    if (newValue === "Tanimoto Edges") {
      App.data = App.edges;
    }
    else if (newValue === "Tanimoto Nodes") {
      App.data = App.nodes;
    }
    else if (newValue === "Jaccard") {
      App.data = App.jaccard;
    }
    else {
      App.data = App.weighted;
      if(self.cluster_groups){
        self.clusters.removeAll();
        self.cluster_groups[0].forEach(function(c){
          self.clusters.push(c);
        });
      }
    }

    /* Reset the cluster drop down*/
    self.currentCluster(undefined);
    // dropdown.firstChild.textContent = "ChiSquared Cluster";

    /* Touch the current observable to re-render the scene */
    if(self.currentPatient()) {
      self.currentPatient(self.currentPatient());
    }
  }

  function changeNumberOfPatients(newValue) {

    if(newValue === "All"){
      self.currentDisplay(App.sites.length);
    }
    else {
      self.currentDisplay(newValue);
    }

    /* Touch the current observable to re-render the scene */
    if(self.currentPatient()) {
      self.currentPatient(self.currentPatient());
    }
  }

  function changeProbabilityRange(newValue){
    /* no value provided */
    if(!newValue)return;

    /* Clear the default caption if it exists */
    self.predictionProbCaption(undefined);
    // clear the patient list
    self.rankings.removeAll();
    self.patients.removeAll();

    let split = newValue.split(" <= p < "),
        min = parseFloat(split[0]), max = parseFloat(split[1]),
        idx = self.prediction_groups.indexOf(newValue),
        variable = _.chain(self.currentPredictionVariable()).toLower().replace(" ", "_").value();

    // add to the list only the patients in the current cluster
    _.filter(App.sites,
      function(s) {
        return s.predictions[variable] >= min && s.predictions[variable] < max;
      }).forEach(function(p){
        // find the patient in the data and add it to the list
        let patient = _.find(App.data, function (o) {
          return o.id === p.patient;
        });
        self.patients.push(_.clone(patient));
      });
    //self.patients(self.patients().sort(patient_sort));

    self.currentPatient(self.patients()[0]);
  }

  function changeProbabilityVariable(newValue){
    /* no value provided */
    if(!newValue)return;

    /* Clear the default caption if it exists */
    self.predictionCaption(undefined);
    self.predictionProbCaption("Select a Probability");

    self.currentPredictionVariable(newValue);
    self.currentPrediction(undefined);
    self.predictions.removeAll();
    self.rankings.removeAll();
    self.patients.removeAll();

    let variable = _.chain(newValue).toLower().replace(" ", "_").value(),
        groupings = (variable === 'enjoyment') ? self.enjoyment_groups : self.prediction_groups;

    groupings.forEach(function(p){
      let split = p.split(" <= p < "),
        min = parseFloat(split[0]), max = parseFloat(split[1]);

      let r = _.find(App.sites, function(s){
        return s.predictions[variable] >= min && s.predictions[variable] < max;
      });
      /* If any of the elements falls into this bin */
      if(r){
        self.predictions.push(p);
      }
    });

  }

  function changeFilteringMode(newValue) {

    if(newValue === "By Patient"){
      self.optionsCaption('Select a Patient');

      // clear the patient list
      self.rankings.removeAll();

      self.currentPredictionVariable(undefined);
      self.currentPrediction(undefined);
      self.currentPatient(undefined);

      self.currentSorting(self.sortingAlgorithms[0]);

      setupPatients();
    }
    else if(newValue === "By Cluster"){
      self.optionsCaption('Select a Patient');

      self.currentCluster(undefined);
      self.currentPatient(undefined);

      self.currentPrediction(undefined);
      self.currentPredictionVariable(undefined);

      self.rankings.removeAll();
      self.clusters.removeAll();

      _.flatten(_.clone(self.cluster_groups)).forEach(function(c){ self.clusters.push(c); });
    }

    else if(newValue === "By Prediction"){
      self.predictionCaption("Select a Variable");
      self.predictionProbCaption("Select a Probability");

      App.data = App.weighted;

      self.currentCluster(undefined);
      self.currentPatient(undefined);

      self.currentPrediction(undefined);
      self.currentPredictionVariable(undefined);

      self.predictions.removeAll();
      self.rankings.removeAll();
      self.clusters.removeAll();
    }

  }

  function setup2WayBindings(){
    // subscribe to the change of the selection
    self.currentPatient.subscribe(changeCurrentPatient);

    /*Subscribe the the change in similarity metric */
    self.currentSorting.subscribe(changeCurrentSorting);

    self.currentPrediction.subscribe(changeProbabilityRange);
    self.currentPredictionVariable.subscribe(changeProbabilityVariable);

    // subscribe to the change of the how many patients to display
    self.currentDisplay.subscribe(changeNumberOfPatients);

    // subscribe to the primary filter type
    self.currentType.subscribe(changeFilteringMode);
  }

  function setupMenu() {
    /*Subscribe the the change in clustering menu */
    let menu = document.getElementById("clusterMenu");
    menu.addEventListener("click", function(e){
      if (e.target.className === 'cluster') {
        let cluster_class = e.target.value || e.target.firstElementChild.value,
            cluster_value = _.trim(e.target.textContent);

        dropdown.firstChild.textContent = cluster_class + ": " + cluster_value + ' ';

        // set the cluster selector to the value
        let cluster = {name: cluster_class, value: parseInt(cluster_value.split(" ")[1])};
        self.currentCluster(cluster);

        if(self.currentType() === "By Cluster" && self.currentCluster()) {
          // clear the patient list
          self.patients.removeAll();
          self.rankings.removeAll();

          /* Change the similarity scores depending on the cluster type*/
          if(cluster_class.split("_")[0] === "weighted"){
            App.data = App.weighted;
          }
          else {
            App.data = App.nodes;
          }

          App.data = App.weighted;

          // add to the list only the patients in the current cluster
          _.filter(App.sites, function(site) {
            return parseInt(site.clusters[self.currentCluster().name]) === parseInt(self.currentCluster().value);
          })
          .forEach(function(p){
            // find the patient in the data and add it to the list
            let patient = _.find(App.data, function (o) {
              return o.id === p.patient;
            });
            self.patients.push(_.clone(patient));
          });

          let outcomes = [_.countBy(self.patients(), "Feeding_tube_6m"), _.countBy(self.patients(), "Aspiration_rate_Pre-therapy"),
              _.countBy(self.patients(), "Aspiration_rate_Post-therapy"), _.countBy(self.patients(), "Aspiration_rate"),
                  _.countBy(self.patients(), "Neck_boost"), _.countBy(self.patients(), "Neck_Disssection_after_IMRT")],
              output_c = [], output_p = [], totals = [105,19,103,104,417,124];

          outcomes.forEach(function(o,i){
            let s = String(o["Y"]||0);
            s+= " / ";
            s+= (o["Y"])?(o["Y"]/self.patients().length*100).toFixed(2):0;
            s+= " / ";
            s+= (o["Y"])?(o["Y"]/totals[i]*100).toFixed(2):0;
            output_c.push(s);
            // output_p.push((o["Y"])?o["Y"]/self.patients().length*100:0);
          });

          // console.log(self.patients().length);
          console.log(output_c.join(", "));
          // console.log(output_p.join(", "));

          self.currentPatient(self.patients()[0]);
      }
      /* Touch the current observable to re-render the scene */
      else if(self.currentPatient()) {
        self.rankings.removeAll();
        filterPatients(self.currentPatient());
        // Render to the screen
        App.createVisualizations(self.rankings());
      }
      }
    });
  }

  // initialize the observables
  setupObservables();
  setup2WayBindings();

  // initialize the menu
  setupMenu();
}

/*** IFE to load the data and apply the KO bindings ***/
(function () {

  function round(value, step) {
    step || (step = 1.0);
    let inv = 1.0 / step;
    return Math.ceil(value * inv) / inv;
  }

  function bin_prediction(p) {
    return round(p, 0.05);
  }

  function parse_predictions(patient,predictions) {
    /* extract the prediction clusters based on the id */
    let nodes = _.chain(predictions)
      .find(function(o){ return parseInt(o.id) === patient.id })
      .omit(["", "id"]).value();

    let index = -1;
    if(index = _.indexOf(nodes, "23") > -1){
      nodes[index] = "2/3"
    }
    if(index = _.indexOf(nodes, "34") > -1){
      nodes[index] = "3/4"
    }

    return nodes
  }

  function extract_nodes(patient, between){
    return _.chain(patient.nodes)
      .reduce(function(result, value) {
        /* Check for two digits */
        if( _.parseInt(value.substring(1)) > 9){
          /* Node 2 is split into A and B */
          if(value[1] === "2"){
            result.push(value[0] + value[1] + 'A');
            result.push(value[0] + value[1] + 'B');
          }
          else{
            result.push(value[0] + value[1]);
          }
          result.push(value[0] + value[2]);
          between.push(value);
        }
        else {
          if(value.length === 2 && value[1] === "2"){
            result.push(value[0] + value[1] + 'A');
            result.push(value[0] + value[1] + 'B');
          }
          else {
            result.push(value);
          }
        }
        return result;
      }, [])
      .partition(function (p) {
        return p[0] === 'L';
    }).value();
  }

  function parse_clusters(patient, clusters, key, labels){
    /* iterate over the clusters and extract the patient's cluster */
    let centers = {};
    clusters.forEach(function(cluster,i){
      centers[labels[i]] = parseInt(_.find(cluster, {"patientId": String(patient)})[key]);
    });
    return centers;
  }

  queue()
    .defer(d3.json, "data/json/tanimoto_weighted.json")
    .defer(d3.csv, "data/csv/clusters/03_2018/cluster_average_3_2018_k=2.csv")
    .defer(d3.csv, "data/csv/clusters/03_2018/cluster_average_3_2018_k=3.csv")
    .defer(d3.csv, "data/csv/clusters/03_2018/cluster_average_3_2018_k=5.csv")
    .defer(d3.csv, "data/csv/clusters/03_2018/cluster_complete_3_2018_k=2.csv")
    .defer(d3.csv, "data/csv/clusters/03_2018/cluster_complete_3_2018_k=3.csv")
    .defer(d3.csv, "data/csv/clusters/03_2018/cluster_complete_3_2018_k=4.csv")
    .defer(d3.csv, "data/csv/predictions/predict_outcome_lymph.csv")
    // .defer(d3.json, "data/json/tanimoto_edges.json")
    //.defer(d3.json, "data/json/jaccard.json")
      .await(function (error, weighted, clusters_ak2, clusters_ak3, clusters_ak5, clusters_ac2, clusters_ac3,clusters_a4, predictions) {
      if (error){
        return console.warn(error);
      }

      App.weighted = weighted;

      App.sites = [];

        /* Iterate through the data and pull out each patient's information */
      App.weighted.forEach(function (patient) {

        // extract the clusters based on the patient's id
        let patient_clusters = parse_clusters(patient.id, [clusters_ak2, clusters_ak3, clusters_ak5, clusters_ac2, clusters_ac3,clusters_a4],
              "group", ["Average, k=2", "Average, k=3", "Average, k=5", "Complete, k=2", "Complete, k=3","Complete, k=4" ] ),
            patient_predictions = parse_predictions(patient,predictions),
            between = [],
            nodes = extract_nodes(patient, between);

        let site = {
          "patient": patient.id,
          "nodes": nodes,
          "position": patient.position,
          "gender": patient.gender,
          "score": [],
          "between_nodes": between,
          "feedingTube_post": patient["Feeding_tube_6m"] ? patient["Feeding_tube_6m"] : "NA",
          "feedingTube_pre": !!patient["Tube_removal"] ? "N": patient["Feeding_tube_6m"],
          "aspiration_pre" : patient["Aspiration_rate_Pre-therapy"] ? patient["Aspiration_rate_Pre-therapy"] : "NA" ,
          "aspiration_post" : patient["Aspiration_rate_Post-therapy"] ? patient["Aspiration_rate_Post-therapy"] : "NA",
          "clusters": patient_clusters,
          "predictions":
            {
              "enjoyment": parseFloat(patient_predictions.pred_Enjoy),
              "enjoyment_bin": bin_prediction(parseFloat(patient_predictions.pred_Enjoy)),
              "feeding_tube": parseFloat(patient_predictions.prob_feeding_tube),
              "feeding_tube_bin": bin_prediction(parseFloat(patient_predictions.prob_feeding_tube)),
              "aspirating": parseFloat(patient_predictions.prob_aspiration),
              "aspirating_bin": bin_prediction(parseFloat(patient_predictions.prob_aspiration)),
            }
        };
        App.sites.push(site);
      });

      App.sites = App.sites.sort(patient_sort.bind(null, "patient"));
      App.data = App.weighted.sort(patient_sort.bind(null, "id") );

      /* Load the dropdown templates */
      let d1 =  new $.Deferred(),
          d2 =  new $.Deferred(),
          d3 =  new $.Deferred();

      $.when(d1,d2,d3).done(function(){
        ko.applyBindings(new Patients());
      });

      $("#byPatient").load("src/htmlTemplates/byPatient.html", ()=>{d1.resolve()});
      $("#byCluster").load("src/htmlTemplates/byCluster.html", ()=>{d2.resolve()});
      $("#byPrediction").load("src/htmlTemplates/byPrediction.html", ()=>{d3.resolve()});
    });

})();
