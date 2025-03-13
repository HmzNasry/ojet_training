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
        const self = this;

        // Observable properties
        self.schemeArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.treeDataProvider = countingSchemesModel.treeDataProvider;
        self.selected = new KeySet.ObservableKeySet();

        // Initialize data - use the model's fetch
        countingSchemesModel.fetchSchemeStats().then(() => {
            // Get the data from the model
            self.apiData = ko.observableArray(countingSchemesModel.rawSchemeStats);
            self.schemeMap = countingSchemesModel.schemeMap;

            self.isLoading(false);
            setTimeout(() => {
                const initialSelection = countingSchemesModel.flattenedSchemes.map(item => item.id);
                self.selected.add(initialSelection);
                self.filterData(countingSchemesModel.getSelectedWithParents(initialSelection));
            }, 1);
        }).catch(error => {
            console.error("Error fetching scheme data:", error);
            self.isLoading(false);
        });

        // Tree selection handler
        self.selectedChanged = function (event) {
            const selectedKeys = [...event.detail.value.values()];
            self.filterData(countingSchemesModel.getSelectedWithParents(selectedKeys));
        };

        // Create display data for table
        self.createDisplayData = function (selectedSchemes) {
            if (selectedSchemes.length === 0) {
                return [];
            }

            // Create a single row with all selected schemes
            const singleRow = {};

            selectedSchemes.forEach(node => {
                const schemeData = self.apiData().find(s => s.schemeId === node.id);
                if (schemeData) {
                    singleRow[node.title] = schemeData.minCount === schemeData.maxCount ?
                        schemeData.minCount : `${schemeData.minCount} - ${schemeData.maxCount}`;
                } else {
                    singleRow[node.title] = "N/A";
                }
            });

            return [singleRow];
        };

        // Create table columns configuration
        self.createTableColumns = function (selectedSchemes) {
            return selectedSchemes.map(node => ({
                headerText: node.title,
                field: node.title,
                sortable: "disabled",
                className: "schemeColumn",
                headerClassName: "schemeColumnHeader"
            }));
        };

        // Filter and update table data
        self.filterData = function (selectedKeys) {
            if (selectedKeys.length === 0) {
                self.schemeArray([]);
                self.tableColumns([]);
                self.schemesDataProvider(new ArrayDataProvider([]));
                return;
            }

            // Get selected scheme nodes
            const selectedSchemes = countingSchemesModel.flattenedSchemes.filter(
                node => selectedKeys.includes(node.id)
            );

            // Create display data and columns
            const displayData = self.createDisplayData(selectedSchemes);
            const columns = self.createTableColumns(selectedSchemes);

            // Update observables
            self.tableColumns(columns);
            self.schemeArray(displayData);
            self.schemesDataProvider(new ArrayDataProvider(displayData));
        };

        // Export functionality
        self.exportTableData = function (event) {
            const exportData = ko.toJS(self.apiData()).map(scheme => {
                return {
                    ...scheme,
                    schemeName: scheme.schemeName,
                    minCount: scheme.minCount,
                    maxCount: scheme.maxCount,
                    parentSchemeName: (scheme.parentSchemeId !== undefined && scheme.parentSchemeId >= 0) ?
                        self.schemeMap[scheme.parentSchemeId] : "N/A",
                    schemeId: undefined,
                    parentSchemeId: undefined
                };
            });

            countingSchemesModel.exportJSON(exportData, "scheme_stats.json");
        };
    }

    return StatsSchemesViewModel();
});