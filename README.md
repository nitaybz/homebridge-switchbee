<img src="branding/switchbee_homebridge.png" width="500px">

# homebridge-switchbee

[![Downloads](https://img.shields.io/npm/dt/homebridge-switchbee.svg?color=critical)](https://www.npmjs.com/package/homebridge-switchbee)
[![Version](https://img.shields.io/npm/v/homebridge-switchbee)](https://www.npmjs.com/package/homebridge-switchbee)<br>
<!-- [![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) [![Homebridge Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/yguuVAX)<br>
[![certified-hoobs-plugin](https://badgen.net/badge/HOOBS/Certified/yellow)](https://plugins.hoobs.org?ref=10876) [![hoobs-support](https://badgen.net/badge/HOOBS/Support/yellow)](https://support.hoobs.org?ref=10876) -->


[Homebridge](https://github.com/nfarina/homebridge) plugin for SwitchBee - Smart Home

<img src="branding/products2.png?v2" width="400px">

### Requirements

<img src="https://img.shields.io/badge/node-%3E%3D10.17-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/homebridge-%3E%3D0.4.4-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/iOS-%3E%3D11.0.0-brightgreen">

check with: `node -v` & `homebridge -V` and update if needed

----------------------------------------
## STILL IN TESTING...

The plugin is still under developement and testing phase.
please check again in a few days.

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
