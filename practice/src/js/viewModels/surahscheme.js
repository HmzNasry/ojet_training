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
  
      // Export configuration (JSON only)
      self.exportValue = ko.observable(null);
      self.exportOptions = [{ label: "Export as JSON", value: "json" }];
      self.exportTableData = function (event) {
        let data = ko.toJS(self.surahArray());
        exportJSON(data);
        self.exportValue(null);
      };
      function exportJSON(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "surah_schemes.json";
        link.click();
      }
  
      // Tree structure definition
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
  
      // Flatten the tree and build a parent–child map
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
      let parentChildMap = {};
      flattenedSchemes.forEach(node => {
        if (node.parentId !== null) {
          if (!parentChildMap[node.parentId]) {
            parentChildMap[node.parentId] = [];
          }
          parentChildMap[node.parentId].push(node.id);
        }
      });
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
  
      // Fetch API data and build schemeMap
      fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerSurah/")
        .then(response => response.json())
        .then(data => {
          self.fullSurahArray(data);
          Object.values(data).flat().forEach(scheme => {
            self.schemeMap[scheme.schemeId] = scheme.schemeName;
          });
          self.selected.add(flattenedSchemes.map(item => item.id));
          self.filterData(getSelectedWithParents([...self.selected().values()]));
          self.isLoading(false);
        })
        .catch(error => {
          console.error("Error fetching surah scheme data:", error);
          self.isLoading(false);
        });
  
      self.selectedChanged = function (event) {
        let selectedKeysArray = [...event.detail.value.values()];
        self.filterData(getSelectedWithParents(selectedKeysArray));
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
              ? `${scheme.minCount} - ${scheme.maxCount}`
              : scheme.maxCount;
          });
          return row;
        }).filter(row => row !== null);
        let orderedSelectedNodes = flattenedSchemes.filter(node => selectedKeys.includes(node.id));
        let columns = [{ headerText: "Surah", field: "surahId", sortable: "enabled" }];
        orderedSelectedNodes.forEach(node => {
          let schemeName = self.schemeMap[node.id];
          if (schemeName) {
            columns.push({ headerText: schemeName, field: schemeName, sortable: "enabled" });
          }
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
    
    return SurahSchemesViewModel;
  });
  