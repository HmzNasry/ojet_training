define([
    "knockout",
    "models/countingSchemes.model",
    "models/ayahscheme.model",
    "ojs/ojbootstrap",
    "ojs/ojarraydataprovider",
    "ojs/ojarraytreedataprovider",
    "ojs/ojknockout-keyset",
    "ojs/ojtreeview",
    "ojs/ojtable",
    "ojs/ojselectsingle"
], function (ko, countingSchemesModel, ayahSchemeModel, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider, KeySet) {

    /**
     * Ayah Schemes ViewModel
     * Provides UI logic for displaying counting schemes per ayah
     */
    function AyahSchemesViewModel() {
        const self = this;

        // ViewModel state observables
        self.ayahArray = ko.observableArray([]);
        self.ayahDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.computed(() => countingSchemesModel.isFetchingSurahData() || ayahSchemeModel.isLoading());
        self.treeDataProvider = countingSchemesModel.treeDataProvider;
        self.selected = new KeySet.ObservableKeySet();

        /**
         * Initialize the view
         */
        self.initialize = function() {
            ayahSchemeModel.initialize().then(() => {
                const initialSelection = countingSchemesModel.flattenedSchemes.map(item => item.id);
                
                // Use the model helper for TreeView selection
                countingSchemesModel.initializeTreeViewSelection(
                    self.selected,
                    initialSelection,
                    keys => self.filterData(keys)
                );
            }).catch(error => {
                console.error("Error initializing view:", error);
            });
        };

        /**
         * Handle TreeView selection changes
         * @param {CustomEvent} event - Selection change event
         */
        self.selectedChanged = function (event) {
            const selectedKeys = [...event.detail.value.values()];
            self.filterData(countingSchemesModel.getSelectedWithParents(selectedKeys));
        };

        /**
         * Create display data for table based on selected schemes
         * @param {Array} selectedKeys - Selected scheme IDs
         * @returns {Array} Data for table display
         */
        self.createDisplayData = function (selectedKeys) {
            const filteredData = ayahSchemeModel.getFilteredAyahData(selectedKeys);
            
            return filteredData.map(item => {
                const row = {
                    seqNo: item.seqNo,
                    surahNo: `${item.surahNo} (${item.surahName})`,
                    ayahNoWithinSurah: item.ayahNoWithinSurah,
                    ayahText: item.ayahText,
                    ayahSerialNo: item.ayahSerialNo
                };

                // Add scheme columns
                Object.keys(item.schemes).forEach(schemeName => {
                    row[schemeName] = item.schemes[schemeName];
                });

                return row;
            });
        };

        /**
         * Create table columns with hierarchical DFS ordering
         * This ensures parent schemes appear before their children
         * @param {Array} selectedKeys - Selected scheme IDs
         * @returns {Array} Column configurations for the table
         */
        self.createTableColumns = function (selectedKeys) {
            const baseColumns = [
                { headerText: "Surah", field: "surahNo", sortable: "enabled", className: "surahColumn" },
                { headerText: "Ayah No", field: "ayahNoWithinSurah", sortable: "enabled", className: "centered" },
                { headerText: "Ayah Text", field: "ayahText", className: "ayah-text-column right-align" },
                { headerText: "Ayah Serial No", field: "ayahSerialNo", className: "centered" }
            ];

            const schemeColumns = [];
            const visited = new Set();

            // DFS traversal using parent-child relationships
            function dfs(nodeId) {
                if (visited.has(nodeId)) return;
                visited.add(nodeId);

                if (selectedKeys.includes(nodeId)) {
                    const schemeName = countingSchemesModel.getSchemeName(nodeId);
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

                // Process children in depth-first order
                const children = countingSchemesModel.parentChildMap[nodeId] || [];
                children.forEach(childId => dfs(childId));
            }

            // Find root nodes and start traversal
            const rootNodes = countingSchemesModel.flattenedSchemes
                .filter(node => node.parentId === null || node.parentId === undefined)
                .map(node => node.id);

            rootNodes.forEach(rootId => dfs(rootId));

            return [...baseColumns, ...schemeColumns];
        };

        /**
         * Filter and update table data based on selected keys
         * @param {Array} selectedKeys - Selected scheme IDs
         */
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

            // Batch all updates in a single transaction for better performance
            ko.computedContext.ignore(function () {
                self.tableColumns(columns);
                self.ayahArray(displayData);
                self.ayahDataProvider(new ArrayDataProvider(displayData, {
                    keyAttributes: "seqNo"
                }));
            });
        };

        /**
         * Navigate to ayah details when row is clicked
         * @param {Event} event - Row click event
         */
        self.handleRowAction = function (event) {
            const rowKey = event.detail.context.key;
            const url = ayahSchemeModel.getAyahDetailsUrl(rowKey);
            
            if (url) {
                window.location.href = url;
            } else {
                console.error('No entry found for key:', rowKey);
            }
        };

        /**
         * Export table data to JSON file
         * @param {Event} event - Click event
         */
        self.exportTableData = function (event) {
            ayahSchemeModel.exportData();
        };

        // Subscribe to surah data changes to refresh display if needed
        countingSchemesModel.surahData.subscribe(function(newSurahData) {
            // Only refresh if we already have data displayed
            if (self.ayahDataProvider() && self.ayahDataProvider().data.length > 0) {
                const currentKeys = [...self.selected.values()];
                if (currentKeys.length > 0) {
                    self.filterData(countingSchemesModel.getSelectedWithParents(currentKeys));
                }
            }
        });

        // Initialize the view
        self.initialize();
    }

    return AyahSchemesViewModel();
});