define([
    'knockout',
    'models/countingSchemes.model'
], function(ko, countingSchemesModel) {

    /**
     * Ayah Schemes Model
     * Handles data access and business logic for ayah-level counting schemes
     */
    function AyahSchemeModel() {
        const self = this;

        // Data containers
        self.rawData = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.cacheKey = 'ayah_schemes_data';

        /**
         * Load ayah scheme data with caching
         * @returns {Promise} Promise that resolves when data is loaded
         */
        self.loadData = function() {
            self.isLoading(true);

            const cachedData = sessionStorage.getItem(self.cacheKey);

            if (cachedData) {
                const data = JSON.parse(cachedData);
                self.rawData(data);
                self.isLoading(false);
                return Promise.resolve(data);
            }

            // Using the centralized API request helper from countingSchemes model
            return countingSchemesModel.apiRequest("GetCountingSchemeStatsPerAyah")
                .then(data => {
                    sessionStorage.setItem(self.cacheKey, JSON.stringify(data));
                    self.rawData(data);
                    return data;
                })
                .catch(error => {
                    console.error("Error fetching ayah scheme data:", error);
                    throw error;
                })
                .finally(() => {
                    self.isLoading(false);
                });
        };

        /**
         * Get ayah entry by sequence number
         * @param {number} seqNo - Sequence number of the ayah
         * @returns {Object|null} Ayah entry or null if not found
         */
        self.getAyahEntry = function(seqNo) {
            return self.rawData().find(item => item.seqNo === seqNo) || null;
        };

        /**
         * Generate URL for ayah details page
         * @param {number} seqNo - Sequence number of the ayah
         * @returns {string|null} URL for the ayah details or null if ayah not found
         */
        self.getAyahDetailsUrl = function(seqNo) {
            const entry = self.getAyahEntry(seqNo);
            
            if (!entry) return null;
            
            const url = new URL('https://hawsabah.org/');
            url.searchParams.set('ojr', 'dashboard');
            url.searchParams.set('mushaf', '1');
            url.searchParams.set('surah', entry.surahNo);
            url.searchParams.set('ayah', entry.ayahNoWithinSurah);
            
            return url.toString();
        };

        /**
         * Filter ayah data by scheme IDs
         * @param {Array} schemeIds - Scheme IDs to filter by
         * @returns {Array} Filtered and formatted ayah data
         */
        self.getFilteredAyahData = function(schemeIds) {
            if (!schemeIds || schemeIds.length === 0) {
                return [];
            }

            return self.rawData().map(entry => {
                // Include only scheme data for selected schemes
                const relevantSchemes = {};
                
                schemeIds.forEach(schemeId => {
                    const schemeName = countingSchemesModel.getSchemeName(schemeId);
                    if (schemeName) {
                        if (entry.schemesThatCount && entry.schemesThatCount.includes(schemeId)) {
                            relevantSchemes[schemeName] = "Counts";
                        } else if (entry.schemesThatHaveKhulf && entry.schemesThatHaveKhulf.includes(schemeId)) {
                            relevantSchemes[schemeName] = "Has Khulf";
                        } else if (entry.schemesThatDoNotCount && entry.schemesThatDoNotCount.includes(schemeId)) {
                            relevantSchemes[schemeName] = "Doesn't Count";
                        } else {
                            relevantSchemes[schemeName] = "N/A";
                        }
                    }
                });
                
                return {
                    seqNo: entry.seqNo,
                    surahNo: entry.surahNo,
                    surahName: countingSchemesModel.getSurahName(entry.surahNo),
                    ayahNoWithinSurah: entry.ayahNoWithinSurah, 
                    ayahText: entry.ayah,
                    ayahSerialNo: entry.ayahSerialNo,
                    schemes: relevantSchemes
                };
            });
        };

        /**
         * Prepare data for export
         * @returns {Array} Data ready for export
         */
        self.prepareExportData = function() {
            return self.rawData().map(entry => {
                const exportEntry = {
                    surah: `${entry.surahNo} - ${countingSchemesModel.getSurahName(entry.surahNo)}`,
                    ayahNumber: entry.ayahNoWithinSurah,
                    ayahSerialNo: entry.ayahSerialNo,
                    ayahText: entry.ayah,
                    schemes: {}
                };
                
                if (entry.schemesThatCount) {
                    entry.schemesThatCount.forEach(schemeId => {
                        const schemeName = countingSchemesModel.getSchemeName(schemeId);
                        exportEntry.schemes[schemeName] = "Counts";
                    });
                }
                
                if (entry.schemesThatHaveKhulf) {
                    entry.schemesThatHaveKhulf.forEach(schemeId => {
                        const schemeName = countingSchemesModel.getSchemeName(schemeId);
                        exportEntry.schemes[schemeName] = "Has Khulf";
                    });
                }
                
                if (entry.schemesThatDoNotCount) {
                    entry.schemesThatDoNotCount.forEach(schemeId => {
                        const schemeName = countingSchemesModel.getSchemeName(schemeId);
                        exportEntry.schemes[schemeName] = "Doesn't Count";
                    });
                }
                
                return exportEntry;
            });
        };

        /**
         * Export data to JSON file
         */
        self.exportData = function() {
            const exportData = self.prepareExportData();
            countingSchemesModel.exportJSON(exportData, "ayah_schemes.json");
        };

        /**
         * Initialize the model
         */
        self.initialize = function() {
            return Promise.all([
                self.loadData(),
                countingSchemesModel.fetchSchemeStats()
            ]);
        };
    }

    return new AyahSchemeModel();
});