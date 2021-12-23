import type {ReactElement, TextElement, Fiber} from './types'

let nextUnitOfWork: Fiber | null = null
let currentRoot: Fiber | null = null
let wipRoot: Fiber | null = null
let deletions: Fiber[] | null = null

const isEvent = (key: string) => key.startsWith('on')
const isProperty = (key: string) => key !== 'children' && !isEvent(key)

const isNew = (prev: Record<string, unknown>, next: Record<string, unknown>) => (key: string) =>
  prev[key] !== next[key]
const isGone = (prev: Record<string, unknown>, next: Record<string, unknown>) => (key: string) =>
  !(key in next)

function commitRoot() {
  deletions?.forEach(commitWork)

  if (wipRoot) {
    commitWork(wipRoot.child)
  }
  currentRoot = null
  wipRoot = null
}

function commitWork(fiber: Fiber | null): void {
  if (!fiber) {
    return
  }

  const domParent = fiber.parent?.dom

  if (fiber.dom) {
    domParent?.appendChild(fiber.dom)
  }

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null) {
    domParent?.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null && fiber.alternate != null) {
    updateDom(fiber.dom, fiber.alternate?.props, fiber.props)
  } else if (fiber.effectTag === 'DELETION' && fiber.dom !== null) {
    domParent?.removeChild(fiber.dom)
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function updateDom(dom: Node, prevProps: Fiber['props'], nextProps: Fiber['props']) {
  // Remove old properties
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name: string) => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, (prevProps as any)[name])
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      ;(dom as any)[name] = nextProps[name]
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, (nextProps as any)[name])
    })
}

function workLoop(deadline: IdleDeadline): void {
  let shouldYield = false

  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(fiber: Fiber): Fiber | null {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  const elements = fiber.props.children
  reconcileChildren(fiber, elements)

  if (fiber.child) {
    return fiber.child
  }

  let nextFiber: Fiber | null = fiber

  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }

    nextFiber = nextFiber.parent
  }

  return null
}

function reconcileChildren(wipFiber: Fiber | null, elements: ReactElement[]): void {
  let index = 0
  let oldFiber = wipFiber?.alternate && wipFiber.alternate.child
  let prevSibling: Fiber | null = null

  while (index < elements.length || oldFiber !== null) {
    const element = elements[index]

    let newFiber: Fiber | null = null

    const sameType = oldFiber && element && element.type === oldFiber.type

    if (sameType && oldFiber) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber?.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
        sibling: null,
        child: null,
      }
    } else {
      if (element) {
        newFiber = {
          type: element.type,
          props: element.props,
          dom: null,
          parent: wipFiber,
          alternate: null,
          effectTag: 'PLACEMENT',
          sibling: null,
          child: null,
        }
      }

      if (oldFiber) {
        oldFiber.effectTag = 'DELETION'
        deletions?.push(oldFiber)
      }
    }

    if (wipFiber && index === 0) {
      wipFiber.child = newFiber
    } else if (prevSibling !== null) {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

function createDom(fiber: Fiber): Node {
  const dom =
    fiber.type == 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type)
  updateDom(dom, {children: []}, fiber.props)
  return dom
}

function createElement(
  type: string,
  props: Record<string, unknown> | null,
  ...children: any[]
): ReactElement {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === 'object' ? child : createTextElement(child),
      ),
    },
  }
}

function createTextElement(text: string): TextElement {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

function render(element: ReactElement, container: HTMLElement | null): void {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    type: '',
    parent: null,
    sibling: null,
    child: null,
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

export const React = {createElement, render}
