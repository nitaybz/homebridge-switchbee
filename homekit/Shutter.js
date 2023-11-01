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
		this.type = 'Shutter'
		this.displayName = this.name
		this.installation = deviceInfo.installation
		this.shutterTilt = config && config.shutterTilt ? config.shutterTilt : null
		this.fullMovementTimeInSec = config && config.fullMovementTimeInSec ? config.fullMovementTimeInSec : null
		this.setDelay = 600
		this.positionState = 2
		this.movingTimeout = null

		this.state = unified.state[this.type](device.state, device)
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
		if (this.shutterTilt)
			this.tiltAngle = 'tiltAngle' in this.accessory.context ? this.accessory.context.tiltAngle : 90


		let informationService = this.accessory.getService(Service.AccessoryInformation)

		if (!informationService)
			informationService = this.accessory.addService(Service.AccessoryInformation)

		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial)

		
		this.addShutterService()
	}

	addShutterService() {
		this.ShutterService = this.accessory.getService(Service.WindowCovering)
		if (!this.ShutterService)
			this.ShutterService = this.accessory.addService(Service.WindowCovering, this.name, this.type)

		this.ShutterService.getCharacteristic(Characteristic.CurrentPosition)
			.on('get', this.stateManager.get.CurrentPosition)

		this.ShutterService.getCharacteristic(Characteristic.TargetPosition)
			.on('get', this.stateManager.get.TargetPosition)
			.on('set', this.stateManager.set.TargetPosition)

		this.ShutterService.getCharacteristic(Characteristic.PositionState)
			.on('get', this.stateManager.get.PositionState)

		switch (this.shutterTilt) {
			case 'vertical': 
				this.ShutterService.getCharacteristic(Characteristic.TargetVerticalTiltAngle)
					.on('get', this.stateManager.get.TargetTiltAngle)
					.on('set', this.stateManager.set.TargetTiltAngle)

				this.ShutterService.getCharacteristic(Characteristic.CurrentVerticalTiltAngle)
					.on('get', this.stateManager.get.TargetTiltAngle)
				break
			case 'horizontal':
				this.ShutterService.getCharacteristic(Characteristic.TargetHorizontalTiltAngle)
					.on('get', this.stateManager.get.TargetTiltAngle)
					.on('set', this.stateManager.set.TargetTiltAngle)

				this.ShutterService.getCharacteristic(Characteristic.CurrentHorizontalTiltAngle)
					.on('get', this.stateManager.get.TargetTiltAngle)
				break
		}
	}


	updateHomeKit(newState, offline) {
		if (offline) {
			const error = new this.api.hap.HapStatusError(-70402)
			this.updateValue('ShutterService', 'CurrentPosition', error)
			this.updateValue('ShutterService', 'TargetPosition', error)
			this.updateValue('ShutterService', 'PositionState', error)
			return
		}

		this.state = newState
			
		// set Tilt Angle
		switch (this.shutterTilt) {
			case 'vertical': 
				this.tiltAngle = this.getTilt(this.state.CurrentPosition, this.ShutterService.getCharacteristic(Characteristic.TargetPosition).value, this.tiltAngle)
				this.accessory.context.tiltAngle = this.tiltAngle
				this.updateValue('ShutterService', 'TargetVerticalTiltAngle', this.tiltAngle)
				this.updateValue('ShutterService', 'CurrentVerticalTiltAngle', this.tiltAngle)
				break
			case 'horizontal':
				this.tiltAngle = this.getTilt(this.state.CurrentPosition, this.ShutterService.getCharacteristic(Characteristic.TargetPosition).value, this.tiltAngle)
				this.accessory.context.tiltAngle = this.tiltAngle
				this.updateValue('ShutterService', 'TargetHorizontalTiltAngle', this.tiltAngle)
				this.updateValue('ShutterService', 'CurrentHorizontalTiltAngle', this.tiltAngle)
				break
		}
		if (this.positionState === 2)
			this.updateValue('ShutterService', 'CurrentPosition', this.state.CurrentPosition)

		this.updateValue('ShutterService', 'TargetPosition', this.state.TargetPosition)
		this.updateValue('ShutterService', 'PositionState', this.positionState)

	}

	updateValue (serviceName, characteristicName, newValue) {
		if (this[serviceName].getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
			this[serviceName].getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
			this.log(`${this.name} (${this.id}) - Updated '${characteristicName}' for ${serviceName} with NEW VALUE: ${newValue}`)
		}
	}

	getTilt(newValue, oldValue, tilt) {
		// if opened
		if (newValue > oldValue + 1)
			return 90

		// if closed
		if (newValue < oldValue - 1)
			return -90
		
		// if no change return current tilt
		return tilt
	}

	setPositionState(targetPosition, currentPosition) {
		clearTimeout(this.movingTimeout)
		if (this.positionState !== 2) {
			this.log.easyDebug(this.name + ' -> Setting Position State to STOPPED')
			this.positionState = 2
			this.updateValue('ShutterService', 'PositionState', this.positionState)
			return
		}

		const diff = Math.abs(targetPosition - currentPosition)
		const calcTimeInSeconds = diff * this.fullMovementTimeInSec / 100

		const isOpening = targetPosition > currentPosition ? 1 : 0
		this.log.easyDebug(this.name + ' -> Setting Position State to ' + (isOpening ? 'OPENING' : 'CLOSING'))
		this.positionState = isOpening
		this.updateValue('ShutterService', 'PositionState', this.positionState)

		this.movingTimeout = setTimeout(() => {
			
			this.updateValue('ShutterService', 'CurrentPosition', targetPosition)
			this.log.easyDebug(this.name + ' -> Setting Position State to STOPPED')
			this.positionState = 2
			this.updateValue('ShutterService', 'PositionState', this.positionState)

		}, calcTimeInSeconds * 1000)
	}
}


module.exports = Shutter