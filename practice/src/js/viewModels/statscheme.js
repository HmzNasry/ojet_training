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

        // Flatten tree using DFS while tracking parent-child relationships
        function flattenTreeDFS(node, parentId = null, parentTitle = null) {
            let result = [];
            let entry = { id: node.id, title: node.title, parentId: parentId, parentTitle: parentTitle };

            result.push(entry);

            if (node.children) {
                node.children.forEach(child => {
                    result = result.concat(flattenTreeDFS(child, node.id, node.title));
                });
            }

            return result;
        }

        let flattenedSchemes = flattenTreeDFS(treeDataStats[0]);
        self.selected.add(flattenedSchemes.map(item => item.id));

        // Create a parent-child mapping to propagate selections correctly
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

            // Ensure that if a child is selected, the parent is also included
            selectedKeys.forEach(key => {
                let parent = flattenedSchemes.find(node => node.id === key)?.parentId;
                while (parent !== null) {
                    allSelected.add(parent);
                    parent = flattenedSchemes.find(node => node.id === parent)?.parentId || null;
                }
            });

            // Ensure that if a parent is selected, all its children are also selected
            selectedKeys.forEach(key => {
                if (parentChildMap[key]) {
                    parentChildMap[key].forEach(childId => allSelected.add(childId));
                }
            });

            return Array.from(allSelected);
        }

        function updateTableData() {
            let selectedKeysArray = getSelectedWithParents([...self.selected().values()]);

            if (selectedKeysArray.length === 0) {
                self.schemeArray([]);
                self.tableColumns([]);
                self.schemesDataProvider(new ArrayDataProvider([], { keyAttributes: "dummyKey" }));
                return;
            }

            let selectedSchemes = flattenedSchemes.filter(node => selectedKeysArray.includes(node.id));
            let singleRow = {};

            selectedSchemes.forEach(node => {
                let schemeData = self.fullSchemeArray().find(s => s.schemeId.toString() === node.id);
                if (schemeData) {
                    if (schemeData.minCount === schemeData.maxCount) {
                        singleRow[node.title] = schemeData.minCount;
                    } else {
                        singleRow[node.title] = `${schemeData.minCount} - ${schemeData.maxCount}`;
                    }
                } else {
                    singleRow[node.title] = "N/A";
                }
            });

            self.schemeArray([singleRow]);
            self.schemesDataProvider(new ArrayDataProvider(self.schemeArray, { keyAttributes: "dummyKey" }));

            let columns = selectedSchemes.map(node => ({
                headerText: node.title,
                field: node.title,
                sortable: "enabled",
                className: "schemeColumn",
            }));

            self.tableColumns(columns);
        }

        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStats/")
            .then(response => response.json())
            .then(data => {
                self.fullSchemeArray(data);
                data.forEach(scheme => {
                    self.schemeMap[scheme.schemeId] = scheme.schemeName;
                });

                updateTableData();
                self.isLoading(false);
            })
            .catch(error => {
                console.error("Error fetching scheme data:", error);
                self.isLoading(false);
            });

        self.selectedChanged = function (event) {
            let selectedKeysArray = [...event.detail.value.values()];
            console.log("Selected IDs:", selectedKeysArray);
            updateTableData();
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
