## NODE JS SDK Sample

Here is a sample application that utilizes the Hyperledger Fabric NODE JS SDK to 

* Connect to the Oracle Blockchain Platform (OBP) network using a set of config files
* Connect to a channel
* Install chaincode written in the "go" programming language
* Instantiate chaincode on a set of specific peers on a specific channel
* Enroll user
* Invoke chaincode

It demonstrates how you could utilize the **__fabric-client__** Node.js SDK APIs.

The "network.yaml" file located in the parent directory mirrors your existing Oracle Blockchain Platform environment. Namely it describes

* A client
* Channels
* An organization
* Orderers
* Peers 
* Certificate Authorities
* Rest Proxies

It also describes where the security certificates with which to connect with your environment are located.

### Step 1: Install prerequisites

* **Node.js** v 6x

### Step 2: Initialize the sample application

We need to use the "npm" package manager to initialize the application. 
To do this, for Linux and MacOS,  run the following command in your terminal from the current directory: `sh npm_bcs_client.sh`; for Windows, run this: `call npm_bcs_client_win.bat`.

Note:
The sample provides a script for 'grpc-node' module, and you can rebuild this module from the official source code yourself. Instructions about how to rebuild the 'grpc-node' module are available in the OBP Console 'Developer Tools' pages.

### Step 3: Run the sample application

To run the application, execute the following node command: `node end2end.js [-c channelName] [-u userName userSecret] [-l language] [-n chaincode] [-p peeraddress] `.

-  option -c to specify channel name you wish to utilize to run the sample(default is channel "default")
-  option -u to specify user name and user secret to enroll a user (default is null, mean no enrollment),Enroll user is optional, the user that you want to enroll must exist in IDCS
-  option -l to specify chaincode language (golang or node, default is golang)
-  option -n to specify chaincode name (default is obcs-example02, and note that if chaincode is already existed, the case will quit with error)
-  option -p to specify peer address to install, instantiate, invoke and query (default is one random peer which already join the this channel, and the selected peer's organization is same with client)

Note:
-  Here is a example: node end2end.js -c default -l golang -n obcs-example02 -p founder1peer0
-  If you want to run the sample on a new channel which is not included in the `network.yaml`, you should download a new `network.yaml` config file from OBP console 'Developer Tools' pages.

"All Done"
