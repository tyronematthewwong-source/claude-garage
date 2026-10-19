import type { Register } from 'claude-code'

// Past this many messages the big model's prompt cache is worth more than
// Haiku's lower price: a switch would re-send the whole conversation uncached.
const MAX_MESSAGES = 20
const LABELS = ['simple', 'hard'] as const
// A request step names a model by full id; the short alias "haiku" only
// resolves for $.model calls and agent definitions, not here.
const HAIKU = 'claude-haiku-5-5'

const line = (n: number) => `⛽ Fuel Saver on · ${n} ${n === 1 ? 'prompt' : 'prompts'} sent to Haiku`

export const register: Register = on => {
  let isOn = true
  let isSimple = false
  let isBroken = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'fuel',
      description: 'Fuel Saver: /fuel on, /fuel off, /fuel reset, or /fuel to see what it saved',
    })
    $.ui.status(line(Number((await $.store.get('routed')) ?? 0)))

    return next(e)
  })

  on('command.run', { command: 'fuel' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'off') isOn = false
    if (arg === 'on') {
      isOn = true
      isBroken = false
    }
    if (arg === 'reset') await $.store.set('routed', 0)
    const saved = Number((await $.store.get('routed')) ?? 0)
    $.ui.status(isOn ? line(saved) : undefined)

    return { text: `Fuel Saver is ${isOn ? 'on' : 'off'}. ${saved} ${saved === 1 ? 'prompt' : 'prompts'} sent to Haiku so far.` }
  })

  on('prompt.submit', async ($, e, next) => {
    isSimple = false
    if (isOn && !isBroken && !e.command && !e.isMeta) {
      try {
        const kind = await $.model.classify(
          `Is this request simple (a quick question, rename, small edit, short rewrite, lookup) or hard (planning, debugging, multi-file code, research, anything needing careful reasoning)?\n\n${e.text}`,
          LABELS,
          { model: 'haiku' },
        )
        isSimple = kind === 'simple'
      } catch {
        isSimple = false
      }
    }

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const isRouted = isOn && !isBroken && isSimple && e.agentId === undefined && e.messageCount <= MAX_MESSAGES
    if (!isRouted) return yield* next(e)

    try {
      const ran = yield* next({ ...e, model: HAIKU })
      const isAnswered = ran.answer !== '' || ran.toolUses.length > 0
      if (e.index === 0 && isAnswered) {
        const saved = Number((await $.store.get('routed')) ?? 0) + 1
        await $.store.set('routed', saved)
        $.ui.status(line(saved))
        $.ui.toast('⛽ Simple one: sent to Haiku')
      }
      if (!isAnswered) {
        isBroken = true
        $.ui.toast('⛽ Haiku gave no answer here, so Fuel Saver is paused (/fuel on to retry)')
      }

      return ran
    } catch (err) {
      // Haiku isn't reachable on this account: stop routing so every later
      // prompt stays on the session's own model.
      isBroken = true
      $.ui.toast('⛽ Haiku is not available here, so Fuel Saver is paused (/fuel on to retry)')
      throw err
    }
  })
}
