const unified = require('../SwitchBee/unified')
let Characteristic, Service

class Valve {
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
		this.roomName = deviceInfo.roomName
		this.name = deviceInfo.name + ' ' + deviceInfo.roomName
		this.type = 'Valve'
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
			

		if (this.accessory.context.duration)
			this.duration = this.accessory.context.duration
		else 
			this.accessory.context.duration = this.duration = this.defaultDuration || 3600

		let informationService = this.accessory.getService(Service.AccessoryInformation)

		if (!informationService)
			informationService = this.accessory.addService(Service.AccessoryInformation)

		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial)

		
		this.addValveService()
	}

	addValveService() {
		this.ValveService = this.accessory.getService(Service.Valve)
		if (!this.ValveService)
			this.ValveService = this.accessory.addService(Service.Valve, this.name, this.type)

		
		this.ValveService.getCharacteristic(Characteristic.ValveType)
			.updateValue(2)
				
		this.ValveService.getCharacteristic(Characteristic.Active)
			.on('get', this.stateManager.get.Active)
			.on('set', this.stateManager.set.Active)
	
		this.ValveService.getCharacteristic(Characteristic.InUse)
			.on('get', this.stateManager.get.InUse)
	
		this.ValveService.getCharacteristic(Characteristic.SetDuration)
			.setProps({
				maxValue: 180000,
				minValue: 60,
				minStep: 60
			})
			.on('get', this.stateManager.get.SetDuration)
			.on('set', this.stateManager.set.SetDuration)

		this.ValveService.getCharacteristic(Characteristic.RemainingDuration)
			.setProps({
				maxValue: 180000,
				minValue: 0,
				minStep: 1
			})
			.on('get', this.stateManager.get.RemainingDuration)
	}


	updateHomeKit(newState, offline) {
		if (offline) {
			const error = new this.api.hap.HapStatusError(-70402)
			this.updateValue('ValveService', 'Active', error)
			this.updateValue('ValveService', 'InUse', error)
			this.updateValue('ValveService', 'SetDuration', error)
			this.updateValue('ValveService', 'RemainingDuration', error)
			return
		}

		this.state = newState
		
		this.updateValue('ValveService', 'Active', this.state.Active)
		this.updateValue('ValveService', 'InUse', this.state.Active)
		this.updateValue('ValveService', 'SetDuration', this.duration)
		this.updateValue('ValveService', 'RemainingDuration', this.state.RemainingDuration)
	}

	updateValue (serviceName, characteristicName, newValue) {
		if (this[serviceName].getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			this.log(`${this.name} (${this.id}) - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}
}


module.exports = Valve