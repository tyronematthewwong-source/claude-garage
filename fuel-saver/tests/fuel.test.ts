import { expect, mock, test } from 'claude-code/testing'

function answer(text: string) {
  return { isAnswered: true as const, text, usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }
}

async function step($: any, messageCount: number) {
  const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', messageCount })
  for await (const _ of stream) { /* drain */ }
  return stream
}

for (const [label, expected] of [['simple', 'claude-haiku-5-5'], ['hard', 'claude-opus-5-5']] as const) {
  test(`a ${label} prompt runs on ${expected}`, async ($, on) => {
    mock.store(on)
    on('ui.status' as any, () => ({ value: undefined }))
    on('ui.toast' as any, () => ({ value: undefined }))
    let sentModel = ''
    on('model.classify' as any, () => ({ value: label }))
    on('prompt.submit', ($, e) => ({ ...e } as any))
    on('turn.step', async function* ($, e) {
      sentModel = e.model
      return { turnId: e.turnId, index: e.index, answer: 'ok', toolUses: [], stopReason: 'end_turn', usage: null } as any
    })
    await $.prompt.submit({ text: 'rename this variable to total', origin: { kind: 'composer' } } as any)
    await step($, 4)
    expect(sentModel).toBe(expected)
  })
}

test('long conversations stay on the big model', async ($, on) => {
  mock.store(on)
  on('ui.status' as any, () => ({ value: undefined }))
  let sentModel = ''
  on('model.classify' as any, () => ({ value: 'simple' }))
  on('prompt.submit', ($, e) => ({ ...e } as any))
  on('turn.step', async function* ($, e) {
    sentModel = e.model
    return { turnId: e.turnId, index: e.index, answer: 'ok', toolUses: [], stopReason: 'end_turn', usage: null } as any
  })
  await $.prompt.submit({ text: 'what time is it in Tokyo', origin: { kind: 'composer' } } as any)
  await step($, 50)
  expect(sentModel).toBe('claude-opus-5-5')
})

test('a failed Haiku step pauses routing and is not counted', async ($, on) => {
  mock.store(on)
  on('ui.status' as any, () => ({ value: undefined }))
  const toasts: string[] = []
  on('ui.toast' as any, ($, e: any) => { toasts.push(e.text); return { value: undefined } })
  on('model.classify' as any, () => ({ value: 'simple' }))
  on('prompt.submit', ($, e) => ({ ...e } as any))
  const sent: string[] = []
  on('turn.step', async function* ($, e) {
    sent.push(e.model)
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null } as any
  })
  await $.prompt.submit({ text: 'what time is it in Tokyo', origin: { kind: 'composer' } } as any)
  await step($, 4)
  await $.prompt.submit({ text: 'and in Paris?', origin: { kind: 'composer' } } as any)
  await step($, 6)
  expect(sent).toEqual(['claude-haiku-5-5', 'claude-opus-5-5'])
  expect(toasts.some(t => t.includes('paused'))).toBe(true)
  expect(toasts.some(t => t.includes('sent to Haiku'))).toBe(false)
})
