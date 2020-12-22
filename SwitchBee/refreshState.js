const unified = require('./unified')

module.exports = (platform) => {
	return () => {
		if (!platform.processingState && !platform.setProcessing) {
			platform.processingState = true
			clearTimeout(platform.pollingTimeout)
			setTimeout(async () => {

				// get configurations
				try {
					platform.devices = await platform.SwitchBeeApi.getDevices()
					await platform.storage.setItem('switchbee-configuration', platform.devices)
				} catch(err) {
					platform.log('ERR:', err.stack || err.message || err)
					platform.log.easyDebug('<<<< ---- Fetching Configurations FAILED! ---- >>>>')
					platform.processingState = false
					if (platform.pollingInterval) {
						platform.log.easyDebug(`Will try again in ${platform.pollingInterval/1000} seconds...`)
						platform.pollingTimeout = setTimeout(platform.refreshState, platform.pollingInterval)
					}
					return
				}

				// get states
				try {
					platform.state = await platform.SwitchBeeApi.getState(Object.keys(platform.devices))
					await platform.storage.setItem('switchbee-raw-state', platform.state)
				} catch(err) {
					platform.log('ERR:', err.stack || err.message || err)
					platform.log.easyDebug('<<<< ---- Refresh State FAILED! ---- >>>>')
					platform.processingState = false
					if (platform.pollingInterval) {
						platform.log.easyDebug(`Will try again in ${platform.pollingInterval/1000} seconds...`)
						platform.pollingTimeout = setTimeout(platform.refreshState, platform.pollingInterval)
					}
					return
				}

				if (platform.setProcessing) {
					platform.processingState = false
					platform.pollingTimeout = setTimeout(platform.refreshState, platform.pollingInterval)
					return
				}
				
				Object.values(platform.connectedDevices).forEach(device => {
					if (device.id in platform.state) {
						if (platform.state[device.id] === -1)
							platform.log.error(`${device.name} is DISCONNECTED !! please check the status in the SwitchBee app...`)
						device.state.update(unified.state[device.type](platform.state[device.id], device))
					}
				})


				// register new devices / unregister removed devices
				platform.syncHomeKitCache()

				// start timeout for next polling
				if (platform.pollingInterval)
					platform.pollingTimeout = setTimeout(platform.refreshState, platform.pollingInterval)

				// block new requests for extra X seconds
				platform.processingState = false

			}, platform.refreshDelay)
		}
	}
}