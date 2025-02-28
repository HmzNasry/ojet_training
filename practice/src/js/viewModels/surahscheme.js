define([
  'knockout', 
  'ojs/ojbootstrap', 
  'ojs/ojarraydataprovider', 
  'ojs/ojarraytreedataprovider', 
  'ojs/ojknockout', 
  'ojs/ojtreeview', 
  'ojs/ojtable'
], function (ko, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider) {
  
  function SchemesSurahViewModel() {
      let self = this;

      self.surahArray = ko.observableArray([]);
      self.schemesDataProvider = ko.observable();
      self.isLoading = ko.observable(true); // Loading state

      fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerSurah/")
          .then(response => response.json())
          .then(data => {
              let normalizedData = [];
              Object.keys(data).forEach(surahId => {
                  data[surahId].forEach(scheme => {
                      normalizedData.push({
                          id: `${surahId}-${scheme.schemeId}`,
                          surahId: surahId,
                          schemeId: scheme.schemeId,
                          schemeName: scheme.schemeName,
                          minCount: scheme.minCount,
                          maxCount: scheme.maxCount
                      });
                  });
              });

              self.surahArray(normalizedData);
              self.schemesDataProvider(new ArrayDataProvider(self.surahArray, { keyAttributes: 'id' }));

              self.isLoading(false); // Stop loading
          })
          .catch(error => {
              console.error("Error fetching surah data:", error);
              self.isLoading(false); // Ensure it stops loading even if an error occurs
          });

      // Unique Tree Data for this module
      let dummyTreeDataSurahUnique = [
          {
              id: "U1",
              title: "Unique Surah Category 1",
              children: [
                  { id: "U1-1", title: "Unique Surah Subcategory 1.1" },
                  { id: "U1-2", title: "Unique Surah Subcategory 1.2" }
              ]
          },
          {
              id: "U2",
              title: "Unique Surah Category 2",
              children: [
                  { id: "U2-1", title: "Unique Surah Subcategory 2.1" },
                  { id: "U2-2", title: "Unique Surah Subcategory 2.2" }
              ]
          }
      ];

      self.treeDataProvider = new ArrayTreeDataProvider(dummyTreeDataSurahUnique, {
          keyAttributes: 'id',
          childrenAttribute: 'children'
      });
  }

  return SchemesSurahViewModel;
});
