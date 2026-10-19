export type Todo = { id: string; text: string; isDone: boolean }
export type Gauges = { turns: number; tools: number; edits: number; seconds: number }

declare module 'claude-code' {
  interface PluginState {
    dashboard: { todos: Todo[]; gauges: Gauges }
  }
}
