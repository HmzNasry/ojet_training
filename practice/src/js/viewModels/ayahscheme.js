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

        // Observable properties
        self.fullAyahArray = ko.observableArray([]);
        self.ayahArray = ko.observableArray([]);
        self.ayahDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.treeDataProvider = countingSchemesModel.treeDataProvider;
        self.selected = new KeySet.ObservableKeySet();

        // Initial data fetch
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerAyah/")
            .then(response => response.json())
            .then(data => {
                self.fullAyahArray(data);

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
            if (selectedKeys.length === 0) {
                self.ayahArray([]);
                self.tableColumns([]);
                self.ayahDataProvider(new ArrayDataProvider([]));
                return;
            }
            
            const filteredData = self.fullAyahArray().map(entry => {
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

            // Generate columns based on selected scheme IDs in DFS order
            const columns = [
                { headerText: "Surah", field: "surahNo", sortable: "enabled", className: "surahColumn", headerClassName: "surahColumnHeader" },
                { headerText: "Ayah No", field: "ayahNoWithinSurah", sortable: "enabled", className: "centered" },
                { headerText: "Ayah Text", field: "ayahText", className: "centered" }
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

            // Update observables
            self.tableColumns(columns);
            self.ayahArray(filteredData);
            self.ayahDataProvider(new ArrayDataProvider(filteredData, {
                keyAttributes: "seqNo"
            }));
        };

        self.handleRowAction = function (event) {
            const rowKey = event.detail.context.key;
            console.log('Row key from context:', rowKey);
        
            const originalEntry = self.fullAyahArray().find(entry => 
                entry.seqNo === rowKey
            );
        
            if (originalEntry) {
                const url = new URL('https://hawsabah.org/');
                url.searchParams.set('ojr', 'dashboard');
                url.searchParams.set('mushaf', '1');
                url.searchParams.set('surah', originalEntry.surahNo); 
                url.searchParams.set('ayah', originalEntry.ayahNoWithinSurah);
                
                console.log('Navigating to:', url.toString());
                window.location.href = url.toString();
            } else {
                console.error('No entry found for key:', rowKey);
            }
        };


        self.exportEnhancedApiData = function (event) {
            const rawData = self.fullAyahArray();
            const exportReady = rawData.map(entry => {
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
            countingSchemesModel.exportJSON(exportReady, "ayah_schemes.json");
        };
    }

    return AyahSchemesViewModel();
});