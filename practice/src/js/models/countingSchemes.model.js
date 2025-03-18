define([
    'knockout',
    'ojs/ojarraytreedataprovider',
    'text!configuration/settings.json'
], function (ko, ArrayTreeDataProvider, settings) {

    function CountingSchemesModel() {
        const self = this;

        // Configuration and state management
        self.conf = JSON.parse(settings);
        self.classEndpoint = self.conf.backendServer + "QRDBAPI/";
        self.schemeMap = {};
        self.nodeMap = {};
        self.treeDataProvider = ko.observable();
        self.flattenedSchemes = [];
        self.parentChildMap = {};
        self.surahData = ko.observable({});
        self.isFetchingSurahData = ko.observable(false);
        
        /**
         * API request helper - centralizes endpoint access and error handling
         * @param {string} endpoint - API endpoint path (without base URL)
         * @param {object} options - Fetch options
         * @returns {Promise} - Promise with JSON response
         */
        self.apiRequest = function(endpoint, options = {}) {
            const url = self.classEndpoint + endpoint;
            
            return fetch(url, options)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`API responded with status: ${response.status}`);
                    }
                    return response.json();
                })
                .catch(error => {
                    console.error(`Error calling ${endpoint}:`, error);
                    throw error;
                });
        };

        /**
         * Fetches counting scheme statistics with caching
         * @returns {Promise} - Promise with scheme stats data
         */
        self.fetchSchemeStats = function() {
            const cachedData = sessionStorage.getItem('scheme_stats_data');

            if (cachedData) {
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

            return self.apiRequest("GetCountingSchemeStats/")
                .then(data => {
                    sessionStorage.setItem('scheme_stats_data', JSON.stringify(data));

                    self.processSchemeData(data);
                    self.rawSchemeStats = data;

                    const treeDataStats = self.buildTreeData(data);
                    self.treeDataProvider(new ArrayTreeDataProvider(treeDataStats, {
                        keyAttributes: "schemeId",
                        childrenAttribute: "children"
                    }));

                    return self.rawSchemeStats;
                });
        };

        /**
         * Process raw scheme data into internal structures
         * @param {Array} data - Raw scheme data from API
         */
        self.processSchemeData = function(data) {
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

        /**
         * Build hierarchical tree structure for TreeView
         * @param {Array} data - Raw scheme data from API
         * @returns {Array} - Tree structure for ArrayTreeDataProvider
         */
        self.buildTreeData = function(data) {
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

        /**
         * Fetch surah names with caching
         * @returns {Promise} - Promise with surah names data
         */
        self.fetchSurahData = function() {
            if (self.isFetchingSurahData()) {
                return Promise.resolve(self.surahData());
            }

            const cachedSurahData = sessionStorage.getItem('surah_names_data');
            if (cachedSurahData) {
                const parsedData = JSON.parse(cachedSurahData);
                self.surahData(parsedData);
                return Promise.resolve(parsedData);
            }

            self.isFetchingSurahData(true);

            return self.apiRequest("GetSurahFirstPage/1")
                .then(data => {
                    const surahMap = {};
                    data.forEach(item => {
                        surahMap[item.entryNo] = item.indexEntry;
                    });

                    sessionStorage.setItem('surah_names_data', JSON.stringify(surahMap));
                    self.surahData(surahMap);
                    return surahMap;
                })
                .catch(error => {
                    return {};
                })
                .finally(() => {
                    self.isFetchingSurahData(false);
                });
        };

        /**
         * Get surah name by ID with automatic data loading
         * @param {number} surahId - Surah ID
         * @returns {string} - Surah name or placeholder
         */
        self.getSurahName = function(surahId) {
            const currentData = self.surahData();

            if (currentData[surahId]) {
                return currentData[surahId];
            }

            if (!self.isFetchingSurahData()) {
                self.fetchSurahData().then(newData => {
                    // The observable will update automatically
                });
            }

            return `Surah ${surahId}`;
        };

        /**
         * Get scheme name by ID
         * @param {number} schemeId - Scheme ID
         * @returns {string} - Scheme name
         */
        self.getSchemeName = function(schemeId) {
            return self.schemeMap[schemeId] || "Unknown";
        };

        /**
         * Get selected schemes with parents and children
         * @param {Array} selectedKeys - Selected scheme IDs
         * @returns {Array} - Complete set of selected IDs including parents
         */
        self.getSelectedWithParents = function(selectedKeys) {
            const allSelected = new Set(selectedKeys);

            // Add all parent nodes
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

            // Add all child nodes
            selectedKeys.forEach(key => {
                if (self.parentChildMap[key]) {
                    self.parentChildMap[key].forEach(childId => allSelected.add(childId));
                }
            });

            return Array.from(allSelected);
        };

        /**
         * Export data as downloadable JSON file
         * @param {object} data - Data to export
         * @param {string} filename - Output filename
         */
        self.exportJSON = function(data, filename = "data.json") {
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

        /**
         * Initialize TreeView selection with retry mechanism
         * @param {ObservableKeySet} selectionObject - TreeView selection object
         * @param {Array} keysToSelect - Keys to select
         * @param {Function} callback - Callback function
         * @param {number} timeout - Initial timeout before selection
         */
        self.initializeTreeViewSelection = function(selectionObject, keysToSelect, callback, timeout = 30) {
            if (callback && typeof callback === 'function') {
                callback(self.getSelectedWithParents(keysToSelect));
            }

            setTimeout(() => {
                try {
                    selectionObject.clear();
                    selectionObject.add(keysToSelect);
                } catch (e) {
                    console.warn("TreeView selection failed on first attempt, retrying...");
                    setTimeout(() => {
                        try {
                            selectionObject.clear();
                            selectionObject.add(keysToSelect);
                        } catch (innerError) {
                            console.error("TreeView selection failed permanently");
                        }
                    }, 100);
                }
            }, timeout);
        };

        // Trigger early loading of surah data
        self.fetchSurahData();
    }

    return new CountingSchemesModel();
});