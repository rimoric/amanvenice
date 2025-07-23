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
            "name": "💡 Main Light",
            "mqttDevice": "Totale",
            "locale": "Camera",
            "initialLevel": 75,
            "initialPower": true
          }
        },
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "🌟 Courtesy Light",
            "mqttDevice": "Parziale",
            "locale": "Camera",
            "initialLevel": 30,
            "initialPower": false
          }
        },
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "🛏️ Bed Light",
            "mqttDevice": "Letto",
            "locale": "Camera",
            "initialLevel": 50,
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
            "initialLevel": 60,
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
            "initialLevel": 60,
            "initialPower": false
          }
        },
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "💻 Desk Light",
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
            "name": "🌡️ Room Climate",
            "mqttDevice": "CameraClima",
            "locale": "Camera",
            "initialTemp": 22.0,
            "measuredTemp": 20.5,
            "initialPower": true,
            "minTemp": 16,
            "maxTemp": 28,
            "fanSpeed": 2
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
            "name": "💡 Main Light",
            "mqttDevice": "Totale",
            "locale": "Bagno",
            "initialLevel": 85,
            "initialPower": false
          }
        },
        {
          "type": "dali",
          "zone": "lighting",
          "config": {
            "name": "🌟 Courtesy Light",
            "mqttDevice": "Parziale",
            "locale": "Bagno",
            "initialLevel": 25,
            "initialPower": false
          }
        },
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