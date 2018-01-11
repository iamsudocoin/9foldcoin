class CollectibleAPI {
    constructor(from_address, contract_addr, abi) {
        if (from_address) {
            this.from = from_address;
            this.abi = abi;
            this.contract_addr = contract_addr;
            this.contract = new w.eth.Contract(this.abi, this.contract_addr, { from: this.from });
        }
    }

    getNumberOfCollectibles() {
        return this.contract.methods.getNumberOfCollectibles().call();
    }

    getCollectibleById(id) {
        return this.contract.methods.getCollectibleById(id).call()
    }

    getAllCollectibles() {
        var list = [];
        var that = this;

        return this.getNumberOfCollectibles()
        .then(n => {
            for (var i = 0; i < n; i++) {
                list.push(that.getCollectibleById(i));
            }

            return Promise.all(list);
        })
    }

    isValidCollectible(name) {
        return this.contract.methods.isValidCollectible(name).call();
    }

    bid(username, collectible, img_url, amount, unit, gas) {
        var m = this.contract.methods.bid(username, collectible, img_url)
        return this._send(m, amount, unit, gas);
    }


    // Manually sign transactions
    _send(method, value, unit = 'wei', gas) {
        if (! this.pk) {
            return new Promise((resolve, reject) => { reject("No private key. Won't send transaction...")}); 
        }

        console.log('value: ' + w.utils.toWei(value.toString(), unit));

        var tx = {
            gas: gas,
            to: this.contract.options.address,
            value: w.utils.toWei(value.toString(), unit),
            data: method.encodeABI(),
        }

        //console.log(tx);
        //console.log(this.pk);
        //console.log(this.contract.options);
        //console.log('---------------------------------------------------------------------------');

        return w.eth.accounts.signTransaction(tx, this.pk)
        .then(d => {
            return w.eth.sendSignedTransaction(d.rawTransaction)
        })
    }

    /*
        Only possible if you're the person who made the original contract.
    */
    createNewCollectible(name, init_amount, img_url, gas) {
        var m = this.contract.methods.createNewCollectible(name, init_amount, img_url)

        return this._send(m, 0, 'wei', gas)
    }

    getCollectibles() {
        var m = this.contract.methods.getCollectibles().call();
    }

    freezeUser(address, gas, freeze = true) {
        var m = this.contract.methods.freezeUser(address, freeze);
        return this._send(m, 0, 'wei', gas)
    }

    isFrozen(address) {
        return this.contract.methods.isFrozen(address).call();
    }

    storeKeyStore(username, keystore, gas) {
        if (username.length && keystore.length) {
            var m = this.contract.methods.storeKeyStore(username, keystore);
            return this._send(m, 0, 'wei', gas); 
        }
    }

    getKeyStore(username) {
        if (username.length)
            return this.contract.methods.getKeyStore(username).call();
    }


    getOwner(collectible) {
        return this.contract.methods.getOwner(collectible).call();
    }
}

module.exports = CollectibleAPI;
