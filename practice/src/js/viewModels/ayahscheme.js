define(['knockout', 'ojs/ojbootstrap', 'ojs/ojarraydataprovider', 'ojs/ojtable'], 
  function(ko, Bootstrap, ArrayDataProvider) {
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
            schemesThatCount: entry.schemesThatCount.join(", "),
            schemesThatDoNotCount: entry.schemesThatDoNotCount.join(", "),
            schemesThatHaveKhulf: entry.schemesThatHaveKhulf.join(", ")
          }));
          self.ayahArray(formattedData);
        })
        .catch(error => console.error("Error fetching ayah data:", error));
    }
    return SchemesAyahViewModel;
  });
