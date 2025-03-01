define([
  'knockout',
  'ojs/ojbootstrap',
  'ojs/ojarraydataprovider',
  'ojs/ojarraytreedataprovider',
  'ojs/ojknockout',
  'ojs/ojtreeview',
  'ojs/ojtable'
], function (ko, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider) {

  function AyahSchemesViewModel() {
      let self = this;

      self.ayahArray = ko.observableArray([]);
      self.ayahDataProvider = ko.observable();
      self.isLoading = ko.observable(true);
      self.tableColumns = ko.observableArray([]);

      // Hardcoded Surah Names (1-indexed)
      self.surahNames = [
          "Al-Fatiha", "Al-Baqarah", "Aal-E-Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah",
          "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
          "Al-Anbiya", "Al-Hajj", "Al-Mu’minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
          "Luqman", "As-Sajda", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
          "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiya", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
          "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi’a", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahina",
          "As-Saff", "Al-Jumua", "Al-Munafiqoon", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqa", "Al-Maarij",
          "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddathir", "Al-Qiyama", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa",
          "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Burooj", "At-Tariq", "Al-A'la", "Al-Ghashiya", "Al-Fajr", "Al-Balad",
          "Ash-Shams", "Al-Lail", "Ad-Duhaa", "Ash-Sharh", "At-Tin", "Al-Alaq", "Al-Qadr", "Al-Bayyina", "Az-Zalzala", "Al-Adiyat",
          "Al-Qaria", "At-Takathur", "Al-Asr", "Al-Humaza", "Al-Fil", "Quraish", "Al-Ma'un", "Al-Kawthar", "Al-Kafiroon", "An-Nasr",
          "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
      ];

      // **Exact** scheme names as provided
      self.schemeMapping = {
          1: "المدنى الأول",
          2: "المدني الثاني",
          3: "المكي",
          4: "الكوفي",
          5: "البصري",
          6: "الدمشقي",
          7: "الحمصي",
          8: "المدنى الأول، يزيد بن القعقاع",
          9: "المدنى الأول، شيبة بن نصاح",
          10: "المدنى الثاني، يزيد بن القعقاع",
          11: "المدنى الثاني، شيبة بن نصاح",
          12: "المدنى الأول، شيبة بن نصاح، بعد (نذير) - الملك",
          13: "المدنى الأول، شيبة بن نصاح، بدون عد (نذير) - الملك",
          14: "المكي، بلا خلف",
          15: "البصري، بلا خلف"
      };

      // Fetch Ayah Data
      fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerAyah/")
          .then(response => response.json())
          .then(ayahData => {
              let formattedData = [];

              ayahData.forEach(entry => {
                  let surahIndex = parseInt(entry.surahNo) - 1;
                  let surahName = self.surahNames[surahIndex] || `Surah ${entry.surahNo}`;

                  let row = {
                      seqNo: entry.seqNo,
                      surahNo: `${entry.surahNo} (${surahName})`,  // Include Surah Name
                      ayahNoWithinSurah: entry.ayahNoWithinSurah,
                      ayahText: entry.ayah
                  };

                  // Track schemes that have khulf separately
                  let schemesWithKhulf = [];

                  // Categorize schemes correctly
                  Object.keys(self.schemeMapping).forEach(schemeId => {
                      schemeId = parseInt(schemeId);
                      let schemeName = self.schemeMapping[schemeId];

                      if (entry.schemesThatCount.includes(schemeId)) {
                          row[schemeName] = "Counts";
                      } else if (entry.schemesThatDoNotCount.includes(schemeId)) {
                          row[schemeName] = "Doesn't Count";
                      } else {
                          row[schemeName] = "-"; // Default empty value
                      }

                      // Collect schemes that have khulf
                      if (entry.schemesThatHaveKhulf.includes(schemeId)) {
                          schemesWithKhulf.push(schemeName);
                      }
                  });

                  // Add Schemes That Have Khulf column
                  row["Schemes That Have Khulf"] = schemesWithKhulf.join(", ") || "-";

                  formattedData.push(row);
              });

              self.ayahArray(formattedData);
              self.ayahDataProvider(new ArrayDataProvider(self.ayahArray, { keyAttributes: 'seqNo' }));
              self.isLoading(false);

              // Dynamically generate table columns
              let columns = [
                  { headerText: "Surah", field: "surahNo", sortable: "enabled" },
                  { headerText: "Ayah No", field: "ayahNoWithinSurah", sortable: "enabled" },
                  { headerText: "Ayah Text", field: "ayahText" },
                  { headerText: "Schemes That Have Khulf", field: "Schemes That Have Khulf", sortable: "enabled" }
              ];

              Object.values(self.schemeMapping).forEach(schemeName => {
                  columns.push({ headerText: schemeName, field: schemeName, sortable: "enabled" });
              });

              self.tableColumns(columns);
          })
          .catch(error => {
              console.error("Error fetching data:", error);
              self.isLoading(false);
          });

      // Dummy Tree Data for Sidebar
      let dummyTreeDataAyah = [
          { id: "AY1", title: "Ayah Category 1", children: [{ id: "AY1-1", title: "Ayah Subcategory 1.1" }] },
          { id: "AY2", title: "Ayah Category 2", children: [{ id: "AY2-1", title: "Ayah Subcategory 2.1" }] }
      ];

      self.treeDataProvider = new ArrayTreeDataProvider(dummyTreeDataAyah, {
          keyAttributes: 'id',
          childrenAttribute: 'children'
      });
  }

  return AyahSchemesViewModel;
});
