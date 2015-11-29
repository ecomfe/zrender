var requirejs = require('requirejs');

requirejs(['../src/core/LRU'], function (LRU) {

    var lru = new LRU(5);

    for (var i = 0; i < 5; i++) {
        lru.put(i, 'val' + i);
    }
    dump();

    get(3);
    get(4);
    get(0);
    get(1);
    dump();

    function get(idx) {
        console.log('-----get' + idx +'----');
        lru.get(idx);
    }

    for (var i = 5; i < 10; i++) {
        console.log('-----put' + i +'----');
        lru.put(i, 'val' + i);
    }
    dump();

    function dump () {
        var entry = lru._list.head;
        while (entry) {
            console.log(entry.value);
            entry = entry.next;
        }
    }
});