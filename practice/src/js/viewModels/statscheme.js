define([
    "knockout",
    "ojs/ojbootstrap",
    "ojs/ojarraydataprovider",
    "ojs/ojarraytreedataprovider",
    "ojs/ojknockout-keyset",
    "ojs/ojtreeview",
    "ojs/ojtable",
    "ojs/ojselectsingle"
], function (ko, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider, KeySet) {

    function StatsSchemesViewModel() {
        let self = this;

        self.fullSchemeArray = ko.observableArray([]);
        self.schemeMap = {};
        self.schemeArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
        self.treeDataProvider = ko.observable();

        let flattenedSchemes = [];
        let parentChildMap = {};

        // Fetch API data and build schemeMap
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStats/")
            .then(response => response.json())
            .then(data => {
                self.fullSchemeArray(data);
                data.forEach(scheme => {
                    self.schemeMap[scheme.schemeId] = scheme.schemeName;
                });

                let treeDataStats = buildTreeData(data);
                flattenedSchemes = flattenTreeDFS(treeDataStats);
                flattenedSchemes.forEach(node => {
                    if (node.parentId !== null) {
                        if (!parentChildMap[node.parentId]) {
                            parentChildMap[node.parentId] = [];
                        }
                        parentChildMap[node.parentId].push(node.id);
                    }
                });

                self.treeDataProvider(new ArrayTreeDataProvider(treeDataStats, {
                    keyAttributes: "schemeId",
                    childrenAttribute: "children"
                }));

                self.selected.add(flattenedSchemes.map(item => item.id));
                updateTableData();
                self.isLoading(false);
            })
            .catch(error => {
                console.error("Error fetching scheme data:", error);
                self.isLoading(false);
            });

        self.selectedChanged = function (event) {
            let selectedKeysArray = [...event.detail.value.values()];
            updateTableData();
        };

        // Tree structure definition
        function buildTreeData(data) {
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
        }

        self.selected = new KeySet.ObservableKeySet();

        // Flatten tree using DFS and build parent-child map
        function flattenTreeDFS(nodes, parentId = null, parentTitle = null) {
            let result = [];
            nodes.forEach(node => {
                result.push({ id: node.schemeId, title: node.title, parentId, parentTitle });
                if (node.children) {
                    result = result.concat(flattenTreeDFS(node.children, node.schemeId, node.title));
                }
            });
            return result;
        }

        function getSelectedWithParents(selectedKeys) {
            let allSelected = new Set(selectedKeys);
            selectedKeys.forEach(key => {
                let parent = flattenedSchemes.find(node => node.id === key)?.parentId;
                while (parent !== null) {
                    allSelected.add(parent);
                    parent = flattenedSchemes.find(node => node.id === parent)?.parentId || null;
                }
            });
            selectedKeys.forEach(key => {
                if (parentChildMap[key]) {
                    parentChildMap[key].forEach(childId => allSelected.add(childId));
                }
            });
            return Array.from(allSelected);
        }

        function updateTableData() {
            let selectedKeysArray = getSelectedWithParents([...self.selected().values()]);
            if (selectedKeysArray.length === 0) {
                self.schemeArray([]);
                self.tableColumns([]);
                self.schemesDataProvider(new ArrayDataProvider([]));
                return;
            }
            let selectedSchemes = flattenedSchemes.filter(node => selectedKeysArray.includes(node.id));
            let singleRow = {};
            selectedSchemes.forEach(node => {
                let schemeData = self.fullSchemeArray().find(s => s.schemeId.toString() === node.id);
                if (schemeData) {
                    singleRow[node.title] = schemeData.minCount === schemeData.maxCount ?
                        schemeData.minCount : `${schemeData.minCount} - ${schemeData.maxCount}`;
                } else {
                    singleRow[node.title] = "N/A";
                }
            });
            self.schemeArray([singleRow]);
            self.schemesDataProvider(new ArrayDataProvider(self.schemeArray));
            let columns = selectedSchemes.map(node => ({
                headerText: node.title,
                field: node.title,
                sortable: "enabled",
                className: "schemeColumn"
            }));
            self.tableColumns(columns);
        }

        self.getSurahName = function (surahId) {
            const surahNames = [
                "Al-Fatiha", "Al-Baqarah", "Aal-E-Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah",
                "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
                "Al-Anbiya", "Al-Hajj", "Al-Mu’minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
                "Luqman", "As-Sajda", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat",
                "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiya", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat",
                "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqia", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahina", "As-Saff",
                "Al-Jumu'a", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqa", "Al-Ma'arij", "Nuh",
                "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyama", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa", "At-Takwir",
                "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiya", "Al-Fajr", "Al-Balad", "Ash-Shams",
                "Al-Lail", "Ad-Duhaa", "Ash-Sharh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyina", "Az-Zalzala", "Al-'Adiyat", "Al-Qari'a",
                "At-Takathur", "Al-Asr", "Al-Humaza", "Al-Fil", "Quraish", "Al-Ma'un", "Al-Kawthar", "Al-Kafiroon", "An-Nasr", "Al-Masad",
                "Al-Ikhlas", "Al-Falaq", "An-Nas"
            ];
            return surahNames[surahId - 1] || `Unknown`;
        };

        // Export configuration 
        self.exportTableData = function (event) {
            // Use the data from the initial fetch call
            const data = ko.toJS(self.fullSchemeArray());

            // Customize the data
            const exportData = data.map(scheme => {
                return {
                    ...scheme,
                    parentSchemeName: (scheme.parentSchemeId !== undefined && scheme.parentSchemeId >= 0) ? self.schemeMap[scheme.parentSchemeId] :  "N/A",
                    schemeId: undefined, // Remove schemeId
                    parentSchemeId: undefined // Remove parentSchemeId
                };
            });

            exportJSON(exportData);
        };

        function exportJSON(data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "scheme_stats.json";
            link.click();
        }
    }

    return StatsSchemesViewModel;
});
