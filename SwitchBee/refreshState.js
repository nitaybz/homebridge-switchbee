const unified = require('./unified')

module.exports = (platform) => {
	return async () => {
		// get configurations
		try {
			platform.devices = await platform.SwitchBeeApi.getDevices()
			await platform.storage.setItem('switchbee-configuration', platform.devices)
		} catch(err) {
			platform.log('ERR:', err.stack || err.message || err)
			platform.log.easyDebug('<<<< ---- Fetching Configurations FAILED! ---- >>>>')
			return
		}

		// get states
		try {
			platform.state = await platform.SwitchBeeApi.getState(Object.keys(platform.devices))
			await platform.storage.setItem('switchbee-raw-state', platform.state)
		} catch(err) {
			platform.log('ERR:', err.stack || err.message || err)
			platform.log.easyDebug('<<<< ---- Refresh State FAILED! ---- >>>>')
			return
		}
		
		Object.values(platform.connectedDevices).forEach(device => {
			if (device.id in platform.state) {
				if (platform.state[device.id] === -1)
					platform.log.easyDebug(`${device.name} is DISCONNECTED !! please check the status in the SwitchBee app...`)
				if (!platform.setProcessing && unified.state[device.type])
					device.updateHomeKit(unified.state[device.type](platform.state[device.id], device))
			}
		})
		// register new devices / unregister removed devices
		platform.syncHomeKitCache()
	}
}