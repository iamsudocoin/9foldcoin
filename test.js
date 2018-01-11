var config = require('./config.js');
var CollectibleAPI = require('./api.js');

w = config.web3;
globals = config.globals;

function deployContract(address) {

    var from = address;

    bytecode = config.bytecode;
    contract = null;
    deploy_contract = null;
    d = null;

    return w.eth.getBalance(from).then(d => {
        console.log("Balance: " + d);
        if (parseInt(d) > 0) {
            var contract = new w.eth.Contract(config.abi, null, {'from': from, 'data': bytecode, 'gasPrice': 20000000000, 'gas': 90000 * 50})
            return _send(contract, 0, 'wei', 3294521);
        } else {
            console.log("Cannot create contract due to the sender's acount being 0. Are you using the right provider?");
            console.log(w.eth.currentProvider); // In case you're using the wrong provider
        }
    })
}


// Manually sign transactions
function _send(method, value, unit = 'wei', gas) {
    if (! globals.pk) {
        return new Promise((resolve, reject) => { reject("No private key. Won't send transaction...")});
    }

    console.log('value: ' + w.utils.toWei(value.toString(), unit));

    var tx = {
        gas: gas,
        //to: this.contract.options.address,
        value: w.utils.toWei(value.toString(), unit),
        data: '0x' + method.options.data,
    }

    //console.log(tx);
    //console.log(globals.pk);
    //console.log(this.contract.options);
    //console.log('---------------------------------------------------------------------------');

    return w.eth.accounts.signTransaction(tx, globals.pk)
    .then(d => {
        return w.eth.sendSignedTransaction(d.rawTransaction)
    })
}

var options = config.command_line_options;

// Deploy contract
if (options.deploy) {
    if (options.pk) {
        globals.pk = options.pk;
        var account = w.eth.accounts.privateKeyToAccount(globals.pk);
        globals.from = account.address;

        console.log(globals);

        console.log("Deploying contract...");
        deployContract(globals.from).then(d => {
            console.log(d);
            console.log('Contract address: ' + d.contractAddress);
            globals.contract_addr = d.contractAddress;

            // Create collectibles
            var api = new CollectibleAPI(globals.from, globals.contract_addr, config.abi);
            api.pk = globals.pk;

            globals.initial_collectibles.reduce(function(p, item) {
                return p.then(function() {
                    console.log("Creating collectible: " + item);
                    return api.createNewCollectible(item, 0, '', 90000*2).then(console.log);
                });

            }, Promise.resolve().then(d => {
            })).then(console.log);
        });
    } else {
        console.log("Need your private-key");
    }
}

// Send monies
if (options['send-only'] && options.address && options.to) {
    w.eth.sendTransaction({from: options.address, to: options.to, value: w.utils.toWei(options.value, 'ether'), gas: 90000}).then(console.log);
}
