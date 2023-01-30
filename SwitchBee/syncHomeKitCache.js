const Switch = require('../homekit/Switch')
const Dimmer = require('../homekit/Dimmer')
const Outlet = require('../homekit/Outlet')
const Valve = require('../homekit/Valve')
const Lock = require('../homekit/Lock')
const Shutter = require('../homekit/Shutter')
const Scene = require('../homekit/Scene')
const Thermostat = require('../homekit/Thermostat')
const IR = require('../homekit/IR')
const Somfy = require('../homekit/Somfy')

module.exports = (platform) => {
	return () => {

		
		Object.values(platform.devices).forEach(device => {

			const deviceConfig = platform.devicesConfig.find(deviceConfig => deviceConfig.id === device.id)
			if (deviceConfig && deviceConfig.hide){
				delete platform.connectedDevices[device.id]
				return // ignoring hidden devices
			}

			if (device.id in platform.connectedDevices)
				return

			device.state = platform.state[device.id]

			if (!device.state) {
				platform.log.easyDebug(`Could not retrieve ${device.zone} ${device.name} state! skipping...`)
				return
			}
				

			const accessoryType = (deviceConfig && deviceConfig.accessoryType) ? deviceConfig.accessoryType.toLowerCase() : 'switch'
			device.defaultDuration = deviceConfig && deviceConfig.defaultDuration ? deviceConfig.defaultDuration * 60 : null

			switch(device.type) {
				case 'SWITCH': 
				case 'TIMED_SWITCH':
				case 'GROUP_SWITCH':
				case 'LOCK_GROUP':
					switch (accessoryType) {
						case 'outlet': 
							platform.connectedDevices[device.id] = new Outlet(device, platform)
							break
						case 'lock':
							platform.connectedDevices[device.id] = new Lock(device, platform)
							break
						default:
							platform.connectedDevices[device.id] = new Switch(device, platform)
							break
					}
					break

				case 'TIMED_POWER':
					switch (accessoryType) {
						case 'outlet': 
							platform.connectedDevices[device.id] = new Outlet(device, platform)
							break
						case 'lock':
							platform.connectedDevices[device.id] = new Lock(device, platform)
							break
						case 'valve':
							platform.connectedDevices[device.id] = new Valve(device, platform)
							break
						default:
							platform.connectedDevices[device.id] = new Switch(device, platform)
							break
					}
					break

				case 'DIMMER':
					platform.connectedDevices[device.id] = new Dimmer(device, platform)
					break

				case 'SCENARIO':
				case 'ROLLING_SCENARIO':
					platform.connectedDevices[device.id] = new Scene(device, platform)
					break

				case 'LOUVERED_SHUTTER':
				case 'SHUTTER':
					platform.connectedDevices[device.id] = new Shutter(device, platform, deviceConfig)
					break

				case 'SOMFY':
					platform.connectedDevices[device.id] = new Somfy(device, platform)
					break

				case 'THERMOSTAT':
				case 'VRF_AC':
					platform.connectedDevices[device.id] = new Thermostat(device, platform)
					break
				
				case 'IR_DEVICE':
					platform.connectedDevices[device.id] = new IR(device, platform)
					break
					
				
			}
		})

		if (platform.preventRemoval)
			return

		if (!platform.connectedDevices || !Object.keys(platform.connectedDevices).length)
			return


		const devicesDetected = Object.keys(platform.devices).map(id => parseInt(id))
		// find devices to remove
		const accessoriesToRemove = []
		platform.accessories.forEach(accessory => {
			const id = accessory.context.deviceId

			if (!(id in platform.connectedDevices)) {
				platform.log(`Removing device id: ${id}, not in connectedDevices (might be hidden in the config)!`)
				accessoriesToRemove.push(accessory)
				return
			}
			
			if (platform.connectedDevices[id].UUID !== accessory.UUID) {
				platform.log(`Removing device id: ${id}, "Type" changed!`)
				accessoriesToRemove.push(accessory)
				return
			}


			if (!devicesDetected.includes(id)) {
				platform.log(`Removing device id: ${id}, Not detected!`)
				accessoriesToRemove.push(accessory)
				delete platform.connectedDevices[id]
				return
			}

		})

		if (accessoriesToRemove.length) {
			platform.log.easyDebug('Unregistering Unnecessary Cached Devices:')
			platform.log.easyDebug(accessoriesToRemove)

			// unregistering accessories
			platform.api.unregisterPlatformAccessories(platform.PLUGIN_NAME, platform.PLATFORM_NAME, accessoriesToRemove)

			// remove from cachedAccessories
			platform.accessories = platform.accessories.filter( cachedAccessory => !accessoriesToRemove.find(accessory => accessory.UUID === cachedAccessory.UUID) )

		}
	}
}