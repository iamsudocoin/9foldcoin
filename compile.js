var solc = require('solc');
var fs = require('fs');

var inputs = {
    'auction.sol': fs.readFileSync('./contracts/auction.sol').toString(),
};

function findImports(path) {
    return {
        'contents': fs.readFileSync('./contracts/' + path).toString()
    }
}

console.log("Compiling contract...");
var compiledCode = solc.compile({sources: inputs}, 1, findImports)


fs.writeFile('./static/compiled.json', JSON.stringify(compiledCode), function(err) {
    if (err) throw err;
    console.log('Compiled & saved');
});
