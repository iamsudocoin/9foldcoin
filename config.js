var fs = require('fs');
var web3 = require('web3');
var command_line = require('command-line-args');

var options_def = [
    {name: 'deploy', alias: 'd', type: Boolean},
    {name: 'address'},
    {name: 'test', type: Boolean},
    {name: 'contract'},
    {name: 'pk'}, // Private key
    {name: 'send-only', type: Boolean},
    {name: 'to'},
    {name: 'value'},
    {name: 'prod', type: Boolean} // designate code to be in test vs. production
]

var options = command_line(options_def);

var PRODUCTION_HOST = 'github.io'; // This is how the app knows you're in productio
//var PRODUCTION_HOST = ''; // Force development environment to use production globals (shouldn't really do this)

// We're in a live document in the browser vs. command line via node
if (typeof(document) != 'undefined') {
    if (document && document.location) {
        var l = document.location;
        if (l.host.includes(PRODUCTION_HOST))
            options.prod = true;
        else
            options.prod = false;
    }
}

// Compile and get the contract interface ready
compiled_code =  JSON.parse(fs.readFileSync('./static/compiled.json').toString());
contract_abi = JSON.parse(compiled_code.contracts['auction.sol:NineFoldAuction'].interface);
bytecode = compiled_code.contracts['auction.sol:NineFoldAuction'].bytecode;

// Setup globals for all the APIs that the app will use
var globals = {
    contract_addr: "0x8CdaF0CD259887258Bc13a92C0a6dA92698644C0",
    from: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
    initial_collectibles: ['sudo', 'tonton', 'oksami', 'sem', 'eden',],
};

var web3_provider = 'http://localhost:7545';

// Replace defaults with live net addresses, APIs, etc.
if (options.prod) {
    console.log("Production environment enabled");
    web3_provider = 'https://rinkeby.infura.io/AkYutwj8wHOBtpj8Y3SD';
    globals.contract_addr = '0x32034016fE043481Fcf28Fd72272344CDDcA90cE';
    globals.from = '0x235469b87ED389Df6f29eef93B1Cd47974e829f9';
} else {
    console.log("Local dev environment enabled");
}

// Get web3 ready to go
var w3 = new web3();

w3.setProvider(new web3.providers.HttpProvider(web3_provider));
w3.eth.setProvider(new web3.providers.HttpProvider(web3_provider));

// Export to app
exports.web3 = w3;
exports.globals = globals;
exports.bytecode = bytecode;
exports.abi = contract_abi;
exports.command_line_options = options;
