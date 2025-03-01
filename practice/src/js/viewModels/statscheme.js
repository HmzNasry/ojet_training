define([
    "knockout",
    "ojs/ojbootstrap",
    "ojs/ojarraydataprovider",
    "ojs/ojarraytreedataprovider",
    "ojs/ojknockout-keyset",
    "ojs/ojtreeview",
    "ojs/ojtable"
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

                // Filter data for initial table display
                let filteredData = data.filter(scheme =>
                    leafNodeIds.includes(scheme.schemeId.toString())
                ).map(scheme => ({
                    ...scheme,
                    parentSchemeLabel: scheme.parentSchemeId !== null
                        ? `${scheme.parentSchemeId} (${self.schemeMap[scheme.parentSchemeId] || "N/A"})`
                        : "N/A"
                }));

                self.schemeArray(filteredData);
                self.schemesDataProvider(new ArrayDataProvider(self.schemeArray, { keyAttributes: "schemeId" }));

                // Define table columns dynamically
                self.tableColumns([
                    { headerText: "Scheme Name", field: "schemeName", sortable: "enabled" },
                    { headerText: "Min Ayahs", field: "minCount", sortable: "enabled" },
                    { headerText: "Max Ayahs", field: "maxCount", sortable: "enabled" },
                    { headerText: "Parent Scheme ID", field: "parentSchemeLabel", sortable: "enabled" }
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

            // Filter table data based on selected tree view items
            let filteredData = self.fullSchemeArray().filter(scheme =>
                selectedKeysArray.includes(scheme.schemeId.toString())
            ).map(scheme => ({
                ...scheme,
                parentSchemeLabel: scheme.parentSchemeId !== null
                    ? `${scheme.parentSchemeId} (${self.schemeMap[scheme.parentSchemeId] || "N/A"})`
                    : "N/A"
            }));

            self.schemeArray(filteredData);
            self.schemesDataProvider(new ArrayDataProvider(self.schemeArray, { keyAttributes: "schemeId" }));
        };
    }

    return StatsSchemesViewModel;
});
