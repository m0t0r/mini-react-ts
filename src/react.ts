import {isEvent, isGone, isNew, isProperty} from './utils'
import type {ReactElement, TextElement, Fiber} from './types'

let nextUnitOfWork: Fiber | null = null
let currentRoot: Fiber | null = null
let wipRoot: Fiber | null = null
let deletions: Fiber[] | null = null

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

function createDom(fiber: Fiber): Node {
  const dom =
    fiber.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)

  return dom
}

function updateDom(dom: Node, prevProps: Fiber['props'], nextProps: Fiber['props']): void {
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, (prevProps as any)[name])
    })

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      ;(dom as any)[name] = ''
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

function commitRoot(): void {
  deletions?.forEach(commitWork)
  commitWork(wipRoot?.child ?? null)
  currentRoot = wipRoot
  wipRoot = null
}

function commitWork(fiber: Fiber | null): void {
  if (!fiber) {
    return
  }

  let domParentFiber = fiber.parent
  while (!domParentFiber?.dom) {
    domParentFiber = domParentFiber?.parent ?? null
  }
  const domParent = domParentFiber.dom

  if (fiber.dom != null) {
    if (fiber.effectTag === 'PLACEMENT') {
      domParent?.appendChild(fiber.dom)
    } else if (fiber.effectTag === 'UPDATE') {
      updateDom(fiber.dom, fiber.alternate?.props ?? {}, fiber.props)
    } else if (fiber.effectTag === 'DELETION') {
      commitDeletion(fiber, domParent)
    }
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion(fiber: Fiber | null, domParent: Node) {
  if (fiber?.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber?.child ?? null, domParent)
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
  const isFunctionComponent = (fiber.type as any) instanceof Function

  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber

  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent as Fiber
  }

  return null
}

function updateFunctionComponent(fiber: Fiber | null) {
  if (fiber) {
    const children = [(fiber.type as Function)(fiber?.props)]
    reconcileChildren(fiber, children)
  }
}
function updateHostComponent(fiber: Fiber | null) {
  if (fiber && !fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber?.props.children ?? [])
}

function reconcileChildren(wipFiber: Fiber | null, elements: ReactElement[]): void {
  let index = 0
  let oldFiber = wipFiber?.alternate && wipFiber.alternate.child
  let prevSibling = null

  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber: Fiber | null = null

    const sameType = oldFiber && element && element.type == oldFiber.type

    if (sameType) {
      newFiber = {
        type: oldFiber?.type ?? '',
        props: element.props,
        dom: oldFiber?.dom ?? null,
        parent: wipFiber,
        alternate: oldFiber ?? null,
        effectTag: 'UPDATE',
        sibling: null,
        child: null,
      }
    }
    if (element && !sameType) {
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
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION'
      deletions?.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0 && wipFiber) {
      wipFiber.child = newFiber
    } else if (element && prevSibling) {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

export const React = {createElement, render}
