define([
  "knockout",
  "ojs/ojbootstrap",
  "ojs/ojarraydataprovider",
  "ojs/ojarraytreedataprovider",
  "ojs/ojknockout-keyset",
  "ojs/ojtreeview",
  "ojs/ojtable"
], function (ko, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider, KeySet) {

  function SurahSchemesViewModel() {
      let self = this;

      // Observables
      self.fullSurahArray = ko.observableArray([]);
      self.schemeMap = {}; // Stores schemeId -> schemeName
      self.surahArray = ko.observableArray([]);
      self.schemesDataProvider = ko.observable();
      self.tableColumns = ko.observableArray([]);
      self.isLoading = ko.observable(true);

      // Tree structure
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

      // Tree Data Provider
      self.treeDataProvider = new ArrayTreeDataProvider(treeDataStats, {
          keyAttributes: "id",
          childrenAttribute: "children"
      });

      // Track selected nodes
      self.selected = new KeySet.ObservableKeySet();

      // Fetch API Data
      fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerSurah/")
          .then(response => response.json())
          .then(data => {
              self.fullSurahArray(data);

              // Store scheme ID -> Name
              Object.values(data).flat().forEach(scheme => {
                  self.schemeMap[scheme.schemeId] = scheme.schemeName;
              });

              // Get all leaf nodes
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

              // Select all leaf nodes
              self.selected.add(leafNodeIds);

              // Initial table filtering
              self.filterData(leafNodeIds);

              self.isLoading(false);
          })
          .catch(error => {
              console.error("Error fetching surah scheme data:", error);
              self.isLoading(false);
          });

      // **Selection Change Handling**
      self.selectedChanged = function (event) {
          let selectedKeysArray = [...event.detail.value.values()];
          console.log("Selected IDs:", selectedKeysArray);
          self.filterData(selectedKeysArray);
      };

      // **Filtering Logic**
      self.filterData = function (selectedKeys) {
          let filteredData = Object.keys(self.fullSurahArray()).map(surahId => {
              let surahSchemes = self.fullSurahArray()[surahId].filter(scheme =>
                  selectedKeys.includes(scheme.schemeId.toString())
              );

              if (surahSchemes.length === 0) return null; // Skip surahs with no selected schemes

              let row = { surahId: `${surahId} (${self.schemeMap[surahId] || "Unknown"})` };

              surahSchemes.forEach(scheme => {
                  row[scheme.schemeName] = `${scheme.minCount}, ${scheme.maxCount}`;
              });

              return row;
          }).filter(row => row !== null);

          // **Generate Table Columns (Only Show Selected Schemes)**
          let selectedSchemeNames = selectedKeys.map(id => self.schemeMap[id]).filter(name => name);

          let columns = [{ headerText: "Surah", field: "surahId", sortable: "enabled" }];
          selectedSchemeNames.forEach(scheme => {
              columns.push({ headerText: scheme, field: scheme, sortable: "enabled" });
          });

          self.tableColumns(columns);
          self.surahArray(filteredData);
          self.schemesDataProvider(new ArrayDataProvider(self.surahArray, { keyAttributes: "surahId" }));
      };
  }

  return SurahSchemesViewModel;
});
