define([
  'knockout',
  'ojs/ojbootstrap',
  'ojs/ojarraydataprovider',
  'ojs/ojarraytreedataprovider',
  'ojs/ojknockout',
  'ojs/ojtreeview',
  'ojs/ojtable'
], function (ko, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider) {

  function SchemesSurahViewModel() {
    let self = this;

    self.surahArray = ko.observableArray([]);
    self.schemesDataProvider = ko.observable();
    self.tableColumns = ko.observableArray([]);

    // Hardcoded Surah Names Array (1-indexed)
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

    // Fetch Counting Scheme Data
    fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStatsPerSurah/")
      .then(response => response.json())
      .then(data => {
        let normalizedData = [];
        let uniqueSchemes = new Set();

        Object.keys(data).forEach(surahId => {
          let surahIndex = parseInt(surahId) - 1;
          let surahName = self.surahNames[surahIndex] || `Surah ${surahId}`;

          // Create row object with Surah ID and Name
          let rowData = { surahId: `${surahId} (${surahName})` };

          data[surahId].forEach(scheme => {
            let schemeName = scheme.schemeName;
            rowData[schemeName] = `${scheme.minCount}, ${scheme.maxCount}`;

            // Collect unique scheme names
            uniqueSchemes.add(schemeName);
          });

          normalizedData.push(rowData);
        });

        self.surahArray(normalizedData);
        self.schemesDataProvider(new ArrayDataProvider(self.surahArray, { keyAttributes: 'surahId' }));

        // Generate table columns dynamically
        let columns = [{ headerText: "Surah ID", field: "surahId", sortable: "enabled" }];
        uniqueSchemes.forEach(scheme => {
          columns.push({ headerText: scheme, field: scheme, sortable: "enabled" });
        });

        self.tableColumns(columns);
      })
      .catch(error => {
        console.error("Error fetching surah data:", error);
      });

    // Unique Tree Data for this module
    let dummyTreeDataSurahUnique = [
      {
        id: "U1",
        title: "Unique Surah Category 1",
        children: [
          { id: "U1-1", title: "Unique Surah Subcategory 1.1" },
          { id: "U1-2", title: "Unique Surah Subcategory 1.2" }
        ]
      },
      {
        id: "U2",
        title: "Unique Surah Category 2",
        children: [
          { id: "U2-1", title: "Unique Surah Subcategory 2.1" },
          { id: "U2-2", title: "Unique Surah Subcategory 2.2" }
        ]
      }
    ];

    self.treeDataProvider = new ArrayTreeDataProvider(dummyTreeDataSurahUnique, {
      keyAttributes: 'id',
      childrenAttribute: 'children'
    });
  }

  return SchemesSurahViewModel;
});
