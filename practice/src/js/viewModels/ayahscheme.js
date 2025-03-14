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

        self.apiData = ko.observableArray([]);
        self.ayahArray = ko.observableArray([]);
        self.ayahDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.treeDataProvider = countingSchemesModel.treeDataProvider;
        self.selected = new KeySet.ObservableKeySet();

        self.loadAyahData = function () {
            self.isLoading(true);

            const cachedData = sessionStorage.getItem('ayah_schemes_data');

            if (cachedData) {
                const data = JSON.parse(cachedData);
                self.apiData(data);

                countingSchemesModel.fetchSchemeStats().then(() => {
                    self.isLoading(false);


                    setTimeout(() => {   // Mandatory in order to suppress the error: Cannot read properties of undefined (reading 'parentKeyNodeMap')
                        try {
                            const initialSelection = countingSchemesModel.flattenedSchemes.map(item => item.id);

                            // First ensure the tree data provider is ready
                            if (self.treeDataProvider() && self.treeDataProvider().data) {
                                self.selected.add(initialSelection);
                                self.filterData(countingSchemesModel.getSelectedWithParents(initialSelection));
                            } else {
                                // If tree not ready, wait a bit longer
                                setTimeout(() => {
                                    self.selected.add(initialSelection);
                                    self.filterData(countingSchemesModel.getSelectedWithParents(initialSelection));
                                }, 10);
                            }
                        } catch (e) {
                            console.error("Error during TreeView initialization:", e);
                            // Fallback - just load data without selection
                            self.filterData([]);
                        }
                    }, 1); 
                });
                return;
            }

            // API fetching configuration
            fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerAyah/")
                .then(response => response.json())
                .then(data => {
                    sessionStorage.setItem('ayah_schemes_data', JSON.stringify(data));

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
        };

        // Initialize on load
        self.loadAyahData();

        // Tree selection handler
        self.selectedChanged = function (event) {
            const selectedKeys = [...event.detail.value.values()];
            self.filterData(countingSchemesModel.getSelectedWithParents(selectedKeys));
        };

        // Data transformation for display
        self.createDisplayData = function (selectedKeys) {
            return self.apiData().map(entry => {
                const row = {
                    seqNo: entry.seqNo,
                    surahNo: `${entry.surahNo} (${countingSchemesModel.getSurahName(entry.surahNo)})`,
                    ayahNoWithinSurah: entry.ayahNoWithinSurah,
                    ayahText: entry.ayah,
                    ayahSerialNo: entry.ayahSerialNo
                };

                selectedKeys.forEach(schemeId => {
                    const schemeName = countingSchemesModel.getSchemeName(schemeId);
                    if (schemeName) {
                        row[schemeName] = entry.schemesThatCount.includes(schemeId) ? "Counts" :
                            entry.schemesThatHaveKhulf?.includes(schemeId) ? "Has Khulf" :
                                "Doesn't Count";
                    }
                });

                return row;
            });
        };

        // Table column configuration
        self.createTableColumns = function (selectedKeys) {
            const baseColumns = [
                { headerText: "Surah", field: "surahNo", sortable: "enabled", className: "surahColumn" },
                { headerText: "Ayah No", field: "ayahNoWithinSurah", sortable: "enabled", className: "centered" },
                { headerText: "Ayah Text", field: "ayahText", className: "ayah-text-column right-align" },
                { headerText: "Ayah Serial No", field: "ayahSerialNo", className: "centered" }
            ];

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
                            headerClassName: "schemeColumnHeader right-align"
                        });
                    }
                }
            });

            return [...baseColumns, ...schemeColumns];
        };

        // Filter and update table data
        self.filterData = function (selectedKeys) {
            if (selectedKeys.length === 0) {
                // Use transaction for empty data case
                ko.computedContext.ignore(function () {
                    self.ayahArray([]);
                    self.tableColumns([]);
                    self.ayahDataProvider(new ArrayDataProvider([]));
                });
                return;
            }

            const displayData = self.createDisplayData(selectedKeys);
            const columns = self.createTableColumns(selectedKeys);

            // Batch all updates in a single transaction
            ko.computedContext.ignore(function () {
                self.tableColumns(columns);
                self.ayahArray(displayData);
                self.ayahDataProvider(new ArrayDataProvider(displayData, {
                    keyAttributes: "seqNo"
                }));
            });
        };

        // Row click navigation
        self.handleRowAction = function (event) {
            const rowKey = event.detail.context.key;
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

        // Export functionality
        self.exportTableData = function (event) {
            const exportData = self.apiData().map(entry => {
                return {
                    ...entry,
                    surahNo: `${countingSchemesModel.getSurahName(entry.surahNo)}, ${entry.surahNo}`,
                    schemesThatCount: entry.schemesThatCount.map(id => countingSchemesModel.getSchemeName(id)),
                    schemesThatDoNotCount: entry.schemesThatDoNotCount.map(id => countingSchemesModel.getSchemeName(id)),
                    schemesThatHaveKhulf: entry.schemesThatHaveKhulf ?
                        entry.schemesThatHaveKhulf.map(id => countingSchemesModel.getSchemeName(id)) : []
                };
            });

            countingSchemesModel.exportJSON(exportData, "ayah_schemes.json");
        };
    }

    return AyahSchemesViewModel();
});