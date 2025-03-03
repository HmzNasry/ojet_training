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

        // Observables for data management
        self.fullSchemeArray = ko.observableArray([]);
        self.schemeMap = {}; // Maps scheme ID to scheme name
        self.schemeArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true);

        // Tree structure definition
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

        // Initialize tree data provider
        self.treeDataProvider = new ArrayTreeDataProvider(treeDataStats, {
            keyAttributes: "id",
            childrenAttribute: "children"
        });

        // Track selected tree nodes
        self.selected = new KeySet.ObservableKeySet();

        // Fetch API data
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStats/")
            .then(response => response.json())
            .then(data => {
                self.fullSchemeArray(data);

                // Build mapping of scheme ID to name
                data.forEach(scheme => {
                    self.schemeMap[scheme.schemeId] = scheme.schemeName;
                });

                // Identify all leaf nodes
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

                // Pre-select all leaf nodes in the tree view
                self.selected.add(leafNodeIds);

                // Filter data for initial table display and remove minCount/maxCount
                let filteredData = data.filter(scheme =>
                    leafNodeIds.includes(scheme.schemeId.toString())
                ).map(scheme => {
                    const { minCount, maxCount, ...rest } = scheme;
                    return {
                        ...rest,
                        parentSchemeLabel: scheme.parentSchemeId !== null
                            ? `${scheme.parentSchemeId} (${self.schemeMap[scheme.parentSchemeId] || "N/A"})`
                            : "N/A",
                        ayahCount: minCount
                    };
                });

                self.schemeArray(filteredData);
                self.schemesDataProvider(new ArrayDataProvider(self.schemeArray, { keyAttributes: "schemeId" }));

                // Define table columns dynamically using "ayahCount"
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

        // Handle selection changes
        self.selectedChanged = function (event) {
            let selectedKeysArray = [...event.detail.value.values()];

            console.log("Selected IDs:", selectedKeysArray);

            // Filter table data based on selected tree view items and remove minCount/maxCount
            let filteredData = self.fullSchemeArray().filter(scheme =>
                selectedKeysArray.includes(scheme.schemeId.toString())
            ).map(scheme => {
                const { minCount, maxCount, ...rest } = scheme;
                return {
                    ...rest,
                    parentSchemeLabel: scheme.parentSchemeId !== null
                        ? `${self.schemeMap[scheme.parentSchemeId] || "N/A"}`
                        : "N/A",
                    ayahCount: minCount
                };
            });

            self.schemeArray(filteredData);
            self.schemesDataProvider(new ArrayDataProvider(self.schemeArray, { keyAttributes: "schemeId" }));
        };

        // **Export Functionality Integration**
        // Define export options for dropdown
        self.exportOptions = [
            { label: "Export as JSON", value: "json" },
            { label: "Export as CSV", value: "csv" },
        ];

        // Define export value observable
        self.exportValue = ko.observable(null);

        // Function to handle export selection
        self.exportTableData = function (event) {
            let selectedFormat = event.detail.value;
            let data = ko.toJS(self.schemeArray()); // Get filtered table data (which now includes ayahCount only)
            switch (selectedFormat) {
                case "json":
                    exportJSON(data);
                    break;
                case "csv":
                    exportCSV(data);
                    break;
            }
            // Reset export value so dropdown always displays "Export Data"
            self.exportValue(null);
        };

        // **Export Functions**
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
            const headers = Object.keys(data[0]).join(",") + "\n";
            const rows = data.map(row =>
                Object.values(row).map(value => `"${value}"`).join(",")
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
