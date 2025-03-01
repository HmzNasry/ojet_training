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

        // **Full API Data**
        self.fullSchemeArray = ko.observableArray([]);
        self.schemeMap = {}; // Store ID -> Name mapping
        self.schemeArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();
        self.tableColumns = ko.observableArray([]);
        self.isLoading = ko.observable(true); // Fixed the typo

        // **Tree Data Structure**
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
                        children: [
                            { id: "14", title: "المكي، بلا خلف" }
                        ]
                    },
                    { id: "4", title: "الكوفي" },
                    {
                        id: "5",
                        title: "البصري",
                        children: [
                            { id: "15", title: "البصري، بلا خلف" }
                        ]
                    },
                    { id: "6", title: "الدمشقي" },
                    { id: "7", title: "الحمصي" }
                ]
            }
        ];

        // **Tree Data Provider**
        self.treeDataProvider = new ArrayTreeDataProvider(treeDataStats, {
            keyAttributes: "id",
            childrenAttribute: "children"
        });

        // **Track Selected Tree Nodes**
        self.selected = new KeySet.ObservableKeySet();

        // **Fetch API Data**
        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStats/")
            .then(response => response.json())
            .then(data => {
                self.fullSchemeArray(data);

                // **Build ID-to-Name Map for Parent Lookups**
                data.forEach(scheme => {
                    self.schemeMap[scheme.schemeId] = scheme.schemeName;
                });

                // **Find all leaf nodes from tree structure**
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

                // **Select All Leaf Nodes in Tree View**
                self.selected.add(leafNodeIds);

                // **Initially, Filter Table to Show All Leaf Nodes**
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

                // **Dynamically Generate Table Columns**
                let columns = [
                    { headerText: "Scheme Name", field: "schemeName", sortable: "enabled" },
                    { headerText: "Min Ayahs", field: "minCount", sortable: "enabled" },
                    { headerText: "Max Ayahs", field: "maxCount", sortable: "enabled" },
                    { headerText: "Parent Scheme ID", field: "parentSchemeLabel", sortable: "enabled" }
                ];

                self.tableColumns(columns);

                self.isLoading(false); // ✅ Mark loading as complete
            })
            .catch(error => {
                console.error("Error fetching scheme data:", error);
                self.isLoading(false); // ✅ Ensure loading state is updated even on failure
            });

        // **Selection Change Handler**
        self.selectedChanged = function (event) {
            let selectedKeys = event.detail.value.values();
            let selectedKeysArray = [...selectedKeys]; // Convert Set to Array

            console.log("Selected IDs:", selectedKeysArray);

            // **Filter table data based on selected leaves**
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
