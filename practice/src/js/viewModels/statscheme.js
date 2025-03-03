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

        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStats/")
            .then(response => response.json())
            .then(data => {
                self.fullSchemeArray(data);

                data.forEach(scheme => {
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

                let filteredData = data.filter(scheme =>
                    leafNodeIds.includes(scheme.schemeId.toString())
                ).map(scheme => {
                    const { minCount, maxCount, parentSchemeId, ...rest } = scheme;
                    return {
                        ...rest,
                        ayahCount: minCount,
                        parentSchemeId: parentSchemeId,
                        parentSchemeLabel: parentSchemeId !== null
                            ? `${self.schemeMap[parentSchemeId] || "N/A"}`
                            : "N/A"
                    };
                });

                self.schemeArray(filteredData);
                self.schemesDataProvider(new ArrayDataProvider(self.schemeArray, { keyAttributes: "schemeId" }));

                self.tableColumns([
                    { headerText: "Number of Ayahs", field: "ayahCount", sortable: "enabled", className: "centered" },
                    { headerText: "Counting Scheme", field: "schemeName", sortable: "enabled", className: "rtl" },
                    { headerText: "Parent Scheme", field: "parentSchemeLabel", sortable: "enabled", className: "rtl" }
                ]);

                self.isLoading(false);
            })
            .catch(error => {
                console.error("Error fetching scheme data:", error);
                self.isLoading(false);
            });

        self.selectedChanged = function (event) {
            let selectedKeysArray = [...event.detail.value.values()];

            console.log("Selected IDs:", selectedKeysArray);


            let filteredData = self.fullSchemeArray().filter(scheme =>
                selectedKeysArray.includes(scheme.schemeId.toString())
            ).map(scheme => {
                const { minCount, maxCount, parentSchemeId, ...rest } = scheme;
                return {
                    ...rest,
                    ayahCount: minCount, 
                    parentSchemeId: parentSchemeId, 
                    parentSchemeLabel: parentSchemeId !== null
                        ? `${self.schemeMap[parentSchemeId] || "N/A"}`
                        : "N/A"
                };
            });

            self.schemeArray(filteredData);
            self.schemesDataProvider(new ArrayDataProvider(self.schemeArray, { keyAttributes: "schemeId" }));
        };


        self.exportOptions = [
            { label: "Export as JSON", value: "json" },
            { label: "Export as CSV", value: "csv" }
        ];

        self.exportValue = ko.observable(null);

        self.exportTableData = function (event) {
            let selectedFormat = event.detail.value;
            let data = ko.toJS(self.schemeArray());
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
            link.download = "scheme_stats.json";
            link.click();
        }

        function exportCSV(data) {
            if (!data || data.length === 0) return;
            const csvOrder = ["schemeId", "schemeName", "ayahCount", "parentSchemeId", "parentSchemeName"];
            const csvMapping = {
                schemeId: "schemeId",
                schemeName: "schemeName",
                ayahCount: "parentSchemeId",  // Theres some problem forcing us to swap these
                parentSchemeId: "ayahCount", // ^
                parentSchemeName: "parentSchemeLabel"
            };
            const headers = csvOrder.join(",") + "\n";
            const rows = data.map(row =>
                csvOrder.map(key => `"${row[csvMapping[key]]}"`).join(",")
            ).join("\n");
            const csvContent = headers + rows;
            const blob = new Blob([csvContent], { type: "text/csv" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "scheme_stats.csv";
            link.click();
        }
        
    }

    return StatsSchemesViewModel;
});
