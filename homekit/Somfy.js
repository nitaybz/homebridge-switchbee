const unified = require('../SwitchBee/unified')
let Characteristic, Service

class Shutter {
	constructor(device, platform, config) {

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
		this.roomName = deviceInfo.roomName
		this.name = deviceInfo.name + ' ' + deviceInfo.roomName
		this.type = 'Somfy'
		this.displayName = this.name
		this.installation = deviceInfo.installation
		this.setDelay = 600
		this.positionState = 2
		this.movingTimeout = null


		this.stateManager = require('./StateManager')(this, platform)

		this.UUID = this.api.hap.uuid.generate(this.id + this.type)
		this.accessory = platform.accessories.find(accessory => accessory.UUID === this.UUID)

		if (!this.accessory) {
			this.log(`Creating New ${platform.PLATFORM_NAME} ${this.type} Accessory: "${this.name}" (id:${this.id})`)
			this.accessory = new this.api.platformAccessory(this.name, this.UUID)
			this.accessory.context.type = this.type
			this.accessory.context.deviceId = this.id

			this.accessory.context.position = 0
			platform.accessories.push(this.accessory)
			// register the accessory
			this.api.registerPlatformAccessories(platform.PLUGIN_NAME, platform.PLATFORM_NAME, [this.accessory])
		}

		this.state =  {
			CurrentPosition: this.accessory.context.position,
			TargetPosition: this.accessory.context.position,
			PositionState: 2
		}
		let informationService = this.accessory.getService(Service.AccessoryInformation)

		if (!informationService)
			informationService = this.accessory.addService(Service.AccessoryInformation)

		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial)

		
		this.addShutterService()

		console.log(this.accessory)
	}

	addShutterService() {
		this.ShutterService = this.accessory.getService(Service.WindowCovering)
		if (!this.ShutterService)
			this.ShutterService = this.accessory.addService(Service.WindowCovering, this.name, this.type)

		this.ShutterService.getCharacteristic(Characteristic.CurrentPosition)
			.on('get', this.stateManager.get.CurrentPosition)

		this.ShutterService.getCharacteristic(Characteristic.TargetPosition)
			.setProps({
				minValue: 0,
				maxValue: 100,
				minStep: 50,
			})
			.on('get', this.stateManager.get.TargetPosition)
			.on('set', this.stateManager.set.SomfyTargetPosition)

		this.ShutterService.getCharacteristic(Characteristic.PositionState)
			.on('get', this.stateManager.get.PositionState)

	}


	updateHomeKit() {
		this.accessory.context.position = this.state.TargetPosition
	}

	updateValue (serviceName, characteristicName, newValue) {
		if (this[serviceName].getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			this.log(`${this.name} (${this.id}) - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}
}


module.exports = Shutter