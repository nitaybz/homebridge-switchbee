const unified = require('../SwitchBee/unified')
let Characteristic, Service

class Dimmer {
	constructor(device, platform) {

		Service = platform.api.hap.Service
		Characteristic = platform.api.hap.Characteristic
		
		const deviceInfo = unified.deviceInformation(device)
		
		this.log = platform.log
		this.api = platform.api
		this.storage = platform.storage
		this.cachedState = platform.cachedState
		this.id = deviceInfo.id
		this.model = deviceInfo.model
		this.serial = deviceInfo.serial
		this.manufacturer = deviceInfo.manufacturer
		this.roomName = deviceInfo.roomName
		this.name = deviceInfo.name
		this.type = 'Dimmer'
		this.displayName = this.name
		this.installation = deviceInfo.installation

		this.state = this.cachedState[this.id] = unified.state[this.type](device.state)
		
		const StateHandler = require('../SwitchBee/StateHandler')(this, platform)
		this.state = new Proxy(this.state, StateHandler)

		this.stateManager = require('./StateManager')(this, platform)

		this.UUID = this.api.hap.uuid.generate(this.id + this.type)
		this.accessory = platform.accessories.find(accessory => accessory.UUID === this.UUID)

		if (!this.accessory) {
			this.log(`Creating New ${platform.PLATFORM_NAME} ${this.type} Accessory in the ${this.roomName}: "${this.name}" (id:${this.id})`)
			this.accessory = new this.api.platformAccessory(this.name, this.UUID)
			this.accessory.context.type = this.type
			this.accessory.context.deviceId = this.id

			platform.accessories.push(this.accessory)
			// register the accessory
			this.api.registerPlatformAccessories(platform.PLUGIN_NAME, platform.PLATFORM_NAME, [this.accessory])
		}

		this.accessory.context.roomName = this.roomName

		let informationService = this.accessory.getService(Service.AccessoryInformation)

		if (!informationService)
			informationService = this.accessory.addService(Service.AccessoryInformation)

		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial)

		
		this.addDimmerService()
	}

	addDimmerService() {
		this.DimmerService = this.accessory.getService(Service.Lightbulb)
		if (!this.DimmerService)
			this.DimmerService = this.accessory.addService(Service.Lightbulb, this.name, this.type)

		this.DimmerService.getCharacteristic(Characteristic.On)
			.on('get', this.stateManager.get.On)
			.on('set', this.stateManager.set.On)

		this.DimmerService.getCharacteristic(Characteristic.Brightness)
			.on('get', this.stateManager.get.Brightness)
			.on('set', this.stateManager.set.Brightness)
	}


	updateHomeKit() {
		this.updateValue('DimmerService', 'On', this.state.On)
		this.updateValue('DimmerService', 'Brightness', this.state.Brightness)
		// cache last state to storage
		this.storage.setItem('switchbee-state', this.cachedState)
	}

	updateValue (serviceName, characteristicName, newValue) {
		if (this[serviceName].getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			this.log.easyDebug(`${this.roomName} - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}
}


module.exports = Dimmer