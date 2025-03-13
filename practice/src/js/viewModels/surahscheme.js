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

        self.apiData = ko.observable({});
        self.surahArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.treeDataProvider = countingSchemesModel.treeDataProvider;
        self.selected = new KeySet.ObservableKeySet();

        // Load data with sessionStorage caching
        self.loadSurahData = function () {
            self.isLoading(true);

            const cachedData = sessionStorage.getItem('surah_schemes_data');

            if (cachedData) {
                const data = JSON.parse(cachedData);
                self.apiData(data);

                countingSchemesModel.fetchSchemeStats().then(() => {
                    self.isLoading(false);
                    setTimeout(() => {
                        const initialSelection = countingSchemesModel.flattenedSchemes.map(item => item.id);
                        self.selected.add(initialSelection);
                        self.filterData(countingSchemesModel.getSelectedWithParents(initialSelection));
                    }, 1);
                });
                return;
            }

            // API fetch configuration

            fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerSurah/")
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`API responded with status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    sessionStorage.setItem('surah_schemes_data', JSON.stringify(data));

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

        // Initialize data loading
        self.loadSurahData();

        // Handle tree selection changes
        self.selectedChanged = function (event) {
            const selectedKeys = [...event.detail.value.values()];
            self.filterData(countingSchemesModel.getSelectedWithParents(selectedKeys));
        };

        // Create display data for table
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

        // Define table columns
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

            self.tableColumns(columns);
            self.surahArray(displayData);
            self.schemesDataProvider(new ArrayDataProvider(displayData, {
                keyAttributes: "surahId"
            }));
        };

        // Export configuration
        self.exportTableData = function () {
            const rawData = self.apiData();
            const exportReady = {};

            Object.keys(rawData).forEach(surahId => {
                const surahName = countingSchemesModel.getSurahName(surahId);
                const surahKey = `${surahId} - ${surahName}`;

                exportReady[surahKey] = rawData[surahId].map(scheme => {
                    let mappedScheme = {
                        schemeName: scheme.schemeName,
                        minCount: scheme.minCount,
                        maxCount: scheme.maxCount
                    };

                    if (scheme.parentSchemeId !== null && scheme.parentSchemeId !== undefined) {
                        mappedScheme.parentSchemeName = countingSchemesModel.getSchemeName(scheme.parentSchemeId);
                    }

                    return mappedScheme;
                });
            });

            countingSchemesModel.exportJSON(exportReady, "surah_schemes.json");
        };
    }

    return SurahSchemesViewModel();
});