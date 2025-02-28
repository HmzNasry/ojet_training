define([
  'knockout', 
  'ojs/ojbootstrap', 
  'ojs/ojarraydataprovider', 
  'ojs/ojarraytreedataprovider', 
  'ojs/ojtable'
], function (ko, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider) {
  
  function SchemesAyahViewModel() {
      let self = this;
      self.ayahArray = ko.observableArray([]);
      self.ayahDataProvider = new ArrayDataProvider(self.ayahArray, { keyAttributes: 'seqNo' });

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
          })
          .catch(error => console.error("Error fetching ayah data:", error));

      // Dummy Tree Data for UI Testing (Unique for this file)
      let dummyTreeDataAyah = [
          {
              id: "A1",
              title: "Ayah Category 1",
              children: [
                  { id: "A1-1", title: "Ayah Subcategory 1.1" },
                  { id: "A1-2", title: "Ayah Subcategory 1.2" }
              ]
          },
          {
              id: "A2",
              title: "Ayah Category 2",
              children: [
                  { id: "A2-1", title: "Ayah Subcategory 2.1" },
                  { id: "A2-2", title: "Ayah Subcategory 2.2" }
              ]
          }
      ];

      self.treeDataProvider = new ArrayTreeDataProvider(dummyTreeDataAyah, {
          keyAttributes: 'id',
          childrenAttribute: 'children'
      });
  }

  return SchemesAyahViewModel;
});
