define([
    "knockout",
    "ojs/ojarraytreedataprovider",
    "text!configuration/surahNames.json"
], function (ko, ArrayTreeDataProvider, surahNames) {

    function CountingSchemesModel() {
        const self = this;

        self.schemeMap = {};
        self.nodeMap = {};
        self.treeDataProvider = ko.observable();
        self.flattenedSchemes = [];
        self.parentChildMap = {};
        self.surahData = null;
        self.rawSchemeStats = [];

        //  Cache configuration
        self.fetchSchemeStats = function () {
            const cachedData = sessionStorage.getItem('scheme_stats_data');

            if (cachedData) {
                console.log("Using cached scheme data");
                const data = JSON.parse(cachedData);
                self.processSchemeData(data);
                self.rawSchemeStats = data;

                if (!self.treeDataProvider()) {
                    const treeDataStats = self.buildTreeData(data);
                    self.treeDataProvider(new ArrayTreeDataProvider(treeDataStats, {
                        keyAttributes: "schemeId",
                        childrenAttribute: "children"
                    }));
                }

                return Promise.resolve(self.rawSchemeStats);
            }

            // API fetcihng configuration
            console.log("Fetching fresh scheme data");
            return fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStats/")
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`API responded with status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Caching scheme data");
                    sessionStorage.setItem('scheme_stats_data', JSON.stringify(data));

                    self.processSchemeData(data);
                    self.rawSchemeStats = data;

                    const treeDataStats = self.buildTreeData(data);
                    self.treeDataProvider(new ArrayTreeDataProvider(treeDataStats, {
                        keyAttributes: "schemeId",
                        childrenAttribute: "children"
                    }));

                    return self.rawSchemeStats;
                })
                .catch(error => {
                    console.error("Error fetching scheme data:", error);
                    throw error;
                });
        };


        // Process raw scheme data into internal structures
        self.processSchemeData = function (data) {
            self.schemeMap = {};
            self.nodeMap = {};
            self.parentChildMap = {};

            data.forEach(scheme => {
                self.schemeMap[scheme.schemeId] = scheme.schemeName;
                self.nodeMap[scheme.schemeId] = {
                    id: scheme.schemeId,
                    title: scheme.schemeName,
                    parentId: scheme.parentSchemeId
                };

                if (scheme.parentSchemeId !== null && scheme.parentSchemeId !== undefined) {
                    if (!self.parentChildMap[scheme.parentSchemeId]) {
                        self.parentChildMap[scheme.parentSchemeId] = [];
                    }
                    self.parentChildMap[scheme.parentSchemeId].push(scheme.schemeId);
                }
            });

            self.flattenedSchemes = Object.values(self.nodeMap);
        };

        // Build hierarchical tree structure
        self.buildTreeData = function (data) {
            const map = {};
            data.forEach(item => {
                map[item.schemeId] = { ...item, title: item.schemeName };
            });

            const roots = [];
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

        // Get surah name by ID
        self.getSurahName = function (surahId) {
            try {
                if (!self.surahData) {
                    self.surahData = JSON.parse(surahNames);
                }
                return self.surahData[surahId] || "Unknown";
            } catch (error) {
                console.error("Error parsing surah names:", error);
                return "Unknown";
            }
        };

        // Get scheme name by ID
        self.getSchemeName = function (schemeId) {
            return self.schemeMap[schemeId] || "Unknown";
        };

        // Get selected schemes with parents and children
        self.getSelectedWithParents = function (selectedKeys) {
            const allSelected = new Set(selectedKeys);

            selectedKeys.forEach(key => {
                let node = self.nodeMap[key];
                if (!node) return;

                let parentId = node.parentId;
                while (parentId !== null && parentId !== undefined) {
                    allSelected.add(parentId);
                    const parentNode = self.nodeMap[parentId];
                    parentId = parentNode ? parentNode.parentId : null;
                }
            });

            selectedKeys.forEach(key => {
                if (self.parentChildMap[key]) {
                    self.parentChildMap[key].forEach(childId => allSelected.add(childId));
                }
            });

            return Array.from(allSelected);
        };

        // Export data
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