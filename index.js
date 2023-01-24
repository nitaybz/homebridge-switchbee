const SwitchBeeApi = require('./SwitchBee/api')
const WebsocketApi = require('./SwitchBee/websocketApi')
const syncHomeKitCache = require('./SwitchBee/syncHomeKitCache')
const refreshState = require('./SwitchBee/refreshState')
const path = require('path')
const storage = require('node-persist')
const PLUGIN_NAME = 'homebridge-switchbee'
const PLATFORM_NAME = 'SwitchBee'

module.exports = (api) => {
	api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, SwitchBeePlatform)
}

class SwitchBeePlatform {
	constructor(log, config, api) {
		this.api = api
		this.log = log

		this.accessories = []
		this.connectedDevices = {}
		this.PLUGIN_NAME = PLUGIN_NAME
		this.PLATFORM_NAME = PLATFORM_NAME
		this.name = PLATFORM_NAME
		this.devicesConfig = config.devices || []
		this.debug = config.debug || false

		this.storage = storage
		this.refreshState = refreshState(this)
		this.syncHomeKitCache = syncHomeKitCache(this)

		// ~~~~~~~~~~~~~~~~~~~~~ SwitchBee Specials ~~~~~~~~~~~~~~~~~~~~~ //
		
		this.ip = config['ip']
		this.username = config['username']
		this.password = config['password']
		this.preventRemoval = config['preventRemoval'] || false
		
		if (!this.username || !this.password || !this.ip) {
			this.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  --  ERROR  --  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n')
			this.log('Can\'t start homebridge-switchbee plugin without IP, username and password !!\n')
			this.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n')
			return
		}

		this.persistPath = path.join(this.api.user.persistPath(), '/../switchbee-persist')
		let requestedInterval = config['statePollingInterval']*1000 || 10000 // default polling time is 10 seconds
		if (requestedInterval < 2000) requestedInterval = 2000 // minimum 2 seconds to not overload

		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

		this.setProcessing = false
		this.pollingInterval = requestedInterval

		// define debug method to output debug logs when enabled in the config
		this.log.easyDebug = (...content) => {
			if (this.debug) {
				this.log(content.reduce((previous, current) => {
					return previous + ' ' + current
				}))
			} else
				this.log.debug(content.reduce((previous, current) => {
					return previous + ' ' + current
				}))
		}
		
		this.api.on('didFinishLaunching', async () => {

			await this.storage.init({
				dir: this.persistPath,
				forgiveParseErrors: true
			})
			this.SwitchBeeApi = await SwitchBeeApi(this)

			let version = null
			// get version
			try {
				version = await this.SwitchBeeApi.getVersion()
				await this.storage.setItem('switchbee-version', version)
			} catch(err) {
				this.log('ERR:', err.stack || err.message || err)
				version = await this.storage.getItem('switchbee-version')
			}

			// use Websocket API on newer versions
			if (version && version.isNew) {
				this.log.easyDebug(`New version found ${version.version} - Using Websocket API`)
				this.SwitchBeeApi = await WebsocketApi(this)
				this.isNewVersion = true
				this.log.easyDebug(`Forcing polling interval to 10 minutes since it's working with websocket - only to validate states and devices`)
				this.pollingInterval = 600000
			}

			// get configurations from storage
			this.devices = await this.storage.getItem('switchbee-configuration')
			if (this.devices) {
				this.log.easyDebug('Got configurations from storage:')
				this.log.easyDebug(JSON.stringify(this.devices))
			} else {
				this.log.easyDebug('Configurations not found in storage.... initiating with empty configurations')
				this.devices = {}
			}

			// get states from storage
			this.state = await this.storage.getItem('switchbee-raw-state')
			if (this.state) {
				this.log.easyDebug('Got state from storage:')
				this.log.easyDebug(JSON.stringify(this.state))
			} else {
				this.log.easyDebug('State not found in storage.... initiating with empty state')
				this.state = {}
			}
			
			this.refreshState()
			setInterval(this.refreshState, this.pollingInterval)
			
		})

	}

	configureAccessory(accessory) {
		this.log.easyDebug(`Found Cached Accessory: ${accessory.displayName} (${accessory.context.deviceId}) `)
		this.accessories.push(accessory)
	}

}
