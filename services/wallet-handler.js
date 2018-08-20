const commonFile = require('../global-files/common-file.js')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const config = require('../config/config')
const async = require('async')
const IOTA = require('iota.lib.js');
const remoteCurl = require('@iota/curl-remote')
let serverKey = process.env.serverKey
const iota = new IOTA({ "provider": "http://iotahosting.org:14265" });  //https://nodes.testnet.iota.org:443
// remoteCurl(iota, `https://powbox.testnet.iota.org`, 100)

let temp,

    getIntTkn = (serverId) => {
        return jwt.sign({ _id: serverId }, config.get('jwtSecretKey'))
    },

    generate_addr_mainNet = (cb) => {
        let seed = commonFile.getTryteSeed();
        iota.api.getNewAddress(seed, { index: 0, total: 1, security: 2, checksum: true }, (err, result) => {
            console.log("==>>", err, result);
            return cb(seed, result[0])
        })
    },

    get_balance = (address, cb) => {
        iota.api.getBalances(address, 100, (err, result) => {
            console.log("==>>balance data", err, result);
            if (err) {
                console.log(err)
                return cb(null)
            }
            return cb(Number(result.balances[0]))
        })
    },

    get_inputs = (seed, cb) => {
        iota.api.getInputs(seed, (err, success) => {
            console.log("err, success=>", err, success)
            return cb(success.inputs);
        })
    },

    payment_method = (seed, send_from, send_to, amount, change_addr, cb) => {
        let options = {},
            message = iota.utils.toTrytes('official_transaction.');
        transfers_raw = [{
            value: amount, //all values in IOTA.
            address: send_to,
            message: message //optional
        }];
        get_inputs(seed, (inputs) => {
            options = {
                inputs: inputs,
                address: change_addr
            }
            console.log("here", inputs)
            iota.api.sendTransfer(seed, 3, 14, transfers_raw, options, (error, success) => {
                if (error) {
                    console.log(error)
                    return cb("error");
                } else {
                    console.log(success)
                    return cb(success)
                }
            });
        })
    };

// get_inputs("JLABTDFLLRCVKYUDYAXNCQUBJTGZYRBRPLAGRQXGNDRAURJQ9URGOWQDJLPWOEUHJVPTUXRXVBNAMVNLD",(inputs)=>{
//     console.log("==>>", inputs);
// })



// iota.api.findTransactionObjects({ addresses: ["DMFHHARFVECWHYOIZLKAXJQNDMYYMTGLWWWXOBWV99VOXJBLPHLCJILZS9HKKKH9RFDWMZLEVBUFMXBOCBFOTNYJUA"]}, (err, success)=>{
//     // console.log("==>>", err, success)
//     let deposits = [], bundles_added = {};
//     success.map((element)=>{
//         if(element.value > 0 && !(element.bundle in bundles_added)){
//             deposits.push({ hash: element.hash, value: element.value, timestamp: element.timestamp});
//             bundles_added[element.bundle] = "added";
//         }
//     })
//     console.log(deposits)
// })
//EEYYINBWGPMTT9I9EDLGKAXJJCCMZUOHFUCZHLYSWOECXCQALIUXUFLNRJYRGWOAXZYLZPJMSPEOF99CYYDDIQRRLY

// let send_from = "99KCIBABTEPUAUKCSBLDVJVFVAOGRYCH9ADWWIQPGXX9BNAUVHJFBMUYDPESBQIYPVMBPRYUZJRPISBRAIOPL9LTWA",
//     send_to = "XNLJA99ESCFJLSAEVYZCHOKYYQMSVIMSLAQQHXUDZEOBIWTXVUKMLXKP9OWCLCKYBHEOUAUQIU9GNCOJBQSPK9HNV9",
//     change_addr = "";
// payment_method(seed, send_from, send_to, 0, change_addr, (data)=>{
//     console.log("==>>",data);
// })
// let temp_arr = ["TGDOGCFYNWNKBUYRWFAKCNVPRMDZQRDJQPDOEUPTWTMTSZTSOVXFKEBGTWOAPOIDEUBQJHVOTNCM99999", "ERGZCGYDDVPTRPXPFXTUVY9OUEBYZVSDEKSJFACQLSTWNVDRNDTANIMZPTLZIOXRLSHXGVQYITRXA9999", "RWWBTRGKIOILMZQOZ9NGIIJGSWUKSCK9CNZDVHTTERQUOALDGOZJAMPUVLUYWUNJYKJGOTJHWGVE99999"];
// iota.api.isReattachable(["TCMZLRFJ9PCQLSBTCWKTRRB9TSQTEKTORFBHMTVAKCFDYJVFUARWZEJHNUYXYYMRBQTYAERGZFQPUPJNWPRQNECAND", "99KCIBABTEPUAUKCSBLDVJVFVAOGRYCH9ADWWIQPGXX9BNAUVHJFBMUYDPESBQIYPVMBPRYUZJRPISBRAIOPL9LTWA","XNLJA99ESCFJLSAEVYZCHOKYYQMSVIMSLAQQHXUDZEOBIWTXVUKMLXKP9OWCLCKYBHEOUAUQIU9GNCOJBQSPK9HNV9","DMFHHARFVECWHYOIZLKAXJQNDMYYMTGLWWWXOBWV99VOXJBLPHLCJILZS9HKKKH9RFDWMZLEVBUFMXBOCBFOTNYJUA"], (err, success)=>{
//     console.log("==>>reatt", err, success)
// })
// temp_arr.map((elem)=>{
    // iota.api.replayBundle("RWWBTRGKIOILMZQOZ9NGIIJGSWUKSCK9CNZDVHTTERQUOALDGOZJAMPUVLUYWUNJYKJGOTJHWGVE99999", 3, 14, (err, txs) => {
    //     // const tailHash = txs[0].hash
    //     console.log(err, txs)
    // })
// })
module.exports = {

    "verifyAuthToken": (req, res, next) => {
        console.log("sending directly to the api")
        if (!req.headers.auth_token) {
            return commonFile.responseHandler(res, 400, "No token provided.")
        }
        commonFile.jwtDecode(req.headers.auth_token, (decoded) => {
            if (decoded) {
                next();
            } else {
                return commonFile.responseHandler(res, 400, "Invalid token.")
            }
        })
    },

    "get_auth_token": (req, res) => {
        if (!req.query.uniqueId) {
            return commonFile.responseHandler(res, 400, "Parameters missing.")
        }
        return commonFile.responseHandler(res, 200, "Success.", jwt.sign({ id: req.query.uniqueId }, config.get('jwtSecretKey'), { expiresIn: '1h' }))
    },

    "generate_new_addr": (req, res) => {
        generate_addr_mainNet((seed, addr) => {
            console.log(seed, addr)
            return commonFile.responseHandler(res, 200, "Success.", { seed: seed, address: addr })
        })
    },

    "get_addr_info": (req, res) => {
        get_balance([req.query.address], (balance_info) => {
            console.log("==>>balance_info", balance_info)
            if(balance_info !== "error" ){
                return commonFile.responseHandler(res, 200, "Balance obtained successfully.", balance_info );
            }else{
                return commonFile.responseHandler(res, 400, "Address is not present on the network." );
            }
        })
    },

    "deposit_history": (req, res) => {
        iota.api.findTransactionObjects({ addresses: [req.body.address] }, (err, success) => {
            console.log("txn data==>>", success)
            let deposits = [], bundles_added = {};
            success.map((element) => {
                if (element.value > 0 && !(element.bundle in bundles_added)) {
                    deposits.push({ hash: element.hash, value: element.value, timestamp: element.timestamp });
                    bundles_added[element.bundle] = "added";
                }
            })
            console.log(deposits)
            return commonFile.responseHandler(res, 200, "Deposits found successfully.", deposits);
        })
    },

    "payment_method": (req, res) => {
        console.log("==>>", req.body);
        let hash = '',
            seed = req.body.seed,
            send_from = req.body.send_from.substring(0, 81),//req.body.send_from,
            send_to = req.body.send_to.substring(0, 81),
            change_addr = req.body.change_addr.substring(0, 81),
            amount = Number(req.body.amount);
            console.log("====>>", send_from);
        payment_method(seed, send_from, send_to, amount, change_addr, (txn_success)=>{
            console.log("==>>transaction result",txn_success);
            if(txn_success === "error"){
                return commonFile.responseHandler(res, 500, "Transaction was not processed.")
            }else{
                hash = txn_success[0].hash;
                iota.api.replayBundle(hash, 3, 14, (err, txs) => {
                    console.log(err, txs)
                    iota.api.replayBundle(hash, 3, 14, (err, txs) => {
                        console.log(err, txs)
                        return commonFile.responseHandler(res, 200, "Transaction submitted successfully.", hash)
                    })
                })
            }
        })
    },

    "get_server_info": (req, res) => {
        iota.api.getNodeInfo((e, r) => {
            console.log("err, result==>>", e, r)
        })
    }
}