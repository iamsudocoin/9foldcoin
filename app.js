var config = require('./config.js');
var CollectibleAPI = require('./api.js');
var isurl = require('is-url');
var xss = require('xss');

w = config.web3;
globals = config.globals;

class App {
    constructor(api) {
        this.api = api;
    }

    // Loads all the collectibles from the blockchain into a menu to choose from
    load_collectibles_menu() {
        return this.api.getAllCollectibles()
        .then(d => {
            if (d.length > 0) {
                $('#collectible-dropdown').empty();
                for (var i in d) {
                    $('#collectible-dropdown').append('<a class="dropdown-item" href="#">' + d[i].collectible + '</a>');
                }
            } else {
                console.log("No collectibles available.");
            }
        })
    }

    get_bid_form_info() {
        return {
            collectible: $('#bid-form #collectible-name').val(),
            img_url: $('#bid-form input[name="img-url"]').val(),
            amount: $('#bid-form input[name="bid-amount"]').val(),
            username: $('#bid-form input[name="username"]').val(),
            pw: $('#bid-form input[name="pw"]').val(),
        }
    }

    // Submits a bid based on information from the DOM to the blockchain
    submit_bid() {
        var that = this;

        var bid = this.get_bid_form_info();

        //console.log(bid);

        if (bid.collectible && isurl(bid.img_url) && $.isNumeric(bid.amount) && bid.username && bid.pw) {
            return this.set_account_info_on_api(bid.username, bid.pw)
            .then(d => {
                if (d.ok) {
                    console.log(that.api.from + ' is placing bid....');

                    return w.eth.getBalance(that.api.from).then(d => {
                        console.log('Current balance: ' + d);

                        $('button[name="submit-bid"]').attr('disabled', true);

                        return that.api.bid(
                            bid.username,
                            bid.collectible,
                            bid.img_url,
                            bid.amount,
                            'ether',
                            90000*4
                        )
                    });
                } else {
                    console.log("Wrong username and pw?");
                }
            })
            .then(d => {
                console.log('bid occured:');
                console.log(d);
            })
        } else {
            console.log("Something went wrong with the bid");
        }

        return new Promise((resolve, reject) => { reject("Don't have all the bid info") })
    }

    create_account() {
        var data = {
            username: $('div#create-account-modal input[name="username"]').val(),
            pw: $('div#create-account-modal input[name="pw"]').val(),
            pk: $('div#create-account-modal input[name="pk"]').val(),
        };

        var account = w.eth.accounts.privateKeyToAccount(data.pk);
        var ks = w.eth.accounts.encrypt(account.privateKey, data.pw);
        this.api.pk = account.privateKey;


        console.log("Creating account...");
        //console.log(account);
        //console.log(data);

        return w.eth.getBalance(account.address).then(d => {
            //console.log("Balance: " + d);
            if (d && parseInt(d) > 0) {
                return this.api.storeKeyStore(data.username, JSON.stringify(ks), 90000*5)
            } else {
                return new Promise((resolve, reject) => { reject("doesn't have enough funds") })
            }
        })
    }

    get_account_info(username, pw) {
       return this.api.getKeyStore(username)
       .then(d => {
            if (d) {
                var ks = JSON.parse(d);
                try {
                    return w.eth.accounts.decrypt(ks, pw);
                } catch(e) {
                    return null;
                }
            }
       })
    }

    set_account_info_on_api(username, pw) {
        return this.get_account_info(username, pw).then(account => {

            if (account && account.address && account.privateKey) {
                this.api.from = account.address;
                this.api.pk = account.privateKey;

                return new Promise((resolve, reject) => { resolve({ok: true}) });
            } else {
                return new Promise((resolve, reject) => { reject({ok: false, 'reason': 'Invalid username/pw'}) });
            }
        });
    }

    check_image(img_src, good, bad) {
        var img = new Image();
        img.onload = good;
        img.onerror = bad;
        img.src = img_src;
    }



    load_collectibles() {
        var that = this;

        return this.api.getAllCollectibles()
        .then(d => {
            if (d) {
                var cl = $('#cards .card-body');
                var html = cl.has('.card').html();
                cl.empty();

                for (var i in d) {
                    if (! d[i].username) { d[i].username = "Nobody" }
                    //console.log(d[i]);
                    var obj = $($.parseHTML(html));
                    obj.find('.card-title').text(xss(d[i].collectible));

                    obj.find('p.card-text').text('Owner: ' + xss(d[i].username) + ' @ ' + parseFloat(w.utils.fromWei(xss(d[i].amount), 'ether')) + ' ether');

                    if (d[i].img_url) {
                        that.check_image(
                            d[i].img_url,
                            function(obj) {
                                return function() { // good
                                    obj.find('img.card-img-top').attr('src', xss(this.src));
                                    cl.append(obj.get(1).outerHTML);

                                }
                            }(obj),
                            function(obj) {
                                return function() { // good
                                    console.log("Error find image on the web");
                                    cl.append(obj.get(1).outerHTML);
                                }
                            }(obj)
                        );


                    } else {
                        cl.append(obj.get(1).outerHTML);
                    }
                }
            }
        })
    }

    clear_create_account_form() {
        $('div#create-account-modal input[name="username"]').val('');
        $('div#create-account-modal input[name="pw"]').val('');
        $('div#create-account-modal input[name="address"]').val('');
        $('div#create-account-modal input[name="pk"]').val('');
    }

    // Sets up all the various handlers for the application in one place
    create_handlers() {
        var that = this;

        // Add handlers
        $('#collectible-dropdown a.dropdown-item').click(function() {
            $('#collectible-dropdown a.dropdown-item').removeClass('active');
            $(this).addClass('active');

            $('#collectible-choice').text('Choose a collectible: ' + $(this).text());
            $('#collectible-name').val($(this).text());

        })

        // Handler for submitting a bid
        $('[name="submit-bid"]').click(function() {
            console.log("Submitting bid...");

            var done = function() {
                $('button[name="submit-bid"]').attr('disabled', false);
                $('#bid-form .spinner').hide();
                return that.load_collectibles();
            }

            $('#bid-form .spinner').show();

            that.submit_bid()
            .then(d => {
                console.log("Done bidding!");
                return done();
            })
            .catch((d)=> {
                console.log(d);

                if (d.reason && d.reason.includes('Invalid username/pw')) {
                    $('[name="username"]').addClass('is-invalid').removeClass('is-valid');
                    $('[name="pw"]').addClass('is-invalid').removeClass('is-valid');
                }

                return done();
            })
        });

        // Error handling on major form elements
        var form = {
            collectible: $('#bid-form #collectible-name'),
            img_url: $('#bid-form input[name="img-url"]'),
            amount: $('#bid-form input[name="bid-amount"]'),
            username: $('#bid-form input[name="username"]'),
            pw: $('#bid-form input[name="pw"]'),
        }

        form.username.blur(e => {
            if (! $(e.target).val().trim()) { $(e.target).addClass('is-invalid').removeClass('is-valid'); } else { $(e.target).addClass('is-valid').removeClass('is-invalid') } 
        })
        form.img_url.blur(e => {
            if (! isurl($(e.target).val().trim())) { $(e.target).addClass('is-invalid').removeClass('is-valid'); } else { $(e.target).addClass('is-valid').removeClass('is-invalid') } 
        })
        form.amount.blur(e => {
            if (! $.isNumeric($(e.target).val().trim())) { $(e.target).addClass('is-invalid').removeClass('is-valid'); } else { $(e.target).addClass('is-valid').removeClass('is-invalid') } 
        })
        form.pw.blur(e => {
            if (! $(e.target).val().trim()) { $(e.target).addClass('is-invalid').removeClass('is-valid'); } else { $(e.target).addClass('is-valid').removeClass('is-invalid') } 
        })


        // Handler for taking care of creating an account
        $('div#create-account-modal button[name="create-account"]').click(function() {
            console.log("Creating account...");
            $('#create-account-modal .spinner').show();
            $('#create-account-modal button[name="create-account"]').attr('disabled', true);

            that.create_account()
            .then(d => {
                $('div#create-account-modal').modal('hide');
                $('#create-account-modal .spinner').hide();
                $('input[name="username"]').val($('div#create-account-modal input[name="username"]').val());

                // Clear everything
                that.clear_create_account_form();
            })
            .catch((reason) => {
                //console.log(reason);
                if (reason.toString().includes("doesn't have enough funds")) {
                    //alert("You need to have a little bit of ethereum to create an account.");

                    $('#create-account-modal .spinner').hide();
                    $('#create-account-modal input[name="address"]').popover('show');
                }
            })

        });

        // Generate a public/private key pair for account creation
        $('#create-account-modal').on('show.bs.modal', function() {
            var account = w.eth.accounts.create();

            $('div#create-account-modal input[name="address"]').val(account.address);
            $('div#create-account-modal input[name="pk"]').val(account.privateKey);

            /*
             *  For the sake of better UX and longer tx times, let's just enable the Create button
             *  when we're positive there's a balance available so that people don't waste their
             *  social media post and eth allocation.
             */
            $('#create-account-modal button[name="create-account"]').attr('disabled', true);
            (function poll() {
                //console.log("Running poll...");
                setTimeout(function() {
                    return w.eth.getBalance($('div#create-account-modal input[name="address"]').val()).then(d => {
                        if (d && parseInt(d) > 0) {
                            $('#create-account-modal button[name="create-account"]').attr('disabled', false);
                        } else {
                            if ($('#create-account-modal').is(':visible'))
                                poll();
                        }
                    });
                }, 3000);
            })();

        });

        // Show the balance of their account if we have their username//pw
        $('input[name="pw"]').blur(function() {
            var data = {
                username: $('[name="username"]').val(),
                pw: $('[name="pw"]').val(),
            }

            if (data.username && data.pw) {
                return that.get_account_info(data.username, data.pw).then(account => {
                    if (account) {
                        return w.eth.getBalance(account.address).then(balance => {
                            var ether = w.utils.fromWei(balance, 'ether');
                            $('#balance').text(ether + ' ether');
                            $('button[name="submit-bid"]').attr('disabled', false);
                        });
                    } else {
                        $('#balance').text('-');
                        console.log("Couldn't get account balance. Possibly wrong username and password.");
                        $('button[name="submit-bid"]').attr('disabled', true);
                    }
                });
            }
        });

        // Upon the create account modal hiding
        $('#create-account-modal').on('hide.bs.modal', function(e) {
            // Hide the popover error for lack of ethereum balance
            $('#create-account-modal input[name="address"]').popover('hide');
        });
    }
}

function main(from) {
    var api = new CollectibleAPI(from, globals.contract_addr, config.abi);
    var app = new App(api);

    return app.load_collectibles_menu()
    .then(function() {
        app.create_handlers();
        return app.load_collectibles();
    })
}

main(globals.from)
