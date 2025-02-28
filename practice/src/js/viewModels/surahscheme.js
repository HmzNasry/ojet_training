define(['knockout', 'ojs/ojbootstrap', 'ojs/ojarraydataprovider', 'ojs/ojtable'], 
  function(ko, Bootstrap, ArrayDataProvider) {
    function SchemesSurahViewModel() {
      let self = this;
      self.surahArray = ko.observableArray([]);
      self.surahDataProvider = new ArrayDataProvider(self.surahArray, { keyAttributes: 'id' });

      // Fetch Counting Scheme per Surah
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
        })
        .catch(error => console.error("Error fetching surah data:", error));
    }
    return SchemesSurahViewModel;
  });
