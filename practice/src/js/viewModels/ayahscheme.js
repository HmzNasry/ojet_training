define([
  'knockout',
  'ojs/ojbootstrap',
  'ojs/ojarraydataprovider',
  'ojs/ojarraytreedataprovider',
  'ojs/ojknockout',
  'ojs/ojtreeview',
  'ojs/ojtable'
], function (ko, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider) {

  function AyahSchemesViewModel() {
      let self = this;

      self.ayahArray = ko.observableArray([]);
      self.ayahDataProvider = ko.observable();
      self.isLoading = ko.observable(true);

      fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerAyah/")
          .then(response => response.json())
          .then(data => {
              let formattedData = data.map(entry => ({
                  seqNo: entry.seqNo,
                  surahNo: entry.surahNo,
                  ayahNoWithinSurah: entry.ayahNoWithinSurah,
                  word: entry.word,
                  ayahText: entry.ayah,
                  schemesThatCount: (entry.schemesThatCount || []).join(", "),
                  schemesThatDoNotCount: (entry.schemesThatDoNotCount || []).join(", "),
                  schemesThatHaveKhulf: (entry.schemesThatHaveKhulf || []).join(", ")
              }));
              self.ayahArray(formattedData);
              self.ayahDataProvider(new ArrayDataProvider(self.ayahArray, { keyAttributes: 'seqNo' }));
              self.isLoading(false);
          })
          .catch(error => {
              console.error("Error fetching ayah data:", error);
              self.isLoading(false);
          });

      // Unique Tree View Data
      let dummyTreeDataAyah = [
          { id: "AY1", title: "Ayah Category 1", children: [{ id: "AY1-1", title: "Ayah Subcategory 1.1" }] },
          { id: "AY2", title: "Ayah Category 2", children: [{ id: "AY2-1", title: "Ayah Subcategory 2.1" }] }
      ];

      self.treeDataProvider = new ArrayTreeDataProvider(dummyTreeDataAyah, {
          keyAttributes: 'id',
          childrenAttribute: 'children'
      });
  }

  return AyahSchemesViewModel;
});
