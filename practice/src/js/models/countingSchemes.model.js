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

        // Placeholder for Surah name mapping
        self.getSurahName = function (surahId) {
            const surahNames = [
                // Placeholder for Surah names
            ];
            return surahNames[surahId - 1] || `Unknown`;
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
    }

    return new CountingSchemesModel();
});