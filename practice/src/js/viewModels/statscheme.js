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

    function StatsSchemesViewModel() {
        let self = this;

        self.fullSchemeArray = ko.observableArray([]);
        self.schemeMap = countingSchemesModel.schemeMap;
        self.schemeArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.treeDataProvider = countingSchemesModel.treeDataProvider;

        // Fetch API data for tables and export
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStats/")
            .then(response => response.json())
            .then(data => {
                self.fullSchemeArray(data);
                data.forEach(scheme => {
                    self.schemeMap[scheme.schemeId] = scheme.schemeName;
                });

                countingSchemesModel.fetchSchemeStats().then(() => {
                    self.selected.add(countingSchemesModel.flattenedSchemes.map(item => item.id));
                    updateTableData();
                    self.isLoading(false);
                });
            })
            .catch(error => {
                console.error("Error fetching scheme data:", error);
                self.isLoading(false);
            });

        self.selectedChanged = function (event) {
            let selectedKeysArray = [...event.detail.value.values()];
            updateTableData();
        };

        self.selected = new KeySet.ObservableKeySet();

        function updateTableData() {
            let selectedKeysArray = countingSchemesModel.getSelectedWithParents([...self.selected().values()]);
            if (selectedKeysArray.length === 0) {
                self.schemeArray([]);
                self.tableColumns([]);
                self.schemesDataProvider(new ArrayDataProvider([]));
                return;
            }
            let selectedSchemes = countingSchemesModel.flattenedSchemes.filter(node => selectedKeysArray.includes(node.id));
            let singleRow = {};
            selectedSchemes.forEach(node => {
                let schemeData = self.fullSchemeArray().find(s => s.schemeId === node.id);
                if (schemeData) {
                    singleRow[node.title] = schemeData.minCount === schemeData.maxCount ?
                        schemeData.minCount : `${schemeData.minCount} - ${schemeData.maxCount}`;
                } else {
                    singleRow[node.title] = "N/A";
                }
            });
            self.schemeArray([singleRow]);
            self.schemesDataProvider(new ArrayDataProvider(self.schemeArray));
            let columns = selectedSchemes.map(node => ({
                headerText: node.title,
                field: node.title,
                sortable: "disabled",
                className: "schemeColumn",
                headerClassName: "schemeColumnHeader"
            }));
            self.tableColumns(columns);
        }

        // Export configuration 
        self.exportTableData = function (event) {
            // Use the data from the initial fetch call
            const data = ko.toJS(self.fullSchemeArray());

            // Customize the data
            const exportData = data.map(scheme => {
                return {
                    ...scheme,
                    parentSchemeName: (scheme.parentSchemeId !== undefined && scheme.parentSchemeId >= 0) ? self.schemeMap[scheme.parentSchemeId] : "N/A",
                    schemeId: undefined, // Remove schemeId
                    parentSchemeId: undefined // Remove parentSchemeId
                };
            });

            countingSchemesModel.exportJSON(exportData, "scheme_stats.json");
        };
    }

    return StatsSchemesViewModel();
});