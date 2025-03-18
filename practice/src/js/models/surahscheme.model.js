define([
    'knockout',
    'models/countingSchemes.model'
], function(ko, countingSchemesModel) {

    /**
     * Surah Schemes Model
     * Handles data access and business logic for surah-level counting schemes
     */
    function SurahSchemeModel() {
        const self = this;

        // Data containers
        self.rawData = ko.observable({});
        self.isLoading = ko.observable(true);
        self.cacheKey = 'surah_schemes_data';

        /**
         * Load surah scheme data with caching
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

            // Updated to remove trailing slash for consistency
            return countingSchemesModel.apiRequest("GetCountingSchemeStatsPerSurah")
                .then(data => {
                    sessionStorage.setItem(self.cacheKey, JSON.stringify(data));
                    self.rawData(data);
                    return data;
                })
                .catch(error => {
                    console.error("Error fetching surah scheme data:", error);
                    throw error;
                })
                .finally(() => {
                    self.isLoading(false);
                });
        };

        /**
         * Get surah schemes filtered by scheme IDs
         * @param {Array} schemeIds - Scheme IDs to filter by
         * @returns {Array} Filtered surah schemes
         */
        self.getFilteredSurahSchemes = function(schemeIds) {
            if (!schemeIds || schemeIds.length === 0) {
                return [];
            }

            return Object.entries(self.rawData())
                .map(([surahId, schemes]) => {
                    const surahSchemes = schemes.filter(scheme =>
                        schemeIds.includes(scheme.schemeId)
                    );

                    if (surahSchemes.length === 0) return null;

                    return {
                        surahId: parseInt(surahId),
                        surahName: countingSchemesModel.getSurahName(surahId),
                        schemes: surahSchemes
                    };
                })
                .filter(Boolean); // Remove null entries
        };

        /**
         * Prepare data for export
         * @returns {Object} Data ready for export
         */
        self.prepareExportData = function() {
            const rawData = self.rawData();
            const exportReady = {};

            Object.keys(rawData).forEach(surahId => {
                const surahName = countingSchemesModel.getSurahName(surahId);
                const surahKey = `${surahId} - ${surahName}`;

                exportReady[surahKey] = rawData[surahId].map(scheme => {
                    const parentSchemeName = scheme.parentSchemeId !== null && scheme.parentSchemeId !== undefined ?
                        countingSchemesModel.getSchemeName(scheme.parentSchemeId) : null;

                    return {
                        schemeName: scheme.schemeName,
                        minCount: scheme.minCount,
                        maxCount: scheme.maxCount,
                        parentSchemeName: parentSchemeName || "N/A"
                    };
                });
            });

            return exportReady;
        };

        /**
         * Export data to JSON file
         */
        self.exportData = function() {
            const exportData = self.prepareExportData();
            countingSchemesModel.exportJSON(exportData, "surah_schemes.json");
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

    return new SurahSchemeModel();
});