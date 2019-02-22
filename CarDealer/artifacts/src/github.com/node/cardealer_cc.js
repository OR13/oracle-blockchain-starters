'use strict';
const shim = require('fabric-shim');
const util = require('util');

var Chaincode = class {
    
    /**
    
    //vechicePart struct
    let vehiclePart = {
        'docType': string, default 'vehiclePart', //docType is used to distinguish the various types of objects in state database         
        'serialNumber': string       //the fieldtags are needed to keep case from bouncing around
        'assembler': string
        'assemblyDate': integer
        'name': string
        'owner': string
        'recall': boolean
        'recallDate': integer
    };
    
    //vehicle struct
    let vehicle ={
        'docType': string, default 'vehicle'    //docType  is used to distinguish the various types of objects in state database
        'chassisNumber': string //the fieldtags are needed to keep case from bouncing around
        'manufacturer': string
        'model': string
        'assemblyDate': integer`
        'airbagSerialNumber': string
        'owner': string
        'recall': boolean
        'recallDate': integer
    }        
    **/
    // Initialize the chaincode
    async Init(stub) {
        console.info('========= example cardealer Init =========');
        let ret = stub.getFunctionAndParameters();
        console.info(ret);
        return shim.success();
    }

    async Invoke(stub) {
        console.info('Transaction ID: ' + stub.getTxID());
        let ret = stub.getFunctionAndParameters();
        console.info(ret);
        let method = this[ret.fcn];
        if (!method) {
            console.error('no method of name:' + ret.fcn + ' found');
            throw new Error('Received unknown function ' + ret.fcn + ' invocation');
        }

        console.info('\nCalling method : ' + ret.fcn);
        try {
            let payload = await method(stub, ret.params, this);
            return shim.success(payload);
        } catch (err) {
            console.log(err);
            return shim.error(err);
        }
    }

    // =======================================================================
    // initVehiclePart - create a new vehicle part, store into chaincode state
    // =======================================================================
    async initVehiclePart(stub, args, thisClass) {
        // data model with recall fields
        //   0           1       2             3                4                      5      6
        // "ser1234", "tata", "1502688979", "airbag 2020", "aaimler ag / mercedes", "false", "0"
        let vehiclePart = {};
        let jsonResp = {};
        vehiclePart.docType = 'vehiclePart';
        
        if (args.length != 7) {
            throw new Error('Incorrect number of arguments. Expecting 7');
        }

        console.info('- start init vehicle part');
        if (args[0].length <= 0) {
            throw new Error('1st argument must be a non-empty string');
        }
        if (args[1].length <= 0) {
            throw new Error('2nd argument must be a non-empty string');
        }
        if (args[3].length <= 0) {
            throw new Error('4th argument must be a non-empty string');
        }
        if (args[4].length <= 0) {
            throw new Error('5th argument must be a non-empty string');
        }
       
        vehiclePart.serialNumber = args[0];
        vehiclePart.assembler = args[1].toLowerCase();
        vehiclePart.assemblyDate = parseInt(args[2]);
        if(typeof vehiclePart.assemblyDate !== 'number'){
            throw new Error('3rd argument must be a numeric string');        
        }
        
        vehiclePart.name = args[3].toLowerCase();
        vehiclePart.owner = args[4].toLowerCase();
        
        if(args[5].toLowerCase() !== 'true' && args[5].toLowerCase() !== 'false'){
            throw new Error('6th argument must be a boolean string');
        }
        vehiclePart.recall = (args[5].toLowerCase() === 'true');
        vehiclePart.recallDate = parseInt(args[6]);
        if(typeof vehiclePart.recallDate !== 'number'){
            throw new Error('7th argument must be a numeric string');        
        }
        
        // ==== Check if vehicle part already exists ====    
        let vehiclePartAsBytes = await stub.getState(vehiclePart.serialNumber);
        if (vehiclePartAsBytes.toString()){
            console.info('This vehicle part already exists: ' + vehiclePart.serialNumber);
            jsonResp.Error = 'This vehicle part already exists: ' + vehiclePart.serialNumber;
            throw new Error(JSON.stringify(jsonResp));
        }
        
        // ==== Create vehiclePart object and marshal to JSON ====    
        let vehiclePartJSONasBytes = Buffer.from(JSON.stringify(vehiclePart));
        
        // === Save vehiclePart to state ===
        console.info('Save vehiclePart:', JSON.stringify(vehiclePart));
        
        // Write the states back to the ledger
        await stub.putState(vehiclePart.serialNumber, vehiclePartJSONasBytes);
        
        console.info('- end initVehiclePart(success)');
    }

    // ============================================================
    // setPartRecallState - sets recall field of a vehicle
    // ============================================================
    async setPartRecallState(stub, args, thisClass) {
        //  expects following arguements
        //       0               1
        // "serialNumber", "status (boolean)"
        let jsonResp = {};
        
        if (args.length != 2) {
            throw new Error('Incorrect number of arguments. Expecting 2');
        }

        console.info('- start setPartRecallState');
        if (args[0].length <= 0) {
            throw new Error('1st argument must be a non-empty string');
        }
        let serialNumber = args[0];

        if( args[1].toLowerCase() !== 'true' && args[1].toLowerCase() !== 'false'){
            throw new Error('2th argument must be a boolean string');
        }
        let recall = (args[1].toLowerCase() === 'true');
        
        // ==== Check if vehicle part already exists ====
        let vehiclePartAsBytes = await stub.getState(serialNumber);
        if (!vehiclePartAsBytes.toString()){
            console.info('Failed to get vehicle part for: ' + serialNumber);
            jsonResp.Error = 'Failed to get vehicle part for: ' + serialNumber;
            throw new Error(JSON.stringify(jsonResp));    
        }
        
        //Buffer to object
        let vehiclePart = {};
        try{
            vehiclePart = JSON.parse(vehiclePartAsBytes.toString('utf8'));
        }catch(err){
            jsonResp.Error = 'Failed to decode JSON of: ' + serialNumber;
            throw new Error(JSON.stringify(jsonResp));
        }
        
        // === Update vehiclePart and sync to world state==========
        vehiclePart.recall = recall;
        vehiclePart.recallDate = Math.floor(Date.now()/1000);
        
        // ==== Create vehiclePart object and marshal to JSON ====
        let vehiclePartJSONasBytes = Buffer.from(JSON.stringify(vehiclePart));

        console.info('Save vehiclePart:', JSON.stringify(vehiclePart));
        // Write the states back to the ledger
        await stub.putState(vehiclePart.serialNumber, vehiclePartJSONasBytes);
        console.info('- end setPartRecallState');    
    }
    
    // ============================================================
    // initVehicle - create a new vehicle , store into chaincode state
    // ============================================================       
    async initVehicle(stub, args, thisClass) {
        // data model with recall fields
        //   0               1              2        3            4        5           6            7
        // "mer1000001", "mercedes", "c class", "1502688979", "ser1234", "mercedes", "false", "1502688979"    
        let vehicle = {};
        let jsonResp = {};
        
        vehicle.docType = 'vehicle';
        
        if (args.length != 8) {
            throw new Error('Incorrect number of arguments. Expecting 8');
        }
        
        // ==== Input sanitation ====
        console.info('- start init vehicle');
        if (args[0].length <= 0) {
            throw new Error('1st argument must be a non-empty string');
        }
        if (args[1].length <= 0) {
            throw new Error('2nd argument must be a non-empty string');
        }
        if (args[2].length <= 0) {
            throw new Error('3rd argument must be a non-empty string');
        }
        if (args[4].length <= 0) {
            throw new Error('5th argument must be a non-empty string');
        }
        if (args[5].length <= 0) {
            throw new Error('6th argument must be a non-empty string');
        }                                    
        
        vehicle.chassisNumber = args[0];
        vehicle.manufacturer = args[1];
        vehicle.model = args[2].toLowerCase();
        vehicle.assemblyDate = parseInt(args[3]);
        if(typeof vehicle.assemblyDate !== 'number'){
            throw new Error('4th argument must be a numeric string');        
        }
        vehicle.airbagSerialNumber = args[4].toLowerCase();
        vehicle.owner = args[5].toLowerCase();
        if( args[6].toLowerCase() !== 'true' && args[6].toLowerCase() !== 'false'){
            throw new Error('7th argument must be a boolean string');
        }
        vehicle.recall = (args[6].toLowerCase() === 'true');
        vehicle.recallDate = parseInt(args[7]);
        if(typeof vehicle.recallDate !== 'number'){
            throw new Error('8th argument must be a numeric string');        
        }
        // ==== Check if vehicle already exists ====
        let vehicleAsBytes = await stub.getState(vehicle.chassisNumber);
        if (vehicleAsBytes.toString()){
            console.info('This vehicle already exists: ' + vehicle.chassisNumber);
            jsonResp.Error = 'This vehicle already exists: ' + vehicle.chassisNumber;
            throw new Error(JSON.stringify(jsonResp));
        }
        
        // ==== Create vehicle object and marshal to JSON ====
        let vehicleJSONasBytes = Buffer.from(JSON.stringify(vehicle));
        
        // === Save vehicle to state ===
        await stub.putState(vehicle.chassisNumber, vehicleJSONasBytes);

        // ==== Vehicle part saved and indexed. Return success ====
        console.info('- end init vehicle');
    }
    
    // ==========================================================
    // readVehiclePart - read a vehicle part from chaincode state
    // ==========================================================
    async readVehiclePart(stub, args, thisClass) {
        let jsonResp = {};
        if (args.length != 1) {
            throw new Error('Incorrect number of arguments. Expecting serial number of the vehicle part to query');
        }
        let serialNumber = args[0];
        let valAsbytes = await stub.getState(serialNumber); //get the vehiclePart from chaincode state
        
        if (!valAsbytes.toString()){
            console.info('Failed to get vehicle for : ' + serialNumber);
            jsonResp.Error = 'Failed to get state for ' + serialNumber;        
            throw new Error(JSON.stringify(jsonResp));    
        }
        
        console.info('readVehiclePart Response:', valAsbytes.toString('utf8'));
        return valAsbytes;
    }
    
    // =================================================
    // readVehicle - read a vehicle from chaincode state
    // =================================================
    async readVehicle(stub, args, thisClass) {
        let jsonResp = {};
        if (args.length != 1) {
            throw new Error("Incorrect number of arguments. Expecting chassis number of the vehicle to query");
        }
    
        let chassisNumber = args[0];
        
        let valAsbytes = await stub.getState(chassisNumber); //get the vehicle from chaincode state
        if (!valAsbytes.toString()) {
            console.info("Failed to get state for " + chassisNumber);
            jsonResp.Error = "Failed to get state for " + chassisNumber;
            throw new Error(JSON.stringify(jsonResp));
        } 

        return valAsbytes;
    }    
    
    // ==================================================================
    // deleteVehiclePart - remove a vehiclePart key/value pair from state
    // ==================================================================
    async deleteVehiclePart(stub, args, thisClass) {
        let jsonResp = {};
    
        if (args.length != 1) {
            throw new Error('Incorrect number of arguments. Expecting 1');
        }
        let serialNumber = args[0];

        // to maintain the assember~serialNumber index, we need to read the vehiclePart first and get its assembler
        let valAsbytes = await stub.getState(serialNumber); //get the vehiclePart from chaincode state
        if (!valAsbytes.toString()) {
            console.info("Failed to get state for " + serialNumber);
            jsonResp.Error = "Failed to get state for " + serialNumber;
            throw new Error(JSON.stringify(jsonResp));
        } 

        let vechicePart = {};
        try{
            vechicePart = JSON.parse(valAsbytes.toString('utf8'));
        }catch (err){
            jsonResp.Error = "Failed to decode JSON of: " + serialNumber ;
            throw new Error(JSON.stringify(jsonResp));
        }

        await stub.deleteState(serialNumber); //remove the vehiclePart from chaincode state
        
        console.info('- deleteVehiclePart end');
    }
    
    // ==========================================================
    // deleteVehicle - remove a vehicle key/value pair from state
    // ==========================================================
    async deleteVehicle(stub, args, thisClass) {
        let jsonResp = {};
        
        if (args.length != 1) {
            throw new Error("Incorrect number of arguments. Expecting 1");
        }
        let chassisNumber = args[0];

        // to maintain the manufacturer~chassisNumber index, we need to read the vehicle first and get its assembler
        let valAsbytes = await stub.getState(chassisNumber); //get the vehicle from chaincode state
        if (!valAsbytes.toString()) {
            console.info("Failed to get state for " + chassisNumber);
            jsonResp.Error = "Failed to get state for " + chassisNumber;
            throw new Error(JSON.stringify(jsonResp));            
        } 

        let vehicle = {};
        try{
            vehicle = JSON.parse(valAsbytes.toString('utf8'));
        }catch (err ){
            console.info("Failed to decode JSON of: " + chassisNumber);
            jsonResp.Error = "Failed to decode JSON of: " + chassisNumber;
            throw new Error(JSON.stringify(jsonResp));
        }

        await stub.deleteState(chassisNumber); //remove the vehicle from chaincode state

        console.info('-deleteVehicle end');
        
    }
    
    // ======================================================================
    // transfer a vehicle part by setting a new owner name on the vehiclePart
    // ======================================================================
    async transferVehiclePart(stub, args, thisClass) {
        
        let jsonResp = {};
        //   0       1       2
        // "name", "from", "to"
        if (args.length < 3) {
            throw new Error("Incorrect number of arguments. Expecting 3");
        }

        let serialNumber = args[0];
        let currentOwner = args[1].toLowerCase();
        let newOwner = args[2].toLowerCase();
        
        console.info("- start transferVehiclePart ", serialNumber, currentOwner, newOwner);
        
        let vehiclePartAsBytes = await stub.getState(serialNumber);
        if (!vehiclePartAsBytes.toString()) {
            console.info("Failed to get vehicle part: ", serialNumber );
            jsonResp.Error = "Failed to get vehicle part: " + serialNumber;
            throw new Error(JSON.stringify(jsonResp));
        }

        let vehiclePartToTransfer = {};
        try{
            vehiclePartToTransfer = JSON.parse(vehiclePartAsBytes.toString('utf8'));
        }catch (err){
            console.info("Failed to decode vehicle part: ", serialNumber);
            jsonResp.Error = "Failed to decode vehicle part: " + serialNumber;
            throw new Error(JSON.stringify(jsonResp));
        }

        // if currentOwner != vehiclePartToTransfer.Owner {
        //     return "This asset is currently owned by another entity.", err
        // }

        vehiclePartToTransfer.owner = newOwner; //change the owner

        let vehiclePartJSONBytes = Buffer.from(JSON.stringify(vehiclePartToTransfer));
        
        await stub.putState(serialNumber, vehiclePartJSONBytes); //rewrite the vehiclePart

        console.info("- end transferVehiclePart (success)");

    }    


    // ======================================================================
    // transfer a vehicle part by setting a new owner name on the vehiclePart
    // ======================================================================
    async transferPartToVehicle(stub, args, thisClass) {
        
        let jsonResp = {};
        console.info("- start transferPartToVehicle");
        //       0                   1
        // "serialNumber", "chassisNumber"
        
        if (args.length < 2) {
            throw new Error("Incorrect number of arguments. Expecting 2");
        }

        let serialNumber = args[0];
        let chassisNumber = args[1];

        let vehiclePartAsBytes = await stub.getState(serialNumber);
        
        if (!vehiclePartAsBytes.toString()){
            console.info("Failed to get vehicle part: " + serialNumber);
            jsonResp.Error = "Failed to get vehicle part: " + serialNumber;
            throw new Error(JSON.stringify(jsonResp));
        }

        let vehicleAsBytes = await stub.getState(chassisNumber);
        if (!vehicleAsBytes.toString()) {
            console.info("Failed to get vehicle: " + chassisNumber);
            jsonResp.Error = "Failed to get vehicle: " + chassisNumber;
            throw new Error(JSON.stringify(jsonResp));            
        }

        let part = {};
        try{
            part = JSON.parse(vehiclePartAsBytes.toString('utf8'));
        }catch (err){
            console.info('Failed to decode vehicle part:' + serialNumber);
            jsonResp.Error = "Failed to decode vehicle part: " + serialNumber;            
            throw new Error(JSON.stringify(jsonResp));
        }
        
        let car = {};
        try{
            car = JSON.parse(vehicleAsBytes.toString('utf8'));
        } catch (err) {
            console.info("Failed to decode vehicle: " + chassisNumber);
            jsonResp.Error = "Failed to decode vehicle: " + chassisNumber;
            throw new Error(JSON.stringify(jsonResp));
        }

        
        if (car.owner != part.owner) {
            console.info("Illegal Transfer.");
            jsonResp.Error = "Illegal Transfer: " + chassisNumber;
            throw new Error(JSON.stringify(jsonResp));
        }
        
        let vehicleToModify = car;
        vehicleToModify.airbagSerialNumber = serialNumber;
        
        let vehicleJSONBytes = Buffer.from(JSON.stringify(vehicleToModify));

        await stub.putState(chassisNumber, vehicleJSONBytes); //rewrite the vehicle
        console.info("- end transferPartToVehicle (success)");
    }
    
    // =====================================================================================
    // transferVehicleHelper: transfer a vehicle  by setting a new owner name on the vehicle
    // =====================================================================================
    async transferVehicle(stub, args, thisClass) {
        let jsonResp = {};
        //   0       1       3
        // "name", "from", "to"
        if (args.length < 3) {
            throw new Error("Incorrect number of arguments. Expecting 3");
        }

        let chassisNumber = args[0];
        let currentOnwer = args[1].toLowerCase();
        let newOwner = args[2].toLowerCase();
        
        console.info("Transfering vehicle with chassis number: " + chassisNumber + " To: " + newOwner);
        let vehicleAsBytes = await stub.getState(chassisNumber);
        if (!vehicleAsBytes.toString()) {
            console.info("Failed to get vehicle:" + chassisNumber);
            jsonResp.Error = "Failed to get vehicle:" + chassisNumber;
            throw new Error(JSON.stringify(jsonResp));
        }

        let vehicleToTransfer = {};
        try{
            vehicleToTransfer = JSON.parse(vehicleAsBytes.toString('utf8'));
        }catch(err){
            console.info("Failed to decode vehicle:" + chassisNumber);
            jsonResp.Error = "Failed to decode vehicle:" + chassisNumber;
            throw new Error(JSON.stringify(jsonResp));
        }

        // if currentOwner != vehicleToTransfer.Owner {
        //     return "This asset is currently owned by another entity.", err
        // }

        vehicleToTransfer.owner = newOwner; //change the owner

        //update world state
        let vehicleJSONBytes = Buffer.from(JSON.stringify(vehicleToTransfer));

        await stub.putState(chassisNumber, vehicleJSONBytes); //rewrite the vehicle

        console.info("- end transferVehicle (success)");

    }
    
    // ===== Example: Parameterized rich query =================================================
    // queryVehiclePartByNameOwner queries for vehicle part based on a passed in name and owner.
    // This is an example of a parameterized query where the query logic is baked into the chaincode,
    // and accepting a single query parameter (owner).
    // =========================================================================================
    async queryVehiclePartByNameOwner(stub, args, thisClass) {
        
        if (args.length != 2) {
            throw new Error("Incorrect number of arguments. Expecting 2");
        }

        let name = args[0].toLowerCase();
        let owner = args[1].toLowerCase();

        //This is for native fabric: couchdb
        //let queryString = util.format("{\"selector\":{\"docType\":\"vehiclePart\",\"name\":\"%s\",\"owner\":\"%s\"}}", name, owner);

        //This is for bcs: bdb
        let queryString = util.format("SELECT valueJson FROM <STATE> WHERE json_extract(valueJson, '$.docType', '$.name', '$.owner') = '[\"vehiclePart\",\"%s\",\"%s\"]'", name, owner);

        let method = thisClass['getQueryResultForQueryString'];
        let queryResults = await method(stub, queryString, thisClass);

        return queryResults;
    }

    // ===== Example: Parameterized rich query =================================================
    // queryVehiclePartByOwner queries for vehicle part based on a passed in owner.
    // This is an example of a parameterized query where the query logic is baked into the chaincode,
    // and accepting a single query parameter (owner).
    // =========================================================================================
    async queryVehiclePartByOwner(stub, args, thisClass) {
        
        if (args.length < 1) {
            throw new Error("Incorrect number of arguments. Expecting 1");
        }

        let owner = args[0].toLowerCase();

        //This is for native fabric: couchdb
        //let queryString = util.format("{\"selector\":{\"docType\":\"vehiclePart\",\"owner\":\"%s\"}}", owner);

        //This is for bcs: bdb
        let queryString = util.format("SELECT valueJson FROM <STATE> WHERE json_extract(valueJson, '$.docType', '$.owner') = '[\"vehiclePart\",\"%s\"]'", owner);

        let method = thisClass['getQueryResultForQueryString'];
        let queryResults = await method(stub, queryString, thisClass);        

        return queryResults;
    }
    // ===== Example: Ad hoc rich query ========================================================
    // queryVehiclePart uses a query string to perform a query for vehiclePart.
    // Query string matching state database syntax is passed in and executed as is.
    // Supports ad hoc queries that can be defined at runtime by the client.
    // =========================================================================================
    async queryVehiclePart(stub, args, thisClass) {
        
        // "queryString"
        if (args.length < 1) {
            throw new Error("Incorrect number of arguments. Expecting 1");
        }

        let queryString = args[0];
        
        let method = thisClass['getQueryResultForQueryString'];
        let queryResults = await method(stub, queryString, thisClass);    
        
        return queryResults;
    }

    // =========================================================================================
    // getQueryResultForQueryString executes the passed in query string.
    // Result set is built and returned as a byte array containing the JSON results.
    // =========================================================================================
    async getQueryResultForQueryString(stub, queryString, thisClass) {

        console.info("- getQueryResultForQueryString queryString:\n", queryString);

        let resultsIterator = await stub.getQueryResult(queryString);
    
        // results is a JSON array containing QueryRecords
        let results = [];
        
        while (true){
            let oneRecord = {};
            let res = await resultsIterator.next();
            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString('utf8'));
                try{
                    oneRecord = JSON.parse(res.value.value.toString('utf8'));
                    
                }catch(err){
                    console.log(err);
                    oneRecord = res.value.value.toString('utf8');
                }
                results.push(oneRecord);
            }
            if(res.done){
                console.info('end of data');
                await resultsIterator.close();
                
                console.log("- getQueryResultForQueryString queryResult:\n", JSON.stringify(results));
                return Buffer.from(JSON.stringify(results));
            }
        }
    }
    
    // ===========================================================================================
    // getHistoryForRecord returns the histotical state transitions for a given key of a record
    // ===========================================================================================
    async getHistoryForRecord(stub, args, thisClass) {

        if (args.length < 1) {
            throw new Error("Incorrect number of arguments. Expecting 1");
        }

        let recordKey = args[0];

        console.info("- start getHistoryForRecord: %s\n", recordKey);

        let resultsIterator = await stub.getHistoryForKey(recordKey);
        
        // results is a JSON array containing historic values for the key/value pair
        let results = [];
        while (true){
            let res = await resultsIterator.next();
            let jsonRes = {};
            
            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString('utf8'));
                jsonRes.TxId = res.value.tx_id;
                jsonRes.Timestamp = new Date(res.value.timestamp.seconds.low).toString();
                jsonRes.IsDelete = res.value.is_delete.toString();
                try {
                    jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    jsonRes.Value = res.value.value.toString('utf8');
                }
                results.push(jsonRes);
            }
            if(res.done){
                console.info('end of data');
                await resultsIterator.close();
                console.log("- getHistoryForRecord returning:\n", JSON.stringify(results));
                
                return Buffer.from(JSON.stringify(results));
            }
        }
    }
    
};

shim.start(new Chaincode());

