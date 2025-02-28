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

        // Table Data (Fetching from API)
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

        // Dummy Tree Data for UI Testing
        let dummyTreeData = [
            {
                id: "1",
                title: "Category 1",
                children: [
                    { id: "1-1", title: "Subcategory 1.1" },
                    { id: "1-2", title: "Subcategory 1.2" }
                ]
            },
            {
                id: "2",
                title: "Category 2",
                children: [
                    { id: "2-1", title: "Subcategory 2.1" },
                    { id: "2-2", title: "Subcategory 2.2" }
                ]
            }
        ];

        self.treeDataProvider = new ArrayTreeDataProvider(dummyTreeData, {
            keyAttributes: 'id',
            childrenAttribute: 'children'
        });
    }

    return SchemesSurahViewModel;
});
