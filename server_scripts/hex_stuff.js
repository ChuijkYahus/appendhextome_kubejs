let $IotaType = Java.loadClass('at.petrak.hexcasting.api.casting.iota.IotaType')
let $HexAPI = Java.loadClass('at.petrak.hexcasting.api.HexAPI')


PlayerEvents.respawned(event => {
    const player = event.player

    player.persistentData.remove('appendix')
})

PlayerEvents.tick(event => {
    const player = event.player
    if (player.age % 20 != 0) return
    const appendix = player.persistentData.appendix
    if (!appendix) return
    const iota = $IotaType.deserialize(appendix, player.level)
    const size = iota.size() * (iota.depth() - 1)
    if (size < 20) return
    const magnitude = Math.min(Math.floor(size / 20 - 1),127)
    player.potionEffects.add('appendhextome:appendicitis', 39, magnitude, true, false)
})

ServerEvents.tags('damage_type', event => {
    event.add('minecraft:bypasses_armor', 'appendhextome:appendicitis')
    event.add('minecraft:bypasses_effects', 'appendhextome:appendicitis')
    event.add('minecraft:bypasses_shield', 'appendhextome:appendicitis')
    event.add('minecraft:bypasses_armor', 'appendhextome:appendicitis_instant')
    event.add('minecraft:bypasses_effects', 'appendhextome:appendicitis_instant')
    event.add('minecraft:bypasses_shield', 'appendhextome:appendicitis_instant')
})

ServerEvents.highPriorityData(event => {
    event.addJson("appendhextome:damage_type/appendicitis", {
        "exhaustion": 0.1,
        "message_id": "appendicitis",
        "scaling": "never"
    })
    event.addJson("appendhextome:damage_type/appendicitis_instant", {
        "exhaustion": 0.1,
        "message_id": "appendicitisInstant",
        "scaling": "never"
    })
})