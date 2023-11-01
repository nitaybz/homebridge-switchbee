const unified = require('../SwitchBee/unified')
let Characteristic, Service

class Occupancy {
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
		this.type = 'Sensor'
		this.displayName = this.name
		this.installation = deviceInfo.installation

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
			this.log(`Creating New ${platform.PLATFORM_NAME} ${this.model} ${this.type} Accessory: "${this.name}" (id:${this.id})`)
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

		
		this.addSensorService()
	}

	addSensorService() {
		switch (this.model) {
			case 'PRESENCE_SENSOR':
				this.SensorService = this.accessory.getService(Service.OccupancySensor)
				if (!this.SensorService)
					this.SensorService = this.accessory.addService(Service.OccupancySensor, this.name, this.type)

				this.SensorService.getCharacteristic(Characteristic.OccupancyDetected)
					.on('get', this.stateManager.get.TriggerDetected)
				break
			case 'FLOOD_SENSOR':
				this.SensorService = this.accessory.getService(Service.LeakSensor)
				if (!this.SensorService)
					this.SensorService = this.accessory.addService(Service.LeakSensor, this.name, this.type)

				this.SensorService.getCharacteristic(Characteristic.LeakDetected)
					.on('get', this.stateManager.get.TriggerDetected)
				break
			case 'MAGNET_SENSOR':
				this.SensorService = this.accessory.getService(Service.ContactSensor)
				if (!this.SensorService)
					this.SensorService = this.accessory.addService(Service.ContactSensor, this.name, this.type)

				this.SensorService.getCharacteristic(Characteristic.ContactSensorState)
					.on('get', this.stateManager.get.TriggerDetected)
				break
			case 'SMOKE_SENSOR':
				this.SensorService = this.accessory.getService(Service.SmokeSensor)
				if (!this.SensorService)
					this.SensorService = this.accessory.addService(Service.SmokeSensor, this.name, this.type)

				this.SensorService.getCharacteristic(Characteristic.SmokeDetected)
					.on('get', this.stateManager.get.TriggerDetected)
				break
		}

		this.SensorService.getCharacteristic(Characteristic.StatusLowBattery)
			.on('get', this.stateManager.get.StatusLowBattery)

		this.SensorService.getCharacteristic(Characteristic.StatusTampered)
			.on('get', this.stateManager.get.StatusTampered)

	}



	updateHomeKit(newState, offline) {
		if (offline) {
			const error = new this.api.hap.HapStatusError(-70402)
			switch (this.model) {
				case 'PRESENCE_SENSOR':
					this.updateValue('SensorService', 'OccupancyDetected', error)
					break
				case 'FLOOD_SENSOR':
					this.updateValue('SensorService', 'LeakDetected', error)
					break
				case 'MAGNET_SENSOR':
					this.updateValue('SensorService', 'ContactSensorState', error)
					break
				case 'SMOKE_SENSOR':
					this.updateValue('SensorService', 'SmokeDetected', error)
					break
			}
			this.updateValue('SensorService', 'StatusLowBattery', error)
			this.updateValue('SensorService', 'StatusTampered', error)
			return
		}

		this.state = newState
		
		switch (this.model) {
			case 'PRESENCE_SENSOR':
				this.updateValue('SensorService', 'OccupancyDetected', this.state.trigger)
				break
			case 'FLOOD_SENSOR':
				this.updateValue('SensorService', 'LeakDetected', this.state.trigger)
				break
			case 'MAGNET_SENSOR':
				this.updateValue('SensorService', 'ContactSensorState', this.state.trigger)
				break
			case 'SMOKE_SENSOR':
				this.updateValue('SensorService', 'SmokeDetected', this.state.trigger)
				break
		}

		this.updateValue('SensorService', 'StatusLowBattery', this.state.lowVoltage)
		this.updateValue('SensorService', 'StatusTampered', this.state.tampered)
	}

	updateValue (serviceName, characteristicName, newValue) {
		if (this[serviceName].getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			this.log(`${this.name} (${this.id}) - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}
}


module.exports = Occupancy