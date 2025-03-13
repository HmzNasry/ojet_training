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
        self.apiData = ko.observable({});
        self.surahArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.treeDataProvider = countingSchemesModel.treeDataProvider;
        self.selected = new KeySet.ObservableKeySet();

        // Initialize data
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerSurah/")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API responded with status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                self.apiData(data);

                countingSchemesModel.fetchSchemeStats().then(() => {
                    self.isLoading(false);
                    setTimeout(() => {
                        const initialSelection = countingSchemesModel.flattenedSchemes.map(item => item.id);
                        self.selected.add(initialSelection);
                        self.filterData(countingSchemesModel.getSelectedWithParents(initialSelection));
                    }, 1);
                });
            })
            .catch(error => {
                console.error("Error fetching data:", error);
                self.isLoading(false);
            });

        // Tree selection handler
        self.selectedChanged = function (event) {
            const selectedKeys = [...event.detail.value.values()];
            self.filterData(countingSchemesModel.getSelectedWithParents(selectedKeys));
        };

        // Data transformation for display
        self.createDisplayData = function (selectedKeys) {
            return Object.entries(self.apiData())
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
        };

        // Table column configuration
        self.createTableColumns = function (selectedKeys) {
            const baseColumns = [{
                headerText: "Surah",
                field: "surahId",
                sortable: "enabled",
                className: "surahColumn",
                headerClassName: "surahColumnHeader"
            }];

            const schemeColumns = [];
            countingSchemesModel.flattenedSchemes.forEach(scheme => {
                if (selectedKeys.includes(scheme.id)) {
                    const schemeName = countingSchemesModel.getSchemeName(scheme.id);
                    if (schemeName) {
                        schemeColumns.push({
                            headerText: schemeName,
                            field: schemeName,
                            sortable: "enabled",
                            className: "schemeColumn",
                            headerClassName: "schemeColumnHeader"
                        });
                    }
                }
            });

            return [...baseColumns, ...schemeColumns];
        };

        // Filter and update table data
        self.filterData = function (selectedKeys) {
            if (selectedKeys.length === 0) {
                self.surahArray([]);
                self.tableColumns([]);
                self.schemesDataProvider(new ArrayDataProvider([]));
                return;
            }

            const displayData = self.createDisplayData(selectedKeys);
            const columns = self.createTableColumns(selectedKeys);

            // Update observables
            self.tableColumns(columns);
            self.surahArray(displayData);
            self.schemesDataProvider(new ArrayDataProvider(displayData, {
                keyAttributes: "surahId"
            }));
        };

        // Export functionality
        self.exportTableData = function () {
            const rawData = self.apiData();
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