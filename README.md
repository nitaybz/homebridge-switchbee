<img src="branding/switchbee_homebridge.png" width="500px">

# homebridge-switchbee

[![Downloads](https://img.shields.io/npm/dt/homebridge-switchbee.svg?color=critical)](https://www.npmjs.com/package/homebridge-switchbee)
[![Version](https://img.shields.io/npm/v/homebridge-switchbee)](https://www.npmjs.com/package/homebridge-switchbee)<br>


[Homebridge](https://github.com/nfarina/homebridge) plugin for SwitchBee - Smart Home

<img src="branding/products2.png?v2" width="400px">

### Requirements

<img src="https://img.shields.io/badge/node-%3E%3D10.17-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/homebridge-%3E%3D0.4.4-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/iOS-%3E%3D11.0.0-brightgreen">

check with: `node -v` & `homebridge -V` and update if needed

----------------------------------------
## How to Get Password?

In order to work with this plugin you need to set up a user with the appropriate permissions, and setup a password for this user which will be used to authenticate the user through the SwitchBee plugin.

To do so, connect with an Administrator user using the SwitchBee App. Select “Users” from the menu and click the user which you want to use through this plugin (create a new user if nessesary).

Then click the “Edit” button. Type the desired password and click the “Set Password” button.

Now the system is ready for connecting through the SwitchBee Open API.


----------------------------------------
# Installation

<!-- This plugin is Homebridge verified and HOOBS certified and can be easily installed and configured through their UI. -->


1. Install homebridge using: `sudo npm install -g homebridge --unsafe-perm`
2. Install this plugin using: `sudo npm install -g homebridge-switchbee`
3. Update your configuration file. See `config-sample.json` in this repository for a sample.

\* install from git: `sudo npm install -g git+https://github.com/nitaybz/homebridge-switchbee.git`


## Config file

#### Easy config (required):

``` json
"platforms": [
    {
      "platform": "SwitchBee",
      "ip": "10.0.0.x",
      "username": "******@*******.***",
      "password": "*******",
    }
]
```

#### Advanced config (optional):

``` json
"platforms": [
    {
      "platform": "SwitchBee",
      "ip": "10.0.0.x",
      "username": "******@*******.***",
      "password": "*******",
      "statePollingInterval": 5,
      "debug": false,
      "devices": [
        {
          "id": 1,
          "accessoryType": "valve",
          "defaultDuration": 90
        },
        {
          "id": 22,
          "accessoryType": "outlet"
        },
        {
          "id": 23,
          "accessoryType": "switch"
        },
        {
          "id": 23,
          "accessoryType": "lock"
        },
        {
          "id": 4,
          "hide": true
        }
      ]
    }
]
```
