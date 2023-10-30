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
		this.id = deviceInfo.id
		this.model = deviceInfo.model
		this.serial = deviceInfo.serial
		this.manufacturer = deviceInfo.manufacturer
		this.name = deviceInfo.name + ' ' + deviceInfo.roomName
		this.type = 'Dimmer'
		this.displayName = this.name
		this.installation = deviceInfo.installation
		this.setDelay = 1000

		this.state = unified.state[this.type](device.state)
		
		this.stateManager = require('./StateManager')(this, platform)

		this.UUID = this.api.hap.uuid.generate(this.id + this.type)
		this.accessory = platform.accessories.find(accessory => accessory.UUID === this.UUID)

		if (!this.accessory) {
			this.log(`Creating New ${platform.PLATFORM_NAME} ${this.type} Accessory: "${this.name}" (id:${this.id})`)
			this.accessory = new this.api.platformAccessory(this.name, this.UUID)
			this.accessory.context.type = this.type
			this.accessory.context.deviceId = this.id

			platform.accessories.push(this.accessory)
			// register the accessory
			this.api.registerPlatformAccessories(platform.PLUGIN_NAME, platform.PLATFORM_NAME, [this.accessory])
		}

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


	updateHomeKit(newState, offline) {
		if (offline) {
			const error = new this.api.hap.HapStatusError(-70402)
			this.updateValue('DimmerService', 'On', error)
			this.updateValue('DimmerService', 'Brightness', error)
			return
		}

		this.state = newState

		this.updateValue('DimmerService', 'On', this.state.On)
		this.updateValue('DimmerService', 'Brightness', this.state.Brightness)
	}

	updateValue (serviceName, characteristicName, newValue) {
		if (this[serviceName].getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			this.log(`${this.name} (${this.id}) - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}
}


module.exports = Dimmer