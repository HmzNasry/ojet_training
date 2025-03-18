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

    /**
     * Stats Schemes ViewModel
     * Provides UI logic for displaying counting scheme statistics
     */
    function StatsSchemesViewModel() {
        const self = this;

        // ViewModel state observables
        self.schemeArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.treeDataProvider = countingSchemesModel.treeDataProvider;
        self.selected = new KeySet.ObservableKeySet();

        /**
         * Initialize the view model by loading data from the model
         * The cache configuration is managed in the model itself
         */
        function initialize() {
            countingSchemesModel.fetchSchemeStats().then(() => {
                self.apiData = ko.observableArray(countingSchemesModel.rawSchemeStats);
                self.schemeMap = countingSchemesModel.schemeMap;
                self.isLoading(false);
                
                const initialSelection = countingSchemesModel.flattenedSchemes.map(item => item.id);
                
                // Use the model helper for TreeView selection with retry mechanism
                countingSchemesModel.initializeTreeViewSelection(
                    self.selected,
                    initialSelection,
                    keys => self.filterData(keys)
                );
            }).catch(error => {
                console.error("Error fetching scheme data:", error);
                self.isLoading(false);
            });
        }

        /**
         * Handle TreeView selection changes
         * @param {CustomEvent} event - Selection change event
         */
        self.selectedChanged = function (event) {
            const selectedKeys = [...event.detail.value.values()];
            self.filterData(countingSchemesModel.getSelectedWithParents(selectedKeys));
        };

        /**
         * Create display data for the table based on selected schemes
         * @param {Array} selectedSchemes - Schemes selected in the TreeView
         * @returns {Array} Data for table display
         */
        self.createDisplayData = function (selectedSchemes) {
            if (selectedSchemes.length === 0) {
                return [];
            }

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

        /**
         * Create table columns with hierarchical DFS ordering
         * This ensures parent schemes appear before their children
         * @param {Array} selectedSchemes - Schemes selected in the TreeView
         * @returns {Array} Column configurations for the table
         */
        self.createTableColumns = function (selectedSchemes) {
            const columns = [];
            const visited = new Set();
            const schemeMap = new Map(selectedSchemes.map(scheme => [scheme.id, scheme]));
            
            // DFS traversal using parent-child relationships
            function dfs(nodeId) {
                if (visited.has(nodeId)) return;
                visited.add(nodeId);
                
                const scheme = schemeMap.get(nodeId);
                if (scheme) {
                    columns.push({
                        headerText: scheme.title,
                        field: scheme.title,
                        sortable: "disabled",
                        className: "schemeColumn",
                        headerClassName: "schemeColumnHeader"
                    });
                }
                
                // Process children in depth-first order
                const children = countingSchemesModel.parentChildMap[nodeId] || [];
                children.forEach(childId => dfs(childId));
            }
            
            // Find root nodes and start traversal
            const rootNodes = selectedSchemes
                .filter(node => node.parentId === null || node.parentId === undefined)
                .map(node => node.id);
            
            rootNodes.forEach(rootId => dfs(rootId));
            
            return columns;
        };

        /**
         * Filter and update table data based on selected keys
         * @param {Array} selectedKeys - Selected scheme IDs
         */
        self.filterData = function (selectedKeys) {
            if (selectedKeys.length === 0) {
                ko.computedContext.ignore(function () {
                    self.schemeArray([]);
                    self.tableColumns([]);
                    self.schemesDataProvider(new ArrayDataProvider([]));
                });
                return;
            }

            const selectedSchemes = countingSchemesModel.flattenedSchemes.filter(
                node => selectedKeys.includes(node.id)
            );

            const displayData = self.createDisplayData(selectedSchemes);
            const columns = self.createTableColumns(selectedSchemes);

            // Batch all updates in a single transaction for better performance
            ko.computedContext.ignore(function () {
                self.tableColumns(columns);
                self.schemeArray(displayData);
                self.schemesDataProvider(new ArrayDataProvider(displayData));
            });
        };

        /**
         * Export table data to JSON file
         * @param {Event} event - Click event
         */
        self.exportTableData = function (event) {
            const exportData = ko.toJS(self.apiData()).map(scheme => {
                const parentSchemeName = scheme.parentSchemeId !== null && scheme.parentSchemeId !== undefined ? 
                    countingSchemesModel.getSchemeName(scheme.parentSchemeId) : null;
                    
                return {
                    schemeName: scheme.schemeName,
                    minCount: scheme.minCount,
                    maxCount: scheme.maxCount,
                    totalVerses: scheme.minCount === scheme.maxCount ? scheme.minCount : 
                        `${scheme.minCount}-${scheme.maxCount}`,
                    parentSchemeName: parentSchemeName || "N/A"
                };
            });

            countingSchemesModel.exportJSON(exportData, "scheme_stats.json");
        };

        // Initialize the view model
        initialize();
    }

    return StatsSchemesViewModel();
});