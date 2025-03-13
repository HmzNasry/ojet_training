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

    function AyahSchemesViewModel() {
        const self = this;

        // Single source of truth for raw data
        self.apiData = ko.observableArray([]);

        // Derived/processed data for display
        self.ayahArray = ko.observableArray([]);
        self.ayahDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);

        // UI state
        self.isLoading = ko.observable(true);
        self.treeDataProvider = countingSchemesModel.treeDataProvider;
        self.selected = new KeySet.ObservableKeySet();

        // Initial data fetch - get our single source of truth
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerAyah/")
            .then(response => response.json())
            .then(data => {
                // Store raw data in our single source of truth
                self.apiData(data);

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

        // Core filtering logic - transform raw data for table display
        self.filterData = function (selectedKeys) {
            if (selectedKeys.length === 0) {
                self.ayahArray([]);
                self.tableColumns([]);
                self.ayahDataProvider(new ArrayDataProvider([]));
                return;
            }

            // Start with raw data and transform for display
            const displayData = self.apiData().map(entry => {
                const row = {
                    seqNo: entry.seqNo,
                    surahNo: `${entry.surahNo} (${countingSchemesModel.getSurahName(entry.surahNo)})`,
                    ayahNoWithinSurah: entry.ayahNoWithinSurah,
                    ayahText: entry.ayah
                };

                // Add scheme columns based on selected schemes
                selectedKeys.forEach(schemeId => {
                    const schemeName = countingSchemesModel.getSchemeName(schemeId);
                    if (schemeName) {
                        row[schemeName] = entry.schemesThatCount.includes(schemeId) ? "Counts" : "Doesn't Count";
                    }
                });

                return row;
            });

            // Generate columns for display
            const columns = [
                { headerText: "Surah", field: "surahNo", sortable: "enabled", className: "surahColumn", headerClassName: "surahColumnHeader" },
                { headerText: "Ayah No", field: "ayahNoWithinSurah", sortable: "enabled", className: "centered" },
                { headerText: "Ayah Text", field: "ayahText", className: "ayah-text-column centered" }
            ];

            countingSchemesModel.flattenedSchemes.forEach(scheme => {
                if (selectedKeys.includes(scheme.id)) {
                    const schemeName = countingSchemesModel.getSchemeName(scheme.id);
                    if (schemeName) {
                        columns.push({
                            headerText: schemeName,
                            field: schemeName,
                            sortable: "enabled",
                            className: "schemeColumn",
                            headerClassName: "schemeColumnHeader"
                        });
                    }
                }
            });

            // Update display data
            self.tableColumns(columns);
            self.ayahArray(displayData);
            self.ayahDataProvider(new ArrayDataProvider(displayData, {
                keyAttributes: "seqNo"
            }));
        };

        // Row action handler - use raw data to get navigation info
        self.handleRowAction = function (event) {
            const rowKey = event.detail.context.key;

            // Find the corresponding entry in our raw data
            const entry = self.apiData().find(item => item.seqNo === rowKey);

            if (entry) {
                const url = new URL('https://hawsabah.org/');
                url.searchParams.set('ojr', 'dashboard');
                url.searchParams.set('mushaf', '1');
                url.searchParams.set('surah', entry.surahNo);
                url.searchParams.set('ayah', entry.ayahNoWithinSurah);

                window.location.href = url.toString();
            } else {
                console.error('No entry found for key:', rowKey);
            }
        };

        self.exportTableData = function (event) {
            const exportData = self.apiData().map(entry => {
                return {
                    ...entry,
                    surahName: countingSchemesModel.getSurahName(entry.surahNo),
                    schemesThatCount: entry.schemesThatCount.map(schemeId => ({
                        id: schemeId,
                        name: countingSchemesModel.getSchemeName(schemeId)
                    })),
                    schemesThatDoNotCount: entry.schemesThatDoNotCount.map(schemeId => ({
                        id: schemeId,
                        name: countingSchemesModel.getSchemeName(schemeId)
                    }))
                };
            });

            countingSchemesModel.exportJSON(exportData, "ayah_schemes.json");
        };
    }

    return AyahSchemesViewModel();
});