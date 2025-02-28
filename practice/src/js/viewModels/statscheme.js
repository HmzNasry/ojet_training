define(['knockout', 'ojs/ojbootstrap', 'ojs/ojarraydataprovider', 'ojs/ojtable'], 
  function(ko, Bootstrap, ArrayDataProvider) {
    function SchemesStatsViewModel() {
      let self = this;
      self.schemesArray = ko.observableArray([]);
      self.schemesDataProvider = new ArrayDataProvider(self.schemesArray, { keyAttributes: 'schemeId' });

      fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStats/")
        .then(response => response.json())
        .then(data => self.schemesArray(data))
        .catch(error => console.error("Error fetching scheme data:", error));
    }
    return SchemesStatsViewModel;
  });
