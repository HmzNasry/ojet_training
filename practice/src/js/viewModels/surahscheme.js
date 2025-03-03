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
  
    function SurahSchemesViewModel() {
        let self = this;
  
        self.fullSurahArray = ko.observableArray([]);
        self.schemeMap = {};
        self.surahArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);
  
        self.exportValue = ko.observable(null);
        self.exportOptions = [
            { label: "Export as JSON", value: "json" },
            { label: "Export as CSV", value: "csv" }
        ];
        self.exportTableData = function (event) {
            let selectedFormat = event.detail.value;
            let data = ko.toJS(self.surahArray()); 
            switch (selectedFormat) {
                case "json":
                    exportJSON(data);
                    break;
                case "csv":
                    exportCSV(data);
                    break;
            }
            self.exportValue(null);
        };
  
        function exportJSON(data) {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "surah_schemes.json";
            link.click();
        }
  
        function exportCSV(data) {
            if (!data || data.length === 0) return;
            const headers = Object.keys(data[0]).join(",") + "\n";
            const rows = data.map(row =>
                Object.values(row).map(value => `"${value}"`).join(",")
            ).join("\n");
            const csvContent = headers + rows;
            const blob = new Blob([csvContent], { type: "text/csv" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "surah_schemes.csv";
            link.click();
        }
  
        let treeDataStats = [
            {
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
            }
        ];
  
        self.treeDataProvider = new ArrayTreeDataProvider(treeDataStats, {
            keyAttributes: "id",
            childrenAttribute: "children"
        });
  
        self.selected = new KeySet.ObservableKeySet();
  
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerSurah/")
            .then(response => response.json())
            .then(data => {
                self.fullSurahArray(data);
  
                Object.values(data).flat().forEach(scheme => {
                    self.schemeMap[scheme.schemeId] = scheme.schemeName;
                });
  
                let leafNodeIds = [];
                function findLeafNodes(nodes) {
                    nodes.forEach(node => {
                        if (node.children) {
                            findLeafNodes(node.children);
                        } else {
                            leafNodeIds.push(node.id);
                        }
                    });
                }
                findLeafNodes(treeDataStats[0].children);
  
                self.selected.add(leafNodeIds);
                self.filterData(leafNodeIds);
                self.isLoading(false);
            })
            .catch(error => {
                console.error("Error fetching surah scheme data:", error);
                self.isLoading(false);
            });
  
        self.selectedChanged = function (event) {
            let selectedKeysArray = [...event.detail.value.values()];
            console.log("Selected IDs:", selectedKeysArray);
            self.filterData(selectedKeysArray);
        };
  
        self.filterData = function (selectedKeys) {
            let filteredData = Object.keys(self.fullSurahArray()).map(surahId => {
                let surahSchemes = self.fullSurahArray()[surahId].filter(scheme =>
                    selectedKeys.includes(scheme.schemeId.toString())
                );
  
                if (surahSchemes.length === 0) return null; 
  
                let row = { surahId: `${surahId} (${self.getSurahName(surahId)})` };
  
                surahSchemes.forEach(scheme => {
                    row[scheme.schemeName] = scheme.minCount !== scheme.maxCount
                        ? `${scheme.minCount}, ${scheme.maxCount}`
                        : scheme.maxCount;
                });
  
                return row;
            }).filter(row => row !== null);
  
            let selectedSchemeNames = selectedKeys.map(id => self.schemeMap[id]).filter(name => name);
  
            let columns = [{ headerText: "Surah", field: "surahId", sortable: "enabled" }];
            selectedSchemeNames.forEach(scheme => {
                columns.push({ headerText: scheme, field: scheme, sortable: "enabled" });
            });
  
            self.tableColumns(columns);
            self.surahArray(filteredData);
            self.schemesDataProvider(new ArrayDataProvider(self.surahArray, { keyAttributes: "surahId" }));
        };
  
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
    }
  
    return SurahSchemesViewModel;
  });
  