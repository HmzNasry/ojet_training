define([
    'knockout', 
    'ojs/ojbootstrap', 
    'ojs/ojarraydataprovider', 
    'ojs/ojarraytreedataprovider', 
    'text!../cookbook/dataCollections/treeView/json/treeViewData.json',
    'ojs/ojknockout', 
    'ojs/ojtreeview', 
    'ojs/ojtable'
], function (ko, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider, treeViewJson) {
    
    function SchemesSurahViewModel() {
        let self = this;

        // 1️⃣ Table Data (Fetching from API)
        self.surahArray = ko.observableArray([]);
        self.schemesDataProvider = new ArrayDataProvider(self.surahArray, { keyAttributes: 'id' });

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


        self.treeDataProvider = new ArrayTreeDataProvider(JSON.parse(treeViewJson), {
            keyAttributes: 'id'
        });
    }

    return SchemesSurahViewModel;
});
