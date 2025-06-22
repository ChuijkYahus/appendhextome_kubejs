let $ActionRegistryEntry = Java.loadClass('at.petrak.hexcasting.api.casting.ActionRegistryEntry')
let $HexPattern = Java.loadClass('at.petrak.hexcasting.api.casting.math.HexPattern')
let $HexDir = Java.loadClass('at.petrak.hexcasting.api.casting.math.HexDir')
let $OperationResult = Java.loadClass('at.petrak.hexcasting.api.casting.eval.OperationResult')
let $Mishap = Java.loadClass('at.petrak.hexcasting.api.casting.mishaps.Mishap')
let $OperatorSideEffect = Java.loadClass('at.petrak.hexcasting.api.casting.eval.sideeffects.OperatorSideEffect')
let $HexEvalSounds = Java.loadClass('at.petrak.hexcasting.common.lib.hex.HexEvalSounds')
let $NullIota = Java.loadClass('at.petrak.hexcasting.api.casting.iota.NullIota')
let $MishapNotEnoughArgs = Java.loadClass('at.petrak.hexcasting.api.casting.mishaps.MishapNotEnoughArgs')
let $MishapBadEntity = Java.loadClass('at.petrak.hexcasting.api.casting.mishaps.MishapBadEntity')
let $CastingVM = Java.loadClass('at.petrak.hexcasting.api.casting.eval.vm.CastingVM')
let $MishapOthersName = Java.loadClass('at.petrak.hexcasting.api.casting.mishaps.MishapOthersName')

let $IotaType = Java.loadClass('at.petrak.hexcasting.api.casting.iota.IotaType')

let $HexAPI = Java.loadClass('at.petrak.hexcasting.api.HexAPI')

let $SoundEvent = Java.loadClass('net.minecraft.sounds.SoundEvent')
let $EvalSound = Java.loadClass('at.petrak.hexcasting.api.casting.eval.sideeffects.EvalSound')

let squishCastSoundEvent = $SoundEvent.createVariableRangeEvent('appendhextome:casting.cast.squish')
let squishCastEvalSound = new $EvalSound(squishCastSoundEvent, 1500)
let squishFailSoundEvent = $SoundEvent.createVariableRangeEvent('appendhextome:casting.cast.fail')
let squishMishapEvalSound = new $EvalSound(squishFailSoundEvent, 4500)

StartupEvents.registry('hexcasting:action', event => {

    function registerPattern(seq, dir, id, options) {

        let pattern = $HexPattern.fromAngles(seq, dir)
        event.createCustom(id, () => { return new $ActionRegistryEntry(pattern, new hexAction(id, pattern, options)) })
    }

    registerPattern('deeeweee', $HexDir.EAST, 'appendhextome:write', { sound: squishCastEvalSound, mishapSound: squishMishapEvalSound })
    registerPattern('aqqqwqqq', $HexDir.EAST, 'appendhextome:read', { sound: squishCastEvalSound, mishapSound: squishMishapEvalSound })
})

let $ResourceKey = Java.loadClass("net.minecraft.resources.ResourceKey")
let DAMAGE_TYPE = $ResourceKey.createRegistryKey("damage_type")

function getDamageSource(/** @type {Internal.Level}*/ level, /** @type {Internal.DamageType_}*/ damageType, projectile, thrower) {
    const resourceKey = $ResourceKey.create(DAMAGE_TYPE, Utils.id(damageType))
    const holder = level.registryAccess().registryOrThrow(DAMAGE_TYPE).getHolderOrThrow(resourceKey)
    return thrower ? new DamageSource(holder, projectile, thrower, thrower.position()) : new DamageSource(holder, projectile, thrower)
}

StartupEvents.registry('mob_effect', event => {
    event.create('appendhextome:appendicitis')
        .harmful()
        .color(0x6e2d33)
        .effectTick((entity, lvl) => {
            if (entity.age % 10 != 0 || entity.level.clientSide) return
            const vel = $HexAPI.instance().getEntityVelocitySpecial(entity).length() * 10
            const multiplier = Math.max(0.5, vel)
            const damageSource = getDamageSource(entity.level, "appendhextome:appendicitis", null, null)
            entity.attack(damageSource, 2 * (lvl + 1) * multiplier)
        })
})

// ***BIG*** thanks to YukkuriC for showing me how to do Hex stuff in kubejs.

function collectArgs(stack, n, keep) {
    if (stack.length < n) throw $MishapNotEnoughArgs(n, stack.length)
    return stack[keep ? 'slice' : 'splice'](-n)
}

let patternMap = {
    'appendhextome:write': (stack, ctx) => {
        let args = collectArgs(stack, 1)
        let iota = args[0]

        let caster = ctx.castingEntity

        if (!caster || !caster.isPlayer()) throw $MishapBadEntity(caster, 'iota.player')

        let cost = iota.size() * 1000 * iota.depth()

        let trueName = $MishapOthersName.getTrueNameFromDatum(iota, caster)

        if (trueName != null) {
            let damageSource = global.getDamageSource(caster.level, "appendhextome:appendicitis_instant", null, trueName)
            caster.attack(damageSource, 1000000000)
            throw $MishapOthersName(trueName)
        }

        let sideEffects = [
            $OperatorSideEffect.ConsumeMedia(cost),
            $OperatorSideEffect.AttemptSpell(
                {
                    cast: () => {
                        caster.persistentData.appendix = $IotaType.serialize(iota)
                        const position = caster.getPosition(1)
                        caster.level.spawnParticles('minecraft:block redstone_block', true, position.x(), position.y() + 1, position.z(), 0, 0.5, 0, 5, 0.1)
                    }
                },
                true,
                true
            )
        ]
        return sideEffects
    },
    'appendhextome:read': (stack, ctx) => {
        let caster = ctx.castingEntity
        let appendix = caster.persistentData.appendix
        if (!caster || !caster.isPlayer()) throw $MishapBadEntity(caster, 'iota.player')
        let iota = appendix ? $IotaType.deserialize(appendix, caster.level) : $NullIota()
        stack.push(iota)
        const position = caster.getPosition(1)
        caster.level.spawnParticles('minecraft:block redstone_block', true, position.x(), position.y() + 1, position.z(), 0, 0.5, 0, 5, 0.1)
    }
}


function hexAction(id, pattern, options) {
    const { sound, mishapSound } = options || {}
    this.operate = (env, img, cont) => {
        let stack = img.stack
        if (stack.toArray) stack = Array.from(stack.toArray())
        try {
            let sideEffects = patternMap[id](stack, env, img) || []
            let newImg = img.copy(stack, img.parenCount, img.parenthesized, img.escapeNext, img.opsConsumed + 1, img.userData)
            return $OperationResult(newImg, sideEffects, cont, sound || $HexEvalSounds.NORMAL_EXECUTE)
        } catch (e) {
            if (e instanceof $Mishap) {
                let mishapName = Text.translate(`hexcasting.action.${id}`).aqua()
                let mishapEffect = $OperatorSideEffect.DoMishap(e, $Mishap.Context(pattern, mishapName))
                mishapEffect.performEffect($CastingVM(img, env))
                let newImg = img.copy(stack, img.parenCount, img.parenthesized, img.escapeNext, 0, img.userData)
                while (cont.next) cont = cont.next
                return $OperationResult(newImg, [mishapEffect], cont, mishapSound || $HexEvalSounds.MISHAP)
            }
            throw e
        }
    }
}