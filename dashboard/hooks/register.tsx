import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Gauges, Todo } from '../types'

const PANE = 'dashboard'
const TITLE = 'Dashboard'
const todos = atom({ plugin: 'dashboard', key: 'todos' } as const, [])
const gauges = atom({ plugin: 'dashboard', key: 'gauges' } as const, { turns: 0, tools: 0, edits: 0, seconds: 0 })

const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit'])

async function saveTodos($: EngineInterface, fn: (list: Todo[]) => Todo[]) {
  await update($, todos, list => fn(list ?? []))
  await $.store.set('todos', await read($, todos))
}

export const register: Register = on => {
  let startedAt = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dash',
      description: 'Open the dashboard pane',
    })
    await $.command.register({
      name: 'todo',
      description: 'Add a to-do to the dashboard',
      argumentHint: '<what to do>',
    })
    const kept = (await $.store.get('todos')) as Todo[] | undefined
    if (kept) await update($, todos, () => kept)

    return next(e)
  })

  on('command.run', { command: 'dash' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: 'Dashboard open.' }
  })

  on('command.run', { command: 'todo' }, async ($, e) => {
    const text = e.args.trim()
    if (text === '') return { text: 'Usage: /todo reply to Sam about the invoice' }
    await saveTodos($, list => [...list, { id: crypto.randomUUID(), text, isDone: false }])
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: `Added to the dashboard: ${text}` }
  })

  on('prompt.submit', async ($, e, next) => {
    startedAt = await $.clock.now()

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const isEdit = EDIT_TOOLS.has(String(e.tool))
    await update($, gauges, g => ({ ...(g as Gauges), tools: g.tools + 1, edits: g.edits + (isEdit ? 1 : 0) }))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const seconds = startedAt === 0 ? 0 : Math.round(((await $.clock.now()) - startedAt) / 1000)
    await update($, gauges, g => ({ ...(g as Gauges), turns: g.turns + 1, seconds }))

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const Input = 'Input' in els ? els.Input : undefined
    const list = (await read($, todos)) ?? []
    const g = (await read($, gauges)) as Gauges
    const open = list.filter(t => !t.isDone)
    const done = list.filter(t => t.isDone)

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>GAUGES</Text>
          <Text>Turns {g.turns} · Tool calls {g.tools} · Edits {g.edits}</Text>
          <Text dimColor>Last turn took {g.seconds}s</Text>
        </Box>
        <Box flexDirection="column">
          <Text bold>TO-DO ({open.length})</Text>
          {open.length === 0 && <Text dimColor>Nothing left. Add one below or with /todo.</Text>}
          {open.map(t => (
            <Button
              key={`todo-${t.id}`}
              plain
              label={`☐ ${t.text}`}
              onPress={() => saveTodos($, l => l.map(x => (x.id === t.id ? { ...x, isDone: true } : x)))}
            />
          ))}
          {done.slice(-5).map(t => (
            <Button
              key={`done-${t.id}`}
              plain
              label={`☑ ${t.text}`}
              onPress={() => saveTodos($, l => l.filter(x => x.id !== t.id))}
            />
          ))}
        </Box>
        {Input !== undefined && (
          <Input
            key="new"
            placeholder="Add a to-do and press Enter"
            onSubmit={(text: string) => {
              const clean = text.trim()
              if (clean !== '') void saveTodos($, l => [...l, { id: crypto.randomUUID(), text: clean, isDone: false }])
            }}
          />
        )}
      </Box>
    )
  })
}
