const unified = require('../SwitchBee/unified')
let Characteristic

function toFahrenheit(value) {
	return Math.round((value * 1.8) + 32)
}

function characteristicToMode(characteristic) {
	switch (characteristic) {
		case Characteristic.TargetHeaterCoolerState.COOL:
			return 'COOL'
		case Characteristic.TargetHeaterCoolerState.HEAT:
			return 'HEAT'
		case Characteristic.TargetHeaterCoolerState.AUTO:
			return 'AUTO'
	}
}

module.exports = (device, platform) => {
	Characteristic = platform.api.hap.Characteristic
	const log = platform.log
	const SwitchBeeApi = platform.SwitchBeeApi
	device.pending = []

	function setState (state) {
		platform.setProcessing = true
		if (typeof state === 'undefined')
			state = device.state
			
		device.tempState = unified.setState(device, state)

		return new Promise((res) => {
			device.pending.push({ resolve: res});
			clearTimeout(device.setTimeout)
			device.setTimeout = setTimeout(() => {
				const sendingState = device.tempState
				device.tempState = null
				const currentPending = device.pending
				device.pending = []

				// always resolve for better experience
				currentPending.forEach(({ resolve }) => resolve())
				let id = device.id
				if (device.type === 'IR')
					id = device.transmitterId

				log(device.name, ' -> Setting New State:', JSON.stringify(sendingState, null, 2))
				SwitchBeeApi.setDeviceState(id, sendingState)
					.catch((err) => {
						log.error(`ERROR setting status of ${device.name}:`)
						log.error(err.message || err.stack || err)
					})
					.finally(() => {
						platform.setProcessing = false
					})
			}, device.setDelay || 0)
		})
	}

	return {
		On: (state) => {
			device.state.On = state
			log(device.name + ' -> Setting On state to', state)
			return setState(device.state)
		},

		Scene: (state) => {
			if (state) {
				log(device.name + ' -> Setting Scene On')
				setInterval(() => {
					device.SwitchService.getCharacteristic(Characteristic.On).updateValue(false)
				}, 2000)
				return setState({On: true})
			}
		},

		IR: (code, state) => {
			if (state) {
				log(`${device.name} -> Sending IR Command ${code.name}(${code.value})`)
				setInterval(() => {
					device.SwitchServices[code.value].getCharacteristic(Characteristic.On).updateValue(false)
				}, 2000)
				return setState(code.value)
			}
		},

		Brightness: (brightness) => {
			if (brightness > 0) {
				device.state.Brightness = brightness
			} else
				device.state.On = false
			log(device.name + ' -> Setting Brightness to', brightness + '%')
			return setState(device.state)
		},

		LockTargetState: (state) => {
			device.state.LockState = state
			log(device.name + ' -> Setting Lock State to', state ? 'SECURED' : 'UNSECURED')
			return setState(device.state)
		},

		Active: (state) => {
			device.state.Active = state
			log(device.name + ' -> Setting Active state to', state)
			return setState(device.state)
		},

		SetDuration: (seconds) => {
			const hours = Math.floor(seconds / 60 / 60)
			const minutes = Math.floor(seconds / 60) % 60
			const formattedTime = hours + ':' + ('0' + minutes).slice(-2)
			log(device.name + ' -> Setting Duration to', formattedTime)
			device.duration = seconds
			device.accessory.context.duration = seconds	
			return setState(device.state)
		},

		TargetPosition: (position) => {
			const currentPosition = device.ShutterService.getCharacteristic(Characteristic.CurrentPosition).value
			device.tiltAngle = device.getTilt(position, currentPosition, device.tiltAngle)
			if (device.fullMovementTimeInSec)
				device.setPositionState(position, currentPosition)

			device.state.TargetPosition = position
			if (device.positionState === 2)
				log(device.name + ' -> Setting Position to' + position + '%')
			else
				log(device.name + ' -> Shutters are busy - Stopping them!')
			
			return setState(device.state)
		},

		SomfyTargetPosition: (position) => {
			clearTimeout(device.setPositionTimeout)
			log(device.name + ' -> Setting Position to' + position + '%')
			device.state.TargetPosition = position
			let command
			if (position  < 20) {
				device.positionState = 0
				command = 'DOWN'

			} else if (position > 80) {
				device.positionState = 1
				command = 'UP'

			} else {
				device.positionState = 2
				command = 'MY'
			}
			device.ShutterService.getCharacteristic(Characteristic.PositionState).updateValue(device.positionState)
			device.setPositionTimeout = setTimeout(() => {
				device.positionState = 2
				device.state.CurrentPosition = position
				device.ShutterService.getCharacteristic(Characteristic.CurrentPosition).updateValue(position)
				device.ShutterService.getCharacteristic(Characteristic.TargetPosition).updateValue(position)
				device.ShutterService.getCharacteristic(Characteristic.PositionState).updateValue(device.positionState)
			}, 3000)

			return setState(command)
		},

		TargetTiltAngle: (angle) => {
			const tiltAngle = device.tiltAngle
			log(device.name + ' -> Setting Tilt to ' + angle + '°')
			if (angle > tiltAngle) {
				device.tiltAngle = device.tiltAngle !== 0 ? 0 : 90
				const newPosition = device.state.CurrentPosition + 1
				device.state.CurrentPosition = newPosition
				log(device.name + ' -> Setting Position to' + newPosition + '%')
			} else if (angle < tiltAngle) {
				device.tiltAngle = device.tiltAngle !== 0 ? 0 : -90
				const newPosition = device.state.CurrentPosition - 1
				device.state.CurrentPosition = newPosition
				log(device.name + ' -> Setting Position to' + newPosition + '%')
			}
			
			return setState(device.state)
		},

		ACActive: (state) => {
			setTimeout(() => {
				state = !!state
				log.easyDebug(device.name + ' -> Setting AC state Active:', state)
	
				if (state) {
					device.state.Active = 1
					let mode = device.state.mode
					if (mode === 'FAN' && mode === 'DRY')
						mode = characteristicToMode(device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value)
					log.easyDebug(device.name + ' -> Setting Mode to', mode)
					device.state.mode = mode
				} else if (device.state.mode === 'COOL' || device.state.mode === 'HEAT' || device.state.mode === 'AUTO')
					device.state.Active = 0
	
				return setState(device.state)
			}, 50)
		},
	
	
		TargetHeaterCoolerState: (state) => {
			const mode = characteristicToMode(state)
			log.easyDebug(device.name + ' -> Setting Target HeaterCooler State:', mode)
			device.state.mode = mode
			device.state.Active = 1

			return setState(device.state)
		},
	
		CoolingThresholdTemperature: (temp) => {
			if (device.usesFahrenheit)
				log.easyDebug(device.name + ' -> Setting Cooling Threshold Temperature:', toFahrenheit(temp) + 'ºF')
			else
				log.easyDebug(device.name + ' -> Setting Cooling Threshold Temperature:', temp + 'ºC')

			device.state.Active = 1
			const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
			const mode = characteristicToMode(lastMode)
			if (mode !== 'AUTO') {
				device.state.TargetTemperature = temp
				// log.easyDebug(device.name + ' -> Setting Mode to: COOL')
				device.state.mode = 'COOL'
			} else {
				if (device.state.TargetTemperature !== temp) {
					setTimeout(() => {
						device.state.TargetTemperature = temp
						// log.easyDebug(device.name + ' -> Setting Mode to: AUTO')
						device.state.mode = 'AUTO'
					},100)
				}
			}

			return setState(device.state)
		},
	
		HeatingThresholdTemperature: (temp) => {
			if (device.usesFahrenheit)
				log.easyDebug(device.name + ' -> Setting Heating Threshold Temperature:', toFahrenheit(temp) + 'ºF')
			else
				log.easyDebug(device.name + ' -> Setting Heating Threshold Temperature:', temp + 'ºC')


			device.state.Active = 1
			const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
			const mode = characteristicToMode(lastMode)
			if (mode !== 'AUTO') {
				device.state.TargetTemperature = temp
				// log.easyDebug(device.name + ' -> Setting Mode to: HEAT')
				device.state.mode = 'HEAT'
			} else {
				if (device.state.TargetTemperature !== temp) {
					setTimeout(() => {
						device.state.TargetTemperature = temp
						// log(device.name + ' -> Setting Mode to: AUTO')
						device.state.mode = 'AUTO'
					},100)
				}
			}

			return setState(device.state)
		},
		ACSwing: (state) => {
			
			state = state === Characteristic.SwingMode.SWING_ENABLED ? 'SWING_ENABLED' : 'SWING_DISABLED'
			log(device.name + ' -> Setting AC Swing:', state)
			device.state.swing = state

			const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
			const mode = characteristicToMode(lastMode)
			// log(device.name + ' -> Setting Mode to', mode)
			device.state.Active = 1
			device.state.mode = mode

			return setState(device.state)
		},
	
		ACRotationSpeed: (speed) => {
			log(device.name + ' -> Setting AC Rotation Speed:', speed + '%')
			device.state.fanSpeed = speed

			const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
			const mode = characteristicToMode(lastMode)
			// log(device.name + ' -> Setting Mode to', mode)
			device.state.Active = 1
			device.state.mode = mode

			return setState(device.state)
		}
	}

}