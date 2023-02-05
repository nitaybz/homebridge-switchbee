const unified = require('../SwitchBee/unified')
let Characteristic, Service

function nameCoversion(name) {
	if (name.length < 4 && name.includes('-'))
		return 'Minus'
	else if (name.length < 4 && name.includes('+'))
		return 'Plus'
	else
		return name.replace("+", "plus").replace(/[^\w\s-]/ig, "_")
}

class Switch {
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
		this.type = 'IR'
		this.displayName = this.name
		this.installation = deviceInfo.installation
		this.transmitterId = device.transmitterId
		this.codes = device.codes
		this.SwitchServices = {}

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



		this.codes.forEach(code => {
			this.addSwitchService(code)
		})

		// remove deleted IR switches
		this.accessory.services.forEach(service => {
			if (service.UUID === "0000003E-0000-1000-8000-0026BB765291")
				return
			const codeFound = this.codes.find(code => {
				const name = nameCoversion(code.name)
				return (service.subtype === `${name}${code.value}`)
			})
			if (!codeFound) {
				this.log(`Removing delete IR Command "${service.displayName}" from : "${this.name}" (id:${this.id})`)
				this.accessory.removeService(service)
			}
		})
	}

	addSwitchService(code) {
		code.name = nameCoversion(code.name)
		this.SwitchServices[code.value] = this.accessory.getService(`${code.name}${code.value}`)
		if (!this.SwitchServices[code.value])
			this.SwitchServices[code.value] = this.accessory.addService(Service.Switch, code.name, `${code.name}${code.value}`)

		this.log(`Adding New IR Command "${code.name}" to : "${this.name}" (id:${this.id})`)
		this.SwitchServices[code.value].getCharacteristic(Characteristic.On)
			.on('get', (callback) => {
				callback(null, false)
			})
			.on('set', this.stateManager.set.IR.bind(this, code))
		
		this.SwitchServices[code.value].addOptionalCharacteristic(Characteristic.ConfiguredName)
		this.SwitchServices[code.value].setCharacteristic(Characteristic.ConfiguredName, code.name)
		
	}

	updateHomeKit() {
		// this.updateValue('SwitchService', 'On', false)
	}

	updateValue (serviceName, characteristicName, newValue) {
		if (this[serviceName].getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			// this.log(`${this.name} (${this.id}) - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}
}

module.exports = Switch