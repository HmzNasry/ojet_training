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

    function AyahSchemesViewModel() {
        let self = this;

        self.fullAyahArray = ko.observableArray([]);
        self.schemeMap = {};
        self.ayahArray = ko.observableArray([]);
        self.ayahDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);

        self.exportValue = ko.observable(null);
        self.exportOptions = [{ label: "Export as JSON", value: "json" }];
        
        self.exportTableData = function (event) {
            console.log('Export triggered with format:', event.detail.value);
            let selectedFormat = event.detail.value;
            let data = ko.toJS(self.ayahArray());
            if (selectedFormat === "json") {
                console.log('Exporting JSON data:', data);
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "ayah_schemes.json";
                link.click();
            }
            self.exportValue(null);
        };

        self.handleRowAction = function (event) {
            const rowKey = event.detail.context.key;
            console.log('Row key from context:', rowKey);
        
            // Get the ORIGINAL entry from fullAyahArray using seqNo
            const originalEntry = self.fullAyahArray().find(entry => 
                entry.seqNo === rowKey
            );
        
            if (originalEntry) {
                const url = new URL('https://hawsabah.org/');
                url.searchParams.set('ojr', 'dashboard');
                url.searchParams.set('mushaf', '1');
                url.searchParams.set('surah', originalEntry.surahNo); // Use original numeric value
                url.searchParams.set('ayah', originalEntry.ayahNoWithinSurah);
                
                console.log('Navigating to:', url.toString());
                window.location.href = url.toString();
            } else {
                console.error('No entry found for key:', rowKey);
            }
        };

        let treeDataStats = [{
            id: "0",
            title: "الكل",
            children: [
                { id: "1", title: "المدنى الأول", children: [
                    { id: "8", title: "المدنى الأول، يزيد بن القعقاع" },
                    { id: "9", title: "المدنى الأول، شيبة بن نصاح", children: [
                        { id: "12", title: "المدنى الأول، شيبة بن نصاح، بعد (نذير) - الملك" },
                        { id: "13", title: "المدنى الأول، شيبة بن نصاح، بدون عد (نذير) - الملك" }
                    ]}
                ]},
                { id: "2", title: "المدني الثاني", children: [
                    { id: "10", title: "المدنى الثاني، يزيد بن القعقاع" },
                    { id: "11", title: "المدنى الثاني، شيبة بن نصاح" }
                ]},
                { id: "3", title: "المكي", children: [{ id: "14", title: "المكي، بلا خلف" }]},
                { id: "4", title: "الكوفي" },
                { id: "5", title: "البصري", children: [{ id: "15", title: "البصري، بلا خلف" }]},
                { id: "6", title: "الدمشقي" },
                { id: "7", title: "الحمصي" }
            ]
        }];

        console.log('Initializing tree data provider');
        self.treeDataProvider = new ArrayTreeDataProvider(treeDataStats, {
            keyAttributes: "id",
            childrenAttribute: "children"
        });

        self.selected = new KeySet.ObservableKeySet();

        function flattenTreeDFS(node, parentId = null, parentTitle = null) {
            let result = [];
            result.push({ id: node.id, title: node.title, parentId, parentTitle });
            if (node.children) {
                node.children.forEach(child => {
                    result = result.concat(flattenTreeDFS(child, node.id, node.title));
                });
            }
            return result;
        }

        let flattenedSchemes = flattenTreeDFS(treeDataStats[0]);
        console.log('Flattened tree structure:', flattenedSchemes);
        
        let parentChildMap = {};
        flattenedSchemes.forEach(node => {
            if (node.parentId !== null) {
                if (!parentChildMap[node.parentId]) {
                    parentChildMap[node.parentId] = [];
                }
                parentChildMap[node.parentId].push(node.id);
            }
        });
        console.log('Parent-child map:', parentChildMap);

        function getSelectedWithParents(selectedKeys) {
            console.log('Processing selected keys:', selectedKeys);
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

        console.log('Starting API fetch');
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerAyah/")
            .then(response => {
                console.log('API response received, status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Raw API data:', data);
                const dataArray = Array.isArray(data) ? data : Object.values(data);
                console.log('Processed data array:', dataArray);
                
                const processedData = dataArray.map(entry => ({
                    ...entry,
                    seqNo: Number(entry.seqNo),
                    surahNo: Number(entry.surahNo),
                    ayahNoWithinSurah: Number(entry.ayahNoWithinSurah),
                    schemesThatCount: entry.schemesThatCount.map(Number)
                }));
                console.log('Numerically processed data:', processedData);

                self.fullAyahArray(processedData);
                processedData.forEach(entry => {
                    entry.schemesThatCount.forEach(schemeId => {
                        self.schemeMap[schemeId] = self.getSchemeName(schemeId);
                    });
                });
                console.log('Scheme map:', self.schemeMap);

                const initialSelection = flattenedSchemes.map(item => item.id);
                console.log('Initial selection:', initialSelection);
                self.selected.add(initialSelection);
                self.filterData(getSelectedWithParents([...self.selected().values()]));
                self.isLoading(false);
            })
            .catch(error => {
                console.error("Error fetching data:", error);
                self.isLoading(false);
            });

        self.selectedChanged = function (event) {
            console.log('Selection changed event:', event.detail);
            let selectedKeysArray = [...event.detail.value.values()];
            console.log('Selected keys array:', selectedKeysArray);
            self.filterData(getSelectedWithParents(selectedKeysArray));
        };

        self.filterData = function (selectedKeys) {
            console.log('Filtering data with keys:', selectedKeys);
            let filteredData = self.fullAyahArray().map(entry => {
                let surahName = self.getSurahName(entry.surahNo);
                let row = {
                    seqNo: entry.seqNo,
                    surahNo: `${entry.surahNo} (${surahName})`,
                    ayahSerialNo: entry.ayahSerialNo,
                    ayahNoWithinSurah: entry.ayahNoWithinSurah,
                    ayahText: entry.ayah
                };
                selectedKeys.forEach(schemeId => {
                    let schemeName = self.getSchemeName(schemeId);
                    row[schemeName] = entry.schemesThatCount.includes(parseInt(schemeId)) ? "Counts" : "Doesn't Count";
                });
                return row;
            });
            console.log('Filtered table data:', filteredData);

            let orderedSelectedNodes = flattenedSchemes.filter(node => selectedKeys.includes(node.id));
            console.log('Ordered selected nodes:', orderedSelectedNodes);
            
            let columns = [
                { headerText: "Surah", field: "surahNo", sortable: "enabled" },
                { headerText: "Ayah No", field: "ayahNoWithinSurah", sortable: "enabled" },
                { headerText: "Ayah Text", field: "ayahText", headerClassName: "ayah-text-column", className: "right-align ayah-text-column" },
                { headerText: "Ayah Serial No", field: "ayahSerialNo", sortable: "enabled" }
            ];

            orderedSelectedNodes.forEach(node => {
                let schemeName = self.getSchemeName(node.id);
                columns.push({ headerText: schemeName, field: schemeName, sortable: "enabled", className: "schemeColumn" });
            });
            console.log('Generated columns:', columns);

            self.tableColumns(columns);
            self.ayahArray(filteredData);
            console.log('Setting ayahDataProvider with data:', filteredData);
            self.ayahDataProvider(new ArrayDataProvider(filteredData, { 
                keyAttributes: "seqNo",
                implicitSort: [{ attribute: "seqNo", direction: "ascending" }]
            }));
        };

        self.getSurahName = function (surahNo) {
            let surahNames = [
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
            return surahNames[surahNo - 1] || `Surah ${surahNo}`;
        };

        self.getSchemeName = function (schemeId) {
            let schemeMapping = {
                0: "الكل", 1: "المدنى الأول", 2: "المدني الثاني", 3: "المكي", 4: "الكوفي",
                5: "البصري", 6: "الدمشقي", 7: "الحمصي", 8: "المدنى الأول، يزيد بن القعقاع",
                9: "المدنى الأول، شيبة بن نصاح", 10: "المدنى الثاني، يزيد بن القعقاع",
                11: "المدنى الثاني، شيبة بن نصاح", 12: "المدنى الأول، شيبة بن نصاح، بعد (نذير) - الملك",
                13: "المدنى الأول، شيبة بن نصاح، بدون عد (نذير) - الملك", 14: "المكي، بلا خلف",
                15: "البصري، بلا خلف"
            };
            return schemeMapping[schemeId] || `Scheme ${schemeId}`;
        };
    }
    
    return AyahSchemesViewModel;
});