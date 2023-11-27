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
		this.id = deviceInfo.id
		this.model = deviceInfo.model
		this.serial = deviceInfo.serial
		this.manufacturer = deviceInfo.manufacturer
		this.roomName = deviceInfo.roomName
		this.name = deviceInfo.name + ' ' + deviceInfo.roomName
		this.type = 'Thermostat'
		this.displayName = this.name
		this.modes = ['COOL', 'HEAT', 'FAN']
		this.usesFahrenheit = false
		this.installation = deviceInfo.installation
		this.setDelay = 600

		this.state = unified.state[this.type](device.state)
		if (device.state === 'OFFLINE') {
			setTimeout(() => {
				// report offline
				this.log.easyDebug(`${device.name} is DISCONNECTED !! please check the status in the SwitchBee app...`)
				this.updateHomeKit(null, true)
			}, 2000)
		}

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

		
		this.addHeaterCoolerService()
	}

	addHeaterCoolerService() {

		const active = this.state.Active
		const mode = this.state.mode
		const targetTemp = this.state.TargetTemperature
		const currentTemp = this.state.CurrentTemperature



		this.HeaterCoolerService = this.accessory.getService(Service.HeaterCooler)
		if (!this.HeaterCoolerService)
			this.HeaterCoolerService = this.accessory.addService(Service.HeaterCooler, this.name, this.type)

		this.HeaterCoolerService.getCharacteristic(Characteristic.Active)
			.onSet(this.stateManager.ACActive)
			.updateValue(!active || mode === 'FAN'|| mode === 'DRY' ? 0 : 1)

		let currentState

		if (!active || mode === 'FAN' || mode === 'DRY')
			currentState = Characteristic.CurrentHeaterCoolerState.INACTIVE
		else if (mode === 'COOL')
			currentState = Characteristic.CurrentHeaterCoolerState.COOLING
		else if (mode === 'HEAT')
			currentState = Characteristic.CurrentHeaterCoolerState.HEATING
		else if (currentTemp > targetTemp)
			currentState = Characteristic.CurrentHeaterCoolerState.COOLING
		else
			currentState = Characteristic.CurrentHeaterCoolerState.HEATING

		this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
			.updateValue(currentState)

		const props = []
		if (this.modes.includes('COOL')) props.push(Characteristic.TargetHeaterCoolerState.COOL)
		if (this.modes.includes('HEAT')) props.push(Characteristic.TargetHeaterCoolerState.HEAT)

		let targetState = this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
		if (['COOL', 'HEAT','AUTO'].includes(mode))
			targetState = Characteristic.TargetHeaterCoolerState[mode]

		this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState)
			.setProps({validValues: props})
			.onSet(this.stateManager.TargetHeaterCoolerState)
			.updateValue(targetState)


		this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentTemperature)
			.setProps({
				minValue: -100,
				maxValue: 100,
				minStep: 0.1
			})
			.updateValue(currentTemp)

		if (this.modes.includes('COOL')) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature)
				.setProps({
					minValue: 16,
					maxValue: 31,
					minStep: this.usesFahrenheit ? 0.1 : 1
				})
				.onSet(this.stateManager.CoolingThresholdTemperature)
				.updateValue(targetTemp)
		}

		if (this.modes.includes('HEAT')) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.HeatingThresholdTemperature)
				.setProps({
					minValue: 16,
					maxValue: 31,
					minStep: this.usesFahrenheit ? 0.1 : 1
				})
				.onSet(this.stateManager.HeatingThresholdTemperature)
				.updateValue(targetTemp)
		}

		this.HeaterCoolerService.getCharacteristic(Characteristic.RotationSpeed)
			.onSet(this.stateManager.ACRotationSpeed)
			.updateValue(this.state.fanSpeed)

	}


	updateHomeKit(newState, offline) {
		if (offline) {
			const error = new this.api.hap.HapStatusError(-70402)
			this.updateValue('HeaterCoolerService', 'CurrentTemperature', error)
			this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', error)
			this.updateValue('HeaterCoolerService', 'TargetHeaterCoolerState', error)
			this.updateValue('HeaterCoolerService', 'CoolingThresholdTemperature', error)
			return
		}

		this.state = newState
		
		
		// update measurements
		this.updateValue('HeaterCoolerService', 'CurrentTemperature', this.state.CurrentTemperature)

		// if status is OFF, set all services to INACTIVE
		if (!this.state.Active) {
			this.updateValue('HeaterCoolerService', 'Active', 0)
			this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.INACTIVE)
		} else {
			// turn on HeaterCoolerService
			this.updateValue('HeaterCoolerService', 'Active', 1)
			if (this.state.mode === 'COOL') {
				this.updateValue('HeaterCoolerService', 'TargetHeaterCoolerState', Characteristic.TargetHeaterCoolerState.COOL)
				this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.COOLING)
			} else if (this.state.mode === 'HEAT') {
				this.updateValue('HeaterCoolerService', 'TargetHeaterCoolerState', Characteristic.TargetHeaterCoolerState.HEAT)
				this.updateValue('HeaterCoolerService', 'CurrentHeaterCoolerState', Characteristic.CurrentHeaterCoolerState.HEATING)
			}
		}

		// update temperatures for HeaterCoolerService
		this.updateValue('HeaterCoolerService', 'HeatingThresholdTemperature', this.state.TargetTemperature)
		this.updateValue('HeaterCoolerService', 'CoolingThresholdTemperature', this.state.TargetTemperature)
		this.updateValue('HeaterCoolerService', 'RotationSpeed', this.state.fanSpeed)

	}

	updateValue (serviceName, characteristicName, newValue) {
		if (this[serviceName].getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			this.log(`${this.name} (${this.id}) - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}
}


module.exports = Thermostat