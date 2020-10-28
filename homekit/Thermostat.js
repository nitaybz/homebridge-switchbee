const unified = require('../SwitchBee/unified')
let Characteristic, Service

class Thermostat {
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
		this.type = 'Thermostat'
		this.displayName = this.name
		this.modes = device.modes
		this.usesFahrenheit = device.temperatureUnits !== 'CELSIUS'
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

		
		this.addHeaterCoolerService()
	}

	addHeaterCoolerService() {
		this.HeaterCoolerService = this.accessory.getService(Service.HeaterCooler)
		if (!this.HeaterCoolerService)
			this.HeaterCoolerService = this.accessory.addService(Service.HeaterCooler, this.name, this.type)

		this.HeaterCoolerService.getCharacteristic(Characteristic.Active)
			.on('get', this.stateManager.get.ACActive)
			.on('set', this.stateManager.set.ACActive)

		this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
			.on('get', this.stateManager.get.CurrentHeaterCoolerState)


		const props = []
		if (this.modes.includes['COOL']) props.push(Characteristic.TargetHeaterCoolerState.COOL)
		if (this.modes.includes['HEAT']) props.push(Characteristic.TargetHeaterCoolerState.HEAT)

		this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState)
			.setProps({validValues: props})
			.on('get', this.stateManager.get.TargetHeaterCoolerState)
			.on('set', this.stateManager.set.TargetHeaterCoolerState)


		this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentTemperature)
			.setProps({
				minValue: -100,
				maxValue: 100,
				minStep: 0.1
			})
			.on('get', this.stateManager.get.CurrentTemperature)

		if (this.modes.includes['COOL']) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature)
				.setProps({
					minValue: 16,
					maxValue: 31,
					minStep: this.usesFahrenheit ? 0.1 : 1
				})
				.on('get', this.stateManager.get.CoolingThresholdTemperature)
				.on('set', this.stateManager.set.CoolingThresholdTemperature)
		}

		if (this.modes.includes['HEAT']) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.HeatingThresholdTemperature)
				.setProps({
					minValue: 16,
					maxValue: 31,
					minStep: this.usesFahrenheit ? 0.1 : 1
				})
				.on('get', this.stateManager.get.HeatingThresholdTemperature)
				.on('set', this.stateManager.set.HeatingThresholdTemperature)
		}

		this.HeaterCoolerService.getCharacteristic(Characteristic.RotationSpeed)
			.on('get', this.stateManager.get.ACRotationSpeed)
			.on('set', this.stateManager.set.ACRotationSpeed)

	}


	updateHomeKit() {
		
		// update measurements
		this.updateValue('HeaterCoolerService', 'CurrentTemperature', this.state.CurrentTemperature)

		// if status is OFF, set all services to INACTIVE
		if (!this.state.Active) {
			this.updateValue('HeaterCoolerService', 'Active', 0)
			this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.INACTIVE)
			return
		}

		// turn on HeaterCoolerService
		this.updateValue('HeaterCoolerService', 'Active', 1)

		// update temperatures for HeaterCoolerService
		this.updateValue('HeaterCoolerService', 'HeatingThresholdTemperature', this.state.TargetTemperature)
		this.updateValue('HeaterCoolerService', 'CoolingThresholdTemperature', this.state.TargetTemperature)

		if (this.state.TargetHeaterCoolerState === 'COOL') {
			this.updateValue('HeaterCoolerService', 'TargetHeaterCoolerState', Characteristic.TargetHeaterCoolerState.COOL)
			this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.COOLING)
		} else {
			this.updateValue('HeaterCoolerService', 'TargetHeaterCoolerState', Characteristic.TargetHeaterCoolerState.HEAT)
			this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.HEATING)
		}

		// cache last state to storage
		this.storage.setItem('switchbee-state', this.cachedState)
	}

	updateValue (serviceName, characteristicName, newValue) {
		if (this[serviceName].getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			this.log.easyDebug(`${this.roomName} ${this.name} (${this.id}) - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}
}


module.exports = Thermostat