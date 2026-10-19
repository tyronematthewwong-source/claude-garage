import { expect, mock, test } from 'claude-code/testing'

const presentation = { isFullscreen: false, columns: 100 } as any

test('session start registers /crew and the three agents', async ($, on) => {
  const agents: string[] = []
  const commands: string[] = []
  on('agent.register' as any, ($, e: any) => { agents.push(e.name); return { value: { agent: 'pit-crew:' + e.name } } })
  on('command.register' as any, ($, e: any) => { commands.push(e.name); return { value: undefined } })
  on('session.start', ($, e) => ({ ...e }) as any)
  await $.session.start({ cwd: '.', source: 'startup' } as any)
  expect(commands).toContain('crew')
  expect(agents).toEqual(['scout', 'writer', 'chief'])
})

test('/crew queues the scout → writer → chief prompt just after the command', async ($, on) => {
  const clock = mock.clock(on)
  let sent = ''
  on('prompt.submit', ($, e) => { sent = e.text; return { ...e } as any })
  const out = await $.command.run({ command: 'crew', args: 'find 10 dentists in Austin', origin: { kind: 'composer' }, presentation } as any)
  expect(out.text).toContain('Pit crew is on it')
  expect(sent).toBe('')
  await clock.advance(60)
  expect(sent).toContain('find 10 dentists in Austin')
  expect(sent.indexOf('pit-crew:scout')).toBeLessThan(sent.indexOf('pit-crew:writer'))
  expect(sent.indexOf('pit-crew:writer')).toBeLessThan(sent.indexOf('pit-crew:chief'))
})

test('/crew with no task explains itself', async ($, on) => {
  mock.clock(on)
  const out = await $.command.run({ command: 'crew', args: ' ', origin: { kind: 'composer' }, presentation } as any)
  expect(out.text).toContain('Give the crew a job')
})

test('each crew member announces itself as it starts', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast' as any, ($, e: any) => { toasts.push(e.text); return { value: undefined } })
  on('agent.spawn', () => ({ model: 'haiku', agentId: 'a1' }) as any)
  for (const who of ['pit-crew:scout', 'pit-crew:writer', 'pit-crew:chief', 'general-purpose']) {
    await $.agent.spawn({ tool_use_id: 'x', prompt: 'p', description: 'd', subagentType: who, provider: { plugin: 'pit-crew', tier: 'user' }, parentModel: 'opus' } as any)
  }
  expect(toasts).toEqual(['🔎 Scout is on the road', '✍️ Writer has the brief', '🏁 Crew chief is reviewing'])
})
