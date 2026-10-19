import { expect, mock, test } from 'claude-code/testing'

const presentation = { isFullscreen: true, columns: 100 } as any
const PANE = { component: 'Pane', requestId: 'dashboard', props: { bodyColumns: 40 } } as any

for (const surface of ['terminal', 'desktop'] as const) {
  test(`to-dos add, show and tick off on ${surface}`, async ($, on) => {
    mock.store(on)
    on('ui.open' as any, () => ({ value: { isPlaced: true } }))
    await $.command.run({ command: 'todo', args: 'reply to Sam about the invoice', origin: { kind: 'composer' }, presentation } as any)

    const ui = await $.ui.mount({ plugin: 'dashboard', surface, ...PANE })
    expect(await ui.find({ text: /reply to Sam/ })).toBeDefined()
    expect(await ui.find({ text: 'TO-DO (1)' })).toBeDefined()

    await ui.input({ key: 'new', text: 'post the reel' })
    expect(await ui.find({ text: 'TO-DO (2)' })).toBeDefined()

    const row = await ui.find({ type: 'Button', text: /reply to Sam/ })
    await ui.press({ key: row!.key! })
    expect(await ui.find({ text: 'TO-DO (1)' })).toBeDefined()
    await ui.unmount()
  })
}
