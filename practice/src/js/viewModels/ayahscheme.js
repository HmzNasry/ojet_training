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
  

        let treeDataStats = [
            {
                id: "0",
                title: "الكل",
                children: [
                    {
                        id: "1",
                        title: "المدنى الأول",
                        children: [
                            { id: "8", title: "المدنى الأول، يزيد بن القعقاع" },
                            {
                                id: "9",
                                title: "المدنى الأول، شيبة بن نصاح",
                                children: [
                                    { id: "12", title: "المدنى الأول، شيبة بن نصاح، بعد (نذير) - الملك" },
                                    { id: "13", title: "المدنى الأول، شيبة بن نصاح، بدون عد (نذير) - الملك" }
                                ]
                            }
                        ]
                    },
                    {
                        id: "2",
                        title: "المدني الثاني",
                        children: [
                            { id: "10", title: "المدنى الثاني، يزيد بن القعقاع" },
                            { id: "11", title: "المدنى الثاني، شيبة بن نصاح" }
                        ]
                    },
                    {
                        id: "3",
                        title: "المكي",
                        children: [{ id: "14", title: "المكي، بلا خلف" }]
                    },
                    { id: "4", title: "الكوفي" },
                    {
                        id: "5",
                        title: "البصري",
                        children: [{ id: "15", title: "البصري، بلا خلف" }]
                    },
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
  
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerAyah/")
            .then(response => response.json())
            .then(data => {
                self.fullAyahArray(data);
  
                Object.values(data).forEach(entry => {
                    entry.schemesThatCount.forEach(schemeId => {
                        self.schemeMap[schemeId] = self.getSchemeName(schemeId);
                    });
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
                console.error("Error fetching Ayah scheme data:", error);
                self.isLoading(false);
            });
  
        self.selectedChanged = function (event) {
            let selectedKeysArray = [...event.detail.value.values()];
            console.log("Selected Scheme IDs:", selectedKeysArray);
            self.filterData(selectedKeysArray);
        };
  
        self.filterData = function (selectedKeys) {
            let filteredData = self.fullAyahArray().map(entry => {
                let relevantSchemes = entry.schemesThatCount.filter(schemeId =>
                    selectedKeys.includes(schemeId.toString())
                );
  
                if (relevantSchemes.length === 0) return null;
  
                let surahName = self.getSurahName(entry.surahNo);
                let row = {
                    seqNo: entry.seqNo,
                    surahNo: `${entry.surahNo} (${surahName})`,
                    ayahNoWithinSurah: entry.ayahNoWithinSurah,
                    ayahText: entry.ayah
                };
  
                selectedKeys.forEach(schemeId => {
                  let schemeName = self.getSchemeName(schemeId);
                  if (entry.schemesThatCount.includes(parseInt(schemeId))) {
                      row[schemeName] = "Counts";
                  } else {
                      row[schemeName] = "Doesn't Count"; 
                  }
              });
              
                return row;
            }).filter(row => row !== null);
  
            let selectedSchemeNames = selectedKeys.map(id => self.getSchemeName(id)).filter(name => name);
  
            let columns = [
                { headerText: "Surah", field: "surahNo", sortable: "enabled" },
                { headerText: "Ayah No", field: "ayahNoWithinSurah", sortable: "enabled" },
                { headerText: "Ayah Text", field: "ayahText", headerClassName: "ayah-text-column", className: "right-align ayah-text-column"}
            ];
  
            selectedSchemeNames.forEach(scheme => {
                columns.push({ headerText: scheme, field: scheme, sortable: "enabled", className: "schemeColumn"});
            });
  
            self.tableColumns(columns);
            self.ayahArray(filteredData);
            self.ayahDataProvider(new ArrayDataProvider(self.ayahArray, { keyAttributes: "seqNo" }));
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
  

        self.exportOptions = [
            { label: "Export as JSON", value: "json" },
            { label: "Export as CSV", value: "csv" },
        ];
  

        self.exportTableData = function (event) {
            let selectedFormat = event.detail.value;
            let data = ko.toJS(self.ayahArray());
  
            switch (selectedFormat) {
                case "json":
                    exportJSON(data);
                    break;
                case "csv":
                    exportCSV(data);
                    break;
            }
        };
  
        function exportJSON(data) {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "ayah_schemes.json";
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
            link.download = "ayah_schemes.csv";
            link.click();
        }
  
    }
  
    return AyahSchemesViewModel;
  });
  