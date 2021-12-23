/** @jsxRuntime classic */
/** @jsx React.createElement */

import {React} from './react'
// Rerendering
// --------------------------------------------------
// const container = document.getElementById('root')

// const updateValue = (e) => {
//   rerender(e.target.value)
// }

// const rerender = (value: string) => {
//   const element = (
//     <div>
//       <input onInput={updateValue} value={value} />
//       <h2>Hello {value}</h2>
//     </div>
//   )

//   React.render(element, container)
// }

// rerender('World')

// Functional Component
// --------------------------------------------------
// function App(props: {name: string}) {
//   return <h1>Hi {props.name}</h1>
// }
// const element = <App name="World" />
// const container = document.getElementById('root')
// React.render(element, container)

// Hooks
// --------------------------------------------------
function Counter() {
  const [state, setState] = React.useState(1)
  return (
    <div>
      Count: {state} <button onClick={() => setState((c) => c + 1)}>increment</button>
    </div>
  )
}
const element = <Counter />
const container = document.getElementById('root')
React.render(element, container)
