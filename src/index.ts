import {React} from './react'

const element = React.createElement(
  'div',
  {className: 'foo'},
  'Hello',
  React.createElement('span', null, 'World'),
)

const container = document.getElementById('root')
React.render(element, container)
