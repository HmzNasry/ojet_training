define([
    "knockout",
    "models/countingSchemes.model",
    "ojs/ojbootstrap",
    "ojs/ojarraydataprovider",
    "ojs/ojknockout-keyset",
    "ojs/ojtreeview",
    "ojs/ojtable",
    "ojs/ojselectsingle"
], function (ko, countingSchemesModel, Bootstrap, ArrayDataProvider, KeySet) {

    function SurahSchemesViewModel() {
        let self = this;

        self.fullSurahArray = ko.observableArray([]);
        self.surahArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.treeDataProvider = countingSchemesModel.treeDataProvider;
        self.selected = new KeySet.ObservableKeySet();

        // Fetch API data for tables and export
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerSurah/")
            .then(response => response.json())
            .then(data => {
                self.fullSurahArray(data);

                countingSchemesModel.fetchSchemeStats().then(() => {
                    const initialSelection = countingSchemesModel.flattenedSchemes.map(item => item.id);
                    self.selected.add(initialSelection);
                    updateTableData();
                    self.isLoading(false);
                });
            })
            .catch(error => {
                console.error("Error fetching surah scheme data:", error);
                self.isLoading(false);
            });

        self.selectedChanged = function (event) {
            updateTableData();
        };

        function updateTableData() {
            let selectedKeysArray = [...self.selected().values()];
            let { schemeArray, columns } = countingSchemesModel.updateTableData(selectedKeysArray, self.fullSurahArray());
            self.surahArray(schemeArray);
            self.tableColumns(columns);
            self.schemesDataProvider(new ArrayDataProvider(self.surahArray));
        }

        // Export configuration 
        self.exportTableData = function (event) {
            // Use the data from the initial fetch call
            const data = ko.toJS(self.fullSurahArray());

            // Customize the data
            const exportData = data.map(scheme => {
                return {
                    ...scheme,
                    parentSchemeName: (scheme.parentSchemeId !== undefined && scheme.parentSchemeId >= 0) ? countingSchemesModel.getSchemeName(scheme.parentSchemeId) : "N/A",
                    schemeId: undefined, // Remove schemeId
                    parentSchemeId: undefined // Remove parentSchemeId
                };
            });

            countingSchemesModel.exportJSON(exportData, "surah_schemes.json");
        };
    }

    return SurahSchemesViewModel;
});