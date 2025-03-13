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
            let selectedSchemesData = getSelectedSchemesData(selectedKeysArray, self.fullSurahArray());
            let schemeArray = [];
            let columns = [{
                headerText: "Surah",
                field: "surahId",
                sortable: "enabled"
            }];

            selectedSchemesData.forEach(scheme => {
                columns.push({
                    headerText: scheme.title,
                    field: `scheme_${scheme.id}`,
                    sortable: "enabled",
                    className: "schemeColumn"
                });

                scheme.data.forEach(data => {
                    let row = schemeArray.find(r => r.surahId === data.surahId);
                    if (!row) {
                        row = { surahId: data.surahId };
                        schemeArray.push(row);
                    }
                    row[`scheme_${data.schemeId}`] = data.value;
                });
            });

            self.surahArray(schemeArray);
            self.tableColumns(columns);
            self.schemesDataProvider(new ArrayDataProvider(self.surahArray));
        }

        function getSelectedSchemesData(selectedKeys, fullSurahArray) {
            let selectedSchemes = countingSchemesModel.flattenedSchemes.filter(scheme => selectedKeys.includes(scheme.id));
            return selectedSchemes.map(scheme => {
                let data = fullSurahArray().map(surah => {
                    return {
                        surahId: surah.surahId,
                        schemeId: scheme.id,
                        value: surah[`scheme_${scheme.id}`] || 0
                    };
                });
                return { ...scheme, data };
            });
        }

        // Export configuration 
        self.exportTableData = function (event) {
            const data = ko.toJS(self.fullSurahArray());

            const exportData = data.map(scheme => {
                return {
                    ...scheme,
                    parentSchemeName: (scheme.parentSchemeId !== undefined && scheme.parentSchemeId >= 0) ? countingSchemesModel.getSchemeName(scheme.parentSchemeId) : "N/A",
                    schemeId: undefined,
                    parentSchemeId: undefined
                };
            });

            countingSchemesModel.exportJSON(exportData, "surah_schemes.json");
        };
    }

    return SurahSchemesViewModel;
});