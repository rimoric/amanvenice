{
  "roomNumber": 2,
  "roomName": "Room 02", 
  "theme": "aman-venice",
  "password": "02",
  "tabs": [
    {
      "id": "bedroom",
      "name": "🛏️ Bedroom",
      "subtitle": "Lighting & Climate Control", 
      "controls": [
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "💡 Main",
            "mqttDevice": "Totale",
            "locale": "Camera",
            "initialLevel": 0,
            "initialPower": false
          }
        },
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "🌟 Courtesy",
            "mqttDevice": "Parziale",
            "locale": "Camera",
            "initialLevel": 0,
            "initialPower": false
          }
        },
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "🛏️ Bed",
            "mqttDevice": "Letto",
            "locale": "Camera",
            "initialLevel": 0,
            "initialPower": false
          }
        },
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "💡 Left Abat Jour",
            "mqttDevice": "ComodinoSx",
            "locale": "Camera",
            "initialLevel": 0,
            "initialPower": false
          }
        },
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "💡 Right Abat Jour",
            "mqttDevice": "ComodinoDx",
            "locale": "Camera",
            "initialLevel": 0,
            "initialPower": false
          }
        },
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "💻 Desk",
            "mqttDevice": "Scrivania",
            "locale": "Camera",
            "initialLevel": 80,
            "initialPower": false
          }
        },
        {
          "type": "thermostat",
          "zone": "climate",
          "config": {
            "name": "🌡️ Climate",
            "mqttDevice": "CameraClima",
            "locale": "Camera",
            "initialTemp": 0.0,
            "measuredTemp": 0.0,
            "initialPower": false,
            "minTemp": 10,
            "maxTemp": 30,
            "fanSpeed": 0
          }
        }
      ]
    },
    {
      "id": "bathroom",
      "name": "🚿 Bathroom", 
      "subtitle": "Lighting & Heating Control",
      "controls": [
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "💡 Main",
            "mqttDevice": "Totale",
            "locale": "Bagno",
            "initialLevel": 0,
            "initialPower": false
          }
        },
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "🌟 Courtesy",
            "mqttDevice": "Parziale",
            "locale": "Bagno",
            "initialLevel": 0,
            "initialPower": false
          }
        },
        {
          "type": "thermostat",
          "zone": "climate",
          "config": {
            "name": "🌡️ Climate",
            "mqttDevice": "BagnoClima",
            "locale": "Bagno",
            "initialTemp": 0.0,
            "measuredTemp": 0.0,
            "initialPower": false,
            "minTemp": 10,
            "maxTemp": 30,
            "fanSpeed": 0
          }
        {
          "type": "onoff",
          "zone": "heating",
          "config": {
            "name": "🔥 Towel Heater",
            "mqttDevice": "ScaldaOnOff",
            "locale": "Bagno",
            "initialState": false
          }
        }
      ]
    },
    {
      "id": "settings",
      "name": "⚙️ Settings",
      "subtitle": "System Reset & Service Controls",
      "controls": [
        {
          "type": "monostable", 
          "zone": "system",
          "config": {
            "name": "🔄 Light Reset",
            "mqttDevice": "ResetLuci",
            "locale": "Globale",
            "buttonText": "RESET LIGHTS",
            "executingText": "Resetting all lights...",
            "completedText": "All lights reset successfully",
            "executionTime": 3000,
            "cooldownTime": 2000
          }
        },
        {
          "type": "monostable", 
          "zone": "system",
          "config": {
            "name": "🔄 Climate Reset",
            "mqttDevice": "ResetClima",
            "locale": "Globale",
            "buttonText": "RESET CLIMATE",
            "executingText": "Resetting climate system...",
            "completedText": "Climate system reset successfully",
            "executionTime": 3000,
            "cooldownTime": 2000
          }
        },
        {
          "type": "monostable", 
          "zone": "system",
          "config": {
            "name": "🌙 Light Turn-Down",
            "mqttDevice": "TurnDown",
            "locale": "Globale",
            "buttonText": "TURN-DOWN SERVICE",
            "executingText": "Activating turn-down service...",
            "completedText": "Turn-down service completed",
            "executionTime": 3000,
            "cooldownTime": 2000
          }
        }
      ]
    }
  ]
}