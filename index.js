const SwitchBeeApi = require('./SwitchBee/api')
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
		
		if (!this.username || !this.password || !this.ip) {
			this.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  --  ERROR  --  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n')
			this.log('Can\'t start homebridge-switchbee plugin without IP, username and password !!\n')
			this.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n')
			return
		}

		this.persistPath = path.join(this.api.user.persistPath(), '/../switchbee-persist')
		let requestedInterval = config['statePollingInterval']*1000 || 10000 // default polling time is 30 seconds
		if (requestedInterval < 3000) requestedInterval = 3000 // minimum 3 seconds to not overload
		this.refreshDelay = 1000

		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

		this.setProcessing = false
		this.pollingTimeout = null
		this.processingState = false
		this.pollingInterval = requestedInterval - this.refreshDelay

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
			this.cachedState = await this.storage.getItem('switchbee-state') || {}
			this.SwitchBeeApi = await SwitchBeeApi(this)

			// get configurations
			try {
				this.devices = await this.SwitchBeeApi.getDevices()
				await this.storage.setItem('switchbee-configuration', this.devices)
			} catch(err) {
				this.log('ERR:', err.stack || err.message || err)
				this.devices = await this.storage.getItem('switchbee-configuration')
				if (this.devices) {
					this.log.easyDebug('Got configurations from storage:')
					this.log.easyDebug(JSON.stringify(this.devices))
				} else {
					this.log.easyDebug('Configurations not found in storage.... initiating with empty configurations')
					this.devices = {}
				}
			}

			// get states
			try {
				this.state = await this.SwitchBeeApi.getState(Object.keys(this.devices))
				await this.storage.setItem('switchbee-raw-state', this.state)
			} catch(err) {
				this.log('ERR:', err.stack || err.message || err)
				this.state = await this.storage.getItem('switchbee-raw-state')
				if (this.state) {
					this.log.easyDebug('Got state from storage:')
					this.log.easyDebug(JSON.stringify(this.state))
				} else {
					this.log.easyDebug('State not found in storage.... initiating with empty state')
					this.state = {}
				}
			}
			
			this.syncHomeKitCache()
			this.pollingTimeout = setTimeout(this.refreshState, this.pollingInterval)
			
		})

	}

	configureAccessory(accessory) {
		this.log.easyDebug(`Found Cached Accessory: ${accessory.displayName} (${accessory.context.deviceId}) `)
		this.accessories.push(accessory)
	}

}
