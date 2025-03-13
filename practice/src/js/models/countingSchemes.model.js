define([
    "knockout",
    "ojs/ojarraytreedataprovider"
], function (ko, ArrayTreeDataProvider) {

    function CountingSchemesModel() {
        let self = this;

        self.schemeMap = {};
        self.treeDataProvider = ko.observable();
        self.flattenedSchemes = [];
        self.parentChildMap = {};

        // Fetch API data and build schemeMap for stats schemes
        self.fetchSchemeStats = function () {
            return fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStats/")
                .then(response => response.json())
                .then(data => {
                    data.forEach(scheme => {
                        self.schemeMap[scheme.schemeId] = scheme.schemeName;
                    });

                    let treeDataStats = self.buildTreeData(data);
                    self.treeDataProvider(new ArrayTreeDataProvider(treeDataStats, {
                        keyAttributes: "schemeId",
                        childrenAttribute: "children"
                    }));

                    self.flattenedSchemes = self.flattenTreeDFS(treeDataStats);
                    self.buildParentChildMap();
                    return data;
                })
                .catch(error => {
                    console.error("Error fetching scheme data:", error);
                });
        };

        // Tree structure definition
        self.buildTreeData = function (data) {
            let map = {};
            data.forEach(item => {
                map[item.schemeId] = { ...item, title: item.schemeName };
            });

            let roots = [];
            data.forEach(item => {
                if (item.parentSchemeId === null || item.parentSchemeId === undefined) {
                    roots.push(map[item.schemeId]);
                } else if (map[item.parentSchemeId]) {
                    if (!map[item.parentSchemeId].children) {
                        map[item.parentSchemeId].children = [];
                    }
                    map[item.parentSchemeId].children.push(map[item.schemeId]);
                }
            });

            return roots;
        };

        // Flatten tree using DFS
        self.flattenTreeDFS = function (nodes, parentId = null, parentTitle = null) {
            let result = [];
            nodes.forEach(node => {
                result.push({ id: node.schemeId, title: node.title, parentId, parentTitle });
                if (node.children) {
                    result = result.concat(self.flattenTreeDFS(node.children, node.schemeId, node.title));
                }
            });
            return result;
        };

        // Build parent-child map
        self.buildParentChildMap = function () {
            self.parentChildMap = {};
            self.flattenedSchemes.forEach(node => {
                if (node.parentId !== null) {
                    if (!self.parentChildMap[node.parentId]) {
                        self.parentChildMap[node.parentId] = [];
                    }
                    self.parentChildMap[node.parentId].push(node.id);
                }
            });
        };

        // Get scheme name by ID
        self.getSchemeName = function (schemeId) {
            return self.schemeMap[schemeId] || `Unknown`;
        };

        // Get selected keys with parents
        self.getSelectedWithParents = function (selectedKeys) {
            let allSelected = new Set(selectedKeys);
            selectedKeys.forEach(key => {
                let parent = self.flattenedSchemes.find(node => node.id === key)?.parentId;
                while (parent !== null) {
                    allSelected.add(parent);
                    parent = self.flattenedSchemes.find(node => node.id === parent)?.parentId || null;
                }
            });
            selectedKeys.forEach(key => {
                if (self.parentChildMap[key]) {
                    self.parentChildMap[key].forEach(childId => allSelected.add(childId));
                }
            });
            return Array.from(allSelected);
        };

        // Update table data based on selected keys
        self.updateTableData = function (selectedKeys, fullSchemeArray) {
            let selectedKeysArray = self.getSelectedWithParents(selectedKeys);
            if (selectedKeysArray.length === 0) {
                return { schemeArray: [], columns: [] };
            }
            let selectedSchemes = self.flattenedSchemes.filter(node => selectedKeysArray.includes(node.id));
            let singleRow = {};
            selectedSchemes.forEach(node => {
                let schemeData = fullSchemeArray.find(s => s.schemeId === node.id);
                if (schemeData) {
                    singleRow[node.title] = schemeData.minCount === schemeData.maxCount ?
                        schemeData.minCount : `${schemeData.minCount} - ${schemeData.maxCount}`;
                } else {
                    singleRow[node.title] = "N/A";
                }
            });
            let schemeArray = [singleRow];
            let columns = selectedSchemes.map(node => ({
                headerText: node.title,
                field: node.title,
                sortable: "enabled",
                className: "schemeColumn"
            }));
            return { schemeArray, columns };
        };

        // Export helper
        self.exportJSON = function (data, filename = "data.json") {
            try {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                console.error("Export failed:", error);
            }
        };
    }

    return new CountingSchemesModel();
});