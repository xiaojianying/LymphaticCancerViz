"use strict";

var App = App || {};

(function(){

  App.dendrogram = new Dendrogram(["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d"]);
  App.GraphFactory = new PatientGraph();
  App.graphUtilities = new Utilities();

  function init() {
    queue()
      .defer(d3.json, "d3-dendrogram.json")
      .await(function(err, data){

        App.dendrogram.init(data, {width:250, height:250, radius: 15});
        App.GraphFactory.init({width:250, height:250, radius: 15})
          .then(O_o => {
            App.GraphFactory.newGraph("#templates");
            App.dendrogram.update();

          });
      });

    App.dendrogram.setCut(5.4);
  }

  /* start the application once the DOM is ready */
  document.addEventListener('DOMContentLoaded', init);

})();