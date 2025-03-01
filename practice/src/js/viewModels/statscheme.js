define([
    'knockout',
    'ojs/ojbootstrap',
    'ojs/ojarraydataprovider',
    'ojs/ojarraytreedataprovider',
    'ojs/ojknockout',
    'ojs/ojtreeview',
    'ojs/ojtable'
], function (ko, Bootstrap, ArrayDataProvider, ArrayTreeDataProvider) {

    function StatsSchemesViewModel() {
        let self = this;

        self.schemeArray = ko.observableArray([]);
        self.schemesDataProvider = ko.observable();

        fetch("https://api.hawsabah.org/QRDBAPI/GetCountingSchemeStats/")
            .then(response => response.json())
            .then(data => {
                self.schemeArray(data);
                self.schemesDataProvider(new ArrayDataProvider(self.schemeArray, { keyAttributes: 'schemeId' }));
            })
            .catch(error => {
                console.error("Error fetching scheme data:", error);
            });

        // Unique Tree View Data
        let dummyTreeDataStats = [
            { id: "ST1", title: "Stats Category 1", children: [{ id: "ST1-1", title: "Stats Subcategory 1.1" }] },
            { id: "ST2", title: "Stats Category 2", children: [{ id: "ST2-1", title: "Stats Subcategory 2.1" }] }
        ];

        self.treeDataProvider = new ArrayTreeDataProvider(dummyTreeDataStats, {
            keyAttributes: 'id',
            childrenAttribute: 'children'
        });
    }

    return StatsSchemesViewModel;
});
