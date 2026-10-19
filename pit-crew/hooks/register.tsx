import type { Register } from 'claude-code'

// A mod that is a hooks module loads no commands/*.md, so the command and
// the three crew agents are registered here.
const AGENTS = [
  {
    name: 'scout',
    description: 'Pit crew scout. Researches the task and brings back the raw facts, options and links the writer needs. Never writes the final piece.',
    tools: ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch'],
    model: 'haiku',
    prompt: `You are the scout on a three-person pit crew (scout, writer, crew chief).
Your only job: gather what the writer needs to finish the task.
- Search and read; do not write the final deliverable.
- Return a tight brief: key facts, names, numbers, sources (with links), and open questions.
- Flag anything you could not verify instead of guessing.`,
  },
  {
    name: 'writer',
    description: 'Pit crew writer. Turns the scout\'s brief into the finished deliverable (copy, email, plan, code). Does no research of its own.',
    tools: ['Read', 'Write', 'Edit'],
    model: 'sonnet',
    prompt: `You are the writer on a three-person pit crew (scout, writer, crew chief).
You get the task and the scout's brief. Produce the finished deliverable.
- Use only facts in the brief; mark gaps as [NEEDS CHECK].
- Plain, specific language. No filler.
- Return the deliverable in full.`,
  },
  {
    name: 'chief',
    description: 'Pit crew chief. Reviews the writer\'s draft against the task and the scout\'s brief, fixes what is wrong, and signs off.',
    tools: ['Read'],
    prompt: `You are the crew chief on a three-person pit crew (scout, writer, crew chief).
You get the task, the scout's brief and the writer's draft.
- Check the draft does what the task asked and every claim is backed by the brief.
- Fix problems directly and return the final version.
- End with one line: "CHIEF: approved" or "CHIEF: approved with fixes: <what changed>".`,
  },
]

const RUN = (task: string) => `Run the pit crew on this task: ${task}

1. Spawn the pit-crew:scout agent with the task. Wait for its brief.
2. Spawn the pit-crew:writer agent with the task and the scout's full brief.
3. Spawn the pit-crew:chief agent with the task, the brief and the writer's draft.
Run them one after another, never in parallel. Then show me the chief's final version, with one line per crew member on what they did.`

const CREW: Record<string, string> = {
  'pit-crew:scout': '🔎 Scout is on the road',
  'pit-crew:writer': '✍️ Writer has the brief',
  'pit-crew:chief': '🏁 Crew chief is reviewing',
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'crew',
      description: 'Pit crew: a scout researches, a writer drafts, a chief reviews',
      argumentHint: '<task>',
    })
    for (const agent of AGENTS) await $.agent.register(agent)

    return next(e)
  })

  on('command.run', { command: 'crew' }, async ($, e) => {
    const task = e.args.trim()
    if (task === '') return { text: 'Give the crew a job: /crew find 10 dentists in Austin and write each a cold email' }

    // A command can't submit a prompt from inside its own run (the prompt would
    // wait on this command), so the crew's prompt is queued just after it.
    $.clock.after(50, () => {
      void $.prompt.submit({ text: RUN(task), asUser: true })
    })

    return { text: `🔧 Pit crew is on it: ${task}` }
  })

  on('agent.spawn', async ($, e, next) => {
    const line = CREW[e.subagentType]
    if (line !== undefined) $.ui.toast(line)

    return next(e)
  })
}
