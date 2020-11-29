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

	return {

		get: {

			On: (callback) => {
				const on = device.state.On
				log.easyDebug(device.name, ' - On State:', on)
				callback(null, on)
			},

			OutletInUse: (callback) => {
				const on = device.state.On
				// log.easyDebug(device.name, ' - OutletInUse State:', on)
				callback(null, on)
			},

			Brightness: (callback) => {
				const brightness = device.state.Brightness
				log.easyDebug(device.name, ' - Brightness State:', brightness)
				callback(null, brightness)
			},

			LockCurrentState: (callback) => {
				const lockState = device.state.LockState
				log.easyDebug(device.name, ' - Lock Current State  is:', lockState ? 'SECURED': 'UNSECURED')
				callback(null, lockState)
			},

			LockTargetState: (callback) => {
				const lockState = device.state.LockState
				// log.easyDebug(device.name, ' - Lock Target State  is:', lockState ? 'SECURED': 'UNSECURED')
				callback(null, lockState)
			},

			Active: (callback) => {
				const active = device.state.Active
				log.easyDebug(device.name, ' - Active State:', active)
				callback(null, active)
			},

			InUse: (callback) => {
				const active = device.state.Active
				// log.easyDebug(device.name, ' - InUse State:', active)
				callback(null, active)
			},

			SetDuration: (callback) => {
				const duration = device.duration
				log.easyDebug(device.name, ' - Duration is:', duration)
				callback(null, duration)
			},

			RemainingDuration: (callback) => {
				const duration = device.state.RemainingDuration
				log.easyDebug(device.name, ' - Remaining Duration is:', duration)
				callback(null, duration)
			},

			CurrentPosition: (callback) => {
				const position = device.state.CurrentPosition
				log.easyDebug(device.name, ' - Current Position is:', position)
				callback(null, position)
			},

			TargetPosition: (callback) => {
				const position = device.state.TargetPosition
				log.easyDebug(device.name, ' - Target Position is:', position)
				callback(null, position)
			},

			PositionState: (callback) => {
				const positionState = device.positionState
				log.easyDebug(device.name, ' - Position State is:', positionState)
				callback(null, positionState)
			},

			TargetTiltAngle: (callback) => {
				const tiltAngle = device.tiltAngle
				log.easyDebug(device.name, ' - Tilt Angle is:', tiltAngle)
				callback(null, tiltAngle)
			},

			ACActive: (callback) => {
				const active = device.state.Active
				const mode = device.state.mode
		
				if (!active || mode === 'FAN'|| mode === 'DRY') {
					log.easyDebug(device.name, ' - Active State: false')
					callback(null, 0)
				} else {
					log.easyDebug(device.name, ' - AC Active State: true')
					callback(null, 1)
				}
			},

			CurrentHeaterCoolerState: (callback) => {
				const active = device.state.Active
				const mode = device.state.mode
				const targetTemp = device.state.targetTemperature
				const currentTemp = device.state.currentTemperature
		
				log.easyDebug(device.name, ' - Current HeaterCooler State is:', active ? mode : 'OFF')
				
				if (!active || mode === 'FAN' || mode === 'DRY')
					callback(null, Characteristic.CurrentHeaterCoolerState.INACTIVE)
				else if (mode === 'COOL')
					callback(null, Characteristic.CurrentHeaterCoolerState.COOLING)
				else if (mode === 'HEAT')
					callback(null, Characteristic.CurrentHeaterCoolerState.HEATING)
				else if (currentTemp > targetTemp)
					callback(null, Characteristic.CurrentHeaterCoolerState.COOLING)
				else
					callback(null, Characteristic.CurrentHeaterCoolerState.HEATING)
			},
		
			TargetHeaterCoolerState: (callback) => {
				const active = device.state.Active
				const mode = device.state.mode
		
				log.easyDebug(device.name, ' - Target HeaterCooler State is:', active ? mode : 'OFF')
				if (!active || mode === 'FAN' || mode === 'DRY')
					callback(null, null)
				else
					callback(null, Characteristic.TargetHeaterCoolerState[mode])
			},

			CurrentTemperature: (callback) => {
				const currentTemp = device.state.currentTemperature
				if (device.usesFahrenheit)
					log.easyDebug(device.name, ' - Current Temperature is:', toFahrenheit(currentTemp) + 'ºF')
				else
					log.easyDebug(device.name, ' - Current Temperature is:', currentTemp + 'ºC')

				callback(null, currentTemp)
			},

			CoolingThresholdTemperature: (callback) => {
				const targetTemp = device.state.targetTemperature

				if (device.usesFahrenheit)
					log.easyDebug(device.name, ' - Target Cooling Temperature is:', toFahrenheit(targetTemp) + 'ºF')
				else
					log.easyDebug(device.name, ' - Target Cooling Temperature is:', targetTemp + 'ºC')

				callback(null, targetTemp)
			},
			
			HeatingThresholdTemperature: (callback) => {
				const targetTemp = device.state.targetTemperature

				if (device.usesFahrenheit)
					log.easyDebug(device.name, ' - Target Heating Temperature is:', toFahrenheit(targetTemp) + 'ºF')
				else
					log.easyDebug(device.name, ' - Target Heating Temperature is:', targetTemp + 'ºC')

				callback(null, targetTemp)
			},

			ACRotationSpeed: (callback) => {
				const active = device.state.Active
				const mode = device.state.mode
				const fanSpeed = device.state.fanSpeed

				log.easyDebug(device.name, ' - AC Rotation Speed is:', fanSpeed + '%')

				if (!active || mode === 'FAN' || mode === 'DRY')
					callback(null, null)
				else
					callback(null, fanSpeed)
			},

		},
	
		set: {

			On: (state, callback) => {
				device.state.On = state
				log(device.name + ' -> Setting On state to', state)
				callback()
			},

			Brightness: (brightness, callback) => {
				device.state.Brightness = brightness
				log(device.name + ' -> Setting Brightness to', brightness + '%')
				callback()
			},

			LockTargetState: (state, callback) => {
				device.state.LockState = state
				log(device.name + ' -> Setting Lock State to', state ? 'SECURED' : 'UNSECURED')
				callback()
			},

			Active: (state, callback) => {
				device.state.Active = state
				log(device.name + ' -> Setting Active state to', state)
				callback()
			},

			SetDuration: (seconds, callback) => {
				const hours = Math.floor(seconds / 60 / 60)
				const minutes = Math.floor(seconds / 60) % 60
				const formattedTime = hours + ':' + ('0' + minutes).slice(-2)
				log(device.name + ' -> Setting Duration to', formattedTime)
				device.duration = seconds
				device.accessory.context.duration = seconds	
				callback()
			},

			TargetPosition: (position, callback) => {
				const currentPosition = device.ShutterService.getCharacteristic(Characteristic.CurrentPosition).value
				device.tiltAngle = device.getTilt(position, currentPosition, device.tiltAngle)
				if (device.fullMovementTimeInSec)
					device.setPositionState(position, currentPosition)

				device.state.TargetPosition = position
				if (device.positionState === 2)
					log(device.name + ' -> Setting Position to' + position + '%')
				else
					log(device.name + ' -> Shutters are busy - Stopping them!')

				callback()
			},

			TargetTiltAngle: (angle, callback) => {
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
				callback()
			},

			ACActive: (state, callback) => {
				state = !!state
				log.easyDebug(device.name + ' -> Setting AC state Active:', state)

				if (state) {
					device.state.Active = 1
					const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
					const mode = characteristicToMode(lastMode)
					log.easyDebug(device.name + ' -> Setting Mode to', mode)
					device.state.mode = mode
				} else if (device.state.mode === 'COOL' || device.state.mode === 'HEAT' || device.state.mode === 'AUTO')
					device.state.Active = 0

				callback()
			},
		
		
			TargetHeaterCoolerState: (state, callback) => {
				const mode = characteristicToMode(state)
				log.easyDebug(device.name + ' -> Setting Target HeaterCooler State:', mode)
				device.state.mode = mode
				device.state.Active = 1

				callback()
			},
		
			CoolingThresholdTemperature: (temp, callback) => {
				if (device.usesFahrenheit)
					log.easyDebug(device.name + ' -> Setting Cooling Threshold Temperature:', toFahrenheit(temp) + 'ºF')
				else
					log.easyDebug(device.name + ' -> Setting Cooling Threshold Temperature:', temp + 'ºC')

				device.state.Active = 1
				const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
				const mode = characteristicToMode(lastMode)
				if (mode !== 'AUTO') {
					device.state.targetTemperature = temp
					log.easyDebug(device.name + ' -> Setting Mode to: COOL')
					device.state.mode = 'COOL'
				} else {
					if (device.state.targetTemperature !== temp) {
						setTimeout(() => {
							device.state.targetTemperature = temp
							log.easyDebug(device.name + ' -> Setting Mode to: AUTO')
							device.state.mode = 'AUTO'
						},100)
					}
				}
				callback()
			},
		
			HeatingThresholdTemperature: (temp, callback) => {
				if (device.usesFahrenheit)
					log.easyDebug(device.name + ' -> Setting Heating Threshold Temperature:', toFahrenheit(temp) + 'ºF')
				else
					log.easyDebug(device.name + ' -> Setting Heating Threshold Temperature:', temp + 'ºC')


				device.state.Active = 1
				const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
				const mode = characteristicToMode(lastMode)
				if (mode !== 'AUTO') {
					device.state.targetTemperature = temp
					log.easyDebug(device.name + ' -> Setting Mode to: HEAT')
					device.state.mode = 'HEAT'
				} else {
					if (device.state.targetTemperature !== temp) {
						setTimeout(() => {
							device.state.targetTemperature = temp
							log(device.name + ' -> Setting Mode to: AUTO')
							device.state.mode = 'AUTO'
						},100)
					}
				}
				callback()
			},
			ACSwing: (state, callback) => {
				
				state = state === Characteristic.SwingMode.SWING_ENABLED ? 'SWING_ENABLED' : 'SWING_DISABLED'
				log(device.name + ' -> Setting AC Swing:', state)
				device.state.swing = state

				const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
				const mode = characteristicToMode(lastMode)
				log(device.name + ' -> Setting Mode to', mode)
				device.state.Active = 1
				device.state.mode = mode

				callback()
			},
		
			ACRotationSpeed: (speed, callback) => {
				log(device.name + ' -> Setting AC Rotation Speed:', speed + '%')
				device.state.fanSpeed = speed

				const lastMode = device.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).value
				const mode = characteristicToMode(lastMode)
				log(device.name + ' -> Setting Mode to', mode)
				device.state.Active = 1
				device.state.mode = mode

				callback()
			}
		}

	}
}