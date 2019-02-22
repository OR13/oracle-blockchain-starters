var helper = require("./app/helper.js");
var install = require('./app/install-chaincode.js');
var instantiate = require('./app/instantiate-chaincode.js');
var invoke = require('./app/invoke-transaction.js');
var query = require('./app/query.js');
var enroll = require('./app/enroll-user.js');
var Client = require('fabric-client');

var logger = helper.getLogger();

//Abstract commandline arguments  
var args = process.argv.splice(2);

// Param declaration
var CHANNEL_NAME = 'default';
var CHAINCODE_ID = 'obcs-example02';
var CHAINCODE_PATH = 'github.com';
var CHAINCODE_VERSION = 'v0';
var CHAINCODE_TYPE = 'golang';
var USER_NAME;
var USER_SECRET;
var base_config_path = "../"
var targets;

//Reload args 
param_check(args);

var installChaincodeRequest = {
    chaincodePath: CHAINCODE_PATH,
    chaincodeId: CHAINCODE_ID,
    chaincodeVersion: CHAINCODE_VERSION,
    chaincodeType: CHAINCODE_TYPE
};

var instantiateChaincodeRequest = {
    chanName: CHANNEL_NAME,
    chaincodeId: CHAINCODE_ID,
    chaincodeVersion: CHAINCODE_VERSION,
    fcn: 'init',
    args: ["a", "1000", "b", "1000"]
};

var invokeChaincodeRequest = {
    chanName: CHANNEL_NAME,
    chaincodeId: CHAINCODE_ID,
    chaincodeVersion: CHAINCODE_VERSION,
    fcn: 'invoke',
    args: ["b", "a", "10"]
};

var queryChaincodeRequest = {
    chanName: CHANNEL_NAME,
    chaincodeId: CHAINCODE_ID,
    chaincodeVersion: CHAINCODE_VERSION,
    fcn: 'query',
    args: ["a"]
};




// STEP 1
// Install chaincode
try {
    install.installChaincode(targets, installChaincodeRequest.chaincodeId, installChaincodeRequest.chaincodePath, installChaincodeRequest.chaincodeVersion, installChaincodeRequest.chaincodeType).then((result) => {
        console.log(result)
        console.log(
            '\n\n*******************************************************************************' +
            '\n*******************************************************************************' +
            '\n*                                          ' +
            '\n* STEP 1/5 : Successfully installed chaincode' +
            '\n*                                          ' +
            '\n*******************************************************************************' +
            '\n*******************************************************************************\n');

        sleep(2000);
        // STEP 2
        // Instantiate chaincode
        return instantiate.instantiateChaincode(targets, instantiateChaincodeRequest.chanName, instantiateChaincodeRequest.chaincodeId,
            instantiateChaincodeRequest.chaincodeVersion, installChaincodeRequest.chaincodeType, instantiateChaincodeRequest.fcn, instantiateChaincodeRequest.args);
    }).then((result2) => {
        console.log(result2)
        console.log(
            '\n\n*******************************************************************************' +
            '\n*******************************************************************************' +
            '\n*                                          ' +
            '\n* STEP 2/5 : Successfully instantiated chaincode on the channel' +
            '\n*                                          ' +
            '\n*******************************************************************************' +
            '\n*******************************************************************************\n');

        sleep(2000);

        // STEP 3
        // Enroll a user
        return enroll.enrollUser(USER_NAME,USER_SECRET);
    }).then((result3) => {
	if(result3 !== 'Do not need enroll'){
		console.log(result3)

        	console.log(
            	'\n\n*******************************************************************************' +
            	'\n*******************************************************************************' +
            	'\n*                                          ' +
            	'\n* STEP 3/5 : Successfully enrolled a user' +
            	'\n*                                          ' +
            	'\n*******************************************************************************' +
            	'\n*******************************************************************************\n');

        	sleep(2000);
	}else{
		console.log(
            	'\n\n*******************************************************************************' +
            	'\n*******************************************************************************' +
            	'\n*                                          ' +
            	'\n* STEP 3/5 : Enroll a user, but no account is specified, so skipped it' +
            	'\n*                                          ' +
            	'\n*******************************************************************************' +
            	'\n*******************************************************************************\n');
	}

        // STEP 4
        // invoke chaincode to transfer balance
        return invoke.invokeChaincode(targets, invokeChaincodeRequest.chanName, invokeChaincodeRequest.chaincodeId,
            invokeChaincodeRequest.fcn, invokeChaincodeRequest.args);
    }).then((result3) => {
        console.log(result3)

        console.log(
            '\n\n*******************************************************************************' +
            '\n*******************************************************************************' +
            '\n*                                          ' +
            '\n* STEP 4/5 : Successfully invoke chaincode on channel' +
            '\n*                                          ' +
            '\n*******************************************************************************' +
            '\n*******************************************************************************\n');

        sleep(2000);

        // STEP 5
        // query chaincode to get the target balance
        return query.queryChaincode(targets, queryChaincodeRequest.chanName, queryChaincodeRequest.chaincodeId,
            queryChaincodeRequest.fcn, queryChaincodeRequest.args)
    }).then((result4) => {
        console.log(result4)

        console.log(
            '\n\n*******************************************************************************' +
            '\n*******************************************************************************' +
            '\n*                                          ' +
            '\n* STEP 5/5 : Successfully query chaincode on channel' +
            '\n*                                          ' +
            '\n*******************************************************************************' +
            '\n*******************************************************************************\n');

        console.log("All Steps Completed Sucessfully");
        process.exit();
    });
} catch (e) {
    console.log(
        '\n\n*******************************************************************************' +
        '\n*******************************************************************************' +
        '\n*                                          ' +
        '\n* Error!!!!!' +
        '\n*                                          ' +
        '\n*******************************************************************************' +
        '\n*******************************************************************************\n');
    console.log(e);
    return;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function param_check(args) {
    var targetPeerName="";

    if (args.length > 0) {
        var parmUser = args.indexOf('-u');
        var parmChannel = args.indexOf('-c');
        var parmLang = args.indexOf('-l');
        var parmChaincode = args.indexOf('-n');
        var parmPeer = args.indexOf('-p');
        if(parmUser !== -1){
            USER_NAME = args[parmUser + 1];
            USER_SECRET = args[parmUser + 2];
            if(USER_NAME === undefined || USER_SECRET === undefined){
                console.log('Please input the username and password.');
                process.exit();
            }
        }
        if(parmChannel !== -1){
            CHANNEL_NAME = args[parmChannel + 1];
        }
        if(parmLang !== -1){
            CHAINCODE_TYPE = args[parmLang + 1];
        }
        if(parmChaincode !== -1){
            CHAINCODE_ID = args[parmChaincode +1];
        }     
        if (parmPeer !== -1) {
            targetPeerName = args[parmPeer +1];  
        }   
    }

    if (targetPeerName.length == 0) {
        var client = Client.loadFromConfig(base_config_path + 'network.yaml');
        var client_org = client.getClientConfig().organization;
        var targets_1 = client.getPeersForOrg(client_org);
        targets =  targets_1.splice(0, 1);
    } else {
        targets = [targetPeerName];
    }
    //console.log("json_targets=" + JSON.stringify(targets));
}



