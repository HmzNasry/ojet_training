define([
    "knockout",
    "models/countingSchemes.model",
    "ojs/ojbootstrap",
    "ojs/ojarraydataprovider",
    "ojs/ojarraytreedataprovider",
    "ojs/ojknockout-keyset",
    "ojs/ojtreeview",
    "ojs/ojtable",
    "ojs/ojselectsingle",
    "text!configuration/navigationData.json"
], function (ko, countingSchemesModel, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider, KeySet, navData) {

    function SurahSchemesViewModel() {
        const self = this;

        // Observable properties
        self.fullSurahArray = ko.observable({});
        self.schemeMap = countingSchemesModel.schemeMap;
        self.surahArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.treeDataProvider = countingSchemesModel.treeDataProvider;
        self.selected = new KeySet.ObservableKeySet();

        // Export functionality
        self.exportValue = ko.observable(null);
        self.exportOptions = [{ label: "Export as JSON", value: "json" }];
        self.exportTableData = function(event) {
            const data = ko.toJS(self.surahArray());
            countingSchemesModel.exportJSON(data, "surah_schemes.json");
            self.exportValue(null);
        };

        // Initial data fetch
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerSurah/")
            .then(response => response.json())
            .then(data => {
                self.fullSurahArray(data);
                
                // Build scheme map
                Object.values(data).flat().forEach(scheme => {
                    self.schemeMap[scheme.schemeId] = scheme.schemeName;
                });

                countingSchemesModel.fetchSchemeStats().then(() => {
                    const initialSelection = countingSchemesModel.flattenedSchemes.map(item => item.id);
                    self.selected.add(initialSelection);
                    self.filterData(countingSchemesModel.getSelectedWithParents(initialSelection));
                    self.isLoading(false);
                });
            })
            .catch(error => {
                console.error("Error fetching data:", error);
                self.isLoading(false);
            });

        // Event handlers
        self.selectedChanged = function(event) {
            const selectedKeys = [...event.detail.value.values()];
            self.filterData(countingSchemesModel.getSelectedWithParents(selectedKeys));
        };

        // Core filtering logic
        self.filterData = function(selectedKeys) {
            const filteredData = Object.entries(self.fullSurahArray())
                .map(([surahId, schemes]) => {
                    const surahSchemes = schemes.filter(scheme => 
                        selectedKeys.includes(scheme.schemeId)
                    );

                    if (surahSchemes.length === 0) return null;

                    const row = {
                        surahId: `${surahId} (${countingSchemesModel.getSurahName(surahId)})`
                    };

                    // Use scheme IDs as keys to prevent name collisions
                    surahSchemes.forEach(scheme => {
                        row[`scheme_${scheme.schemeId}`] = 
                            scheme.minCount !== scheme.maxCount 
                                ? `${scheme.minCount} - ${scheme.maxCount}` 
                                : scheme.maxCount;
                    });

                    return row;
                })
                .filter(Boolean);

            // Generate columns based on selected scheme IDs
            const columns = [{
                headerText: "Surah",
                field: "surahId",
                sortable: "enabled"
            }];

            selectedKeys.forEach(schemeId => {
                const schemeName = self.schemeMap[schemeId];
                if (schemeName) {
                    columns.push({
                        headerText: schemeName,
                        field: `scheme_${schemeId}`,
                        sortable: "enabled"
                    });
                }
            });

            // Update observables
            self.tableColumns(columns);
            self.surahArray(filteredData);
            self.schemesDataProvider(new ArrayDataProvider(filteredData, {
                keyAttributes: "surahId"
            }));
        };
    }

    return SurahSchemesViewModel();
});