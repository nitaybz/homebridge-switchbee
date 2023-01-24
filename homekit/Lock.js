const unified = require('../SwitchBee/unified')
let Characteristic, Service

class Lock {
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
		this.type = 'Lock'
		this.displayName = this.name
		this.installation = deviceInfo.installation
		this.defaultDuration = device.defaultDuration

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

		if (this.defaultDuration)
			this.accessory.context.duration = this.duration = this.defaultDuration
			

		let informationService = this.accessory.getService(Service.AccessoryInformation)

		if (!informationService)
			informationService = this.accessory.addService(Service.AccessoryInformation)

		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial)

		
		this.addLockService()
	}

	addLockService() {
		this.LockService = this.accessory.getService(Service.LockMechanism)
		if (!this.LockService)
			this.LockService = this.accessory.addService(Service.LockMechanism, this.name, this.type)

		this.LockService.getCharacteristic(Characteristic.LockCurrentState)
			.on('get', this.stateManager.get.LockCurrentState)

		this.LockService.getCharacteristic(Characteristic.LockTargetState)
			.on('get', this.stateManager.get.LockTargetState)
			.on('set', this.stateManager.set.LockTargetState)

		if (this.installation === 'TIMED_POWER') {

			if (this.accessory.context.duration)
				this.duration = this.accessory.context.duration
			else 
				this.accessory.context.duration = this.duration = this.defaultDuration || 3600

			this.LockService.getCharacteristic(Characteristic.SetDuration)
				.setProps({
					maxValue: 180000,
					minValue: 60,
					minStep: 60
				})
				.on('get', this.stateManager.get.SetDuration)
				.on('set', this.stateManager.set.SetDuration)
		}
	}


	updateHomeKit(newState) {
		this.state = newState

		this.updateValue('LockService', 'LockCurrentState', this.state.LockState)
		this.updateValue('LockService', 'LockTargetState', this.state.LockState)
	}

	updateValue (serviceName, characteristicName, newValue) {
		if (this[serviceName].getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			this.log(`${this.name} (${this.id}) - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}
}


module.exports = Lock