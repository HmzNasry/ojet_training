define([
    "knockout",
    "models/countingSchemes.model",
    "ojs/ojbootstrap",
    "ojs/ojarraydataprovider",
    "ojs/ojarraytreedataprovider",
    "ojs/ojknockout-keyset",
    "ojs/ojtreeview",
    "ojs/ojtable",
    "ojs/ojselectsingle"
], function (ko, countingSchemesModel, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider, KeySet) {

    function SurahSchemesViewModel() {
        const self = this;

        // Observable properties
        self.fullSurahArray = ko.observable({});
        self.surahArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.treeDataProvider = countingSchemesModel.treeDataProvider;
        self.selected = new KeySet.ObservableKeySet();

        // Initial data fetch
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerSurah/")
            .then(response => response.json())
            .then(data => {
                self.fullSurahArray(data);

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
        self.selectedChanged = function (event) {
            const selectedKeys = [...event.detail.value.values()];
            self.filterData(countingSchemesModel.getSelectedWithParents(selectedKeys));
        };

        // Core filtering logic
        self.filterData = function (selectedKeys) {
            const filteredData = Object.entries(self.fullSurahArray())
                .map(([surahId, schemes]) => {
                    const surahSchemes = schemes.filter(scheme =>
                        selectedKeys.includes(scheme.schemeId)
                    );

                    if (surahSchemes.length === 0) return null;

                    const row = {
                        surahId: `${surahId} (${countingSchemesModel.getSurahName(surahId)})`
                    };

                    // Use scheme names from countingSchemesModel to ensure consistency
                    surahSchemes.forEach(scheme => {
                        const schemeName = countingSchemesModel.getSchemeName(scheme.schemeId);
                        row[schemeName] = scheme.minCount !== scheme.maxCount
                            ? `${scheme.minCount} - ${scheme.maxCount}`
                            : scheme.maxCount;
                    });

                    return row;
                })
                .filter(Boolean);

            // Generate columns based on selected scheme IDs in DFS order
            const columns = [{
                headerText: "Surah",
                field: "surahId",
                sortable: "enabled",
                className: "surahColumn"
            }];

            countingSchemesModel.flattenedSchemes.forEach(scheme => {
                if (selectedKeys.includes(scheme.id)) {
                    const schemeName = countingSchemesModel.getSchemeName(scheme.id);
                    if (schemeName) {
                        columns.push({
                            headerText: schemeName,
                            field: schemeName,
                            sortable: "enabled",
                            className: "schemeColumn" 
                        });
                    }
                }
            });

            // Update observables
            self.tableColumns(columns);
            self.surahArray(filteredData);
            self.schemesDataProvider(new ArrayDataProvider(filteredData, {
                keyAttributes: "surahId"
            }));
        };

        // Export functionality
        self.exportTableData = function () {
            const rawData = self.fullSurahArray();
            const exportReady = {};

            // Process each surah
            Object.keys(rawData).forEach(surahId => {
                const surahName = countingSchemesModel.getSurahName(surahId);
                const surahKey = `${surahId} - ${surahName}`;

                // Map each scheme in the surah
                exportReady[surahKey] = rawData[surahId].map(scheme => {
                    let mappedScheme = {
                        schemeName: scheme.schemeName,
                        minCount: scheme.minCount,
                        maxCount: scheme.maxCount
                    };

                    // Add parent scheme name if it exists
                    if (scheme.parentSchemeId !== null && scheme.parentSchemeId !== undefined) {
                        mappedScheme.parentSchemeName = countingSchemesModel.getSchemeName(scheme.parentSchemeId);
                    }

                    return mappedScheme;
                });
            });

            // Export the transformed data
            countingSchemesModel.exportJSON(exportReady, "surah_schemes.json");
        };
    }

    return SurahSchemesViewModel();
});