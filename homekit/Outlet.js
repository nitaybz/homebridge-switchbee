const unified = require('../SwitchBee/unified')
let Characteristic, Service

class Outlet {
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
		this.type = 'Outlet'
		this.displayName = this.name
		this.installation = deviceInfo.installation
		this.defaultDuration = device.defaultDuration

		this.state = this.cachedState[this.id] = unified.state[this.type](device.state)

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
		
		if (this.defaultDuration)
			this.accessory.context.duration = this.duration = this.defaultDuration

		this.accessory.context.roomName = this.roomName

		let informationService = this.accessory.getService(Service.AccessoryInformation)

		if (!informationService)
			informationService = this.accessory.addService(Service.AccessoryInformation)

		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial)

		
		this.addOutletService()
	}

	addOutletService() {
		this.OutletService = this.accessory.getService(Service.Outlet)
		if (!this.OutletService)
			this.OutletService = this.accessory.addService(Service.Outlet, this.name, this.type)


		this.OutletService.getCharacteristic(Characteristic.On)
			.on('get', this.stateManager.get.On)
			.on('set', this.stateManager.set.On)

		this.OutletService.getCharacteristic(Characteristic.OutletInUse)
			.on('get', this.stateManager.get.OutletInUse)

		if (this.installation === 'TIMED_POWER') {

			if (this.accessory.context.duration)
				this.duration = this.accessory.context.duration
			else 
				this.accessory.context.duration = this.duration = this.defaultDuration || 5400

			this.OutletService.getCharacteristic(Characteristic.SetDuration)
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
		
		this.updateValue('OutletService', 'On', this.state.On)
		this.updateValue('OutletService', 'OutletInUse', this.state.On)
		// cache last state to storage
		this.storage.setItem('switchbee-state', this.cachedState)
	}

	updateValue (serviceName, characteristicName, newValue) {
		if (this[serviceName].getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			this.log(`${this.roomName} ${this.name} (${this.id}) - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}
}


module.exports = Outlet